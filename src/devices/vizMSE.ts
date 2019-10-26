import * as _ from 'underscore'
import { EventEmitter } from 'events'
import {
	DeviceWithState,
	CommandWithContext,
	DeviceStatus,
	StatusCode
} from './device'

import {
	DeviceType,
	DeviceOptions,
	Mapping,
	VizMSEOptions,
	ResolvedTimelineObjectInstanceExtended,
	TimelineObjVIZMSEElementInternal,
	TimelineContentTypeVizMSE,
	TimelineObjVIZMSEElementPilot,
	ExpectedPlayoutItemContent,
	ExpectedPlayoutItemContentVizMSE
} from '../types/src'

import {
	TimelineState, ResolvedTimelineObjectInstance
} from 'superfly-timeline'

import { createMSE, MSE, VRundown, InternalElement, ExternalElement } from 'v-connection'

import { DoOnTime, SendMode } from '../doOnTime'

/** The ideal time to prepare elements before going on air */
const IDEAL_PREPARE_TIME = 1000
/** Minimum time to wait after preparing elements */
const PREPARE_TIME_WAIT = 50

// const DEFAULT_FPS = 25 // frames per second
// const JUMP_ERROR_MARGIN = 10 // frames

export interface VizMSEDeviceOptions extends DeviceOptions {
	options?: {
		commandReceiver?: CommandReceiver
	}
}
export type CommandReceiver = (time: number, cmd: VizMSECommand, context: string, timelineObjId: string) => Promise<any>
/**
 * This class is used to interface with a vizRT Media Sequence Editor, through the v-connection library
 */
export class VizMSEDevice extends DeviceWithState<VizMSEState> {

	private _vizMSE?: MSE
	private _vizmseManager?: VizMSEManager

	private _commandReceiver: CommandReceiver

	private _doOnTime: DoOnTime
	private _connectionOptions?: VizMSEOptions
	private _vizMSEConnected: boolean = false
	// private _initialized: boolean = false

