import * as _ from 'underscore'
import * as underScoreDeepExtend from 'underscore-deep-extend'
import { Device, DeviceOptions } from './device'
import { DeviceType, MappingAtem, MappingAtemType, TimelineResolvedObjectExtended } from './mapping'

import { TimelineState } from 'superfly-timeline'
import { Atem, VideoState, Commands as AtemCommands } from 'atem-connection'
import { AtemState, State as DeviceState, Defaults as StateDefault } from 'atem-state'
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
export interface AtemOptions {
	host: string
	port?: number
}
export enum TimelineContentTypeAtem { //  Atem-state
	ME = 'me',
	DSK = 'dsk',
	AUX = 'aux',
	SSRC = 'ssrc',
	MEDIAPLAYER = 'mp'
}
export class AtemDevice extends Device {

	// private _queue: Array<any>
	private _doOnTime: DoOnTime

	private _device: Atem
	private _state: AtemState
	private _initialized: boolean = false
	private _connected: boolean = false // note: ideally this should be replaced by this._device.connected
	private _conductor: Conductor

	private _commandReceiver: (time: number, cmd) => Promise<any>

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
		return new Promise((resolve/*, reject*/) => {
			// This is where we would do initialization, like connecting to the devices, etc
			this._state = new AtemState()
			this._device = new Atem()
			this._device.connect(options.host, options.port)
			this._device.once('connected', () => {
				// console.log('-------------- ATEM CONNECTED')
				// this.emit('connectionChanged', true)
				// check if state has been initialized:
				this._connected = true
				this._initialized = true
				resolve(true)
			})
			this._device.on('connected', () => {
				this.setState(this._device.state, this.getCurrentTime())
				this._connected = true
				this.emit('connectionChanged', true)
				this._conductor.resetResolver()
			})
			this._device.on('disconnected', () => {
				this._connected = false
				this.emit('connectionChanged', false)
			})
			this._device.on('error', (e) => this.emit('error', e))
		})
	}
	terminate (): Promise<boolean> {
		return new Promise((resolve) => {
			// TODO: implement dispose function in atem-connection
			// this._device.dispose()
			// .then(() => {
			// resolve(true)
			// })
			resolve(true)
		})
	}
	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified
		// @ts-ignore
		// console.log('handleState', JSON.stringify(newState, ' ', 2))
		// console.log('handleState', newState.LLayers['myLayer0'])

		if (!this._initialized) {
			// before it's initialized don't do anything
			this._log('Atem not initialized yet')
			return
		}
		let oldState = this.getStateBefore(newState.time) || this._getDefaultState()

		let oldAtemState = oldState
		let newAtemState = this.convertStateToAtem(newState)

		// @ts-ignore
		// console.log('newAtemState', JSON.stringify(newAtemState, ' ', 2))
		// console.log('oldAtemState', JSON.stringify(oldAtemState, ' ', 2))
		// console.log('newAtemState', newAtemState.video.ME[0])

		let commandsToAchieveState: Array<AtemCommands.AbstractCommand> = this._diffStates(oldAtemState, newAtemState)

		// console.log('commandsToAchieveState', commandsToAchieveState)
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueAfter(newState.time)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newAtemState, newState.time)
	}
	clearFuture (clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
		// Clear any scheduled commands after this time
		// this._queue = _.reject(this._queue, (q) => { return q.time > clearAfterTime })
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
			let mapping = this.mapping[layerName] as MappingAtem
			if (!mapping && tlObjectExt.originalLLayer) {
				mapping = this.mapping[tlObjectExt.originalLLayer] as MappingAtem
			}

			if (mapping) {
				if (mapping.index !== undefined && mapping.index >= 0) { // index must be 0 or higher
					// 	obj = {}
					// 	obj[mapping.index] = tlObject.content
					// }
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
	private _addToQueue (commandsToAchieveState: Array<AtemCommands.AbstractCommand>, time: number) {
		_.each(commandsToAchieveState, (cmd: AtemCommands.AbstractCommand) => {

			// add the new commands to the queue:
			this._doOnTime.queue(time, (cmd: AtemCommands.AbstractCommand) => {
				return this._commandReceiver(time, cmd)
			}, cmd)
		})
	}
	private _diffStates (oldAbstractState, newAbstractState): Array<AtemCommands.AbstractCommand> {
		let commands: Array<AtemCommands.AbstractCommand> = this._state.diffStates(oldAbstractState, newAbstractState)

		return commands
	}

	private _getDefaultState (): DeviceState {
		let deviceState = new DeviceState()

		for (let i = 0; i < this._device.state.info.capabilities.MEs; i++) {
			deviceState.video.ME[i] = JSON.parse(JSON.stringify(StateDefault.Video.MixEffect)) as VideoState.MixEffect
			for (const usk in this._device.state.video.ME[i].upstreamKeyers) {
				deviceState.video.ME[i].upstreamKeyers[usk] = JSON.parse(JSON.stringify(StateDefault.Video.UpstreamKeyer(Number(usk))))
				for (const flyKf in this._device.state.video.ME[i].upstreamKeyers[usk].flyKeyframes) {
					deviceState.video.ME[i].upstreamKeyers[usk].flyKeyframes[flyKf] = JSON.parse(JSON.stringify(StateDefault.Video.flyKeyframe(Number(flyKf))))
				}
			}
		}
		for (let i = 0; i < Object.keys(this._device.state.video.downstreamKeyers).length; i++) {
			deviceState.video.downstreamKeyers[i] = JSON.parse(JSON.stringify(StateDefault.Video.DownStreamKeyer))
		}
		for (let i = 0; i < this._device.state.info.capabilities.auxilliaries; i++) {
			deviceState.video.auxilliaries[i] = JSON.parse(JSON.stringify(StateDefault.Video.defaultInput))
		}
		for (let i = 0; i < this._device.state.info.superSourceBoxes; i++) {
			deviceState.video.superSourceBoxes[i] = JSON.parse(JSON.stringify(StateDefault.Video.SuperSourceBox))
		}

		return deviceState
	}

	private _defaultCommandReceiver (time: number, command: AtemCommands.AbstractCommand): Promise<any> {
		time = time // seriously this needs to stop
		return this._device.sendCommand(command).then(() => {
			// @todo: command was acknowledged by atem, how will we check if it did what we wanted?
		})
	}

	// private _enforceDeviceState () {
	// 	const actualState = this._device.state
	// 	const theoreticalState = this.convertStateToAtem(this.getStateBefore(this.getCurrentTime()) || { LLayers: {}, GLayers: {}, time: this.getCurrentTime() })

	// 	const commandsToAchieveState = this._diffStates(actualState, theoreticalState)

	// 	this._addToQueue(commandsToAchieveState, this.getCurrentTime())
	// }
}
