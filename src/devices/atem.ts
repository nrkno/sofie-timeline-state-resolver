import * as _ from 'underscore'
import { Device, DeviceOptions } from './device'
import { DeviceType, MappingAtem, MappingAtemType } from './mapping'

import { TimelineState, TimelineResolvedObject } from 'superfly-timeline'
import { Atem, VideoState } from 'atem-connection'
import { AtemState, State as DeviceState, Defaults as StateDefault } from 'atem-state'
import AbstractCommand from 'atem-connection/dist/commands/AbstractCommand'

/*
	This is a wrapper for the Atem Device. Commands to any and all atem devices will be sent through here.
*/
export interface AtemDeviceOptions extends DeviceOptions {
	options?: {
		commandReceiver?: (time: number, cmd) => void
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

	private _queue: Array<any>
	private _device: Atem
	private _state: AtemState
	private _initialized: boolean = false

	private _commandReceiver: (time: number, cmd) => void

	constructor (deviceId: string, deviceOptions: AtemDeviceOptions, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}

		setInterval(() => {
			// send any commands due:

			let now = this.getCurrentTime()

			this._queue = _.reject(this._queue, (q) => {
				if (q.time <= now) {
					if (this._commandReceiver) {
						this._commandReceiver(now, q.command)
					}
					return true
				}
				return false
			})
		}, 100)
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
				// check if state has been initialized:
				this._initialized = true
				resolve(true)
			})
		})
	}
	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified
		// @ts-ignore
		// console.log('handleState', JSON.stringify(newState, ' ', 2))

		if (!this._initialized) {
			// before it's initialized don't do anything
			return
		}
		let oldState: TimelineState = this.getStateBefore(newState.time) || {time: 0, LLayers: {}, GLayers: {}}

		let oldAtemState = this.convertStateToAtem(oldState)
		let newAtemState = this.convertStateToAtem(newState)

		// @ts-ignore
		// console.log('newAtemState', JSON.stringify(newAtemState, ' ', 2))

		let commandsToAchieveState: Array<AbstractCommand> = this._diffStates(oldAtemState, newAtemState)

		// clear any queued commands on this time:
		this._queue = _.reject(this._queue, (q) => { return q.time === newState.time })

		// add the new commands to the queue:
		_.each(commandsToAchieveState, (cmd) => {
			this._queue.push({
				time: newState.time,
				command: cmd
			})
		})

		// store the new state, for later use:
		this.setState(newState)
	}
	clearFuture (clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._queue = _.reject(this._queue, (q) => { return q.time > clearAfterTime })
	}
	get connected (): boolean {
		return false
	}
	convertStateToAtem (state: TimelineState): DeviceState {
		if (!this._initialized) throw Error('convertStateToAtem cannot be used before inititialized')

		// Convert the timeline state into something we can use easier:
		const deviceState = this._getDefaultState()

		_.each(state.LLayers, (tlObject: TimelineResolvedObject, layerName: string) => {
			let content = tlObject.content
			const mapping = this.mapping[layerName] as MappingAtem
			if (mapping) {
				if (!(mapping.index !== undefined && mapping.index >= 0)) return // index must be 0 or higher
				// 	obj = {}
				// 	obj[mapping.index] = tlObject.content
				// }
				switch (mapping.mappingType) {
					case MappingAtemType.MixEffect:
						if (content.type === TimelineContentTypeAtem.ME) {
							let me = deviceState.video.ME[mapping.index]
							_.extend(me, content.attributes)
						}
						break
					case MappingAtemType.DownStreamKeyer:
						if (content.type === TimelineContentTypeAtem.DSK) {
							let dsk = deviceState.video.downstreamKeyers[mapping.index]
							_.extend(dsk, content.attributes)
						}
						break
					case MappingAtemType.SuperSourceBox:
						if (content.type === TimelineContentTypeAtem.SSRC) {
							let ssrc = deviceState.video.superSourceBoxes
							_.extend(ssrc, content.attributes.boxes)
						}
						break
					case MappingAtemType.Auxilliary:
						if (content.type === TimelineContentTypeAtem.AUX) {
							let aux = deviceState.video.auxilliaries[mapping.index]
							_.extend(aux, content.attributes)
						}
						break
					case MappingAtemType.MediaPlayer:
						if (content.type === TimelineContentTypeAtem.MEDIAPLAYER) {
							let ms = deviceState.media.players[mapping.index]
							_.extend(ms, content.attributes)
						}
						break
				}
			}

			// const traverseState = (mutation, mutableObj) => {
			// 	for (const key in mutation) {
			// 		if (typeof mutation[key] === 'object' && mutableObj[key]) {
			// 			traverseState(mutation[key], mutableObj[key])
			// 		} else {
			// 			mutableObj[key] = mutation[key]
			// 		}
			// 	}
			// }

			// traverseState(obj, deviceState)
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
		return _.values(this._queue)
	}

	private _diffStates (oldAbstractState, newAbstractState): Array<AbstractCommand> {
		let commands: Array<AbstractCommand> = this._state.diffStates(oldAbstractState, newAbstractState)

		return commands
	}

	private _getDefaultState (): DeviceState {
		let deviceState = new DeviceState()

		for (let i = 0; i < this._device.state.info.capabilities.MEs; i++) {
			deviceState.video.ME[i] = JSON.parse(JSON.stringify(StateDefault.Video.MixEffect)) as VideoState.MixEffect
		}
		for (let i = 0; i < this._device.state.video.downstreamKeyers.length; i++) {
			deviceState.video.downstreamKeyers[i] = JSON.parse(JSON.stringify(StateDefault.Video.DownStreamKeyer))
		}
		for (let i = 0; i < this._device.state.info.capabilities.auxilliaries; i++) {
			deviceState.video.auxilliaries[i] = JSON.parse(JSON.stringify(StateDefault.Video.defaultInput))
		}
		for (let i = 0; i < 4 /* @todo from _SSC */; i++) {
			deviceState.video.superSourceBoxes[i] = JSON.parse(JSON.stringify(StateDefault.Video.SuperSourceBox))
		}

		return deviceState
	}

	private _defaultCommandReceiver (time: number, command: AbstractCommand) {
		time = time // seriously this needs to stop
		this._device.sendCommand(command).then(() => {
			// @todo: command was acknowledged by atem, how will we check if it did what we wanted?
		})
	}
}
