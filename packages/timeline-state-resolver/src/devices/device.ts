import * as _ from 'underscore'
import { TimelineState } from 'superfly-timeline'
import {
	Mappings,
	DeviceType,
	MediaObject,
	DeviceOptionsBase,
	DeviceStatus,
	StatusCode,
	ActionExecutionResult,
	ActionExecutionResultCode,
} from 'timeline-state-resolver-types'
import { EventEmitter } from 'eventemitter3'
import { CommandReport, DoOnTime, SlowFulfilledCommandInfo, SlowSentCommandInfo } from './doOnTime'
import { ExpectedPlayoutItem } from '../expectedPlayoutItems'
import { FinishedTrace, t } from '../lib'

/*
	This is a base class for all the Device wrappers.
	The Device wrappers will
*/

export interface DeviceCommand {
	time: number
	deviceId: string
	command: any
}

export interface DeviceCommandContainer {
	deviceId: string
	commands: Array<DeviceCommand>
}
export interface CommandWithContext {
	context: any
	timelineObjId: string
	command: any
}

export function literal<T>(o: T) {
	return o
}

export { DeviceStatus, StatusCode }

export type DeviceEvents = {
	info: [info: string]
	warning: [warning: string]
	error: [context: string, err: Error]
	debug: [...debug: any[]]
	/** The connection status has changed */
	connectionChanged: [status: DeviceStatus]
	/** A message to the resolver that something has happened that warrants a reset of the resolver (to re-run it again) */
	resetResolver: []

	/** A report that a command was sent too late */
	slowCommand: [commandInfo: string]
	/** A report that a command was sent too late */
	slowSentCommand: [info: SlowSentCommandInfo]
	/** A report that a command was fullfilled too late */
	slowFulfilledCommand: [info: SlowFulfilledCommandInfo]

	/** Something went wrong when executing a command  */
	commandError: [error: Error, context: CommandWithContext]
	/** Update a MediaObject  */
	updateMediaObject: [collectionId: string, docId: string, doc: MediaObject | null]
	/** Clear a MediaObjects collection */
	clearMediaObjects: [collectionId: string]

	commandReport: [commandReport: CommandReport]
	timeTrace: [trace: FinishedTrace]
}

export interface IDevice<TOptions extends DeviceOptionsBase<any>> {
	init: (initOptions: TOptions['options'], activeRundownPlaylistId: string | undefined) => Promise<boolean>

	getCurrentTime: () => number

	prepareForHandleState: (newStateTime: number) => void
	handleState: (newState: TimelineState, mappings: Mappings) => void
	clearFuture: (clearAfterTime: number) => void
	canConnect: boolean
	connected: boolean

	makeReady: (_okToDestroyStuff?: boolean, activeRundownId?: string) => Promise<void>
	standDown: (_okToDestroyStuff?: boolean) => Promise<void>
	getStatus: () => DeviceStatus

	deviceId: string
	deviceName: string
	deviceType: DeviceType
	deviceOptions: TOptions

	instanceId: number
	startTime: number
}
/**
 * Base class for all Devices to inherit from. Defines the API that the conductor
 * class will use.
 */
