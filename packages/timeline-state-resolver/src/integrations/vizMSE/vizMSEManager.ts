import * as _ from 'underscore'
import { EventEmitter } from 'events'
import { literal } from '../../devices/device'
import {
	MediaObject,
	TimelineContentTypeVizMSE,
	VIZMSEPlayoutItemContent,
	VIZMSEPlayoutItemContentInternal,
	VIZMSETransitionType,
} from 'timeline-state-resolver-types'
import { ExternalElement, InternalElement, MSE, VElement, VRundown } from '@tv2media/v-connection'
import { ExpectedPlayoutItem } from '../../expectedPlayoutItems'
import * as request from 'request'
import { deferAsync } from '../../lib'
import { VizMSEDevice } from './index'
import {
	CachedVElement,
	isVizMSEPlayoutItemContentInternalInstance,
	isVizMSEPlayoutItemContentExternalInstance,
	VizMSECommandPrepare,
	VizMSECommandCue,
	VizMSECommandElementBase,
	VizMSECommandTake,
	VizMSECommandTakeOut,
	VizMSECommandContinue,
	VizMSECommandContinueReverse,
	VizMSECommandClearAllElements,
	VizMSEStateLayerInternal,
	VizMSECommandType,
	VizMSECommandClearAllEngines,
	VizMSECommandSetConcept,
	VizMSECommandLoadAllElements,
	VizMSECommandInitializeShows,
	VizMSECommandCleanupShows,
	VizMSEStateLayer,
	VizMSEPlayoutItemContentInstance,
	isVIZMSEPlayoutItemContentExternal,
	VizMSEPlayoutItemContentExternalInstance,
	isVIZMSEPlayoutItemContentInternal,
} from './types'
import { VizEngineTcpSender } from './vizEngineTcpSender'
import * as crypto from 'crypto'
import * as path from 'path'

/** Minimum time to wait before removing an element after an expectedPlayoutItem has been removed */
const DELETE_TIME_WAIT = 20 * 1000

// How often to check / preload elements
const MONITOR_INTERVAL = 5 * 1000

// How long to wait after any action (takes, cues, etc) before trying to cue for preloading
const SAFE_PRELOAD_TIME = 2000

// How long to wait before retrying to ping the MSE when initializing the rundown, after a failed attempt
const INIT_RETRY_INTERVAL = 3000

// Appears at the end of show names in the directory
const SHOW_EXTENSION = '.show'

export function getHash(str: string): string {
	const hash = crypto.createHash('sha1')
	return hash.update(str).digest('base64').replace(/[+/=]/g, '_') // remove +/= from strings, because they cause troubles
}

export type Engine = { name: string; channel?: string; host: string; port: number }
export type EngineStatus = Engine & { alive: boolean }

export class VizMSEManager extends EventEmitter {
	public initialized = false
	public notLoadedCount = 0
	public loadingCount = 0
	public enginesDisconnected: Array<string> = []

	private _rundown: VRundown | undefined
	private _elementCache: { [hash: string]: CachedVElement } = {}
	private _expectedPlayoutItems: Array<ExpectedPlayoutItem> = []
	private _monitorAndLoadElementsTimeout?: NodeJS.Timer
	private _monitorMSEConnectionTimeout?: NodeJS.Timer
	private _lastTimeCommandSent = 0
	private _hasActiveRundown = false
	private _getRundownPromise?: Promise<VRundown>
	private _mseConnected: boolean | undefined = undefined // undefined: first connection not established yet
	private _msePingConnected = false
	private _loadingAllElements = false
	private _waitWithLayers: {
		[portId: string]: Function[]
	} = {}
	public ignoreAllWaits = false // Only to be used in tests
	private _terminated = false
	private _activeRundownPlaylistId: string | undefined
	private _preloadedRundownPlaylistId: string | undefined
	private _updateAfterReconnect = false
	private _initializedShows = new Set<string>()
	private _showToIdMap: Map<string, string> | undefined

	public get activeRundownPlaylistId() {
		return this._activeRundownPlaylistId
	}