	constructor (deviceId: string, deviceOptions: VizMSEDeviceOptions, options) {
		super(deviceId, deviceOptions, options)

		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}

		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		}, SendMode.IN_ORDER, this._deviceOptions)
		this.handleDoOnTime(this._doOnTime, 'VizMSE')
	}

	async init (connectionOptions: VizMSEOptions): Promise<boolean> {
		this._connectionOptions = connectionOptions
		if (!this._connectionOptions.host) 	throw new Error('VizMSE bad connection option: host')

		this._vizMSE = createMSE(
			this._connectionOptions.host,
			this._connectionOptions.restPort,
			this._connectionOptions.wsPort
		)

		this._vizmseManager = new VizMSEManager(
			this._vizMSE,
			this._connectionOptions.preloadAllElements
		)

		this._vizmseManager.on('connectionChanged', (connected) => this._connectionChanged(connected))

		await this._vizmseManager.initializeRundown(
			connectionOptions.showID,
			connectionOptions.profile
		)

		// this._vizmse.on('error', e => this.emit('error', 'VizMSE.v-connection', e))
		this._vizmseManager.on('info', str => this.emit('info', 'VizMSE: ' + str))
		this._vizmseManager.on('warning', str => this.emit('warning', 'VizMSE' + str))
		this._vizmseManager.on('error', e => this.emit('error', 'VizMSE', e))
		this._vizmseManager.on('debug', (...args) => this.emit('debug', ...args))

		// this._initialized = true

		return true
	}

	/**
	 * Terminates the device safely such that things can be garbage collected.
	 */
	async terminate (): Promise<boolean> {
		if (this._vizmseManager) {
			await this._vizmseManager.terminate()
			delete this._vizmseManager
		}
		this._doOnTime.dispose()

		return true
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState (newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	/**
	 * Generates an array of VizMSE commands by comparing the newState against the oldState, or the current device state.
	 */
	handleState (newState: TimelineState) {
		// check if initialized:
		if (!this._vizmseManager || !this._vizmseManager.initialized) {
			this.emit('warning', 'VizMSE.v-connection not initialized yet')
			return
		}

		let previousStateTime = Math.max(this.getCurrentTime(), newState.time)

		let oldVizMSEState: VizMSEState = (
			this.getStateBefore(previousStateTime) ||
			{ state: { time: 0, layer: {} } }
		).state

		let newVizMSEState = this.convertStateToVizMSE(newState)

		let commandsToAchieveState = this._diffStates(oldVizMSEState, newVizMSEState, newState.time)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)

		// add the new commands to the queue
		this._addToQueue(commandsToAchieveState)

		// store the new state, for later use:
		this.setState(newVizMSEState, newState.time)
	}

	/**
	 * Clear any scheduled commands after this time
	 * @param clearAfterTime
	 */
	clearFuture (clearAfterTime: number) {
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	get canConnect (): boolean {
		return true
	}
	get connected (): boolean {
		return this._vizMSEConnected
	}

	get deviceType () {
		return DeviceType.VIZMSE
	}
	get deviceName (): string {
		return `VizMSE ${this._vizMSE ? this._vizMSE.hostname : 'Uninitialized'}`
	}

	get queue () {
		return this._doOnTime.getQueue()
	}

	public handleExpectedPlayoutItems (expectedPlayoutItems: Array<ExpectedPlayoutItemContent>): void {
		if (this._vizmseManager) {
			this._vizmseManager.setExpectedPlayoutItems(expectedPlayoutItems)
		}
	}

	/**
	 * Takes a timeline state and returns a VizMSE State that will work with the state lib.
	 * @param timelineState The timeline state to generate from.
	 */
	convertStateToVizMSE (timelineState: TimelineState): VizMSEState {

		const state: VizMSEState = {
			time: timelineState.time,
			layer: {}
		}

		const mappings = this.getMapping()

		_.each(timelineState.layers, (layer: ResolvedTimelineObjectInstance, layerName: string) => {

			const layerExt = layer as ResolvedTimelineObjectInstanceExtended
			let foundMapping: Mapping = mappings[layerName]

			let isLookahead = false
			if (!foundMapping && layerExt.isLookahead && layerExt.lookaheadForLayer) {
				foundMapping = mappings[layerExt.lookaheadForLayer]
				isLookahead = true
			}
			if (
				foundMapping &&
				foundMapping.device === DeviceType.VIZMSE
			) {
				if (layer.content) {

					if (layer.content.type === TimelineContentTypeVizMSE.ELEMENT_INTERNAL) {
						const l = layer as any as TimelineObjVIZMSEElementInternal

						state.layer[layerName] = {
							timelineObjId: l.id,
							contentType: TimelineContentTypeVizMSE.ELEMENT_INTERNAL,
							continueStep: l.content.continueStep,

							templateName: l.content.templateName,
							templateData: l.content.templateData
						}
					} else if (layer.content.type === TimelineContentTypeVizMSE.ELEMENT_PILOT) {
						const l = layer as any as TimelineObjVIZMSEElementPilot
						state.layer[layerName] = {
							timelineObjId: l.id,
							contentType: TimelineContentTypeVizMSE.ELEMENT_PILOT,
							continueStep: l.content.continueStep,

							templateVcpId: l.content.templateVcpId

						}
					}

					if (isLookahead) state.layer[layerName].lookahead = true
				}
			}
		})

		return state

	}

	/**
	 * Prepares the physical device for playout.
	 * @param okToDestroyStuff Whether it is OK to do things that affects playout visibly
	 */
	async makeReady (okToDestroyStuff?: boolean): Promise<void> {
		if (this._vizmseManager) {
			await this._vizmseManager.activate()
		}

		if (okToDestroyStuff) {
			// reset our own state(s):
			this.clearStates()
		}
	}
	/**
	 * The standDown event could be triggered at a time after broadcast
	 * @param okToDestroyStuff If true, the device may do things that might affect the visible output
	 */
	async standDown (okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			if (this._vizmseManager) {
				await this._vizmseManager.deactivate()
			}
		}
	}
	getStatus (): DeviceStatus {
		let statusCode = StatusCode.GOOD
		let messages: Array<string> = []

		if (!this._vizMSEConnected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		}
		// if (this._vizMSE.statusMessage) {
		// 	statusCode = StatusCode.BAD
		// 	messages.push(this._vizMSE.statusMessage)
		// }

		// if (!this._vizMSE.initialized) {
		// 	statusCode = StatusCode.BAD
		// 	messages.push(`VizMSE device connection not initialized (restart required)`)
		// }

		return {
			statusCode: statusCode,
			messages: messages
		}
	}

	private _diffStates (oldState: VizMSEState, newState: VizMSEState, time: number): Array<VizMSECommand> {
		const highPrioCommands: VizMSECommand[] = []
		const lowPrioCommands: VizMSECommand[] = []

		const addCommand = (command: VizMSECommand, lowPriority?: boolean) => {
			(lowPriority ? lowPrioCommands : highPrioCommands).push(command)
		}

		/** The time of when to run "preparation" commands */
		let prepareTime = Math.min(
			time,
			Math.max(
				time - IDEAL_PREPARE_TIME,
				oldState.time + PREPARE_TIME_WAIT // earliset possible prepareTime
			)
		)
		if (prepareTime < this.getCurrentTime()) { // Only to not emit an unnessesary slowCommand event
			prepareTime = this.getCurrentTime()
		}
		if (time < prepareTime) {
			prepareTime = time - 10
		}

		_.each(newState.layer, (newLayer: VizMSEStateLayer, layerId: string) => {
			const oldLayer: VizMSEStateLayer | undefined = oldState.layer[layerId]

			// if (
			// 	!oldLayer ||
			// 	!_.isEqual(newLayer.channels, oldLayer.channels)
			// ) {
			// 	const channel = newLayer.channels[0] as number | undefined
			// 	if (channel !== undefined) { // todo: support for multiple channels
			// 		addCommand({
			// 			type: VizMSECommandType.SETUPPORT,
			// 			time: prepareTime,
			// 			portId: portId,
			// 			timelineObjId: newLayer.timelineObjId,
			// 			channel: channel
			// 		}, newLayer.lookahead)
			// 	}
			// }

			if (
				!oldLayer ||
				!_.isEqual(
					_.omit(newLayer, ['continueStep']),
					_.omit(oldLayer, ['continueStep'])
				)
			) {
				if (
					newLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL ||
					newLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT
				) {
					// Maybe prepare the element first:
					addCommand({
						type: VizMSECommandType.PREPARE_ELEMENT,
						time: prepareTime,
						timelineObjId: newLayer.timelineObjId,
						fromLookahead: newLayer.lookahead,

						elementName: this._getElementName(newLayer),
						templateName: this._getTemplateName(newLayer),
						dataFields: this._getTemplateData(newLayer)
					}, newLayer.lookahead)

					// Start playing
					addCommand({
						type: VizMSECommandType.TAKE_ELEMENT,
						time: time,
						timelineObjId: newLayer.timelineObjId,
						fromLookahead: newLayer.lookahead,

						elementName: this._getElementName(newLayer),
						templateName: this._getTemplateName(newLayer),
						dataFields: this._getTemplateData(newLayer)

					}, newLayer.lookahead)
				}
			} else if (
				(newLayer.continueStep || 0) > (oldLayer.continueStep || 0)
			) {
				// A change in continueStep should result in triggering a continue:
				addCommand({
					type: VizMSECommandType.CONTINUE_ELEMENT,
					time: prepareTime,
					timelineObjId: newLayer.timelineObjId,
					fromLookahead: newLayer.lookahead,

					elementName: this._getElementName(newLayer)

				}, newLayer.lookahead)
			}
		})

		_.each(oldState.layer, (oldLayer: VizMSEStateLayer, layerId: string) => {
			const newLayer = newState.layer[layerId]
			if (!newLayer) {
				// Stopped playing
				addCommand({
					type: VizMSECommandType.TAKEOUT_ELEMENT,
					time: prepareTime,
					timelineObjId: oldLayer.timelineObjId,
					fromLookahead: oldLayer.lookahead,

					elementName: this._getElementName(oldLayer)

				}, oldLayer.lookahead)
			}
		})

		return highPrioCommands.concat(lowPrioCommands)
	}
	private _doCommand (command: VizMSECommand, context: string, timlineObjId: string): Promise<void> {
		let time = this.getCurrentTime()
		return this._commandReceiver(time, command, context, timlineObjId)
	}
	/**
	 * Use either AMCP Command Scheduling or the doOnTime to execute commands at
	 * {@code time}.
	 * @param commandsToAchieveState Commands to be added to queue
	 * @param time Point in time to send commands at
	 */
	private _addToQueue (commandsToAchieveState: Array<VizMSECommand>) {
		_.each(commandsToAchieveState, (cmd: VizMSECommand) => {
			this._doOnTime.queue(cmd.time, cmd.layerId, (c: {cmd: VizMSECommand}) => {
				return this._doCommand(c.cmd, c.cmd.type + '_' + c.cmd.timelineObjId, c.cmd.timelineObjId)
			}, { cmd: cmd })
		})

	}
	/**
	 * Sends commands to the VizMSE ISA server
	 * @param time deprecated
	 * @param cmd Command to execute
	 */
	private async _defaultCommandReceiver (_time: number, cmd: VizMSECommand, context: string, timelineObjId: string): Promise<any> {

		let cwc: CommandWithContext = {
			context: context,
			timelineObjId: timelineObjId,
			command: cmd
		}
		this.emit('debug', cwc)

		try {
			if (this._vizmseManager) {

				if (cmd.type === VizMSECommandType.PREPARE_ELEMENT) {
					await this._vizmseManager.prepareElement(cmd)
				} else if (cmd.type === VizMSECommandType.CUE_ELEMENT) {
					await this._vizmseManager.cueElement(cmd)
				} else if (cmd.type === VizMSECommandType.TAKE_ELEMENT) {
					await this._vizmseManager.takeElement(cmd)
				} else if (cmd.type === VizMSECommandType.TAKEOUT_ELEMENT) {
					await this._vizmseManager.takeoutElement(cmd)
				} else if (cmd.type === VizMSECommandType.CONTINUE_ELEMENT) {
					await this._vizmseManager.continueElement(cmd)
				} else {
					// @ts-ignore never
					throw new Error(`Unsupported command type "${cmd.type}"`)
				}
			} else {
				throw new Error(`Not initialized yet`)
			}
		} catch (error) {
			let errorString = (
				error && error.message ?
				error.message :
				error.toString()
			)
			this.emit('commandError', new Error(errorString), cwc)
		}
	}
	private _connectionChanged (connected?: boolean) {
		if (connected === true || connected === false) this._vizMSEConnected = connected
		this.emit('connectionChanged', this.getStatus())
	}
	private _getTemplateName (layer: VizMSEStateLayer): string {
		if (layer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL) return layer.templateName
		// if (layer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT) return layer.templateVcpId
		throw new Error(`Unknown layer.contentType "${layer['contentType']}"`)
	}
	private _getTemplateData (layer: VizMSEStateLayer): string[] {
		if (layer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL) return layer.templateData
		return []
	}
	private _getElementName (layer: VizMSEStateLayer): string | number {
		if (layer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL) {
			return 'sofieInt_' + layer.templateName + layer.templateData.join(',')
		}
		if (layer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT) return layer.templateVcpId

		throw new Error(`Unknown layer.contentType "${layer['contentType']}"`)
	}
}
class VizMSEManager extends EventEmitter {
	public initialized: boolean = false
	// private _vizmseState: VizMSETrackedState = {
	// 	elements: {}
	// }
	private _rundown: VRundown | undefined

