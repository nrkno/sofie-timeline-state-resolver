import * as _ from 'underscore'
import { Device, DeviceOptions } from './device'
import { DeviceType } from './mapping'

import { TimelineState } from 'superfly-timeline'
import { Atem, AtemState as DeviceState } from 'atem-connection'
import { AtemState } from 'atem-state'
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
export class AtemDevice extends Device {

	private _queue: Array<any>
	private _device: Atem
	private _state: AtemState

	private _commandReceiver: (time: number, cmd) => void

	constructor (deviceId: string, deviceOptions: AtemDeviceOptions, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
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
			this._device.once('connected', () => resolve(true))
		})
	}
	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified

		let oldState: TimelineState = this.getStateBefore(newState.time) || {time: 0, LLayers: {}, GLayers: {}}

		let oldAtemState = this.convertStateToAtem(oldState)
		let newAtemState = this.convertStateToAtem(newState)

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
		// @todo: convert the timeline state into something we can use
		return new DeviceState()
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
		// in this abstract class, let's just cheat:

		let commands: Array<AbstractCommand> = this._state.diffStates(oldAbstractState, newAbstractState)

		return commands
	}
}