	constructor(
		private _parentVizMSEDevice: VizMSEDevice,
		private _vizMSE: MSE,
		public preloadAllElements: boolean,
		public onlyPreloadActivePlaylist: boolean,
		public purgeUnknownElements: boolean,
		public autoLoadInternalElements: boolean,
		public engineRestPort: number | undefined,
		private _showDirectoryPath: string,
		private _profile: string,
		private _playlistID?: string
	) {
		super()
	}
	/**
	 * Initialize the Rundown in MSE.
	 * Our approach is to create a single rundown on initialization, and then use only that for later control.
	 */
	public async initializeRundown(activeRundownPlaylistId: string | undefined): Promise<void> {
		this._vizMSE.on('connected', () => this._mseConnectionChanged(true))
		this._vizMSE.on('disconnected', () => this._mseConnectionChanged(false))
		this._vizMSE.on('warning', (message: string) => this.emit('warning', 'v-connection: ' + message))
		this._activeRundownPlaylistId = activeRundownPlaylistId
		this._preloadedRundownPlaylistId = this.onlyPreloadActivePlaylist ? activeRundownPlaylistId : undefined

		if (activeRundownPlaylistId) {
			this.emit('debug', `VizMSE: already active playlist: ${this._preloadedRundownPlaylistId}`)
		}

		const initializeRundownInner = async () => {
			try {
				// Perform a ping, to ensure we are connected properly
				await this._vizMSE.ping()
				this._msePingConnected = true
				this._mseConnectionChanged(true)

				// Setup the rundown used by this device:
				const rundown = await this._getRundown()

				if (!rundown) throw new Error(`VizMSEManager: Unable to create rundown!`)

				this._showToIdMap = await this._vizMSE.listShowsFromDirectory()
			} catch (e) {
				this.emit('debug', `VizMSE: initializeRundownInner ${e}`)
				setTimeout(() => {
					deferAsync(
						async () => initializeRundownInner(),
						(_e) => {
							// ignore error
						}
					)
				}, INIT_RETRY_INTERVAL)
				return
			}

			// const profile = await this._vizMSE.getProfile('sofie') // TODO: Figure out if this is needed
			this._setMonitorLoadedElementsTimeout()
			this._setMonitorConnectionTimeout()

			this.initialized = true
		}

		await initializeRundownInner()
	}
	/**
	 * Close connections and die
	 */
	public async terminate() {
		this._terminated = true
		if (this._monitorAndLoadElementsTimeout) {
			clearTimeout(this._monitorAndLoadElementsTimeout)
		}
		if (this._monitorMSEConnectionTimeout) {
			clearTimeout(this._monitorMSEConnectionTimeout)
		}
		if (this._vizMSE) {
			await this._vizMSE.close()
		}
	}
	/**
	 * Set the collection of expectedPlayoutItems.
	 * These will be monitored and can be triggered to pre-load.
	 */
	public setExpectedPlayoutItems(expectedPlayoutItems: Array<ExpectedPlayoutItem>) {
		this.emit('debug', 'VIZDEBUG: setExpectedPlayoutItems called')
		if (this.preloadAllElements) {
			this.emit('debug', 'VIZDEBUG: preload elements allowed')
			this._expectedPlayoutItems = expectedPlayoutItems
			this._prepareAndGetExpectedPlayoutItems() // Calling this in order to trigger creation of all elements
				.then(async (hashesAndItems) => {
					if (this._rundown && this._hasActiveRundown) {
						this.emit('debug', 'VIZDEBUG: auto load internal elements...')
						await this._updateElementsLoadedStatus()

						const elementHashesToDelete: string[] = []
						// When a new element is added, we'll trigger a show init:
						const showIdsToInitialize = new Set<string>()
						_.each(this._elementCache, (element) => {
							if (isVizMSEPlayoutItemContentInternalInstance(element.content)) {
								if (!element.isLoaded && !element.requestedLoading) {
									this.emit('debug', `Element "${this._getElementReference(element.element)}" is not loaded`)
									if (this.autoLoadInternalElements || this._initializedShows.has(element.content.showId)) {
										showIdsToInitialize.add(element.content.showId)
										element.requestedLoading = true
									}
								}
							}
							if (!hashesAndItems[element.hash] && !element.toDelete) {
								elementHashesToDelete.push(element.hash)
								this._elementCache[element.hash].toDelete = true
							}
						})
						const uniqueShowIds = Array.from(showIdsToInitialize)
						await this._initializeShows(uniqueShowIds)

						setTimeout(() => {
							Promise.all(
								elementHashesToDelete.map(async (elementHash) => {
									const element = this._elementCache[elementHash]
									if (element?.toDelete) {
										await this._deleteElement(element.content)
										delete this._elementCache[elementHash]
									}
								})
							).catch((error) => this.emit('error', error))
						}, DELETE_TIME_WAIT)
					}
				})
				.catch((error) => this.emit('error', error))
		}
	}
	/**
	 * Activate the rundown.
	 * This causes the MSE rundown to activate, which must be done before using it.
	 * Doing this will make MSE start loading things onto the vizEngine etc.
	 */
	public async activate(rundownPlaylistId: string | undefined): Promise<void> {
		this._preloadedRundownPlaylistId = this.onlyPreloadActivePlaylist ? rundownPlaylistId : undefined
		let loadTwice = false
		if (!rundownPlaylistId || this._activeRundownPlaylistId !== rundownPlaylistId) {
			this._triggerCommandSent()
			const rundown = await this._getRundown()

			// clear any existing elements from the existing rundown
			try {
				this.emit('debug', `VizMSE: purging rundown`)
				const elementsToKeep = this._expectedPlayoutItems
					.filter((item) => !!item.baseline)
					.map((playoutItem) => this.getPlayoutItemContent(playoutItem))
					.filter(isVizMSEPlayoutItemContentExternalInstance)

				await rundown.purgeExternalElements(elementsToKeep)
			} catch (error) {
				this.emit('error', error)
			}
			this._clearCache()
			this._clearMediaObjects()
			loadTwice = true
		}

		this._triggerCommandSent()
		this._triggerLoadAllElements(loadTwice)
			.then(async () => {
				this._triggerCommandSent()
				this._activeRundownPlaylistId = rundownPlaylistId
				this._hasActiveRundown = true

				if (this.purgeUnknownElements) {
					const rundown = await this._getRundown()
					const elementsInRundown = await rundown.listExternalElements()
					const hashesAndItems = await this._prepareAndGetExpectedPlayoutItems()

					for (const element of elementsInRundown) {
						// Check if that element is in our expectedPlayoutItems list
						if (!hashesAndItems[VizMSEManager._getElementHash(element)]) {
							// The element in the Viz-rundown seems to be unknown to us
							await rundown.deleteElement(element)
						}
					}
				}
			})
			.catch((e) => {
				this.emit('error', e)
			})
	}
	/**
	 * Deactivate the MSE rundown.
	 * This causes the MSE to stand down and clear the vizEngines of any loaded graphics.
	 */
	public async deactivate(): Promise<void> {
		const rundown = await this._getRundown()
		this._triggerCommandSent()
		await rundown.deactivate()
		this._triggerCommandSent()
		this.standDownActiveRundown()
		this._clearMediaObjects()
	}
	public standDownActiveRundown(): void {
		this._hasActiveRundown = false
		this._activeRundownPlaylistId = undefined
	}
	private _clearMediaObjects(): void {
		this.emit('clearMediaObjects')
	}
	/**
	 * Prepare an element
	 * This creates the element and is intended to be called a little time ahead of Takeing the element.
	 */
	public async prepareElement(cmd: VizMSECommandPrepare): Promise<void> {
		this.logCommand(cmd, 'prepare')
		this._triggerCommandSent()
		await this._checkPrepareElement(cmd.content, true)
		this._triggerCommandSent()
	}
	/**
	 * Cue:ing an element: Load and play the first frame of a graphic
	 */
	public async cueElement(cmd: VizMSECommandCue): Promise<void> {
		const rundown = await this._getRundown()

		await this._checkPrepareElement(cmd.content)

		await this._checkElementExists(cmd)
		await this._handleRetry(async () => {
			this.logCommand(cmd, 'cue')
			return rundown.cue(cmd.content)
		})
	}

