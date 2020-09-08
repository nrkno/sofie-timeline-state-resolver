import * as _ from 'underscore'
import * as underScoreDeepExtend from 'underscore-deep-extend'
import {
	DeviceWithState,
	CommandWithContext,
	DeviceStatus,
	StatusCode,
	IDevice
} from './device'
import {
	DeviceType,
	TimelineContentTypeAtem,
	MappingAtem,
	MappingAtemType,
	AtemOptions,
	TimelineObjAtemME,
	TimelineObjAtemDSK,
	TimelineObjAtemMediaPlayer,
	TimelineObjAtemAudioChannel,
	TimelineObjAtemSsrc,
	TimelineObjAtemAUX,
	TimelineObjAtemSsrcProps,
	TimelineObjAtemMacroPlayer,
	DeviceOptionsAtem
} from '../types/src'
import { TimelineState } from 'superfly-timeline'
import {
	Atem,
	VideoState,
	AtemState as AtemAtemState,
	Commands as AtemCommands
} from 'atem-connection'
import {
	AtemState,
	State as DeviceState,
	Defaults as StateDefault
} from 'atem-state'
import { DoOnTime, SendMode } from '../doOnTime'
import { SuperSourceInfo } from 'atem-connection/dist/state/info'

_.mixin({ deepExtend: underScoreDeepExtend(_) })

function jsonClone<T> (src: T): T {
	return JSON.parse(JSON.stringify(src))
}
function deepExtend<T> (destination: T, ...sources: any[]) {
	// @ts-ignore (mixin)
	return _.deepExtend(destination, ...sources)
}

export interface AtemCommandWithContext {
	command: AtemCommands.AbstractCommand
	context: CommandContext
	timelineObjId: string
}
type CommandContext = any

export interface DeviceOptionsAtemInternal extends DeviceOptionsAtem {
	options: (
		DeviceOptionsAtem['options'] &
		{ commandReceiver?: CommandReceiver }
	)
}
export type CommandReceiver = (time: number, command: AtemCommands.AbstractCommand, context: CommandContext, timelineObjId: string) => Promise<any>

/**
 * This is a wrapper for the Atem Device. Commands to any and all atem devices will be sent through here.
 */
export class AtemDevice extends DeviceWithState<DeviceState> implements IDevice {
	private _doOnTime: DoOnTime

	private _atem: Atem
	private _state: AtemState
	private _initialized: boolean = false
	private _connected: boolean = false // note: ideally this should be replaced by this._atem.connected

	private firstStateAfterMakeReady: boolean = true // note: temprorary for some improved logging

	private _atemStatus: {
		psus: Array<boolean>
	} = {
		psus: []
	}

	private _commandReceiver: CommandReceiver

