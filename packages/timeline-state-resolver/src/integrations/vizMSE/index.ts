import * as _ from 'underscore'
import { CommandWithContext, DeviceStatus, DeviceWithState, StatusCode } from './../../devices/device'

import {
	ActionExecutionResult,
	ActionExecutionResultCode,
	DeviceOptionsVizMSE,
	DeviceType,
	Mapping,
	Mappings,
	MediaObject,
	ResolvedTimelineObjectInstanceExtended,
	Timeline,
	TimelineContentTypeVizMSE,
	TimelineContentVIZMSEAny,
	TSRTimelineContent,
	VizMSEOptions,
	VIZMSETransitionType,
	VizMSEActionMethods,
	SomeMappingVizMSE,
	TimelineContentVIZMSEElementPilot,
	TimelineContentVIZMSEElementInternal,
	VizResetPayload,
	VizMSEDeviceTypes,
	VizMSEActions,
} from 'timeline-state-resolver-types'

import { createMSE, MSE } from '@tv2media/v-connection'

import { DoOnTime, SendMode } from '../../devices/doOnTime'

import { ExpectedPlayoutItem } from '../../expectedPlayoutItems'
import { endTrace, startTrace, t, literal } from '../../lib'
import { HTTPClientError, HTTPServerError } from '@tv2media/v-connection/dist/msehttp'
import { VizMSEManager } from './vizMSEManager'
import {
	VizMSECommand,
	VizMSEState,
	VizMSEStateLayerLoadAllElements,
	VizMSEStateLayerContinue,
	VizMSEStateLayerInitializeShows,
	VizMSEStateLayerCleanupShows,
	VizMSEStateLayerConcept,
	VizMSEStateLayer,
	VizMSEStateLayerInternal,
	VizMSEStateLayerPilot,
	VizMSECommandType,
	VizMSECommandLoadAllElements,
	VizMSECommandElementBase,
	VizMSECommandContinue,
	VizMSECommandContinueReverse,
	VizMSECommandInitializeShows,
	VizMSECommandCleanupShows,
	VizMSECommandSetConcept,
	VizMSECommandPrepare,
	VizMSECommandCue,
	VizMSECommandTake,
	VizMSECommandTakeOut,
	VizMSECommandClearAllElements,
	VizMSECommandClearAllEngines,
} from './types'

/** The ideal time to prepare elements before going on air */
const IDEAL_PREPARE_TIME = 1000
/** Minimum time to wait after preparing elements */
const PREPARE_TIME_WAIT = 50

export interface DeviceOptionsVizMSEInternal extends DeviceOptionsVizMSE {
	commandReceiver?: CommandReceiver
}
export type CommandReceiver = (time: number, cmd: VizMSECommand, context: string, timelineObjId: string) => Promise<any>

/**
 * This class is used to interface with a vizRT Media Sequence Editor, through the v-connection library.
 * It features playing both "internal" graphics element and vizPilot elements.
 */
export class VizMSEDevice extends DeviceWithState<VizMSEState, VizMSEDeviceTypes, DeviceOptionsVizMSEInternal> {
	private _vizMSE?: MSE
	private _vizmseManager?: VizMSEManager

	private _commandReceiver: CommandReceiver = this._defaultCommandReceiver.bind(this)

	private _doOnTime: DoOnTime
	private _doOnTimeBurst: DoOnTime
	private _initOptions?: VizMSEOptions
	private _vizMSEConnected = false

	constructor(deviceId: string, deviceOptions: DeviceOptionsVizMSEInternal, getCurrentTime: () => Promise<number>) {
		super(deviceId, deviceOptions, getCurrentTime)

		if (deviceOptions.options) {
			if (deviceOptions.commandReceiver) this._commandReceiver = deviceOptions.commandReceiver
		}

		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.IN_ORDER,
			this._deviceOptions
		)
		this.handleDoOnTime(this._doOnTime, 'VizMSE')