	private _elementCache: {[hash: string]: (InternalElement | ExternalElement) } = {}
	private _expectedPlayoutItems: Array<ExpectedPlayoutItemContent> = []

	constructor (
		private _vizMSE: MSE,
		public preloadAllElements: boolean
	) {
		super()
		// this._vizmse.on('error', (...args) => this.emit('error', ...args))
		// this._vizmse.on('debug', (...args) => this.emit('debug', ...args))
	}

	public async initializeRundown (
		showID: string,
		profile: string
	): Promise<void> {
		this._vizMSE.on('connected', () => this.emit('connectionChanged', true))
		this._vizMSE.on('disconnected', () => this.emit('connectionChanged', false))

		await this._vizMSE.ping()
		this.emit('connectionChanged', true)

		// Setup the rundown used by this device

		// check if it already exists:
		this._rundown = _.find(this._vizMSE.getRundowns(), (rundown) => {
			return (
				rundown.show === showID &&
				rundown.profile === profile
			)
		})
		if (!this._rundown) {
			this._rundown = await this._vizMSE.createRundown(
				showID,
				profile
			)
		}

		if (!this._rundown) throw new Error(`VizMSEManager: unable to create rundown!`)

		// const profile = await this._vizMSE.getProfile('sofie') // TODO: Figure out if this is needed

		this._updateExpectedPlayoutItems().catch(e => this.emit('error', e))

		this.initialized = true
	}
	public async terminate () {
		if (this._vizMSE) {
			await this._vizMSE.close()
			delete this._vizMSE
		}
	}
	public setExpectedPlayoutItems (expectedPlayoutItems: Array<ExpectedPlayoutItemContent>) {
		if (this.preloadAllElements) {
			this._expectedPlayoutItems = expectedPlayoutItems
		}
		this._updateExpectedPlayoutItems().catch(e => this.emit('error', e))
	}
	public async activate (): Promise<void> {
		if (!this._rundown) throw new Error(`Viz Rundown not initialized!`)
		await this._rundown.activate()
	}
	public async deactivate (): Promise<void> {
		if (!this._rundown) throw new Error(`Viz Rundown not initialized!`)
		await this._rundown.deactivate()
		this._clearCache()
	}
	public async prepareElement (cmd: VizMSECommandPrepare): Promise<void> {
		if (!this._rundown) throw new Error(`Viz Rundown not initialized!`)

		const elementHash = this.getElementHash(cmd)
		this.emit('debug', `VizMSE: prepare "${elementHash}"`)
		await this._checkPrepareElement(cmd, true)
	}
	public async cueElement (cmd: VizMSECommandCue): Promise<void> {
		if (!this._rundown) throw new Error(`Viz Rundown not initialized!`)

		const elementRef = await this._checkPrepareElement(cmd)

		this.emit('debug', `VizMSE: cue "${elementRef}"`)
		await this._rundown.cue(elementRef)
	}
	public async takeElement (cmd: VizMSECommandTake): Promise<void> {
		if (!this._rundown) throw new Error(`Viz Rundown not initialized!`)

		const elementRef = await this._checkPrepareElement(cmd)

		this.emit('debug', `VizMSE: take "${elementRef}"`)
		await this._rundown.take(elementRef)
	}
	public async takeoutElement (cmd: VizMSECommandTakeOut): Promise<void> {
		if (!this._rundown) throw new Error(`Viz Rundown not initialized!`)

		this.emit('debug', `VizMSE: out "${cmd.elementName}"`)
		await this._rundown.out(cmd.elementName)
	}
	public async continueElement (cmd: VizMSECommandContinue): Promise<void> {
		if (!this._rundown) throw new Error(`Viz Rundown not initialized!`)

		this.emit('debug', `VizMSE: continue "${cmd.elementName}"`)
		await this._rundown.continue(cmd.elementName)
	}