	logCommand(cmd: VizMSECommandElementBase, commandName: string) {
		const content = cmd.content
		if (isVizMSEPlayoutItemContentInternalInstance(content)) {
			this.emit('debug', `VizMSE: ${commandName} "${content.instanceName}" in show "${content.showId}"`)
		} else {
			this.emit('debug', `VizMSE: ${commandName} "${content.vcpid}" on channel "${content.channel}"`)
		}
	}

	/**
	 * Take an element: Load and Play a graphic element, run in-animatinos etc
	 */
	public async takeElement(cmd: VizMSECommandTake): Promise<void> {
		const rundown = await this._getRundown()

		await this._checkPrepareElement(cmd.content)

		if (cmd.transition) {
			if (cmd.transition.type === VIZMSETransitionType.DELAY) {
				if (await this._waitWithLayer(cmd.layerId || '__default', cmd.transition.delay)) {
					// at this point, the wait aws aborted by someone else. Do nothing then.
					return
				}
			}
		}

		await this._checkElementExists(cmd)
		await this._handleRetry(async () => {
			this.logCommand(cmd, 'take')
			return rundown.take(cmd.content)
		})
	}
	/**
	 * Take out: Animate out a graphic element
	 */
	public async takeoutElement(cmd: VizMSECommandTakeOut): Promise<void> {
		const rundown = await this._getRundown()

		if (cmd.transition) {
			if (cmd.transition.type === VIZMSETransitionType.DELAY) {
				if (await this._waitWithLayer(cmd.layerId || '__default', cmd.transition.delay)) {
					// at this point, the wait aws aborted by someone else. Do nothing then.
					return
				}
			}
		}

		await this._checkPrepareElement(cmd.content)

		await this._checkElementExists(cmd)
		await this._handleRetry(async () => {
			this.logCommand(cmd, 'out')
			return rundown.out(cmd.content)
		})
	}
	/**
	 * Continue: Cause the graphic element to step forward, if it has multiple states
	 */
	public async continueElement(cmd: VizMSECommandContinue): Promise<void> {
		const rundown = await this._getRundown()

		await this._checkPrepareElement(cmd.content)

		await this._checkElementExists(cmd)
		await this._handleRetry(async () => {
			this.logCommand(cmd, 'continue')
			return rundown.continue(cmd.content)
		})
	}
	/**
	 * Continue-reverse: Cause the graphic element to step backwards, if it has multiple states
	 */
	public async continueElementReverse(cmd: VizMSECommandContinueReverse): Promise<void> {
		const rundown = await this._getRundown()

		await this._checkPrepareElement(cmd.content)

		await this._checkElementExists(cmd)
		await this._handleRetry(async () => {
			this.logCommand(cmd, 'continue reverse')
			return rundown.continueReverse(cmd.content)
		})
	}
	/**
	 * Special: trigger a template which clears all templates on the output
	 */
	public async clearAll(cmd: VizMSECommandClearAllElements): Promise<void> {
		const rundown = await this._getRundown()

		const template: VizMSEStateLayerInternal = {
			timelineObjId: cmd.timelineObjId,
			contentType: TimelineContentTypeVizMSE.ELEMENT_INTERNAL,
			templateName: cmd.templateName,
			templateData: [],
			showId: cmd.showId,
		}
		// Start playing special element:
		const cmdTake: VizMSECommandTake = {
			time: cmd.time,
			type: VizMSECommandType.TAKE_ELEMENT,
			timelineObjId: template.timelineObjId,
			content: VizMSEManager.getPlayoutItemContentFromLayer(template),
		}

		await this._checkPrepareElement(cmdTake.content)

		await this._checkElementExists(cmdTake)
		await this._handleRetry(async () => {
			this.logCommand(cmdTake, 'clearAll take')
			return rundown.take(cmdTake.content)
		})
	}
	/**
	 * Special: send commands to Viz Engines in order to clear them
	 */
	public async clearEngines(cmd: VizMSECommandClearAllEngines): Promise<void> {
		try {
			const engines = await this._getEngines()
			const enginesToClear = this._filterEnginesToClear(engines, cmd.channels)
			enginesToClear.forEach((engine) => {
				const sender = new VizEngineTcpSender(engine.port, engine.host)
				sender.on('warning', (w) => this.emit('warning', `clearEngines: ${w}`))
				sender.on('error', (e) => this.emit('error', `clearEngines: ${e}`))
				sender.send(cmd.commands)
			})
		} catch (e) {
			this.emit('warning', `Sending Clear-all command failed ${e}`)
		}
	}
	private async _getEngines(): Promise<Engine[]> {
		const profile = await this._vizMSE.getProfile(this._profile)
		const engines = await this._vizMSE.getEngines()
		const result: Engine[] = []
		const outputs = new Map<string, string>() // engine name : channel name
		_.each(profile.execution_groups, (group, groupName) => {
			_.each(group, (entry) => {
				if (typeof entry === 'object' && entry.viz) {
					if (typeof entry.viz === 'object' && entry.viz.value) {
						outputs.set(entry.viz.value as string, groupName)
					}
				}
			})
		})
		const outputEngines = engines.filter((engine) => {
			return outputs.has(engine.name)
		})
		outputEngines.forEach((engine) => {
			_.each(_.keys(engine.renderer), (fullHost) => {
				const channelName = outputs.get(engine.name)
				const match = fullHost.match(/([^:]+):?(\d*)?/)
				const port = match && match[2] ? parseInt(match[2], 10) : 6100
				const host = match && match[1] ? match[1] : fullHost
				result.push({ name: engine.name, channel: channelName, host, port })
			})
		})
		return result
	}
	private _filterEnginesToClear(engines: Engine[], channels: string[] | 'all'): Array<{ host: string; port: number }> {
		return engines.filter((engine) => channels === 'all' || (engine.channel && channels.includes(engine.channel)))
	}

