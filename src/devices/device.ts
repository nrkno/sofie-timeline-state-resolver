import * as _ from 'underscore'
import { TimelineState } from 'superfly-timeline'
import {
	Mappings,
	DeviceType,
	DeviceOptions,
	ExpectedPlayoutItemContent
} from '../types/src'
import { EventEmitter } from 'events'
import { CommandReport, DoOnTime } from '../doOnTime'
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
export interface CommandWithContext {
	context: any
	timelineObjId: string
	command: any
}
export enum StatusCode {
	UNKNOWN = 0, 		// Status unknown
	GOOD = 1, 			// All good and green
	WARNING_MINOR = 2,	// Everything is not OK, operation is not affected
	WARNING_MAJOR = 3, 	// Everything is not OK, operation might be affected
	BAD = 4, 			// Operation affected, possible to recover
	FATAL = 5			// Operation affected, not possible to recover without manual interference
}
export interface DeviceStatus {
	statusCode: StatusCode,
	messages?: Array<string>
}

export function literal<T> (o: T) { return o }

export interface DeviceClassOptions {
	getCurrentTime: () => number
}

/**
 * Base class for all Devices to inherit from. Defines the API that the conductor
 * class will use.
 */
export abstract class Device extends EventEmitter {

	private _getCurrentTime: () => Promise<number> | number

	private _deviceId: string

	private _mappings: Mappings = {}
	private _currentTimeDiff: number = 0
	private _currentTimeUpdated: number = 0
	private _instanceId: number
	private _startTime: number

	public useDirectTime: boolean = false
	protected _deviceOptions: DeviceOptions
	protected _reportAllCommands: boolean = false

	constructor (deviceId: string, deviceOptions: DeviceOptions, options: DeviceClassOptions) {
		super()
		this._deviceId = deviceId
		this._deviceOptions = deviceOptions

		this._instanceId = Math.floor(Math.random() * 10000)
		this._startTime = Date.now()

		this._reportAllCommands = !!deviceOptions.reportAllCommands

		// this._deviceOptions = this._deviceOptions // ts-lint fix

		if (process.env.JEST_WORKER_ID !== undefined) {
			// running in Jest test environment.
			// Because Jest does a lot of funky stuff with the timing, we have to pull the time directly.
			this.useDirectTime = true
		}

		if (options.getCurrentTime) {
			this._getCurrentTime = () => options.getCurrentTime()
		}

		this._updateCurrentTime()
	}

	/**
	 * Connect to the device, resolve the promise when ready.
	 * @param connectionOptions Device-specific options
	 */
	abstract init (connectionOptions: any): Promise<boolean>
	terminate (): Promise<boolean> {
		return Promise.resolve(true)
	}
	getCurrentTime (): number {
		if (this.useDirectTime) {
			// Used when running in test
			// @ts-ignore
			return this._getCurrentTime()
		}
		if ((Date.now() - this._currentTimeUpdated) > 5 * 60 * 1000) {
			this._updateCurrentTime()
		}
		return Date.now() - this._currentTimeDiff
	}

	/** Called from Conductor when a new state is about to be handled soon */
	abstract prepareForHandleState (newStateTime: number)
	/** Called from Conductor when a new state is to be handled */
	abstract handleState (newState: TimelineState)
	/**
	 * Clear any scheduled commands after this time
	 * @param clearAfterTime
	 */
	abstract clearFuture (clearAfterTime: number)
	abstract get canConnect (): boolean
	abstract get connected (): boolean

	/**
	 * The makeReady method could be triggered at a time before broadcast
	 * Whenever we know that the user want's to make sure things are ready for broadcast
	 * The exact implementation differ between different devices
	 * @param okToDestroyStuff If true, the device may do things that might affect the output (temporarily)
	 */
	makeReady (_okToDestroyStuff?: boolean): Promise<void> {
		// This method should be overwritten by child
		return Promise.resolve()
	}
	/**
	 * The standDown event could be triggered at a time after broadcast
	 * The exact implementation differ between different devices
	 * @param okToDestroyStuff If true, the device may do things that might affect the output (temporarily)
	 */
	standDown (_okToDestroyStuff?: boolean): Promise<void> {
		// This method should be overwritten by child
		return Promise.resolve()
	}
	abstract getStatus (): DeviceStatus

	getMapping (): Mappings {
		return this._mappings
	}
	setMapping (mappings: Mappings) {
		this._mappings = mappings
	}

	get deviceId () {
		return this._deviceId
	}
	/**
	 * A human-readable name for this device
	 */
	abstract get deviceName (): string
	abstract get deviceType (): DeviceType
	get deviceOptions (): DeviceOptions {
		return this._deviceOptions
	}
	get supportsExpectedPlayoutItems (): boolean {
		return false
	}
	public handleExpectedPlayoutItems (_expectedPlayoutItems: Array<ExpectedPlayoutItemContent>): void {
		// When receiving a new list of playoutItems.
		// by default, do nothing
	}

	private _updateCurrentTime () {
		if (this._getCurrentTime) {
			const startTime = Date.now()
			Promise.resolve(this._getCurrentTime())
			.then((parentTime) => {
				const endTime = Date.now()
				const clientTime = Math.round((startTime + endTime) / 2)

				this._currentTimeDiff = clientTime - parentTime
				this._currentTimeUpdated = endTime

			})
			.catch((err) => {
				this.emit('error', 'device._updateCurrentTime', err)
			})
		}
	}
	/* tslint:disable:unified-signatures */

