import * as _ from 'underscore'
import { Device } from './device'
import { DeviceType } from './mapping'

import { TimelineState } from 'superfly-timeline'

/*
	This is a wrapper for an "Abstract" device

	An abstract device is just a test-device that doesn't really do anything, but can be used
	as a preliminary mock
*/
export class AbstractDevice extends Device {

	private _queue: Array<any>

	private _commandReceiver: (time: number, cmd) => void

	constructor (deviceId: string, deviceOptions: any, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
		}

		setInterval(() => {
			// send any commands due:

			let now = this.getCurrentTime()

			// console.log('check queue ' + now, _.values(this._queue).length )

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

		// console.log('handleState')

		let oldState: TimelineState = this.getStateBefore(newState.time) || {time: 0, LLayers: {}, GLayers: {}}

		let oldAbstractState = this.convertStateToAbstract(oldState)
		let newAbstractState = this.convertStateToAbstract(newState)

		let commandsToAchieveState: Array<any> = this._diffStates(oldAbstractState, newAbstractState)

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
	convertStateToAbstract (state: TimelineState) {
		// convert the timeline state into something we can use
		return state
	}
	get deviceType () {
		return DeviceType.ABSTRACT
	}
	get queue () {
		return _.values(this._queue)
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
				if (oldLayer.id !== newLayer.id ) {
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
}