	public async setConcept(cmd: VizMSECommandSetConcept): Promise<void> {
		const rundown: VRundown = await this._getRundown()
		await rundown.setAlternativeConcept(cmd.concept)
	}

	/**
	 * Load all elements: Trigger a loading of all pilot elements onto the vizEngine.
	 * This might cause the vizEngine to freeze during load, so do not to it while on air!
	 */
	public async loadAllElements(_cmd: VizMSECommandLoadAllElements): Promise<void> {
		this._triggerCommandSent()
		await this._triggerLoadAllElements()
		this._triggerCommandSent()
	}

	private async _initializeShows(showIds: string[]) {
		const rundown = await this._getRundown()
		this.emit('debug', `Triggering show ${showIds} init `)
		for (const showId of showIds) {
			try {
				await rundown.initializeShow(showId)
			} catch (e) {
				this.emit('error', `Error in _initializeShows : ${e instanceof Error ? e.toString() : e}`)
			}
		}
	}

	public async initializeShows(cmd: VizMSECommandInitializeShows): Promise<void> {
		const rundown = await this._getRundown()
		this._initializedShows = new Set(cmd.showIds)
		const expectedPlayoutItems = await this._prepareAndGetExpectedPlayoutItems()
		if (this.purgeUnknownElements) {
			this.emit('debug', `Purging shows ${cmd.showIds} `)
			const elementsToKeep = Object.values(expectedPlayoutItems).filter(isVizMSEPlayoutItemContentInternalInstance)
			await rundown.purgeInternalElements(cmd.showIds, true, elementsToKeep)
		}
		this._triggerCommandSent()
		await this._initializeShows(cmd.showIds)
		this._triggerCommandSent()
	}

	public async cleanupShows(cmd: VizMSECommandCleanupShows): Promise<void> {
		this._triggerCommandSent()
		await this._cleanupShows(cmd.showIds)
		this._triggerCommandSent()
	}

	private async _cleanupShows(showIds: string[]) {
		const rundown = await this._getRundown()
		this.emit('debug', `Triggering show ${showIds} cleanup `)
		await rundown.purgeInternalElements(showIds, true)
		for (const showId of showIds) {
			try {
				await rundown.cleanupShow(showId)
			} catch (e) {
				this.emit('error', `Error in _cleanupShows : ${e instanceof Error ? e.toString() : e}`)
			}
		}
	}

	public async cleanupAllSofieShows(): Promise<void> {
		this._triggerCommandSent()
		const rundown = await this._getRundown()
		try {
			await rundown.cleanupAllSofieShows()
		} catch (error) {
			this.emit('error', `Error in cleanupAllSofieShows : ${error instanceof Error ? error.toString() : error}`)
		}
		this._triggerCommandSent()
	}

	public resolveShowNameToId(showName: string): string | undefined {
		const showNameWithExtension = path.extname(showName) === SHOW_EXTENSION ? showName : `${showName}${SHOW_EXTENSION}`
		return this._showToIdMap?.get(path.posix.join(this._showDirectoryPath, showNameWithExtension))
	}

	/** Convenience function to get the data for an element */
	static getTemplateData(layer: VizMSEStateLayer): string[] {
		if (layer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL) return layer.templateData
		return []
	}
	/** Convenience function to get the "instance-id" of an element. This is intended to be unique for each usage/instance of the elemenet */
	static getInternalElementInstanceName(layer: VizMSEStateLayerInternal | VIZMSEPlayoutItemContentInternal): string {
		return `sofieInt_${layer.templateName}_${getHash((layer.templateData ?? []).join(','))}`
	}

	getPlayoutItemContent(playoutItem: VIZMSEPlayoutItemContent): VizMSEPlayoutItemContentInstance | undefined {
		if (isVIZMSEPlayoutItemContentExternal(playoutItem)) {
			return playoutItem
		}
		const showId = this.resolveShowNameToId(playoutItem.showName)
		if (!showId) {
			this.emit(
				'warning',
				`getPlayoutItemContent: Unable to find Show Id for template "${playoutItem.templateName}" and Show Name "${playoutItem.showName}"`
			)
			return undefined
		}
		return {
			...playoutItem,
			instanceName: VizMSEManager.getInternalElementInstanceName(playoutItem),
			showId,
		}
	}
	static getPlayoutItemContentFromLayer(layer: VizMSEStateLayer): VizMSEPlayoutItemContentInstance {
		if (layer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL) {
			return {
				templateName: layer.templateName,
				templateData: this.getTemplateData(layer).map((data) => _.escape(data)),
				instanceName: this.getInternalElementInstanceName(layer),
				showId: layer.showId,
			}
		}
		if (layer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT) {
			return literal<VizMSEPlayoutItemContentExternalInstance>({
				vcpid: layer.templateVcpId,
				channel: layer.channelName,
			})
		}
		throw new Error(`Unknown layer.contentType "${layer['contentType']}"`)
	}