	private getElementHash (cmd: ExpectedPlayoutItemContentVizMSE): string {
		if (_.isNumber(cmd.elementName)) {
			return 'pilot_' + cmd.elementName
		} else {
			return (
				'el_' +
				cmd.elementName + '_' +
				cmd.templateName + '_' +
				cmd.dataFields // TODO: make unique on this as well??
			)
		}
	}
	private _getCachedElement (hash: string): InternalElement | ExternalElement | undefined {
		return this._elementCache[hash]
	}
	private _cacheElement (hash: string, element: InternalElement | ExternalElement) {
		if (this._elementCache[hash]) {
			this.emit('error', `There is already an element with hash "${hash}" in cache`)
		}
		this._elementCache[hash] = element
	}
	private _clearCache () {
		_.each(_.keys(this._elementCache), hash => {
			delete this._elementCache[hash]
		})
	}
	private _getElementReference (el: InternalElement | ExternalElement): string | number {
		if (this._isInternalElement(el)) return el.name
		if (this._isExternalElement(el)) return el.vcpid
		throw Error('Unknown element type, neither internal nor external')
	}
	private _isInternalElement (el: any): el is InternalElement {
		return (el && el.name && !el.vcpid)
	}
	private _isExternalElement (el: any): el is ExternalElement {
		return (el && !el.name && el.vcpid)
	}
	private async _checkPrepareElement (cmd: ExpectedPlayoutItemContentVizMSE, fromPrepare?: boolean): Promise<string | number> {
		// check if element is prepared
		const elementHash = this.getElementHash(cmd)
		let element = this._getCachedElement(elementHash)

		if (!element) {
			if (!fromPrepare) {
				this.emit('warning', `Late preparation of element "${elementHash}"`)
			} else {
				this.emit('debug', `VizMSE: preparing new "${elementHash}"`)
			}
			element = await this._prepareNewElement(cmd)
		}

		return this._getElementReference(element)
	}
	private async _prepareNewElement (cmd: ExpectedPlayoutItemContentVizMSE): Promise<InternalElement | ExternalElement> {
		if (!this._rundown) throw new Error(`Viz Rundown not initialized!`)

		const elementHash = this.getElementHash(cmd)

		if (_.isNumber(cmd.elementName)) {
			// Prepare a pilot element
			const pilotEl = await this._rundown.createElement(cmd.elementName)

			this._cacheElement(elementHash, pilotEl)
			return pilotEl
		} else {
			// Prepare an internal element
			const internalEl = await this._rundown.createElement(
				cmd.templateName,
				cmd.elementName,
				cmd.dataFields
			)

			this._cacheElement(elementHash, internalEl)
			return internalEl
		}
	}
	private async _updateExpectedPlayoutItems (): Promise<void> {
		if (this.preloadAllElements) {
			this.emit('debug', `VISMSE: _updateExpectedPlayoutItems (${this._expectedPlayoutItems.length})`)

			await Promise.all(
				_.map(this._expectedPlayoutItems, async expectedPlayoutItem => {
					await this._checkPrepareElement(expectedPlayoutItem, true)
				})
			)
		}
	}
}