	// Overide EventEmitter.on() for stronger typings:
	on (event: 'info',				listener: (info: string) => void): this
	on (event: 'warning',			listener: (warning: string) => void): this
	on (event: 'error',				listener: (context: string, err: Error) => void): this
	on (event: 'debug',				listener: (...debug: any[]) => void): this
	/** The connection status has changed */
	on (event: 'connectionChanged', listener: (status: DeviceStatus) => void): this
	/** A message to the resolver that something has happened that warrants a reset of the resolver (to re-run it again) */
	on (event: 'resetResolver',		listener: () => void): this
	/** A report that a command was sent too late */
	on (event: 'slowCommand',		listener: (commandInfo: string) => void): this
	/** Something went wrong when executing a command  */
	on (event: 'commandError', listener: (error: Error, context: CommandWithContext) => void): this
	on (event: string | symbol, listener: (...args: any[]) => void): this {
		return super.on(event, listener)
	}
	// Overide EventEmitter.emit() for stronger typings:
	emit (event: 'info',				info: string): boolean
	emit (event: 'warning',				warning: string): boolean // ts
	emit (event: 'error',				context: string, err: Error): boolean
	emit (event: 'debug',				...debug: any[]): boolean
	emit (event: 'connectionChanged',	status: DeviceStatus): boolean
	emit (event: 'resetResolver'): boolean
	emit (event: 'slowCommand',			commandInfo: string): boolean
	emit (event: 'commandReport',		commandReport: CommandReport): boolean
	emit (event: 'commandError',		error: Error, context: CommandWithContext): boolean
	emit (event: string, ...args: any[]): boolean {
		return super.emit(event, ...args)
	}

	/* tslint:enable:unified-signatures */
	public get instanceId (): number {
		return this._instanceId
	}
	public get startTime (): number {
		return this._startTime
	}
	protected handleDoOnTime (doOnTime: DoOnTime, deviceType: string) {
		doOnTime.on('error', e => this.emit('error', `${deviceType}.doOnTime`, e))
		doOnTime.on('slowCommand', msg => this.emit('slowCommand', this.deviceName + ': ' + msg))
		doOnTime.on('commandReport', commandReport => {
			if (this._reportAllCommands) {
				this.emit('commandReport', commandReport)
			}
		})
	}
}

/**
 * Basic class that devices with state tracking can inherit from. Defines some
 * extra convenience methods for tracking state while inheriting all other methods
 * from the Device class.
 */
export abstract class DeviceWithState<T> extends Device {
	private _states: {[time: string]: T} = {}
	private _setStateCount: number = 0

	/**
	 * Get the last known state before a point time. Useful for creating device
	 * diffs.
	 * @param time
	 */
	getStateBefore (time: number): {state: T, time: number} | null {
		let foundTime = 0
		let foundState: T | null = null
		_.each(this._states, (state: T, stateTimeStr: string) => {
			let stateTime = parseFloat(stateTimeStr)
			if (stateTime > foundTime && stateTime < time) {
				foundState = state
				foundTime = stateTime
			}
		})
		if (foundState) {
			return {
				state: foundState,
				time: foundTime
			}
		}
		return null
	}
	/**
	 * Get the last known state at a point in time. Useful for creating device
	 * diffs.
	 *
	 * @todo is this literally the same as "getStateBefore(time + 1)"?
	 *
	 * @param time
	 */
	getState (time?: number): {state: T, time: number} | null {
		if (time === undefined) {
			time = this.getCurrentTime()
		}
		let foundTime = 0
		let foundState: T | null = null
		_.each(this._states, (state: T, stateTimeStr: string) => {
			let stateTime = parseFloat(stateTimeStr)
			if (stateTime > foundTime && stateTime <= time!) {
				foundState = state
				foundTime = stateTime
			}
		})
		if (foundState) {
			return {
				state: foundState,
				time: foundTime
			}
		}
		return null
	}
	/**
	 * Saves a state on a certain time point. Overwrites any previous state
	 * saved at the same time. Removes any state after this time point.
	 * @param state
	 * @param time
	 */
	setState (state: T, time: number) {
		if (!time) throw new Error('setState: falsy time')
		this.cleanUpStates(0, time) // remove states after this time, as they are not relevant anymore

		this._states[time + ''] = state

		this._setStateCount++
		if (this._setStateCount > 10) {
			this._setStateCount = 0

			// Clean up old states:
			let stateBeforeNow = this.getStateBefore(this.getCurrentTime())
			if (stateBeforeNow && stateBeforeNow.time) {
				this.cleanUpStates(stateBeforeNow.time - 1, 0)
			}
		}
	}
	/**
	 * Sets a windows outside of which all states will be removed.
	 * @param removeBeforeTime
	 * @param removeAfterTime
	 */
	cleanUpStates (removeBeforeTime: number, removeAfterTime: number) {
		_.each(_.keys(this._states), (stateTimeStr: string) => {
			let stateTime = parseFloat(stateTimeStr)
			if (
				(
					removeBeforeTime &&
					stateTime <= removeBeforeTime
				) ||
				(
					removeAfterTime &&
					stateTime >= removeAfterTime
				) ||
				!stateTime
			) {
				delete this._states[stateTime]
			}
		})
	}
	/**
	 * Removes all states
	 */
	clearStates () {
		_.each(_.keys(this._states), (time: string) => {
			delete this._states[time]
		})
	}
}