	private static _getElementHash(content: VizMSEPlayoutItemContentInstance): string {
		if (isVizMSEPlayoutItemContentInternalInstance(content)) {
			return `${content.showId}_${content.instanceName}`
		} else {
			return `pilot_${content.vcpid}_${content.channel}`
		}
	}

	private _getCachedElement(content: VizMSEPlayoutItemContentInstance): CachedVElement | undefined
	private _getCachedElement(hash: string): CachedVElement | undefined
	private _getCachedElement(hashOrContent: string | VizMSEPlayoutItemContentInstance): CachedVElement | undefined {
		if (typeof hashOrContent !== 'string') {
			hashOrContent = VizMSEManager._getElementHash(hashOrContent)
			return this._elementCache[hashOrContent]
		} else {
			return this._elementCache[hashOrContent]
		}
	}
	private _cacheElement(content: VizMSEPlayoutItemContentInstance, element: VElement) {
		const hash = VizMSEManager._getElementHash(content)
		if (!element) throw new Error('_cacheElement: element not set (with hash ' + hash + ')')
		if (this._elementCache[hash]) {
			this.emit('warning', `There is already an element with hash "${hash}" in cache`)
		}
		this._elementCache[hash] = {
			hash,
			element,
			content,
			isLoaded: this._isElementLoaded(element),
			isLoading: this._isElementLoading(element),
		}
	}
	private _clearCache() {
		_.each(_.keys(this._elementCache), (hash) => {
			delete this._elementCache[hash]
		})
	}
	private _getElementReference(el: InternalElement): string
	private _getElementReference(el: ExternalElement): number
	private _getElementReference(el: VElement): string | number
	private _getElementReference(el: VElement): string | number {
		if (this._isInternalElement(el)) return el.name
		if (this._isExternalElement(el)) return Number(el.vcpid) // TMP!!

		throw Error('Unknown element type, neither internal nor external')
	}
	private _isInternalElement(element: VElement): element is InternalElement {
		const el = element as any
		return el && el.name && !el.vcpid
	}
	private _isExternalElement(element: VElement): element is ExternalElement {
		const el = element as any
		return el && el.vcpid
	}
	/**
	 * Check if element is already created, otherwise create it and return it.
	 */
	private async _checkPrepareElement(content: VizMSEPlayoutItemContentInstance, fromPrepare?: boolean) {
		const cachedElement = this._getCachedElement(content)
		let vElement = cachedElement ? cachedElement.element : undefined
		if (cachedElement) {
			cachedElement.toDelete = false
		}
		if (!vElement) {
			const elementHash = VizMSEManager._getElementHash(content)
			if (!fromPrepare) {
				this.emit('warning', `Late preparation of element "${elementHash}"`)
			} else {
				this.emit('debug', `VizMSE: preparing new "${elementHash}"`)
			}
			vElement = await this._prepareNewElement(content)

			if (!fromPrepare) await this._wait(100) // wait a bit, because taking isn't possible right away anyway at this point
		}
	}
	/** Check that the element exists and if not, throw error */
	private async _checkElementExists(cmd: VizMSECommandElementBase): Promise<void> {
		const rundown = await this._getRundown()

		const cachedElement = this._getCachedElement(cmd.content)
		if (!cachedElement) throw new Error(`_checkElementExists: cachedElement falsy`)
		const elementRef = this._getElementReference(cachedElement.element)
		const elementIsExternal = cachedElement && this._isExternalElement(cachedElement.element)

		if (elementIsExternal) {
			const element = await rundown.getElement(cmd.content)
			if (this._isExternalElement(element) && element.exists === 'no') {
				throw new Error(`Can't take the element "${elementRef}" while it has the property exists="no"`)
			}
		}
	}
	/**
	 * Create a new element in MSE
	 */
	private async _prepareNewElement(content: VizMSEPlayoutItemContentInstance): Promise<VElement> {
		const rundown = await this._getRundown()

		try {
			if (isVizMSEPlayoutItemContentExternalInstance(content)) {
				// Prepare a pilot element
				const pilotEl = await rundown.createElement(content)

				this._cacheElement(content, pilotEl)
				return pilotEl
			} else {
				// Prepare an internal element
				const internalEl = await rundown.createElement(
					content,
					content.templateName,
					content.templateData || [],
					content.channel
				)

				this._cacheElement(content, internalEl)
				return internalEl
			}
		} catch (e) {
			if ((e as Error).toString().match(/already exist/i)) {
				// "An internal/external graphics element with name 'xxxxxxxxxxxxxxx' already exists."
				// If the object already exists, it's not an error, fetch and use the element instead
				const element = await rundown.getElement(content)

				this._cacheElement(content, element)
				return element
			} else {
				throw e
			}
		}
	}
	private async _deleteElement(content: VizMSEPlayoutItemContentInstance) {
		const rundown = await this._getRundown()
		this._triggerCommandSent()
		await rundown.deleteElement(content)
		this._triggerCommandSent()
	}
	private async _prepareAndGetExpectedPlayoutItems(): Promise<{ [hash: string]: VizMSEPlayoutItemContentInstance }> {
		this.emit('debug', `VISMSE: _prepareAndGetExpectedPlayoutItems (${this._expectedPlayoutItems.length})`)

		const hashesAndItems: { [hash: string]: VizMSEPlayoutItemContentInstance } = {}

		const expectedPlayoutItems = _.uniq(
			_.filter(this._expectedPlayoutItems, (expectedPlayoutItem) => {
				return (
					(!this._preloadedRundownPlaylistId ||
						!expectedPlayoutItem.playlistId ||
						this._preloadedRundownPlaylistId === expectedPlayoutItem.playlistId) &&
					(isVIZMSEPlayoutItemContentInternal(expectedPlayoutItem) ||
						isVIZMSEPlayoutItemContentExternal(expectedPlayoutItem))
				)
			}),
			false,
			(a) => JSON.stringify(_.pick(a, 'templateName', 'templateData', 'vcpid', 'showId'))
		)

		await Promise.all(
			_.map(expectedPlayoutItems, async (expectedPlayoutItem) => {
				const content = this.getPlayoutItemContent(expectedPlayoutItem)
				if (!content) {
					return
				}
				const hash = VizMSEManager._getElementHash(content)
				try {
					await this._checkPrepareElement(content, true)
					hashesAndItems[hash] = content
				} catch (e) {
					this.emit('error', `Error in _prepareAndGetExpectedPlayoutItems for "${hash}": ${(e as Error).toString()}`)
				}
			})
		)
		return hashesAndItems
	}

