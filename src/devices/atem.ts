import * as _ from 'underscore'
import * as underScoreDeepExtend from 'underscore-deep-extend'
import {
	DeviceWithState,
	DeviceOptions,
	CommandWithContext,
	DeviceStatus,
	StatusCode
} from './device'
import {
	DeviceType,
	TimelineResolvedObjectExtended,
	TimelineContentTypeAtem,
	MappingAtem,
	MappingAtemType,
	AtemOptions
} from '../types/'
import { TimelineState } from 'superfly-timeline'
import {
	Atem,
	VideoState,
	Commands as AtemCommands
} from 'atem-connection'
import {
	AtemState,
	State as DeviceState,
	Defaults as StateDefault
} from 'atem-state'
import { DoOnTime } from '../doOnTime'
import { Conductor } from '../conductor'

_.mixin({ deepExtend: underScoreDeepExtend(_) })

function deepExtend<T> (destination: T, ...sources: any[]) {
	// @ts-ignore (mixin)
	return _.deepExtend(destination, ...sources)
}
/**
 * This is a wrapper for the Atem Device. Commands to any and all atem devices will be sent through here.
 */
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
export class AtemDevice extends DeviceWithState<DeviceState> {

	// private _queue: Array<any>
	private _doOnTime: DoOnTime

	private _atem: Atem
	private _state: AtemState
	private _initialized: boolean = false
	private _connected: boolean = false // note: ideally this should be replaced by this._atem.connected
	private _conductor: Conductor

	private firstStateAfterMakeReady: boolean = true // note: temprorary for some improved logging

	private _commandReceiver: (time: number, command: AtemCommands.AbstractCommand, context: CommandContext) => Promise<any>

