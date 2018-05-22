import * as _ from 'underscore'
import { Device, DeviceOptions } from './device'
import { DeviceType, MappingLawo } from './mapping'

import { TimelineState, TimelineResolvedObject } from 'superfly-timeline'

/*
	This is a wrapper for an "Abstract" device

	An abstract device is just a test-device that doesn't really do anything, but can be used
	as a preliminary mock
*/
export interface LawoOptions extends DeviceOptions {
	options?: {
		commandReceiver?: (time: number, cmd) => void
	}
}
export class LawoDevice extends Device {

	private _queue: Array<any>

	private _commandReceiver: (time: number, cmd) => void

	constructor (deviceId: string, deviceOptions: LawoOptions, options) {
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
			// @todo: initiate ember+ connection

			resolve(true)
		})
	}
	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified

		// console.log('handleState')

		let oldState: TimelineState = this.getStateBefore(newState.time) || {time: 0, LLayers: {}, GLayers: {}}

		let oldAbstractState = this.convertStateToLawo(oldState)
		let newAbstractState = this.convertStateToLawo(newState)

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
	get connected (): boolean {
		return false
	}
	convertStateToLawo (state: TimelineState) {
		// convert the timeline state into something we can use
		const lawoState: Array<{ muted: boolean, volume: number }> = []

		_.each(state.LLayers, (tlObject: TimelineResolvedObject, layerName: string) => {
			const mapping = this.mapping[layerName] as MappingLawo
			const channel = {
				muted: true,
				volume: 0
			}
			if (tlObject.content.muted === false) {
				channel.muted = false
			}
			if (typeof tlObject.content.volume !== 'undefined') {
				channel.volume = tlObject.content.volume
			}
			if (typeof mapping !== 'undefined') {
				lawoState[mapping.channel] = channel
			}
		})

		return lawoState
	}
	get deviceType () {
		return DeviceType.LAWO
	}
	get deviceName (): string {
		return 'Lawo ' + this.deviceId
	}
	get queue () {
		return _.values(this._queue)
	}

	private _diffStates (oldLawoState, newLawoState) {
		// in this abstract class, let's just cheat:

		let commands: Array<any> = []

		_.each(newLawoState.channels, (newChannel: { muted: boolean, volume: number }, channelNo: number) => {
			let oldChannel = oldLawoState[channelNo]
			if (!oldChannel) {
				commands.push({
					type: 'VOLUME',
					channelNo,
					value: newChannel.volume
				})
				commands.push({
					type: 'MUTED',
					channelNo,
					value: newChannel.muted
				})
			} else {
				if (oldChannel.volume !== newChannel.volume) {
					commands.push({
						type: 'VOLUME',
						channelNo,
						value: newChannel.volume
					})
				}
				if (oldChannel.muted !== newChannel.muted) {
					commands.push({
						type: 'MUTED',
						channelNo,
						value: newChannel.muted
					})
				}
			}
		})
		// removed
		_.each(oldLawoState.LLayers, (oldChannel: any, channelNo) => {
			let newChannel = newLawoState[channelNo]
			if (!newChannel) {
				commands.push({
					type: 'VOLUME',
					channelNo,
					value: 0
				})
				commands.push({
					type: 'MUTED',
					channelNo,
					value: true
				})
			}
		})
		return commands
	}
}