export abstract class Device<TOptions extends DeviceOptionsBase<any>>
	extends EventEmitter<DeviceEvents>
	implements IDevice<TOptions>
{
	private _getCurrentTime: (() => Promise<number> | number) | undefined

	private _deviceId: string

	private _currentTimeDiff = 0
	private _currentTimeUpdated = 0
	private _instanceId: number
	private _startTime: number

	public useDirectTime = false
	protected _deviceOptions: TOptions
	protected _reportAllCommands = false
	protected _isActive = true
	private debugLogging: boolean

	constructor(deviceId: string, deviceOptions: TOptions, getCurrentTime: () => Promise<number>) {
		super()
		this._deviceId = deviceId
		this._deviceOptions = deviceOptions
		this.debugLogging = deviceOptions.debug ?? true // Default to true to keep backwards compatibility

		this._instanceId = Math.floor(Math.random() * 10000)
		this._startTime = Date.now()

		this._reportAllCommands = !!deviceOptions.reportAllCommands

		if (process.env.JEST_WORKER_ID !== undefined) {
			// running in Jest test environment.
			// Because Jest does a lot of funky stuff with the timing, we have to pull the time directly.
			this.useDirectTime = true

			// Hack around the function mangling done by threadedClass
			const getCurrentTimeTmp = getCurrentTime as any
			if (getCurrentTimeTmp && getCurrentTimeTmp.inner) {
				getCurrentTime = getCurrentTimeTmp.inner
			}
		}

		if (getCurrentTime) {
			this._getCurrentTime = getCurrentTime
		}

		this._updateCurrentTime()
	}

	/**
	 * Connect to the device, resolve the promise when ready.
	 * @param initOptions Device-specific options
	 * @param activeRundownPlaylistId ID of active rundown playlist
	 */
	abstract init(initOptions: TOptions['options'], activeRundownPlaylistId?: string): Promise<boolean>
	async terminate(): Promise<boolean> {
		return Promise.resolve(true)
	}
	getCurrentTime(): number {
		if (this.useDirectTime) {
			// Used when running in test
			// @ts-ignore
			return this._getCurrentTime()
		}
		if (Date.now() - this._currentTimeUpdated > 5 * 60 * 1000) {
			this._updateCurrentTime()
		}
		return Date.now() - this._currentTimeDiff
	}

	/** Called from Conductor when a new state is about to be handled soon */
	abstract prepareForHandleState(newStateTime: number): void
	/** Called from Conductor when a new state is to be handled */
	abstract handleState(newState: TimelineState, mappings: Mappings): void

	/** To be called by children first in .handleState */
	protected onHandleState(_newState: TimelineState, mappings: Mappings) {
		this.updateIsActive(mappings)
	}
	/**
	 * Clear any scheduled commands after this time
	 * @param clearAfterTime
	 */
	abstract clearFuture(clearAfterTime: number): void
	abstract get canConnect(): boolean
	abstract get connected(): boolean

	/**
	 * The makeReady method could be triggered at a time before broadcast
	 * Whenever we know that the user want's to make sure things are ready for broadcast
	 * The exact implementation differ between different devices
	 * @param okToDestroyStuff If true, the device may do things that might affect the output (temporarily)
	 */
	async makeReady(_okToDestroyStuff?: boolean, _activeRundownId?: string): Promise<void> {
		// This method should be overwritten by child
		return Promise.resolve()
	}
	/**
	 * The standDown event could be triggered at a time after broadcast
	 * The exact implementation differ between different devices
	 * @param okToDestroyStuff If true, the device may do things that might affect the output (temporarily)
	 */
	async standDown(_okToDestroyStuff?: boolean): Promise<void> {
		// This method should be overwritten by child
		return Promise.resolve()
	}
	abstract getStatus(): DeviceStatus

	setDebugLogging(debug: boolean) {
		this.debugLogging = debug
	}

	protected emitDebug(...args: any[]) {
		if (this.debugLogging) {
			this.emit('debug', ...args)
		}
	}

	get deviceId() {
		return this._deviceId
	}
	/**
	 * A human-readable name for this device
	 */
	abstract get deviceName(): string
	abstract get deviceType(): DeviceType
	get deviceOptions(): TOptions {
		return this._deviceOptions
	}
	get supportsExpectedPlayoutItems(): boolean {
		return false
	}
	public handleExpectedPlayoutItems(_expectedPlayoutItems: Array<ExpectedPlayoutItem>): void {
		// When receiving a new list of playoutItems.
		// by default, do nothing
	}
	get isActive(): boolean {
		return this._isActive
	}

	async executeAction(_actionId: string, _payload?: Record<string, any>): Promise<ActionExecutionResult> {
		return {
			result: ActionExecutionResultCode.Error,
			response: t('Device does not implement an action handler'),
		}
	}

	private _updateCurrentTime() {
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

	public get instanceId(): number {
		return this._instanceId
	}
	public get startTime(): number {
		return this._startTime
	}
	protected handleDoOnTime(doOnTime: DoOnTime, deviceType: string) {
		doOnTime.on('error', (e) => this.emit('error', `${deviceType}.doOnTime`, e))
		doOnTime.on('slowCommand', (msg) => this.emit('slowCommand', this.deviceName + ': ' + msg))
		doOnTime.on('slowSentCommand', (info) => this.emit('slowSentCommand', info))
		doOnTime.on('slowFulfilledCommand', (info) => this.emit('slowFulfilledCommand', info))
		doOnTime.on('commandReport', (commandReport) => {
			if (this._reportAllCommands) {
				this.emit('commandReport', commandReport)
			}
			this.emit('timeTrace', {
				measurement: 'device:commandSendDelay',
				tags: {
					deviceId: this.deviceId,
				},
				start: commandReport.plannedSend,
				ended: commandReport.send,
				duration: commandReport.send - commandReport.plannedSend,
			})
			this.emit('timeTrace', {
				measurement: 'device:commandFulfillDelay',
				tags: {
					deviceId: this.deviceId,
				},
				start: commandReport.send,
				ended: commandReport.fullfilled,
				duration: commandReport.fullfilled - commandReport.send,
			})
		})
	}
	private updateIsActive(mappings: Mappings) {
		// If there are no mappings assigned to this device, it is considered inactive

		const ownMappings: Mappings = {}
		let isActive = false

		_.each(mappings, (mapping, layerId) => {
			if (mapping.deviceId === this.deviceId) {
				isActive = true
				ownMappings[layerId] = mapping
			}
		})
		this._isActive = isActive
	}
}

/**
 * Basic class that devices with state tracking can inherit from. Defines some
 * extra convenience methods for tracking state while inheriting all other methods
 * from the Device class.
 */
export abstract class DeviceWithState<TState, TOptions extends DeviceOptionsBase<any>> extends Device<TOptions> {
	private _states: { [time: string]: TState } = {}
	private _setStateCount = 0

	/**
	 * Get the last known state before a point time. Useful for creating device
	 * diffs.
	 * @param time
	 */
	protected getStateBefore(time: number): { state: TState; time: number } | null {
		let foundTime = 0
		let foundState: TState | null = null
		_.each(this._states, (state: TState, stateTimeStr: string) => {
			const stateTime = parseFloat(stateTimeStr)
			if (stateTime > foundTime && stateTime < time) {
				foundState = state
				foundTime = stateTime
			}
		})
		if (foundState) {
			return {
				state: foundState,
				time: foundTime,
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
	protected getState(time?: number): { state: TState; time: number } | null {
		if (time === undefined) {
			time = this.getCurrentTime()
		}
		let foundTime = 0
		let foundState: TState | null = null
		_.each(this._states, (state: TState, stateTimeStr: string) => {
			const stateTime = parseFloat(stateTimeStr)
			if (stateTime > foundTime && stateTime <= time!) {
				foundState = state
				foundTime = stateTime
			}
		})
		if (foundState) {
			return {
				state: foundState,
				time: foundTime,
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
	protected setState(state: TState, time: number) {
		if (!time) throw new Error('setState: falsy time')
		this.cleanUpStates(0, time) // remove states after this time, as they are not relevant anymore

		this._states[time + ''] = state

		this._setStateCount++
		if (this._setStateCount > 10) {
			this._setStateCount = 0

			// Clean up old states:
			const stateBeforeNow = this.getStateBefore(this.getCurrentTime())
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
	protected cleanUpStates(removeBeforeTime: number, removeAfterTime: number) {
		_.each(_.keys(this._states), (stateTimeStr: string) => {
			const stateTime = parseFloat(stateTimeStr)
			if (
				(removeBeforeTime && stateTime <= removeBeforeTime) ||
				(removeAfterTime && stateTime >= removeAfterTime) ||
				!stateTime
			) {
				delete this._states[stateTime]
			}
		})
	}
	/**
	 * Removes all states
	 */
	protected clearStates() {
		_.each(_.keys(this._states), (time: string) => {
			delete this._states[time]
		})
	}
}