interface VizMSEState {
	time: number
	layer: {
		[layerId: string]: VizMSEStateLayer
	}
}
type VizMSEStateLayer = VizMSEStateLayerInternal | VizMSEStateLayerPilot
interface VizMSEStateLayerBase {
	timelineObjId: string

	contentType: TimelineContentTypeVizMSE
	continueStep?: number

	lookahead?: boolean
}
interface VizMSEStateLayerInternal extends VizMSEStateLayerBase {
	contentType: TimelineContentTypeVizMSE.ELEMENT_INTERNAL

	templateName: string
	templateData: Array<string>
}
interface VizMSEStateLayerPilot extends VizMSEStateLayerBase {
	contentType: TimelineContentTypeVizMSE.ELEMENT_PILOT

	templateVcpId: number
}

interface VizMSECommandBase {
	time: number
	type: VizMSECommandType
	timelineObjId: string
	fromLookahead?: boolean
	layerId?: string
}
export enum VizMSECommandType {
	// ACTIVATE = 'activate', // something to be done before starting to use the viz engine
	// DEACTIVATE = 'deactivate', // something to be done when done with a viz engine

	PREPARE_ELEMENT = 'prepare',
	CUE_ELEMENT = 'cue',
	TAKE_ELEMENT = 'take',
	TAKEOUT_ELEMENT = 'out',
	CONTINUE_ELEMENT = 'continue'
}
// interface VizMSECommandActivate extends VizMSECommandBase {
// 	type: VizMSECommandType.ACTIVATE
// }
// interface VizMSECommandDeactivate extends VizMSECommandBase {
// 	type: VizMSECommandType.DEACTIVATE
// }
interface VizMSECommandElementBase extends VizMSECommandBase, ExpectedPlayoutItemContentVizMSE {
}
interface VizMSECommandPrepare extends VizMSECommandElementBase {
	type: VizMSECommandType.PREPARE_ELEMENT
}
interface VizMSECommandCue extends VizMSECommandElementBase {
	type: VizMSECommandType.CUE_ELEMENT
}
interface VizMSECommandTake extends VizMSECommandElementBase {
	type: VizMSECommandType.TAKE_ELEMENT
}
interface VizMSECommandTakeOut extends VizMSECommandBase {
	type: VizMSECommandType.TAKEOUT_ELEMENT

	elementName: string | number
}
interface VizMSECommandContinue extends VizMSECommandBase {
	type: VizMSECommandType.CONTINUE_ELEMENT

	elementName: string | number
}

type VizMSECommand = VizMSECommandPrepare |
	VizMSECommandCue |
	VizMSECommandTake |
	VizMSECommandTakeOut |
	VizMSECommandContinue

/** Tracked state of the vizMSE */
// interface VizMSETrackedState {
// 	elements: {
// 		[elementName: string]: VizMSEElement
// 	}
// }
// interface VizMSEElement {
// 	// todo
// }