	constructor (deviceId: string, deviceOptions: AtemDeviceOptions, options, conductor: Conductor) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		})
		this._doOnTime.on('error', e => this.emit('error', e))
		this._conductor = conductor
	}

	/**
	 * Initiates the connection with the ATEM through the atem-connection lib.
	 */
	init (options: AtemOptions): Promise<boolean> {
		return new Promise((resolve, reject) => {
			// This is where we would do initialization, like connecting to the devices, etc
			this._state = new AtemState()
			this._atem = new Atem()
			this._atem.once('connected', () => {
				// check if state has been initialized:
				this._connected = true
				this._initialized = true
				resolve(true)
			})
			this._atem.on('connected', () => {
				this.setState(this._atem.state, this.getCurrentTime())
				this._connected = true
				this._connectionChanged()
				this._conductor.resetResolver()
			})
			this._atem.on('disconnected', () => {
				this._connected = false
				this._connectionChanged()
			})
			this._atem.on('error', (e) => this.emit('error', e))

			this._atem.connect(options.host, options.port)
			.catch(e => {
				reject(e)
			})
		})
	}
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

	makeReady (okToDestroyStuff?: boolean): Promise<void> {
		this.firstStateAfterMakeReady = true
		if (okToDestroyStuff) {
			this._doOnTime.clearQueueNowAndAfter(this.getCurrentTime())
			this.setState(this._atem.state, this.getCurrentTime())
		}
		return Promise.resolve()
	}

	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified
		// @ts-ignore
		// console.log('handleState', JSON.stringify(newState, ' ', 2))
		// console.log('handleState', newState.LLayers['myLayer0'])

		if (!this._initialized) {
			// before it's initialized don't do anything
			this.emit('info', 'Atem not initialized yet')
			return
		}
		let oldState: DeviceState = (this.getStateBefore(newState.time) || { state: this._getDefaultState() }).state

		let oldAtemState = oldState
		let newAtemState = this.convertStateToAtem(newState)

		if (this.firstStateAfterMakeReady) {
			this.firstStateAfterMakeReady = false
			this.emit('info', { reason: 'firstStateAfterMakeReady', before: (oldAtemState || {}).video, after: (newAtemState || {}).video })
		}

		// @ts-ignore
		// console.log('newAtemState', JSON.stringify(newAtemState, ' ', 2))
		// console.log('oldAtemState', JSON.stringify(oldAtemState, ' ', 2))
		// console.log('newAtemState', newAtemState.video.ME[0])

		let commandsToAchieveState: Array<AtemCommandWithContext> = this._diffStates(oldAtemState, newAtemState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newState.time)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newAtemState, newState.time)
	}
	clearFuture (clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	get canConnect (): boolean {
		return true
	}
	get connected (): boolean {
		return this._connected
	}
	convertStateToAtem (state: TimelineState): DeviceState {
		if (!this._initialized) throw Error('convertStateToAtem cannot be used before inititialized')

		// Convert the timeline state into something we can use easier:
		const deviceState = this._getDefaultState()

		const sortedLayers = _.map(state.LLayers, (tlObject, layerName) => ({ layerName, tlObject }))
			.sort((a,b) => a.layerName.localeCompare(b.layerName))

		_.each(sortedLayers, ({ tlObject, layerName }) => {
			const tlObjectExt = tlObject as TimelineResolvedObjectExtended
			const content = tlObject.resolved || tlObject.content
			let mapping = this.mapping[layerName] as MappingAtem // tslint:disable-line
			if (!mapping && tlObjectExt.originalLLayer) {
				mapping = this.mapping[tlObjectExt.originalLLayer] as MappingAtem // tslint:disable-line
			}

			if (mapping) {
				if (mapping.index !== undefined && mapping.index >= 0) { // index must be 0 or higher

					switch (mapping.mappingType) {
						case MappingAtemType.MixEffect:
							if (tlObjectExt.isBackground) {
								break
							}
							if (content.type === TimelineContentTypeAtem.ME) {
								let me = deviceState.video.ME[mapping.index]
								if (me) deepExtend(me, content.attributes)
							}
							break
						case MappingAtemType.DownStreamKeyer:
							if (tlObjectExt.isBackground) {
								break
							}
							if (content.type === TimelineContentTypeAtem.DSK) {
								let dsk = deviceState.video.downstreamKeyers[mapping.index]
								if (dsk) deepExtend(dsk, content.attributes)
							}
							break
						case MappingAtemType.SuperSourceBox:
							if (tlObjectExt.isBackground && (!tlObjectExt.originalLLayer || tlObjectExt.originalLLayer && state.LLayers[tlObjectExt.originalLLayer])) {
								break
							}
							if (content.type === TimelineContentTypeAtem.SSRC) {
								let ssrc = deviceState.video.superSourceBoxes
								if (ssrc) deepExtend(ssrc, content.attributes.boxes)
							}
							break
						case MappingAtemType.Auxilliary:
							if (tlObjectExt.isBackground) {
								break
							}
							if (content.type === TimelineContentTypeAtem.AUX) {
								deviceState.video.auxilliaries[mapping.index] = content.attributes.input
							}
							break
						case MappingAtemType.MediaPlayer:
							if (tlObjectExt.isBackground) {
								break
							}
							if (content.type === TimelineContentTypeAtem.MEDIAPLAYER) {
								let ms = deviceState.media.players[mapping.index]
								if (ms) deepExtend(ms, content.attributes)
							}
							break
					}
				}
				if (mapping.mappingType === MappingAtemType.SuperSourceProperties) {
					if (!(tlObjectExt.isBackground && (!tlObjectExt.originalLLayer || tlObjectExt.originalLLayer && state.LLayers[tlObjectExt.originalLLayer]))) {
						if (content.type === TimelineContentTypeAtem.SSRCPROPS) {
							let ssrc = deviceState.video.superSourceProperties
							if (ssrc) deepExtend(ssrc, content.attributes)
						}
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
			let psus = this._atem.state.info.power || []

			// psus = [true, false] // tmp test
			_.each(psus, (psu: boolean, i: number) => {
				if (!psu) {
					statusCode = StatusCode.WARNING_MAJOR
					messages.push(`Atem PSU ${i + 1}/${psus.length} is faulty`)
				}
			})
		}

		let deviceStatus: DeviceStatus = {
			statusCode: statusCode,
			messages: messages
		}
		return deviceStatus
	}
	private _addToQueue (commandsToAchieveState: Array<AtemCommandWithContext>, time: number) {
		_.each(commandsToAchieveState, (cmd: AtemCommandWithContext) => {

			// add the new commands to the queue:
			this._doOnTime.queue(time, (cmd: AtemCommandWithContext) => {
				return this._commandReceiver(time, cmd.command, cmd.context)
			}, cmd)
		})
	}
	private _diffStates (oldAbstractState: DeviceState, newAbstractState: DeviceState): Array<AtemCommandWithContext> {
		return _.map(
			this._state.diffStates(oldAbstractState, newAbstractState),
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
	private _connectionChanged () {
		this.emit('connectionChanged', this.getStatus())
	}
}
