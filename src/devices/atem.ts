import * as _ from 'underscore'
import * as underScoreDeepExtend from 'underscore-deep-extend'
import {
	DeviceWithState,
	CommandWithContext,
	DeviceStatus,
	StatusCode
} from './device'
import {
	DeviceType,
	DeviceOptions,
	TimelineContentTypeAtem,
	MappingAtem,
	MappingAtemType,
	AtemOptions
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

_.mixin({ deepExtend: underScoreDeepExtend(_) })

function deepExtend<T> (destination: T, ...sources: any[]) {
	// @ts-ignore (mixin)
	return _.deepExtend(destination, ...sources)
}
export interface AtemDeviceOptions extends DeviceOptions {
	options?: {
		commandReceiver?: (time: number, cmd) => Promise<any>
	}
}

export interface AtemCommandWithContext {
	command: AtemCommands.AbstractCommand
	context: CommandContext
}
type CommandContext = any

/**
 * This is a wrapper for the Atem Device. Commands to any and all atem devices will be sent through here.
 */
export class AtemDevice extends DeviceWithState<DeviceState> {
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

	private _commandReceiver: (time: number, command: AtemCommands.AbstractCommand, context: CommandContext) => Promise<any>

	constructor (deviceId: string, deviceOptions: AtemDeviceOptions, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		}, SendMode.BURST, this._deviceOptions)
		this._doOnTime.on('error', e => this.emit('error', 'doOnTime', e))
		this._doOnTime.on('slowCommand', msg => this.emit('slowCommand', this.deviceName + ': ' + msg))
	}

	/**
	 * Initiates the connection with the ATEM through the atem-connection lib
	 * and initiates Atem State lib.
	 */
	init (options: AtemOptions): Promise<boolean> {
		return new Promise((resolve, reject) => {
			// This is where we would do initialization, like connecting to the devices, etc
			this._state = new AtemState()
			this._atem = new Atem({ externalLog: console.log })
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
			// this._atem.dispose()
			// .then(() => {
			// resolve(true)
			// })
			resolve(true)
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

	/**
	 * Process a state, diff against previous state and generate commands to
	 * be executed at the state's time.
	 * @param newState The state to handle
	 */
	handleState (newState: TimelineState) {
		if (!this._initialized) { // before it's initialized don't do anything
			this.emit('info', 'Atem not initialized yet')
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

		// Sort layer based on LLayer name
		const sortedLayers = _.map(state.LLayers, (tlObject, layerName) => ({ layerName, tlObject }))
			.sort((a,b) => a.layerName.localeCompare(b.layerName))

		// For every layer, augment the state
		_.each(sortedLayers, ({ tlObject, layerName }) => {
			const content = tlObject.resolved || tlObject.content
			let mapping = this.getMapping()[layerName] as MappingAtem // tslint:disable-line

			if (mapping) {
				if (mapping.index !== undefined && mapping.index >= 0) { // index must be 0 or higher
					switch (mapping.mappingType) {
						case MappingAtemType.MixEffect:
							if (content.type === TimelineContentTypeAtem.ME) {
								let me = deviceState.video.ME[mapping.index]
								if (me) deepExtend(me, content.attributes)
							}
							break
						case MappingAtemType.DownStreamKeyer:
							if (content.type === TimelineContentTypeAtem.DSK) {
								let dsk = deviceState.video.downstreamKeyers[mapping.index]
								if (dsk) deepExtend(dsk, content.attributes)
							}
							break
						case MappingAtemType.SuperSourceBox:
							if (content.type === TimelineContentTypeAtem.SSRC) {
								let ssrc = deviceState.video.superSourceBoxes
								if (ssrc) deepExtend(ssrc, content.attributes.boxes)
							}
							break
						case MappingAtemType.Auxilliary:
							if (content.type === TimelineContentTypeAtem.AUX) {
								deviceState.video.auxilliaries[mapping.index] = content.attributes.input
							}
							break
						case MappingAtemType.MediaPlayer:
							if (content.type === TimelineContentTypeAtem.MEDIAPLAYER) {
								let ms = deviceState.media.players[mapping.index]
								if (ms) deepExtend(ms, content.attributes)
							}
							break
						case MappingAtemType.AudioChannel:
							if (content.type === TimelineContentTypeAtem.AUDIOCHANNEL) {
								const chan = deviceState.audio.channels[mapping.index]
								if (chan) {
									deviceState.audio.channels[mapping.index] = {
										...chan,
										...content.attributes
									}
								}
							}
					}
				}

				if (mapping.mappingType === MappingAtemType.SuperSourceProperties) {
					if (content.type === TimelineContentTypeAtem.SSRCPROPS) {
						let ssrc = deviceState.video.superSourceProperties
						if (ssrc) deepExtend(ssrc, content.attributes)
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

		let deviceStatus: DeviceStatus = {
			statusCode: statusCode,
			messages: messages
		}
		return deviceStatus
	}
	/**
	 * Execute `commandsToAchieveState` at `time` using the doOnTime class
	 * @param commandsToAchieveState 
	 * @param time 
	 */
	private _addToQueue (commandsToAchieveState: Array<AtemCommandWithContext>, time: number) {
		_.each(commandsToAchieveState, (cmd: AtemCommandWithContext) => {

			// add the new commands to the queue:
			this._doOnTime.queue(time, (cmd: AtemCommandWithContext) => {
				return this._commandReceiver(time, cmd.command, cmd.context)
			}, cmd)
		})
	}
	/**
	 * Diffs two states and generate commands based on the diff.
	 * @param oldAtemState 
	 * @param newAtemState 
	 */
	private _diffStates (oldAtemState: DeviceState, newAtemState: DeviceState): Array<AtemCommandWithContext> {
		return _.map(
			this._state.diffStates(oldAtemState, newAtemState),
			(cmd: any) => {
				if (_.has(cmd,'command') && _.has(cmd,'context')) {
					return cmd as AtemCommandWithContext
				} else {
					// backwards compability, to be removed later:
					return {
						command: cmd as AtemCommands.AbstractCommand,
						context: null
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
			deviceState.video.ME[i] = JSON.parse(JSON.stringify(StateDefault.Video.MixEffect)) as VideoState.MixEffect
			for (const usk in this._atem.state.video.ME[i].upstreamKeyers) {
				deviceState.video.ME[i].upstreamKeyers[usk] = JSON.parse(JSON.stringify(StateDefault.Video.UpstreamKeyer(Number(usk))))
				for (const flyKf in this._atem.state.video.ME[i].upstreamKeyers[usk].flyKeyframes) {
					deviceState.video.ME[i].upstreamKeyers[usk].flyKeyframes[flyKf] = JSON.parse(JSON.stringify(StateDefault.Video.flyKeyframe(Number(flyKf))))
				}
			}
		}
		for (let i = 0; i < Object.keys(this._atem.state.video.downstreamKeyers).length; i++) {
			deviceState.video.downstreamKeyers[i] = JSON.parse(JSON.stringify(StateDefault.Video.DownStreamKeyer))
		}
		for (let i = 0; i < this._atem.state.info.capabilities.auxilliaries; i++) {
			deviceState.video.auxilliaries[i] = JSON.parse(JSON.stringify(StateDefault.Video.defaultInput))
		}
		for (let i = 0; i < this._atem.state.info.superSourceBoxes; i++) {
			deviceState.video.superSourceBoxes[i] = JSON.parse(JSON.stringify(StateDefault.Video.SuperSourceBox))
		}
		if (this._atem.state.video.superSourceProperties) {
			deviceState.video.superSourceProperties = JSON.parse(JSON.stringify(StateDefault.Video.SuperSourceProperties))
		}
		for (const i of Object.keys(this._atem.state.audio.channels)) {
			deviceState.audio.channels[i] = JSON.parse(JSON.stringify(StateDefault.Audio.Channel))
		}

		return deviceState
	}

	private _defaultCommandReceiver (_time: number, command: AtemCommands.AbstractCommand, context: CommandContext): Promise<any> {
		let cwc: CommandWithContext = {
			context: context,
			command: command
		}
		this.emit('debug', cwc)

		return this._atem.sendCommand(command).then(() => {
			// @todo: command was acknowledged by atem, how will we check if it did what we wanted?
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