		this._doOnTimeBurst = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.BURST,
			this._deviceOptions
		)
		this.handleDoOnTime(this._doOnTimeBurst, 'VizMSE.burst')
	}

	async init(initOptions: VizMSEOptions, activeRundownPlaylistId?: string): Promise<boolean> {
		this._initOptions = initOptions
		if (!this._initOptions.host) throw new Error('VizMSE bad option: host')
		if (!this._initOptions.profile) throw new Error('VizMSE bad option: profile')

		this._vizMSE = createMSE(this._initOptions.host, this._initOptions.restPort, this._initOptions.wsPort)

		this._vizmseManager = new VizMSEManager(
			this,
			this._vizMSE,
			this._initOptions.preloadAllElements ?? false,
			this._initOptions.onlyPreloadActivePlaylist ?? false,
			this._initOptions.purgeUnknownElements ?? false,
			this._initOptions.autoLoadInternalElements ?? false,
			this._initOptions.engineRestPort,
			this._initOptions.showDirectoryPath ?? '',
			initOptions.profile,
			initOptions.playlistID
		)

		this._vizmseManager.on('connectionChanged', (connected) => this.connectionChanged(connected))
		this._vizmseManager.on('updateMediaObject', (docId: string, doc: MediaObject | null) =>
			this.emit('updateMediaObject', this.deviceId, docId, doc)
		)
		this._vizmseManager.on('clearMediaObjects', () => this.emit('clearMediaObjects', this.deviceId))

		this._vizmseManager.on('info', (str) => this.emit('info', 'VizMSE: ' + str))
		this._vizmseManager.on('warning', (str) => this.emit('warning', 'VizMSE: ' + str))
		this._vizmseManager.on('error', (e) => this.emit('error', 'VizMSE', typeof e === 'string' ? new Error(e) : e))
		this._vizmseManager.on('debug', (...args) => this.emitDebug(...args))

		this._vizmseManager
			.initializeRundown(activeRundownPlaylistId)
			.then(() => {
				// reset any states we had to re-enforce them
				this.clearStates()
				this.emit('resyncStates')
			})
			.catch((e) => this.emit('error', 'Failed to initialise Viz Rundown', e))

		return true
	}

	/**
	 * Terminates the device safely such that things can be garbage collected.
	 */
	async terminate(): Promise<void> {
		if (this._vizmseManager) {
			await this._vizmseManager.terminate()
			this._vizmseManager.removeAllListeners()
			delete this._vizmseManager
		}
		this._doOnTime.dispose()
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	/**
	 * Generates an array of VizMSE commands by comparing the newState against the oldState, or the current device state.
	 */
	handleState(newState: Timeline.TimelineState<TSRTimelineContent>, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		// check if initialized:
		if (!this._vizmseManager || !this._vizmseManager.initialized) {
			this.emit('warning', 'VizMSE.v-connection not initialized yet')
			return
		}

		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)

		const oldVizMSEState: VizMSEState = (this.getStateBefore(previousStateTime) || { state: { time: 0, layer: {} } })
			.state

		const convertTrace = startTrace(`device:convertState`, { deviceId: this.deviceId })
		const newVizMSEState = this.convertStateToVizMSE(newState, newMappings)
		this.emit('timeTrace', endTrace(convertTrace))

		const diffTrace = startTrace(`device:diffState`, { deviceId: this.deviceId })
		const commandsToAchieveState = this._diffStates(oldVizMSEState, newVizMSEState, newState.time)
		this.emit('timeTrace', endTrace(diffTrace))

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
	clearFuture(clearAfterTime: number) {
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	get canConnect(): boolean {
		return true
	}
	get connected(): boolean {
		return this._vizMSEConnected
	}

	async activate(payload: Record<string, any> | undefined): Promise<ActionExecutionResult> {
		if (!payload || !payload.activeRundownPlaylistId) {
			return {
				result: ActionExecutionResultCode.Error,
				response: t('Invalid payload'),
			}
		}
		if (!this._vizmseManager) {
			return {
				result: ActionExecutionResultCode.Error,
				response: t('Unable to activate vizMSE, not initialized yet'),
			}
		}

		const activeRundownPlaylistId = payload.activeRundownPlaylist
		const previousPlaylistId = this._vizmseManager?.activeRundownPlaylistId

		await this._vizmseManager.activate(activeRundownPlaylistId)

		if (!payload.clearAll) {
			return {
				result: ActionExecutionResultCode.Ok,
			}
		}

		this.clearStates()

		if (this._initOptions && activeRundownPlaylistId !== previousPlaylistId) {
			if (this._initOptions.clearAllCommands && this._initOptions.clearAllCommands.length) {
				await this._vizmseManager.clearEngines({
					type: VizMSECommandType.CLEAR_ALL_ENGINES,
					time: this.getCurrentTime(),
					timelineObjId: 'makeReady',
					channels: 'all',
					commands: this._initOptions.clearAllCommands,
				})
			}
		}

		return {
			result: ActionExecutionResultCode.Ok,
		}
	}
	public async purgeRundown(clearAll: boolean): Promise<void> {
		await this._vizmseManager?.purgeRundown(clearAll)
	}
	public async clearEngines(): Promise<void> {
		await this._vizmseManager?.clearEngines({
			type: VizMSECommandType.CLEAR_ALL_ENGINES,
			time: this.getCurrentTime(),
			timelineObjId: 'clearAllEnginesAction',
			channels: 'all',
			commands: this._initOptions?.clearAllCommands || [],
		})
	}
	public async resetViz(payload: VizResetPayload): Promise<void> {
		await this.purgeRundown(true) // note - this might not be 100% necessary
		await this.clearEngines()
		await this._vizmseManager?.activate(payload?.activeRundownPlaylistId)

		// lastly make sure we reset so timeline state is sent again
		this.clearStates()
		this.emit('resetResolver')
	}

	readonly actions: VizMSEActionMethods = {
		[VizMSEActions.PurgeRundown]: async () => {
			await this.purgeRundown(true)
			return { result: ActionExecutionResultCode.Ok }
		},
		[VizMSEActions.Activate]: async (payload) => {
			return this.activate(payload)
		},
		[VizMSEActions.StandDown]: async () => {
			return this.executeStandDown()
		},
		[VizMSEActions.ClearAllEngines]: async () => {
			await this.clearEngines()
			return { result: ActionExecutionResultCode.Ok }
		},
		[VizMSEActions.VizReset]: async (payload) => {
			await this.resetViz(payload)
			return { result: ActionExecutionResultCode.Ok }
		},
	}

	get deviceType() {
		return DeviceType.VIZMSE
	}
	get deviceName(): string {
		return `VizMSE ${this._vizMSE ? this._vizMSE.hostname : 'Uninitialized'}`
	}

	get queue() {
		return this._doOnTime.getQueue()
	}

	get supportsExpectedPlayoutItems(): boolean {
		return true
	}
	public handleExpectedPlayoutItems(expectedPlayoutItems: Array<ExpectedPlayoutItem>): void {
		this.emitDebug('VIZDEBUG: handleExpectedPlayoutItems called')
		if (this._vizmseManager) {
			this.emitDebug('VIZDEBUG: manager exists')
			this._vizmseManager.setExpectedPlayoutItems(expectedPlayoutItems)
		}
	}

	public getCurrentState(): VizMSEState | undefined {
		return (this.getState() || { state: undefined }).state
	}
	public connectionChanged(connected?: boolean) {
		if (connected === true || connected === false) this._vizMSEConnected = connected
		if (connected === false) {
			this.emit('clearMediaObjects', this.deviceId)
		}
		this.emit('connectionChanged', this.getStatus())
	}
	/**
	 * Takes a timeline state and returns a VizMSE State that will work with the state lib.
	 * @param timelineState The timeline state to generate from.
	 */
	convertStateToVizMSE(timelineState: Timeline.TimelineState<TSRTimelineContent>, mappings: Mappings): VizMSEState {
		const state: VizMSEState = {
			time: timelineState.time,
			layer: {},
		}

		_.each(timelineState.layers, (layer, layerName: string) => {
			const layerExt: ResolvedTimelineObjectInstanceExtended = layer
			let foundMapping = mappings[layerName] as Mapping<SomeMappingVizMSE>

			let isLookahead = false
			if (!foundMapping && layerExt.isLookahead && layerExt.lookaheadForLayer) {
				foundMapping = mappings[layerExt.lookaheadForLayer] as Mapping<SomeMappingVizMSE>
				isLookahead = true
			}
			if (foundMapping && foundMapping.device === DeviceType.VIZMSE && foundMapping.deviceId === this.deviceId) {
				if (layer.content) {
					const content = layer.content as TimelineContentVIZMSEAny

					switch (content.type) {
						case TimelineContentTypeVizMSE.LOAD_ALL_ELEMENTS:
							state.layer[layerName] = literal<VizMSEStateLayerLoadAllElements>({
								timelineObjId: layer.id,
								contentType: TimelineContentTypeVizMSE.LOAD_ALL_ELEMENTS,
							})
							break
						case TimelineContentTypeVizMSE.CLEAR_ALL_ELEMENTS: {
							// Special case: clear all graphics:
							const showId = this._vizmseManager?.resolveShowNameToId(content.showName)
							if (!showId) {
								this.emit(
									'warning',
									`convertStateToVizMSE: Unable to find Show Id for Clear-All template and Show Name "${content.showName}"`
								)
								break
							}
							state.isClearAll = {
								timelineObjId: layer.id,
								showId,
								channelsToSendCommands: content.channelsToSendCommands,
							}
							break
						}
						case TimelineContentTypeVizMSE.CONTINUE:
							state.layer[layerName] = literal<VizMSEStateLayerContinue>({
								timelineObjId: layer.id,
								contentType: TimelineContentTypeVizMSE.CONTINUE,
								direction: content.direction,
								reference: content.reference,
							})
							break
						case TimelineContentTypeVizMSE.INITIALIZE_SHOWS:
							state.layer[layerName] = literal<VizMSEStateLayerInitializeShows>({
								timelineObjId: layer.id,
								contentType: TimelineContentTypeVizMSE.INITIALIZE_SHOWS,
								showIds: _.compact(
									content.showNames.map((showName) => this._vizmseManager?.resolveShowNameToId(showName))
								),
							})
							break
						case TimelineContentTypeVizMSE.CLEANUP_SHOWS:
							state.layer[layerName] = literal<VizMSEStateLayerCleanupShows>({
								timelineObjId: layer.id,
								contentType: TimelineContentTypeVizMSE.CLEANUP_SHOWS,
								showIds: _.compact(
									content.showNames.map((showName) => this._vizmseManager?.resolveShowNameToId(showName))
								),
							})
							break
						case TimelineContentTypeVizMSE.CONCEPT:
							state.layer[layerName] = literal<VizMSEStateLayerConcept>({
								timelineObjId: layer.id,
								contentType: TimelineContentTypeVizMSE.CONCEPT,
								concept: content.concept,
							})
							break
						default: {
							const stateLayer = this._contentToStateLayer(layer.id, content)
							if (stateLayer) {
								if (isLookahead) stateLayer.lookahead = true

								state.layer[layerName] = stateLayer
							}
							break
						}
					}
				}
			}
		})

		if (state.isClearAll) {
			// clear rest of state:
			state.layer = {}
		}

		// Fix references:
		_.each(state.layer, (layer) => {
			if (layer.contentType === TimelineContentTypeVizMSE.CONTINUE) {
				const otherLayer = state.layer[layer.reference]
				if (otherLayer) {
					if (
						otherLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL ||
						otherLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT
					) {
						layer.referenceContent = otherLayer
					} else {
						// it's not possible to reference that kind of object
						this.emit(
							'warning',
							`object "${layer.timelineObjId}" of contentType="${layer.contentType}", cannot reference object "${otherLayer.timelineObjId}" on layer "${layer.reference}" of contentType="${otherLayer.contentType}" `
						)
					}
				}
			}
		})

		return state
	}

	private _contentToStateLayer(
		timelineObjId: string,
		content: TimelineContentVIZMSEElementInternal | TimelineContentVIZMSEElementPilot
	): VizMSEStateLayer | undefined {
		if (content.type === TimelineContentTypeVizMSE.ELEMENT_INTERNAL) {
			const showId = this._vizmseManager?.resolveShowNameToId(content.showName)
			if (!showId) {
				this.emit(
					'warning',
					`_contentToStateLayer: Unable to find Show Id for template "${content.templateName}" and Show Name "${content.showName}"`
				)
				return undefined
			}
			const o: VizMSEStateLayerInternal = {
				timelineObjId: timelineObjId,
				contentType: TimelineContentTypeVizMSE.ELEMENT_INTERNAL,
				continueStep: content.continueStep,
				cue: content.cue,
				outTransition: content.outTransition,

				templateName: content.templateName,
				templateData: content.templateData,
				channelName: content.channelName,
				delayTakeAfterOutTransition: content.delayTakeAfterOutTransition,
				showId,
			}
			return o
		} else if (content.type === TimelineContentTypeVizMSE.ELEMENT_PILOT) {
			const o: VizMSEStateLayerPilot = {
				timelineObjId: timelineObjId,
				contentType: TimelineContentTypeVizMSE.ELEMENT_PILOT,
				continueStep: content.continueStep,
				cue: content.cue,
				outTransition: content.outTransition,

				templateVcpId: content.templateVcpId,
				channelName: content.channelName,
				delayTakeAfterOutTransition: content.delayTakeAfterOutTransition,
			}
			return o
		}
		return undefined
	}

	/**
	 * Prepares the physical device for playout.
	 * @param okToDestroyStuff Whether it is OK to do things that affects playout visibly
	 */
	async makeReady(okToDestroyStuff?: boolean, activeRundownPlaylistId?: string): Promise<void> {
		const previousPlaylistId = this._vizmseManager?.activeRundownPlaylistId
		if (this._vizmseManager) {
			await this._vizmseManager.cleanupAllShows()
			await this._vizmseManager.activate(activeRundownPlaylistId)
		} else throw new Error(`Unable to activate vizMSE, not initialized yet!`)

		if (okToDestroyStuff) {
			// reset our own state(s):
			this.clearStates()

			if (this._vizmseManager) {
				if (this._initOptions && activeRundownPlaylistId !== previousPlaylistId) {
					if (
						this._initOptions.clearAllOnMakeReady &&
						this._initOptions.clearAllCommands &&
						this._initOptions.clearAllCommands.length
					) {
						await this._vizmseManager.clearEngines({
							type: VizMSECommandType.CLEAR_ALL_ENGINES,
							time: this.getCurrentTime(),
							timelineObjId: 'makeReady',
							channels: 'all',
							commands: this._initOptions.clearAllCommands,
						})
					}
				}
			} else throw new Error(`Unable to activate vizMSE, not initialized yet!`)
		}
	}
	async executeStandDown(): Promise<ActionExecutionResult> {
		if (this._vizmseManager) {
			if (!this._initOptions || !this._initOptions.dontDeactivateOnStandDown) {
				await this._vizmseManager.deactivate()
			} else {
				this._vizmseManager.standDownActiveRundown() // because we still want to stop monitoring expectedPlayoutItems
			}
		}

		return {
			result: ActionExecutionResultCode.Ok,
		}
	}
	/**
	 * The standDown event could be triggered at a time after broadcast
	 * @param okToDestroyStuff If true, the device may do things that might affect the visible output
	 */
	async standDown(okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			return this.executeStandDown().then(() => undefined)
		}
	}
	getStatus(): DeviceStatus {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._vizMSEConnected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		} else if (this._vizmseManager) {
			if (this._vizmseManager.notLoadedCount > 0 || this._vizmseManager.loadingCount > 0) {
				statusCode = StatusCode.WARNING_MINOR
				messages.push(
					`Got ${this._vizmseManager.notLoadedCount} elements not yet loaded to the Viz Engine (${this._vizmseManager.loadingCount} are currently loading)`
				)
			}
			if (this._vizmseManager.enginesDisconnected.length) {
				statusCode = StatusCode.BAD
				this._vizmseManager.enginesDisconnected.forEach((engine) => {
					messages.push(`Viz Engine ${engine} disconnected`)
				})
			}
		}

		return {
			statusCode: statusCode,
			messages: messages,
			active: this.isActive,
		}
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 */
	private _diffStates(oldState: VizMSEState, newState: VizMSEState, time: number): Array<VizMSECommand> {
		const highPrioCommands: VizMSECommand[] = []
		const lowPrioCommands: VizMSECommand[] = []

		const addCommand = (command: VizMSECommand, lowPriority?: boolean) => {
			;(lowPriority ? lowPrioCommands : highPrioCommands).push(command)
		}

		/** The time of when to run "preparation" commands */
		let prepareTime = Math.min(
			time,
			Math.max(
				time - IDEAL_PREPARE_TIME,
				oldState.time + PREPARE_TIME_WAIT // earliset possible prepareTime
			)
		)
		if (prepareTime < this.getCurrentTime()) {
			// Only to not emit an unnessesary slowCommand event
			prepareTime = this.getCurrentTime()
		}
		if (time < prepareTime) {
			prepareTime = time - 10
		}

		_.each(newState.layer, (newLayer: VizMSEStateLayer, layerId: string) => {
			const oldLayer: VizMSEStateLayer | undefined = oldState.layer[layerId]

			if (newLayer.contentType === TimelineContentTypeVizMSE.LOAD_ALL_ELEMENTS) {
				if (!oldLayer || !_.isEqual(newLayer, oldLayer)) {
					addCommand(
						literal<VizMSECommandLoadAllElements>({
							timelineObjId: newLayer.timelineObjId,
							fromLookahead: newLayer.lookahead,
							layerId: layerId,

							type: VizMSECommandType.LOAD_ALL_ELEMENTS,
							time: time,
						}),
						newLayer.lookahead
					)
				}
			} else if (newLayer.contentType === TimelineContentTypeVizMSE.CONTINUE) {
				if ((!oldLayer || !_.isEqual(newLayer, oldLayer)) && newLayer.referenceContent) {
					const props: Omit<VizMSECommandElementBase, 'time' | 'type'> = {
						timelineObjId: newLayer.timelineObjId,
						fromLookahead: newLayer.lookahead,
						layerId: layerId,

						content: VizMSEManager.getPlayoutItemContentFromLayer(newLayer.referenceContent),
					}
					if ((newLayer.direction || 1) === 1) {
						addCommand(
							literal<VizMSECommandContinue>({
								...props,
								type: VizMSECommandType.CONTINUE_ELEMENT,
								time: time,
							}),
							newLayer.lookahead
						)
					} else {
						addCommand(
							literal<VizMSECommandContinueReverse>({
								...props,
								type: VizMSECommandType.CONTINUE_ELEMENT_REVERSE,
								time: time,
							}),
							newLayer.lookahead
						)
					}
				}
			} else if (newLayer.contentType === TimelineContentTypeVizMSE.INITIALIZE_SHOWS) {
				if (!oldLayer || !_.isEqual(newLayer, oldLayer)) {
					addCommand(
						literal<VizMSECommandInitializeShows>({
							type: VizMSECommandType.INITIALIZE_SHOWS,
							timelineObjId: newLayer.timelineObjId,
							showIds: newLayer.showIds,
							time: time,
						}),
						newLayer.lookahead
					)
				}
			} else if (newLayer.contentType === TimelineContentTypeVizMSE.CLEANUP_SHOWS) {
				if (!oldLayer || !_.isEqual(newLayer, oldLayer)) {
					const command: VizMSECommandCleanupShows = literal<VizMSECommandCleanupShows>({
						type: VizMSECommandType.CLEANUP_SHOWS,
						timelineObjId: newLayer.timelineObjId,
						showIds: newLayer.showIds,
						time: time,
					})
					addCommand(command, newLayer.lookahead)
				}
			} else if (newLayer.contentType === TimelineContentTypeVizMSE.CONCEPT) {
				if (!oldLayer || !_.isEqual(newLayer, oldLayer)) {
					addCommand(
						literal<VizMSECommandSetConcept>({
							concept: newLayer.concept,
							type: VizMSECommandType.SET_CONCEPT,
							time: time,
							timelineObjId: newLayer.timelineObjId,
						})
					)
				}
			} else {
				const props: Omit<VizMSECommandElementBase, 'time' | 'type'> = {
					timelineObjId: newLayer.timelineObjId,
					fromLookahead: newLayer.lookahead,
					layerId: layerId,

					content: VizMSEManager.getPlayoutItemContentFromLayer(newLayer),
				}
				if (
					!oldLayer ||
					!_.isEqual(
						_.omit(newLayer, ['continueStep', 'timelineObjId', 'outTransition']),
						_.omit(oldLayer, ['continueStep', 'timelineObjId', 'outTransition'])
					)
				) {
					if (
						newLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL ||
						newLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT
					) {
						// Maybe prepare the element first:
						addCommand(
							literal<VizMSECommandPrepare>({
								...props,
								type: VizMSECommandType.PREPARE_ELEMENT,
								time: prepareTime,
							}),
							newLayer.lookahead
						)

						if (newLayer.cue) {
							// Cue the element
							addCommand(
								literal<VizMSECommandCue>({
									...props,
									type: VizMSECommandType.CUE_ELEMENT,
									time: time,
								}),
								newLayer.lookahead
							)
						} else {
							// Start playing element
							addCommand(
								literal<VizMSECommandTake>({
									...props,
									type: VizMSECommandType.TAKE_ELEMENT,
									time: time,
								}),
								newLayer.lookahead
							)
						}
					}
				} else if (
					(oldLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL ||
						oldLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT) &&
					(newLayer.continueStep || 0) > (oldLayer.continueStep || 0)
				) {
					// An increase in continueStep should result in triggering a continue:
					addCommand(
						literal<VizMSECommandContinue>({
							...props,
							type: VizMSECommandType.CONTINUE_ELEMENT,
							time: time,
						}),
						newLayer.lookahead
					)
				} else if (
					(oldLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL ||
						oldLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT) &&
					(newLayer.continueStep || 0) < (oldLayer.continueStep || 0)
				) {
					// A decrease in continueStep should result in triggering a continue:
					addCommand(
						literal<VizMSECommandContinueReverse>({
							...props,
							type: VizMSECommandType.CONTINUE_ELEMENT_REVERSE,
							time: time,
						}),
						newLayer.lookahead
					)
				}
			}
		})

		_.each(oldState.layer, (oldLayer: VizMSEStateLayer, layerId: string) => {
			const newLayer = newState.layer[layerId]
			if (!newLayer) {
				if (
					oldLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL ||
					oldLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT
				) {
					// Stopped playing
					addCommand(
						literal<VizMSECommandTakeOut>({
							type: VizMSECommandType.TAKEOUT_ELEMENT,
							time: time,
							timelineObjId: oldLayer.timelineObjId,
							fromLookahead: oldLayer.lookahead,
							layerId: layerId,
							transition: oldLayer && oldLayer.outTransition,
							content: VizMSEManager.getPlayoutItemContentFromLayer(oldLayer),
						}),
						oldLayer.lookahead
					)
				} else if (oldLayer.contentType === TimelineContentTypeVizMSE.INITIALIZE_SHOWS) {
					addCommand(
						literal<VizMSECommandInitializeShows>({
							type: VizMSECommandType.INITIALIZE_SHOWS,
							timelineObjId: oldLayer.timelineObjId,
							showIds: [],
							time: time,
						}),
						oldLayer.lookahead
					)
				}
			}
		})

		if (newState.isClearAll && !oldState.isClearAll) {
			// Special: clear all graphics

			const clearingCommands: VizMSECommand[] = []

			const templateName = this._initOptions && this._initOptions.clearAllTemplateName
			if (!templateName) {
				this.emit('warning', `vizMSE: initOptions.clearAllTemplateName is not set!`)
			} else {
				// Start playing special element:
				clearingCommands.push(
					literal<VizMSECommandClearAllElements>({
						timelineObjId: newState.isClearAll.timelineObjId,
						time: time,
						type: VizMSECommandType.CLEAR_ALL_ELEMENTS,
						templateName: templateName,
						showId: newState.isClearAll.showId,
					})
				)
			}
			if (
				newState.isClearAll.channelsToSendCommands &&
				this._initOptions &&
				this._initOptions.clearAllCommands &&
				this._initOptions.clearAllCommands.length
			) {
				// Send special commands to the engines:
				clearingCommands.push(
					literal<VizMSECommandClearAllEngines>({
						timelineObjId: newState.isClearAll.timelineObjId,
						time: time,
						type: VizMSECommandType.CLEAR_ALL_ENGINES,
						channels: newState.isClearAll.channelsToSendCommands,
						commands: this._initOptions.clearAllCommands,
					})
				)
			}
			return clearingCommands
		}
		const sortCommands = (commands: VizMSECommand[]): VizMSECommand[] => {
			// Sort the commands so that take out:s are run first
			return commands.sort((a, b) => {
				if (a.type === VizMSECommandType.TAKEOUT_ELEMENT && b.type !== VizMSECommandType.TAKEOUT_ELEMENT) return -1
				if (a.type !== VizMSECommandType.TAKEOUT_ELEMENT && b.type === VizMSECommandType.TAKEOUT_ELEMENT) return 1
				return 0
			})
		}
		sortCommands(highPrioCommands)
		sortCommands(lowPrioCommands)

		const concatCommands = sortCommands(highPrioCommands.concat(lowPrioCommands))

		let highestDelay = 0
		concatCommands.forEach((command) => {
			if (command.type === VizMSECommandType.TAKEOUT_ELEMENT) {
				if (command.transition && command.transition.delay) {
					if (command.transition.delay > highestDelay) {
						highestDelay = command.transition.delay
					}
				}
			}
		})

		if (highestDelay > 0) {
			concatCommands.forEach((command, index) => {
				if (
					command.type === VizMSECommandType.TAKE_ELEMENT &&
					command.layerId &&
					(newState.layer[command.layerId].contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL ||
						!!newState.layer[command.layerId].delayTakeAfterOutTransition)
				) {
					;(concatCommands[index] as VizMSECommandTake).transition = {
						type: VIZMSETransitionType.DELAY,
						delay: highestDelay + 20,
					}
				}
			})
		}

		if (concatCommands.length) {
			this.emitDebug(`VIZMSE: COMMANDS: ${JSON.stringify(sortCommands(concatCommands))}`)
		}

		return sortCommands(concatCommands)
	}
	private async _doCommand(command: VizMSECommand, context: string, timlineObjId: string): Promise<void> {
		const time = this.getCurrentTime()
		return this._commandReceiver(time, command, context, timlineObjId)
	}
	/**
	 * Add commands to queue, to be executed at the right time
	 */
	private _addToQueue(commandsToAchieveState: Array<VizMSECommand>) {
		_.each(commandsToAchieveState, (cmd: VizMSECommand) => {
			this._doOnTime.queue(
				cmd.time,
				cmd.layerId,
				async (c: { cmd: VizMSECommand }) => {
					return this._doCommand(c.cmd, c.cmd.type + '_' + c.cmd.timelineObjId, c.cmd.timelineObjId)
				},
				{ cmd: cmd }
			)

			this._doOnTimeBurst.queue(
				cmd.time,
				undefined,
				async (c: { cmd: VizMSECommand }) => {
					if (c.cmd.type === VizMSECommandType.TAKE_ELEMENT && !c.cmd.fromLookahead) {
						if (this._vizmseManager && c.cmd.layerId) {
							this._vizmseManager.clearAllWaitWithLayer(c.cmd.layerId)
						}
					}
					return Promise.resolve()
				},
				{ cmd: cmd }
			)
		})
	}
	/**
	 * Sends commands to the VizMSE server
	 * @param time deprecated
	 * @param cmd Command to execute
	 */
	private async _defaultCommandReceiver(
		_time: number,
		cmd: VizMSECommand,
		context: string,
		timelineObjId: string
	): Promise<any> {
		const cwc: CommandWithContext = {
			context: context,
			timelineObjId: timelineObjId,
			command: cmd,
		}
		this.emitDebug(cwc)

		try {
			if (!this._vizmseManager) {
				throw new Error(`Not initialized yet`)
			}
			switch (cmd.type) {
				case VizMSECommandType.PREPARE_ELEMENT:
					await this._vizmseManager.prepareElement(cmd)
					break
				case VizMSECommandType.CUE_ELEMENT:
					await this._vizmseManager.cueElement(cmd)
					break
				case VizMSECommandType.TAKE_ELEMENT:
					await this._vizmseManager.takeElement(cmd)
					break
				case VizMSECommandType.TAKEOUT_ELEMENT:
					await this._vizmseManager.takeoutElement(cmd)
					break
				case VizMSECommandType.CONTINUE_ELEMENT:
					await this._vizmseManager.continueElement(cmd)
					break
				case VizMSECommandType.CONTINUE_ELEMENT_REVERSE:
					await this._vizmseManager.continueElementReverse(cmd)
					break
				case VizMSECommandType.LOAD_ALL_ELEMENTS:
					await this._vizmseManager.loadAllElements(cmd)
					break
				case VizMSECommandType.CLEAR_ALL_ELEMENTS:
					await this._vizmseManager.clearAll(cmd)
					break
				case VizMSECommandType.CLEAR_ALL_ENGINES:
					await this._vizmseManager.clearEngines(cmd)
					break
				case VizMSECommandType.SET_CONCEPT:
					await this._vizmseManager.setConcept(cmd)
					break
				case VizMSECommandType.INITIALIZE_SHOWS:
					await this._vizmseManager.initializeShows(cmd)
					break
				case VizMSECommandType.CLEANUP_SHOWS:
					await this._vizmseManager.cleanupShows(cmd)
					break
				default:
					// @ts-ignore never
					throw new Error(`Unsupported command type "${cmd.type}"`)
			}
		} catch (e) {
			const error = e as Error
			let errorString = error && error.message ? error.message : error.toString()
			if (error?.stack) {
				errorString += '\n' + error.stack
			}
			if (e instanceof HTTPClientError || e instanceof HTTPServerError) {
				errorString +=
					`\n\nPath: ${e.path}` +
					'\n\n' +
					(e.body ?? '[No request body present]') +
					`\n\nStatus: ${e.status}` +
					`\nResponse:\n ${e.response}`
			}
			this.emit('commandError', new Error(errorString), cwc)
		}
	}
	public ignoreWaitsInTests() {
		if (!this._vizmseManager) throw new Error('_vizmseManager not set')
		this._vizmseManager.ignoreAllWaits = true
	}
}
