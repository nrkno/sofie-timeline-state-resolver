import * as _ from 'underscore'
import { Device, DeviceOptions } from './device'
import { DeviceType } from './mapping'

import { TimelineState } from 'superfly-timeline'
import { DoOnTime } from '../doOnTime'

/*
	This is a wrapper for an "Abstract" device

	An abstract device is just a test-device that doesn't really do anything, but can be used
	as a preliminary mock
*/
export interface AbstractDeviceOptions extends DeviceOptions {
	options?: {
		commandReceiver?: (time: number, cmd) => Promise<any>
	}
}
export type Command = any
export class AbstractDevice extends Device {
	private _doOnTime: DoOnTime
	// private _queue: Array<any>

	private _commandReceiver: (time: number, cmd: Command) => Promise<any>

	constructor (deviceId: string, deviceOptions: AbstractDeviceOptions, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		})
		this._doOnTime.on('error', e => this.emit('error', e))
	}

	/**
	 * Initiates the connection with CasparCG through the ccg-connection lib.
	 */
	init (): Promise<boolean> {
		return new Promise((resolve/*, reject*/) => {
			// This is where we would do initialization, like connecting to the devices, etc
			resolve(true)
		})
	}
	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified

		let oldState: TimelineState = this.getStateBefore(newState.time) || { time: 0, LLayers: {}, GLayers: {} }

		let oldAbstractState = this.convertStateToAbstract(oldState)
		let newAbstractState = this.convertStateToAbstract(newState)

		let commandsToAchieveState: Array<Command> = this._diffStates(oldAbstractState, newAbstractState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newState.time)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newState)
	}
	clearFuture (clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	get canConnect (): boolean {
		return false
	}
	get connected (): boolean {
		return false
	}
	convertStateToAbstract (state: TimelineState) {
		// convert the timeline state into something we can use
		return state
	}
	get deviceType () {
		return DeviceType.ABSTRACT
	}
	get deviceName (): string {
		return 'Abstract ' + this.deviceId
	}
	get queue () {
		return this._doOnTime.getQueue()
	}
	private _addToQueue (commandsToAchieveState: Array<Command>, time: number) {
		_.each(commandsToAchieveState, (cmd: Command) => {

			// add the new commands to the queue:
			this._doOnTime.queue(time, (cmd: Command) => {
				return this._commandReceiver(time, cmd)
			}, cmd)
		})
	}
	private _diffStates (oldAbstractState, newAbstractState) {
		// in this abstract class, let's just cheat:

		let commands: Array<any> = []

		_.each(newAbstractState.LLayers, (newLayer: any, layerKey) => {
			let oldLayer = oldAbstractState.LLayers[layerKey]
			if (!oldLayer) {
				// added!
				commands.push({
					commandName: 'addedAbstract',
					content: newLayer.content
				})
			} else {
				// changed?
				if (oldLayer.id !== newLayer.id) {
					// changed!
					commands.push({
						commandName: 'changedAbstract',
						content: newLayer.content
					})
				}
			}
		})
		// removed
		_.each(oldAbstractState.LLayers, (oldLayer: any, layerKey) => {
			let newLayer = newAbstractState.LLayers[layerKey]
			if (!newLayer) {
				// removed!
				commands.push({
					commandName: 'removedAbstract',
					content: oldLayer.content
				})
			}
		})
		return commands
	}
	private _defaultCommandReceiver (time: number, cmd): Promise<any> {
		time = time
		// execute the command here
		cmd = cmd

		return Promise.resolve()
	}
}
