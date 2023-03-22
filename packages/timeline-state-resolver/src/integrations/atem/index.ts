import * as _ from 'underscore'
import * as underScoreDeepExtend from 'underscore-deep-extend'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode } from './../../devices/device'
import {
	DeviceType,
	TimelineContentTypeAtem,
	SomeMappingAtem,
	MappingAtemType,
	AtemOptions,
	DeviceOptionsAtem,
	Mappings,
	AtemTransitionStyle,
	Timeline,
	TSRTimelineContent,
	Mapping,
	MappingAtemAuxilliary,
	ActionExecutionResult,
	ActionExecutionResultCode,
	AtemActions,
} from 'timeline-state-resolver-types'
import { AtemState, State as DeviceState, Defaults as StateDefault } from 'atem-state'
import {
	BasicAtem,
	Commands as AtemCommands,
	AtemState as NativeAtemState,
	AtemStateUtil,
	Enums as ConnectionEnums,
} from 'atem-connection'
import { DoOnTime, SendMode } from '../../devices/doOnTime'
import { actionNotFoundMessage, endTrace, startTrace } from '../../lib'

_.mixin({ deepExtend: underScoreDeepExtend(_) })

function deepExtend<T>(destination: T, ...sources: any[]) {
	// @ts-ignore (mixin)
	return _.deepExtend(destination, ...sources)
}

export interface AtemCommandWithContext {
	command: AtemCommands.ISerializableCommand
	context: CommandContext
	timelineObjId: string
}
type CommandContext = any

export interface DeviceOptionsAtemInternal extends DeviceOptionsAtem {
	commandReceiver?: CommandReceiver
}
export type CommandReceiver = (
	time: number,
	command: AtemCommands.ISerializableCommand,
	context: CommandContext,
	timelineObjId: string
) => Promise<any>

/**
 * This is a wrapper for the Atem Device. Commands to any and all atem devices will be sent through here.
 */
export class AtemDevice extends DeviceWithState<DeviceState, DeviceOptionsAtemInternal> {
	private _doOnTime: DoOnTime

	private _atem: BasicAtem
	private _state: AtemState
	private _initialized = false
	private _connected = false // note: ideally this should be replaced by this._atem.connected

	private firstStateAfterMakeReady = true // note: temprorary for some improved logging

	private _atemStatus: {
		psus: Array<boolean>
	} = {
		psus: [],
	}

	private _commandReceiver: CommandReceiver

