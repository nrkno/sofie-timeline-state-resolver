import * as _ from 'underscore'
import { TimelineState } from 'superfly-timeline'
import { Mappings, DeviceType } from './mapping'
import { EventEmitter } from 'events'
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
export interface DeviceOptions {
	type: DeviceType,
	options?: {}
	externalLog?: (...args: any[]) => void
}
export class Device extends EventEmitter {

	protected _log: (...args: any[]) => void
	private _getCurrentTime: () => number

	private _deviceId: string
	private _deviceOptions: DeviceOptions

	private _states: {[time: string]: TimelineState} = {}
	private _mappings: Mappings
	private _setStateCount: number = 0

	constructor (deviceId: string, deviceOptions: DeviceOptions, options) {
		super()
		this._deviceId = deviceId
		this._deviceOptions = deviceOptions

		this._deviceOptions = this._deviceOptions // ts-lint fix

		if (options.getCurrentTime) {
			this._getCurrentTime = options.getCurrentTime
		}
		if (options.externalLog) {
			this._log = options.externalLog
		} else {
			this._log = () => { return }
		}
	}
	init (connectionOptions: any): Promise<boolean> {
		// connect to the device, resolve the promise when ready.
		connectionOptions = connectionOptions // ts-ignore
		throw new Error('This class method must be replaced by the Device class!')

		// return Promise.resolve(true)
	}
	terminate (): Promise<boolean> {
		return Promise.resolve(true)
	}
	getCurrentTime () {
		if (this._getCurrentTime) return this._getCurrentTime()
		return Date.now()
	}

	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified
		newState = newState
		throw new Error('This class method must be replaced by the Device class!')
	}
	clearFuture (clearAfterTime: number) {
		// Clear any scheduled commands after this time
		clearAfterTime = clearAfterTime
		throw new Error('This class method must be replaced by the Device class!')
	}
	get canConnect (): boolean {
		throw new Error('This class method must be replaced by the Device class!')
	}
	get connected (): boolean {
		// Returns connection status
		throw new Error('This class method must be replaced by the Device class!')
	}

	getStateBefore (time: number): TimelineState | null {
		let foundTime = 0
		let foundState: TimelineState | null = null
		_.each(this._states, (state: TimelineState, stateTimeStr: string) => {
			let stateTime = parseFloat(stateTimeStr)
			if (stateTime > foundTime && stateTime < time) {
				foundState = state
				foundTime = stateTime
			}
		})
		return foundState
	}
	setState (state, time?) {
		this._states[time ? time + '' : state.time + ''] = state

		this.cleanUpStates(0, state.time) // remove states after this time, as they are not relevant anymore
		this._setStateCount++
		if (this._setStateCount > 10) {
			this._setStateCount = 0

			// Clean up old states:
			let stateBeforeNow = this.getStateBefore(this._getCurrentTime())
			if (stateBeforeNow && stateBeforeNow.time) {
				this.cleanUpStates(stateBeforeNow.time - 1, 0)
			}
		}
	}
	cleanUpStates (removeBeforeTime, removeAfterTime) {
		_.each(_.keys(this._states), (stateTimeStr: string) => {
			let stateTime = parseFloat(stateTimeStr)
			if (
				(
					removeBeforeTime &&
					stateTime < removeBeforeTime
				) ||
				(
					removeAfterTime &&
					stateTime > removeAfterTime
				) ||
				!stateTime) {
				delete this._states[stateTime]
			}
		})
	}
	clearStates () {
		_.each(_.keys(this._states), (time: string) => {
			delete this._states[time]
		})
	}
	/**
	 * The makeReady method could be triggered at a time before broadcast
	 * Whenever we know that the user want's to make sure things are ready for broadcast
	 * The exact implementation differ between different devices
	 * @param okToDestroyStuff If true, the device may do things that might affect the output (temporarily)
	 */
	makeReady (okToDestroyStuff?: boolean): Promise<void> {
		// This method should be overwritten by child
		okToDestroyStuff = okToDestroyStuff
		return Promise.resolve()
	}
	/**
	 * The standDown event could be triggered at a time after broadcast
	 * The exact implementation differ between different devices
	 * @param okToDestroyStuff If true, the device may do things that might affect the output (temporarily)
	 */
	standDown (okToDestroyStuff?: boolean): Promise<void> {
		// This method should be overwritten by child
		okToDestroyStuff = okToDestroyStuff
		return Promise.resolve()
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
	get deviceName (): string {
		// Return a human-readable name for this device
		throw new Error('This class method must be replaced by the Device class!')
	}
	set deviceId (deviceId) {
		this._deviceId = deviceId
	}
	get deviceType (): DeviceType {
		// return DeviceType.ABSTRACT
		throw new Error('This class method must be replaced by the Device class!')
	}
	get deviceOptions (): DeviceOptions {
		return this._deviceOptions
	}
}