	constructor (deviceId: string, deviceOptions: DeviceOptionsAtemInternal, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		}, SendMode.BURST, this._deviceOptions)
		this.handleDoOnTime(this._doOnTime, 'Atem')
	}

	/**
	 * Initiates the connection with the ATEM through the atem-connection lib
	 * and initiates Atem State lib.
	 */
	init (options: AtemOptions): Promise<boolean> {
		return new Promise((resolve, reject) => {
			// This is where we would do initialization, like connecting to the devices, etc
			this._state = new AtemState()
			this._atem = new Atem({ externalLog: (...args) => this.emit('info', JSON.stringify(args)) })
			this._atem.once('connected', () => {
				// check if state has been initialized:
				this._connected = true
				this._initialized = true
				resolve(true)
			})
			this._atem.on('connected', () => {
				let time = this.getCurrentTime()
				this.setState(this._atem.state, time)
				this._connected = true
				this._connectionChanged()
				this.emit('resetResolver')

			})
			this._atem.on('disconnected', () => {
				this._connected = false
				this._connectionChanged()
			})
			this._atem.on('error', (e) => this.emit('error', 'Atem', e))
			this._atem.on('stateChanged', (state) => this._onAtemStateChanged(state))

			this._atem.connect(options.host, options.port)
			.catch(e => {
				reject(e)
			})
		})
	}
	/**
	 * Safely terminate everything to do with this device such that it can be
	 * garbage collected.
	 */
	terminate (): Promise<boolean> {
		this._doOnTime.dispose()

		return new Promise((resolve) => {
			// TODO: implement dispose function in atem-connection
			this._atem.disconnect()
			.then(() => {
				resolve(true)
			})
			.catch(() => {
				resolve(false)
			})
		})
	}

	/**
	 * Prepare device for playout
	 * @param okToDestroyStuff If true, may break output
	 */
	async makeReady (okToDestroyStuff?: boolean): Promise<void> {
		this.firstStateAfterMakeReady = true
		if (okToDestroyStuff) {
			this._doOnTime.clearQueueNowAndAfter(this.getCurrentTime())
			this.setState(this._atem.state, this.getCurrentTime())
		}
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState (newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	/**
	 * Process a state, diff against previous state and generate commands to
	 * be executed at the state's time.
	 * @param newState The state to handle
	 */
	handleState (newState: TimelineState) {
		if (!this._initialized) { // before it's initialized don't do anything
			this.emit('warning', 'Atem not initialized yet')
			return
		}

		let previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		let oldState: DeviceState = (this.getStateBefore(previousStateTime) || { state: this._getDefaultState() }).state

		let oldAtemState = oldState
		let newAtemState = this.convertStateToAtem(newState)

		if (this.firstStateAfterMakeReady) { // emit a debug message with the states:
			this.firstStateAfterMakeReady = false
			this.emit('debug', JSON.stringify({ reason: 'firstStateAfterMakeReady', before: (oldAtemState || {}).video, after: (newAtemState || {}).video }))
		}

		let commandsToAchieveState: Array<AtemCommandWithContext> = this._diffStates(oldAtemState, newAtemState)

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
	clearFuture (clearAfterTime: number) {
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	get canConnect (): boolean {
		return true
	}
	get connected (): boolean {
		return this._connected
	}
	/**
	 * Convert a timeline state into an Atem state.
	 * @param state The state to be converted
	 */
	convertStateToAtem (state: TimelineState): DeviceState {
		if (!this._initialized) throw Error('convertStateToAtem cannot be used before inititialized')

		// Start out with default state:
		const deviceState = this._getDefaultState()

		// Sort layer based on Layer name
		const sortedLayers = _.map(state.layers, (tlObject, layerName) => ({ layerName, tlObject }))
			.sort((a,b) => a.layerName.localeCompare(b.layerName))

		// For every layer, augment the state
		_.each(sortedLayers, ({ tlObject, layerName }) => {
			// const content = tlObject.content

			let mapping = this.getMapping()[layerName] as MappingAtem | undefined

			if (mapping && mapping.deviceId === this.deviceId) {
				if (mapping.index !== undefined && mapping.index >= 0) { // index must be 0 or higher
					switch (mapping.mappingType) {
						case MappingAtemType.MixEffect:
							if (tlObject.content.type === TimelineContentTypeAtem.ME) {
								let me = deviceState.video.ME[mapping.index]
								let atemObj = tlObject as any as TimelineObjAtemME
								if (me) deepExtend(me, atemObj.content.me)
							}
							break
						case MappingAtemType.DownStreamKeyer:
							if (tlObject.content.type === TimelineContentTypeAtem.DSK) {
								let dsk = deviceState.video.downstreamKeyers[mapping.index]
								let atemObj = tlObject as any as TimelineObjAtemDSK
								if (dsk) deepExtend(dsk, atemObj.content.dsk)
							}
							break
						case MappingAtemType.SuperSourceBox:
							if (tlObject.content.type === TimelineContentTypeAtem.SSRC) {
								let ssrc = deviceState.video.superSources[mapping.index]
								let atemObj = tlObject as any as TimelineObjAtemSsrc
								if (ssrc) deepExtend(ssrc.boxes, atemObj.content.ssrc.boxes)
							}
							break
						case MappingAtemType.SuperSourceProperties:
							if (tlObject.content.type === TimelineContentTypeAtem.SSRCPROPS) {
								let ssrc = deviceState.video.superSources[mapping.index]
								let atemObj = tlObject as any as TimelineObjAtemSsrcProps
								if (ssrc) deepExtend(ssrc.properties, atemObj.content.ssrcProps)
							}
							break
						case MappingAtemType.Auxilliary:
							if (tlObject.content.type === TimelineContentTypeAtem.AUX) {
								let atemObj = tlObject as any as TimelineObjAtemAUX
								deviceState.video.auxilliaries[mapping.index] = atemObj.content.aux.input
							}
							break
						case MappingAtemType.MediaPlayer:
							if (tlObject.content.type === TimelineContentTypeAtem.MEDIAPLAYER) {
								let ms = deviceState.media.players[mapping.index]
								let atemObj = tlObject as any as TimelineObjAtemMediaPlayer
								if (ms) deepExtend(ms, atemObj.content.mediaPlayer)
							}
							break
						case MappingAtemType.AudioChannel:
							if (tlObject.content.type === TimelineContentTypeAtem.AUDIOCHANNEL) {
								const chan = deviceState.audio.channels[mapping.index]
								let atemObj = tlObject as any as TimelineObjAtemAudioChannel
								if (chan) {
									deviceState.audio.channels[mapping.index] = {
										...chan,
										...atemObj.content.audioChannel
									}
								}
							}
							break
					}
				}

				if (mapping.mappingType === MappingAtemType.MacroPlayer) {
					if (tlObject.content.type === TimelineContentTypeAtem.MACROPLAYER) {
						let ms = deviceState.macro.macroPlayer
						let atemObj = tlObject as any as TimelineObjAtemMacroPlayer
						if (ms) deepExtend(ms, atemObj.content.macroPlayer)
					}
				}
			}
		})

		return deviceState
	}
	get deviceType () {
		return DeviceType.ATEM
	}
	get deviceName (): string {
		return 'Atem ' + this.deviceId
	}
	get queue () {
		return this._doOnTime.getQueue()
	}
	doCustomCommand (commandName: string, args: any[]): Promise<any> {
		const fcn = this._atem[commandName]
		if (!fcn) throw new Error(`Method Atem.${commandName} not found!`)

		return Promise.resolve(fcn(...args))
	}
	/**
	 * Check status and return it with useful messages appended.
	 */
	public getStatus (): DeviceStatus {
		let statusCode = StatusCode.GOOD
		let messages: Array<string> = []

		if (statusCode === StatusCode.GOOD) {
			if (!this._connected) {
				statusCode = StatusCode.BAD
				messages.push(`Atem disconnected`)
			}
		}
		if (statusCode === StatusCode.GOOD) {
			let psus = this._atemStatus.psus

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

		let deviceStatus: DeviceStatus = {
			statusCode: statusCode,
			messages: messages,
			active: this.isActive
		}
		return deviceStatus
	}
	/**
	 * Add commands to queue, to be executed at the right time
	 */
	private _addToQueue (commandsToAchieveState: Array<AtemCommandWithContext>, time: number) {
		_.each(commandsToAchieveState, (cmd: AtemCommandWithContext) => {

			// add the new commands to the queue:
			this._doOnTime.queue(time, undefined, (cmd: AtemCommandWithContext) => {
				return this._commandReceiver(time, cmd.command, cmd.context, cmd.timelineObjId)
			}, cmd)
		})
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 * @param oldAtemState
	 * @param newAtemState
	 */
	private _diffStates (oldAtemState: DeviceState, newAtemState: DeviceState): Array<AtemCommandWithContext> {
		// Ensure the state diffs the correct version
		this._state.version = this._atem.state.info.apiVersion

		return _.map(
			this._state.diffStates(oldAtemState, newAtemState),
			(cmd: any) => {
				if (_.has(cmd,'command') && _.has(cmd,'context')) {
					return cmd as AtemCommandWithContext
				} else {
					// backwards compability, to be removed later:
					return {
						command: cmd as AtemCommands.AbstractCommand,
						context: null,
						timelineObjId: '' // @todo: implement in Atem-state
					}
				}
			}
		)
	}

	/**
	 * Returns the default state of an atem device, partially base on the topology and partially based on reported
	 * properties. This can be used to augment with device state info.
	 */
	private _getDefaultState (): DeviceState {
		let deviceState = new DeviceState()

		for (let i = 0; i < this._atem.state.info.capabilities.MEs; i++) {
			deviceState.video.ME[i] = Object.assign(new VideoState.MixEffect(i), jsonClone(StateDefault.Video.MixEffect))
			for (const usk in this._atem.state.video.ME[i].upstreamKeyers) {
				deviceState.video.ME[i].upstreamKeyers[usk] = jsonClone(StateDefault.Video.UpstreamKeyer(Number(usk)))
				for (const flyKf in this._atem.state.video.ME[i].upstreamKeyers[usk].flyKeyframes) {
					deviceState.video.ME[i].upstreamKeyers[usk].flyKeyframes[flyKf] = jsonClone(StateDefault.Video.flyKeyframe(Number(flyKf)))
				}
			}
		}
		for (let i = 0; i < Object.keys(this._atem.state.video.downstreamKeyers).length; i++) {
			deviceState.video.downstreamKeyers[i] = jsonClone(StateDefault.Video.DownStreamKeyer)
		}
		for (let i = 0; i < this._atem.state.info.capabilities.auxilliaries; i++) {
			deviceState.video.auxilliaries[i] = jsonClone(StateDefault.Video.defaultInput)
		}
		for (let i = 0; i < this._atem.state.info.capabilities.superSources; i++) {
			const ssrc = new VideoState.SuperSource(i)
			ssrc.properties = jsonClone(StateDefault.Video.SuperSourceProperties)
			ssrc.border = jsonClone(StateDefault.Video.SuperSourceBorder)

			const ssrcInfo = this._atem.state.info.superSources[i] as SuperSourceInfo | undefined
			const boxCount = ssrcInfo ? ssrcInfo.boxCount : 4
			for (let i = 0; i < boxCount; i++) {
				ssrc.boxes[i] = jsonClone(StateDefault.Video.SuperSourceBox)
			}

			deviceState.video.superSources[i] = ssrc
		}
		for (const i of Object.keys(this._atem.state.audio.channels)) {
			deviceState.audio.channels[i] = jsonClone(StateDefault.Audio.Channel)
		}

		deviceState.macro.macroPlayer = jsonClone(StateDefault.Video.MacroPlayer)

		for (let i = 0; i < this._atem.state.info.capabilities.mediaPlayers; i++) {
			deviceState.media.players[i] = {
				...jsonClone(StateDefault.Video.MediaPlayer),
				// default to matching index
				clipIndex: i,
				stillIndex: i
			}
		}

		return deviceState
	}

	private _defaultCommandReceiver (_time: number, command: AtemCommands.AbstractCommand, context: CommandContext, timelineObjId: string): Promise<any> {
		let cwc: CommandWithContext = {
			context: context,
			command: command,
			timelineObjId: timelineObjId
		}
		this.emit('debug', cwc)

		return this._atem.sendCommand(command)
		.then(() => {
			// @todo: command was acknowledged by atem, how will we check if it did what we wanted?
		})
		.catch((error) => {
			this.emit('commandError', error, cwc)
		})
	}
	private _onAtemStateChanged (newState: AtemAtemState) {
		let psus = newState.info.power || []

		if (!_.isEqual(this._atemStatus.psus, psus)) {
			this._atemStatus.psus = _.clone(psus)

			this._connectionChanged()
		}
	}
	private _connectionChanged () {
		this.emit('connectionChanged', this.getStatus())
	}
}