	constructor(deviceId: string, deviceOptions: DeviceOptionsAtemInternal, getCurrentTime: () => Promise<number>) {
		super(deviceId, deviceOptions, getCurrentTime)
		if (deviceOptions.options) {
			if (deviceOptions.commandReceiver) this._commandReceiver = deviceOptions.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver.bind(this)
		}
		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.BURST,
			this._deviceOptions
		)
		this.handleDoOnTime(this._doOnTime, 'Atem')
	}

	/**
	 * Initiates the connection with the ATEM through the atem-connection lib
	 * and initiates Atem State lib.
	 */
	async init(options: AtemOptions): Promise<boolean> {
		return new Promise((resolve, reject) => {
			// This is where we would do initialization, like connecting to the devices, etc
			this._state = new AtemState()
			this._atem = new BasicAtem()
			this._atem.once('connected', () => {
				// check if state has been initialized:
				this._connected = true
				this._initialized = true
				resolve(true)
			})
			this._atem.on('connected', () => {
				const time = this.getCurrentTime()
				if (this._atem.state) this.setState(this._atem.state, time)
				this._connected = true
				this._connectionChanged()
				this.emit('resetResolver')
			})
			this._atem.on('disconnected', () => {
				this._connected = false
				this._connectionChanged()
			})
			this._atem.on('error', (e) => this.emit('error', 'Atem', new Error(e)))
			this._atem.on('stateChanged', (state) => this._onAtemStateChanged(state))

			this._atem.connect(options.host, options.port).catch((e) => {
				reject(e)
			})
		})
	}
	/**
	 * Safely terminate everything to do with this device such that it can be
	 * garbage collected.
	 */
	async terminate(): Promise<boolean> {
		this._doOnTime.dispose()

		return new Promise((resolve) => {
			// TODO: implement dispose function in atem-connection
			this._atem
				.disconnect()
				.then(() => {
					resolve(true)
				})
				.catch(() => {
					resolve(false)
				})
		})
	}

	private async resyncState(): Promise<ActionExecutionResult> {
		this._doOnTime.clearQueueNowAndAfter(this.getCurrentTime())
		if (this._atem.state) this.setState(this._atem.state, this.getCurrentTime())

		return {
			result: ActionExecutionResultCode.Ok,
		}
	}
	async executeAction(
		actionId: AtemActions,
		_payload?: Record<string, any> | undefined
	): Promise<ActionExecutionResult> {
		switch (actionId) {
			case AtemActions.Resync:
				return this.resyncState()
			default:
				return actionNotFoundMessage(actionId)
		}
	}

	/**
	 * Prepare device for playout
	 * @param okToDestroyStuff If true, may break output
	 */
	async makeReady(okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			await this.resyncState()
		}
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	/**
	 * Process a state, diff against previous state and generate commands to
	 * be executed at the state's time.
	 * @param newState The state to handle
	 */
	handleState(newState: Timeline.TimelineState<TSRTimelineContent>, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		if (!this._initialized) {
			// before it's initialized don't do anything
			this.emit('warning', 'Atem not initialized yet')
			return
		}

		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		const oldState: DeviceState = (this.getStateBefore(previousStateTime) || { state: AtemStateUtil.Create() }).state

		const convertTrace = startTrace(`device:convertState`, { deviceId: this.deviceId })
		const oldAtemState = oldState
		const newAtemState = this.convertStateToAtem(newState, newMappings)
		this.emit('timeTrace', endTrace(convertTrace))

		if (this.firstStateAfterMakeReady) {
			// emit a debug message with the states:
			this.firstStateAfterMakeReady = false
			this.emitDebug(
				JSON.stringify({
					reason: 'firstStateAfterMakeReady',
					before: (oldAtemState || {}).video,
					after: (newAtemState || {}).video,
				})
			)
		}

		const diffTrace = startTrace(`device:diffState`, { deviceId: this.deviceId })
		const commandsToAchieveState: Array<AtemCommandWithContext> = this._diffStates(
			oldAtemState,
			newAtemState,
			newMappings
		)
		this.emit('timeTrace', endTrace(diffTrace))

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newAtemState, newState.time)
	}
	/**
	 * Clear any scheduled commands after `clearAfterTime`
	 * @param clearAfterTime
	 */
	clearFuture(clearAfterTime: number) {
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	get canConnect(): boolean {
		return true
	}
	get connected(): boolean {
		return this._connected
	}
	/**
	 * Convert a timeline state into an Atem state.
	 * @param state The state to be converted
	 */
	convertStateToAtem(state: Timeline.TimelineState<TSRTimelineContent>, newMappings: Mappings): DeviceState {
		if (!this._initialized) throw Error('convertStateToAtem cannot be used before inititialized')

		// Start out with default state:
		const deviceState = AtemStateUtil.Create()

		// Sort layer based on Layer name
		const sortedLayers = _.map(state.layers, (tlObject, layerName) => ({ layerName, tlObject })).sort((a, b) =>
			a.layerName.localeCompare(b.layerName)
		)

		// For every layer, augment the state
		_.each(sortedLayers, ({ tlObject, layerName }) => {
			const content = tlObject.content

			const mapping = newMappings[layerName] as Mapping<SomeMappingAtem> | undefined

			if (mapping && mapping.deviceId === this.deviceId && content.deviceType === DeviceType.ATEM) {
				if ('index' in mapping.options && mapping.options.index !== undefined && mapping.options.index >= 0) {
					// index must be 0 or higher
					switch (mapping.options.mappingType) {
						case MappingAtemType.MixEffect:
							if (content.type === TimelineContentTypeAtem.ME) {
								const me = AtemStateUtil.getMixEffect(deviceState, mapping.options.index)
								const atemObjKeyers = content.me.upstreamKeyers
								const transition = content.me.transition

								deepExtend(me, _.omit(content.me, 'upstreamKeyers'))
								if (this._isAssignableToNextStyle(transition)) {
									me.transitionProperties.nextStyle = transition as number as ConnectionEnums.TransitionStyle
								}
								if (atemObjKeyers) {
									_.each(atemObjKeyers, (objKey, i) => {
										const keyer = AtemStateUtil.getUpstreamKeyer(me, i)
										deepExtend(keyer, objKey)
									})
								}
							}
							break
						case MappingAtemType.DownStreamKeyer:
							if (content.type === TimelineContentTypeAtem.DSK) {
								const dsk = AtemStateUtil.getDownstreamKeyer(deviceState, mapping.options.index)
								if (dsk) deepExtend(dsk, content.dsk)
							}
							break
						case MappingAtemType.SuperSourceBox:
							if (content.type === TimelineContentTypeAtem.SSRC) {
								const ssrc = AtemStateUtil.getSuperSource(deviceState, mapping.options.index)
								if (ssrc) {
									const objBoxes = content.ssrc.boxes
									_.each(objBoxes, (box, i) => {
										if (ssrc.boxes[i]) {
											deepExtend(ssrc.boxes[i], box)
										} else {
											ssrc.boxes[i] = {
												...StateDefault.Video.SuperSourceBox,
												...box,
											}
										}
									})
								}
							}
							break
						case MappingAtemType.SuperSourceProperties:
							if (content.type === TimelineContentTypeAtem.SSRCPROPS) {
								const ssrc = AtemStateUtil.getSuperSource(deviceState, mapping.options.index)
								if (!ssrc.properties) ssrc.properties = { ...StateDefault.Video.SuperSourceProperties }
								if (ssrc) deepExtend(ssrc.properties, content.ssrcProps)
							}
							break
						case MappingAtemType.Auxilliary:
							if (content.type === TimelineContentTypeAtem.AUX) {
								deviceState.video.auxilliaries[mapping.options.index] = content.aux.input
							}
							break
						case MappingAtemType.MediaPlayer:
							if (content.type === TimelineContentTypeAtem.MEDIAPLAYER) {
								const ms = AtemStateUtil.getMediaPlayer(deviceState, mapping.options.index)
								if (ms) deepExtend(ms, content.mediaPlayer)
							}
							break
						case MappingAtemType.AudioChannel:
							if (content.type === TimelineContentTypeAtem.AUDIOCHANNEL) {
								const chan = deviceState.audio?.channels[mapping.options.index]
								if (chan && deviceState.audio) {
									deviceState.audio.channels[mapping.options.index] = {
										...chan,
										...content.audioChannel,
									}
								}
							}
							break
					}
				}

				if (mapping.options.mappingType === MappingAtemType.MacroPlayer) {
					if (content.type === TimelineContentTypeAtem.MACROPLAYER) {
						const ms = deviceState.macro.macroPlayer
						if (ms) deepExtend(ms, content.macroPlayer)
					}
				}
			}
		})

		return deviceState
	}
	get deviceType() {
		return DeviceType.ATEM
	}
	get deviceName(): string {
		return 'Atem ' + this.deviceId
	}
	get queue() {
		return this._doOnTime.getQueue()
	}
	/**
	 * Check status and return it with useful messages appended.
	 */
	public getStatus(): DeviceStatus {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (statusCode === StatusCode.GOOD) {
			if (!this._connected) {
				statusCode = StatusCode.BAD
				messages.push(`Atem disconnected`)
			}
		}
		if (statusCode === StatusCode.GOOD) {
			const psus = this._atemStatus.psus

			_.each(psus, (psu: boolean, i: number) => {
				if (!psu) {
					statusCode = StatusCode.WARNING_MAJOR
					messages.push(`Atem PSU ${i + 1} is faulty. The device has ${psus.length} PSU(s) in total.`)
				}
			})
		}
		if (!this._initialized) {
			statusCode = StatusCode.BAD
			messages.push(`ATEM device connection not initialized (restart required)`)
		}

		const deviceStatus: DeviceStatus = {
			statusCode: statusCode,
			messages: messages,
			active: this.isActive,
		}
		return deviceStatus
	}
	/**
	 * Add commands to queue, to be executed at the right time
	 */
	private _addToQueue(commandsToAchieveState: Array<AtemCommandWithContext>, time: number) {
		_.each(commandsToAchieveState, (cmd: AtemCommandWithContext) => {
			// add the new commands to the queue:
			this._doOnTime.queue(
				time,
				undefined,
				async (cmd: AtemCommandWithContext) => {
					return this._commandReceiver(time, cmd.command, cmd.context, cmd.timelineObjId)
				},
				cmd
			)
		})
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 * @param oldAtemState
	 * @param newAtemState
	 */
	private _diffStates(
		oldAtemState: DeviceState,
		newAtemState: DeviceState,
		mappings: Mappings
	): Array<AtemCommandWithContext> {
		// Ensure the state diffs the correct version
		if (this._atem.state) {
			this._state.version = this._atem.state.info.apiVersion
		}

		// bump out any auxes that we don't control as they may be used for CC etc.
		const noOfAuxes = Math.max(oldAtemState.video.auxilliaries.length, newAtemState.video.auxilliaries.length)
		const auxMappings = Object.values(mappings)
			.filter(
				(mapping: Mapping<SomeMappingAtem>): mapping is Mapping<MappingAtemAuxilliary> =>
					mapping.options.mappingType === MappingAtemType.Auxilliary
			)
			.map((mapping) => mapping.options.index)

		for (let i = 0; i < noOfAuxes; i++) {
			if (!auxMappings.includes(i)) {
				oldAtemState.video.auxilliaries[i] = undefined
				newAtemState.video.auxilliaries[i] = undefined
			}
		}

		return _.map(this._state.diffStates(oldAtemState, newAtemState), (cmd: any) => {
			if (_.has(cmd, 'command') && _.has(cmd, 'context')) {
				return cmd as AtemCommandWithContext
			} else {
				// backwards compability, to be removed later:
				return {
					command: cmd as AtemCommands.ISerializableCommand,
					context: null,
					timelineObjId: '', // @todo: implement in Atem-state
				}
			}
		})
	}

	private async _defaultCommandReceiver(
		_time: number,
		command: AtemCommands.ISerializableCommand,
		context: CommandContext,
		timelineObjId: string
	): Promise<any> {
		const cwc: CommandWithContext = {
			context: context,
			command: command,
			timelineObjId: timelineObjId,
		}
		this.emitDebug(cwc)

		return this._atem
			.sendCommand(command)
			.then(() => {
				// @todo: command was acknowledged by atem, how will we check if it did what we wanted?
			})
			.catch((error) => {
				this.emit('commandError', error, cwc)
			})
	}
	private _onAtemStateChanged(newState: Readonly<NativeAtemState>) {
		const psus = newState.info.power || []

		if (!_.isEqual(this._atemStatus.psus, psus)) {
			this._atemStatus.psus = _.clone(psus)

			this._connectionChanged()
		}
	}
	private _connectionChanged() {
		this.emit('connectionChanged', this.getStatus())
	}
	private _isAssignableToNextStyle(transition: AtemTransitionStyle | undefined) {
		return (
			transition !== undefined && transition !== AtemTransitionStyle.DUMMY && transition !== AtemTransitionStyle.CUT
		)
	}
}