	/**
	 * Update the load-statuses of the expectedPlayoutItems -elements from MSE, where needed
	 */
	private async _updateElementsLoadedStatus(forceReloadAll?: boolean) {
		const hashesAndItems = await this._prepareAndGetExpectedPlayoutItems()
		let someUnloaded = false
		const elementsToLoad = _.compact(
			_.map(hashesAndItems, (item, hash) => {
				const el = this._getCachedElement(hash)
				if (!item.noAutoPreloading && el) {
					if (el.wasLoaded && !el.isLoaded && !el.isLoading) {
						someUnloaded = true
					}
					return el
				}
				return undefined
			})
		)
		if (this._rundown) {
			this.emit(
				'debug',
				`Updating status of elements starting, activePlaylistId="${
					this._preloadedRundownPlaylistId
				}", elementsToLoad.length=${elementsToLoad.length} (${_.keys(hashesAndItems).length})`
			)

			const rundown = await this._getRundown()

			if (forceReloadAll) {
				elementsToLoad.forEach((element) => {
					element.isLoaded = false
					element.isLoading = false
					element.requestedLoading = false
					element.wasLoaded = false
				})
			}
			if (someUnloaded) {
				await this._triggerRundownActivate(rundown)
			}

			await Promise.all(
				_.map(elementsToLoad, async (cachedEl) => {
					try {
						await this._checkPrepareElement(cachedEl.content)

						this.emit('debug', `Updating status of element ${cachedEl.hash}`)

						// Update cached status of the element:
						const newEl = await rundown.getElement(cachedEl.content)

						const newLoadedEl = {
							...cachedEl,
							isExpected: true,
							isLoaded: this._isElementLoaded(newEl),
							isLoading: this._isElementLoading(newEl),
						}
						this._elementCache[cachedEl.hash] = newLoadedEl
						this.emit('debug', `Element ${cachedEl.hash}: ${JSON.stringify(newEl)}`)
						if (isVizMSEPlayoutItemContentExternalInstance(cachedEl.content)) {
							if (this._updateAfterReconnect || cachedEl?.isLoaded !== newLoadedEl.isLoaded) {
								if (cachedEl?.isLoaded && !newLoadedEl.isLoaded) {
									newLoadedEl.wasLoaded = true
								} else if (!cachedEl?.isLoaded && newLoadedEl.isLoaded) {
									newLoadedEl.wasLoaded = false
								}
								const vcpid = cachedEl.content.vcpid
								if (newLoadedEl.isLoaded) {
									const mediaObject: MediaObject = {
										_id: cachedEl.hash,
										mediaId: 'PILOT_' + vcpid,
										mediaPath: vcpid.toString(),
										mediaSize: 0,
										mediaTime: 0,
										thumbSize: 0,
										thumbTime: 0,
										cinf: '',
										tinf: '',
										_rev: '',
									}
									this.emit('updateMediaObject', cachedEl.hash, mediaObject)
								} else {
									this.emit('updateMediaObject', cachedEl.hash, null)
								}
							}
							if (newLoadedEl.wasLoaded && !newLoadedEl.isLoaded && !newLoadedEl.isLoading) {
								this.emit(
									'debug',
									`Element "${this._getElementReference(newEl)}" went from loaded to not loaded, initializing`
								)
								await rundown.initialize(cachedEl.content)
							}
						}
					} catch (e) {
						this.emit('error', `Error in updateElementsLoadedStatus: ${(e as Error).toString()}`)
					}
				})
			)
			this._updateAfterReconnect = false
			this.emit('debug', `Updating status of elements done`)
		} else {
			throw Error('VizMSE.v-connection not initialized yet')
		}
	}
	private async _triggerRundownActivate(rundown: VRundown): Promise<void> {
		try {
			this.emit('debug', 'rundown.activate triggered')
			await rundown.activate()
		} catch (error) {
			this.emit('warning', `Ignored error for rundown.activate(): ${error}`)
		}
		this._triggerCommandSent()
		await this._wait(1000)
		this._triggerCommandSent()
	}
	/**
	 * Trigger a load of all elements that are not yet loaded onto the vizEngine.
	 */
	private async _triggerLoadAllElements(loadTwice = false): Promise<void> {
		if (this._loadingAllElements) {
			this.emit('warning', '_triggerLoadAllElements already running')
			return
		}
		this._loadingAllElements = true
		try {
			const rundown = await this._getRundown()

			this.emit('debug', '_triggerLoadAllElements starting')
			// First, update the loading-status of all elements:
			await this._updateElementsLoadedStatus(true)

			// if (this._initializeRundownOnLoadAll) {
			// Then, load all elements that needs loading:
			const loadAllElementsThatNeedsLoading = async () => {
				const showIdsToInitialize = new Set<string>()
				this._triggerCommandSent()
				await this._triggerRundownActivate(rundown)
				await Promise.all(
					_.map(this._elementCache, async (e) => {
						if (isVizMSEPlayoutItemContentInternalInstance(e.content)) {
							showIdsToInitialize.add(e.content.showId)
							e.requestedLoading = true
						} else if (isVizMSEPlayoutItemContentExternalInstance(e.content)) {
							if (e.isLoaded) {
								// The element is loaded fine, no need to do anything
								this.emit('debug', `Element "${VizMSEManager._getElementHash(e.content)}" is loaded`)
							} else if (e.isLoading) {
								// The element is currently loading, do nothing
								this.emit('debug', `Element "${VizMSEManager._getElementHash(e.content)}" is loading`)
							} else if (e.isExpected) {
								// The element has not started loading, load it:
								this.emit('debug', `Element "${VizMSEManager._getElementHash(e.content)}" is not loaded, initializing`)
								await rundown.initialize(e.content)
							}
						} else {
							this.emit('error', `Element "${VizMSEManager._getElementHash(e.content)}" type `)
						}
					})
				)
				await this._initializeShows(Array.from(showIdsToInitialize))
			}

			// He's making a list:
			await loadAllElementsThatNeedsLoading()
			await this._wait(2000)
			if (loadTwice) {
				// He's checking it twice:
				await this._updateElementsLoadedStatus()
				// Gonna find out what's loaded and nice:
				await loadAllElementsThatNeedsLoading()
			}

			this.emit('debug', '_triggerLoadAllElements done')
		} finally {
			this._loadingAllElements = false
		}
	}
	private _setMonitorLoadedElementsTimeout(): void {
		if (this._monitorAndLoadElementsTimeout) {
			clearTimeout(this._monitorAndLoadElementsTimeout)
		}
		if (!this._terminated) {
			this._monitorAndLoadElementsTimeout = setTimeout(() => {
				this._monitorLoadedElements()
					.catch((...args) => {
						this.emit('error', ...args)
					})
					.finally(() => {
						this._setMonitorLoadedElementsTimeout()
					})
			}, MONITOR_INTERVAL)
		}
	}
	private _setMonitorConnectionTimeout(): void {
		if (this._monitorMSEConnectionTimeout) {
			clearTimeout(this._monitorMSEConnectionTimeout)
		}
		if (!this._terminated) {
			this._monitorMSEConnectionTimeout = setTimeout(() => {
				this._monitorConnection()
					.catch((...args) => {
						this.emit('error', ...args)
					})
					.finally(() => {
						this._setMonitorConnectionTimeout()
					})
			}, MONITOR_INTERVAL)
		}
	}
	private async _monitorConnection(): Promise<void> {
		if (this.initialized) {
			// (the ping will throw on a timeout if ping doesn't return in time)
			return this._vizMSE
				.ping()
				.then(() => {
					// ok!
					if (!this._msePingConnected) {
						this._msePingConnected = true
						this._onConnectionChanged()
					}
				})
				.catch(() => {
					// not ok!
					if (this._msePingConnected) {
						this._msePingConnected = false
						this._onConnectionChanged()
					}
				})
				.then(async () => {
					return this._msePingConnected ? this._monitorEngines() : Promise.resolve()
				})
		}
		return Promise.reject()
	}
	private async _monitorEngines() {
		if (!this.engineRestPort) {
			return
		}
		const engines = await this._getEngines()
		const ps: Promise<EngineStatus>[] = []
		engines.forEach((engine) => {
			return ps.push(this._pingEngine(engine))
		})
		const statuses = await Promise.all(ps)
		const enginesDisconnected: string[] = []
		statuses.forEach((status) => {
			if (!status.alive) {
				enginesDisconnected.push(`${status.channel || status.name} (${status.host})`)
			}
		})
		if (!_.isEqual(enginesDisconnected, this.enginesDisconnected)) {
			this.enginesDisconnected = enginesDisconnected
			this._onConnectionChanged()
		}
	}
	private async _pingEngine(engine: Engine): Promise<EngineStatus> {
		return new Promise((resolve) => {
			const url = `http://${engine.host}:${this.engineRestPort}/#/status`
			request.get(url, { timeout: 2000 }, (error, response: request.Response | undefined) => {
				const alive = !error && response !== undefined && response?.statusCode < 400
				if (!alive) {
					this.emit('debug', `VizMSE: _pingEngine at "${url}", error ${error}, code ${response?.statusCode}`)
				}
				resolve({ ...engine, alive })
			})
		})
	}
	/** Monitor loading status of expected elements */
	private async _monitorLoadedElements(): Promise<void> {
		try {
			if (
				this._rundown &&
				this._hasActiveRundown &&
				this.preloadAllElements &&
				this._timeSinceLastCommandSent() > SAFE_PRELOAD_TIME
			) {
				await this._updateElementsLoadedStatus(false)

				let notLoaded = 0
				let loading = 0
				let loaded = 0

				_.each(this._elementCache, (e) => {
					if (e.isLoaded) loaded++
					else if (e.isLoading) loading++
					else notLoaded++
				})

				if (notLoaded > 0 || loading > 0) {
					// emit debug data
					this.emit('debug', `Items on queue: notLoaded: ${notLoaded} loading: ${loading}, loaded: ${loaded}`)

					this.emit(
						'debug',
						`_elementsLoaded: ${_.map(_.filter(this._elementCache, (e) => !e.isLoaded).slice(0, 10), (e) => {
							return JSON.stringify(e.element)
						})}`
					)
				}

				this._setLoadedStatus(notLoaded, loading)
			} else this._setLoadedStatus(0, 0)
		} catch (e) {
			this.emit('error', e)
		}
	}
	private async _wait(time: number): Promise<void> {
		if (this.ignoreAllWaits) return Promise.resolve()
		return new Promise((resolve) => setTimeout(resolve, time))
	}
	/** Execute fcn an retry a couple of times until it succeeds */
	private async _handleRetry<T>(fcn: () => Promise<T>): Promise<T> {
		let i = 0
		const maxNumberOfTries = 5

		// eslint-disable-next-line no-constant-condition
		while (true) {
			try {
				this._triggerCommandSent()
				const result = fcn()
				this._triggerCommandSent()
				return result
			} catch (e: any) {
				if (i++ < maxNumberOfTries) {
					if (e?.toString && e?.toString().match(/inexistent/i)) {
						// "PepTalk inexistent error"
						this.emit('debug', `VizMSE: _handleRetry got "inexistent" error, trying again...`)

						// Wait and try again:
						await this._wait(300)
					} else {
						// Unhandled error, give up:
						throw e
					}
				} else {
					// Give up, we've tried enough times already
					throw e
				}
			}
		}
	}
	private _triggerCommandSent(): void {
		this._lastTimeCommandSent = Date.now()
	}
	private _timeSinceLastCommandSent(): number {
		return Date.now() - this._lastTimeCommandSent
	}
	private _setLoadedStatus(notLoaded: number, loading: number) {
		if (notLoaded !== this.notLoadedCount || loading !== this.loadingCount) {
			this.notLoadedCount = notLoaded
			this.loadingCount = loading
			this._parentVizMSEDevice.connectionChanged()
		}
	}
	/**
	 * Returns true if the element is successfully loaded (as opposed to "not-loaded" or "loading")
	 */
	private _isElementLoaded(el: VElement): boolean {
		if (this._isInternalElement(el)) {
			return (
				(el.available === '1.00' || el.available === '1' || el.available === undefined) &&
				(el.loaded === '1.00' || el.loaded === '1') &&
				el.is_loading !== 'yes'
			)
		} else if (this._isExternalElement(el)) {
			return (
				(el.available === '1.00' || el.available === '1') &&
				(el.loaded === '1.00' || el.loaded === '1') &&
				el.is_loading !== 'yes'
			)
		} else {
			throw new Error(`vizMSE: _isLoaded: unknown element type: ${el && JSON.stringify(el)}`)
		}
	}
	/**
	 * Returns true if the element has NOT started loading (is currently not loading, or finished loaded)
	 */
	private _isElementLoading(el: VElement) {
		if (this._isInternalElement(el)) {
			return el.loaded !== '1.00' && el.loaded !== '1' && el.is_loading === 'yes'
		} else if (this._isExternalElement(el)) {
			return el.loaded !== '1.00' && el.loaded !== '1' && el.is_loading === 'yes'
		} else {
			throw new Error(`vizMSE: _isLoaded: unknown element type: ${el && JSON.stringify(el)}`)
		}
	}
	/**
	 * Return the current MSE rundown, create it if it doesn't exists
	 */
	private async _getRundown(): Promise<VRundown> {
		if (!this._rundown) {
			// Only allow for one rundown fetch at the same time:
			if (this._getRundownPromise) {
				return this._getRundownPromise
			}

			const getRundownPromise = (async () => {
				// Check if the rundown already exists:
				// let rundown: VRundown | undefined = _.find(await this._vizMSE.getRundowns(), (rundown) => {
				// 	return (
				// 		rundown.show === this._showID &&
				// 		rundown.profile === this._profile &&
				// 		rundown.playlist === this._playlistID
				// 	)
				// })
				this.emit('debug', `Creating new rundown ${[this._profile, this._playlistID]}`)

				const rundown = await this._vizMSE.createRundown(this._profile, this._playlistID)

				this._rundown = rundown
				if (!this._rundown) throw new Error(`_getRundown: this._rundown is not set!`)
				return this._rundown
			})()

			this._getRundownPromise = getRundownPromise

			try {
				const rundown = await this._getRundownPromise
				this._rundown = rundown
				return rundown
			} catch (e) {
				this._getRundownPromise = undefined
				throw e
			}
		} else {
			return this._rundown
		}
	}
	private _mseConnectionChanged(connected: boolean) {
		if (connected !== this._mseConnected) {
			if (connected) {
				// not the first connection
				if (this._mseConnected === false) {
					this._updateAfterReconnect = true
				}
			}
			this._mseConnected = connected
			this._onConnectionChanged()
		}
	}
	private _onConnectionChanged() {
		this.emit('connectionChanged', this._mseConnected && this._msePingConnected)
	}

	public clearAllWaitWithLayer(portId: string) {
		if (!this._waitWithLayers[portId]) {
			_.each(this._waitWithLayers[portId], (fcn) => {
				fcn(true)
			})
		}
	}
	/**
	 * Returns true if the wait was cleared from someone else
	 */
	private async _waitWithLayer(layerId: string, delay: number): Promise<boolean> {
		return new Promise((resolve) => {
			if (!this._waitWithLayers[layerId]) this._waitWithLayers[layerId] = []
			this._waitWithLayers[layerId].push(resolve)
			setTimeout(() => {
				resolve(false)
			}, delay || 0)
		})
	}
}
