import * as _ from 'underscore'
import { TimelineState } from 'superfly-timeline'
import { Mappings, DeviceType } from './mapping'
import { CasparCG as StateNS, CasparCGState } from 'casparcg-state'
import { stat } from 'fs'
/*
	This is a base class for all the Device wrappers.
	The Device wrappers will
*/

export interface DeviceCommand {
	time: number,
	deviceId: string,
	command: any
}

export interface DeviceCommandContainer {
	deviceId: string,
	commands: Array<DeviceCommand>
}

export class Device {

	private _getCurrentTime: () => number

	private _deviceId: string
	private _deviceOptions: any

	private _states: {[time: number]: TimelineState}
	private _mappings: Mappings

	constructor (deviceId: string, deviceOptions: any, options) {
		this._deviceId = deviceId
		this._deviceOptions = deviceOptions

		this._states = {}
		if (options.getCurrentTime) {
			this._getCurrentTime = options.getCurrentTime
		}
	}
	init (): Promise<boolean> {
		// connect to the device, resolve the promise when ready.
		throw new Error('This class method must be replaced by the Device class!')

		// return Promise.resolve(true)
	}
	getCurrentTime () {
		if (this._getCurrentTime) return this._getCurrentTime()
		return Date.now()
	}

	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified
		throw new Error('This class method must be replaced by the Device class!')
	}
	clearFuture (clearAfterTime: number) {
		// Clear any scheduled commands after this time
		throw new Error('This class method must be replaced by the Device class!')
	}

	getStateBefore (time: number): TimelineState | null {

		let foundTime = 0
		let foundState: TimelineState | null = null
		_.each(this._states, (state: TimelineState, stateTime: number) => {
			if (stateTime > foundTime && stateTime < time) {
				foundState = state
				foundTime = stateTime
			}
		})
		return foundState
	}
	setState (state) {
		this._states[state.time] = state

		this.cleanUpStates(0, state.time) // remove states after this time, as they are not relevant anymore
	}
	cleanUpStates (removeBeforeTime, removeAfterTime) {
		_.each(_.keys(this._states), (time) => {

			if (time < removeBeforeTime || time > removeAfterTime || !time) {
				delete this._states[time]
			}
		})
	}

	get mapping (): Mappings {
		return this._mappings
	}
	set mapping (mappings: Mappings) {
		this._mappings = mappings
	}

	get deviceId () {
		return this._deviceId
	}
	set deviceId (deviceId) {
		this._deviceId = deviceId
	}
	get deviceType (): DeviceType {
		// return DeviceType.ABSTRACT
		throw new Error('This class method must be replaced by the Device class!')
	}

}
