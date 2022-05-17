import EventEmitter = require('events')
import { TimelineState } from 'superfly-timeline'
import {
	DeviceOptionsAny,
	DeviceOptionsBase,
	DeviceStatus as IntegrationStatus,
	DeviceType,
	Mappings,
	MediaObject,
} from 'timeline-state-resolver-types'
import _ = require('underscore')
import { CommandWithContext } from './conductor'
import { SlowSentCommandInfo, SlowFulfilledCommandInfo, CommandReport, DoOnTime } from './devices/doOnTime'
import { ExpectedPlayoutItem } from './expectedPlayoutItems'
import { FinishedTrace } from './lib'

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

export interface DeviceProperties {
	deviceId: string
	deviceName: string
	deviceType: DeviceType
	deviceOptions: DeviceOptionsAny
	instanceId: number
	startTime: number
	supportsExpectedPlayoutItems: boolean
}

export interface DeviceStatus {
	status: IntegrationStatus
	canConnect: boolean // @todo - don't understand what we use this for
	connected: boolean
}

export type LogLevel = 'debug' | 'info' | 'warning' | 'error'

/**
 * This is the public API that has to implemented by an integration
 */
export interface IntegrationAPI {
	/**
	 * Sets up the initial connection to
	 * @param options Contains options such as device ip adresses
	 * @param activeRundownPlaylistId To document
	 */
	init(activeRundownPlaylistId?: string): Promise<boolean>
	/**
	 * Breaks down the current device so that it can be garbage collected
	 */
	terminate(): Promise<boolean>
	/**
	 * Sets the log level of this device
	 * @param level debug, info, warning, error
	 */
	setLogLevel(level: LogLevel): void

	/**
	 * Inform the device that a new state is being generated so that it can
	 * prepare itself for that
	 * @param newStateTime Time of the state that will be passed down soon
	 */
	prepareForHandleState(newStateTime: number): void
	/**
	 * Let the device handle a new state at a specific point in time
	 * @param newState Timeline state
	 * @param mappings Mappings
	 */
	handleState(newState: TimelineState, mappings: Mappings): void
	/**
	 * Clear all states / scheduled commands after this time
	 * @param clearAfterTime timestamp
	 */
	clearFuture(clearAfterTime: number): void

	/**
	 * Let the device execute an action by a specific id, used for things
	 * such as reloading
	 * @param actionId unique id for the action
	 * @param actionPayload arguments / payload for the action
	 */
	executeAction(actionId: string, actionPayload: Record<string, any>): Promise<{ error?: Error; result?: any }>

	getStatus(): DeviceStatus
	getDeviceProperties(): DeviceProperties

	handleExpectedPlayoutItems(expectedPlayoutItems: Array<ExpectedPlayoutItem>): void
}

/**
 * Abstract base class for integrations to inherit from
 */
export abstract class AbstractIntegration<TOptions extends DeviceOptionsBase<any>>
	extends EventEmitter
	implements IntegrationAPI
{
	private _instanceId: number
	private _startTime: number
	private _logLevel: LogLevel = 'info'
	private _isActive = false
	private _useDirectTime = false

	private _currentTimeDiff: number
	private _currentTimeLastUpdated: number

	constructor(private _deviceId: string, private _options: TOptions, private _getCurrentTime?: () => Promise<number>) {
		super()
		this._instanceId = Math.floor(Math.random() * 10000)
		this._startTime = Date.now()

		if (this._options.debug) this.setLogLevel('debug')

		if (process.env.JEST_WORKER_ID !== undefined) {
			// running in Jest test environment.
			// Because Jest does a lot of funky stuff with the timing, we have to pull the time directly.
			this._useDirectTime = true

			// Hack around the function mangling done by threadedClass
			const getCurrentTimeTmp = this._getCurrentTime as any
			if (getCurrentTimeTmp && getCurrentTimeTmp.inner) {
				this._getCurrentTime = getCurrentTimeTmp.inner
			}
		}

		this._syncCurrentTime()
	}

	protected emitLog(logLevel: LogLevel, ...args: any[]) {
		const levelOrder: LogLevel[] = ['debug', 'info', 'warning', 'error']

		for (const level of levelOrder) {
			if (this._logLevel === level) {
				this.emit(logLevel, ...args)
			} else if (logLevel === level) {
				break
			}
		}
	}
	protected getOptions() {
		return this._options.options
	}
	/** To be called by children first in .handleState */
	protected onHandleState(_newState: TimelineState, mappings: Mappings) {
		this.updateIsActive(mappings)
	}

	protected getCurrentTime(): number {
		if (this._useDirectTime) {
			// Used when running in test
			// @ts-ignore
			return this._getCurrentTime()
		}
		if (Date.now() - this._currentTimeLastUpdated > 5 * 60 * 1000) {
			this._syncCurrentTime()
		}
		return Date.now() - this._currentTimeDiff
	}

	protected handleDoOnTime(doOnTime: DoOnTime, deviceType: string) {
		doOnTime.on('error', (e) => this.emit('error', `${deviceType}.doOnTime`, e))
		doOnTime.on('slowCommand', (msg) => this.emit('slowCommand', this._deviceName + ': ' + msg))
		doOnTime.on('slowSentCommand', (info) => this.emit('slowSentCommand', info))
		doOnTime.on('slowFulfilledCommand', (info) => this.emit('slowFulfilledCommand', info))
		doOnTime.on('commandReport', (commandReport) => {
			if (this._options.reportAllCommands) {
				this.emit('commandReport', commandReport)
			}
			this.emit('timeTrace', {
				measurement: 'device:commandSendDelay',
				tags: {
					deviceId: this._deviceId,
				},
				start: commandReport.plannedSend,
				ended: commandReport.send,
				duration: commandReport.send - commandReport.plannedSend,
			})
			this.emit('timeTrace', {
				measurement: 'device:commandFulfillDelay',
				tags: {
					deviceId: this._deviceId,
				},
				start: commandReport.send,
				ended: commandReport.fullfilled,
				duration: commandReport.fullfilled - commandReport.send,
			})
		})
	}

	protected abstract get _deviceName(): string
	protected abstract get _canConnect(): boolean
	protected abstract get _connected(): boolean
	protected abstract get _supportsExpectedPlayoutItems(): boolean
	protected abstract _getStatus(): Pick<IntegrationStatus, 'statusCode' | 'messages'>

	abstract init(activeRundownPlaylistId?: string): Promise<boolean>
	async terminate(): Promise<boolean> {
		return Promise.resolve(true)
	}
	setLogLevel(level: LogLevel): void {
		this._logLevel = level
	}

	abstract prepareForHandleState(newStateTime: number): void
	abstract handleState(newState: TimelineState, mappings: Mappings): void
	abstract clearFuture(clearAfterTime: number): void

	/**
	 * The makeReady method could be triggered at a time before broadcast
	 * Whenever we know that the user want's to make sure things are ready for broadcast
	 * The exact implementation differ between different devices
	 * @deprecated to be replaced by executeAction
	 * @param okToDestroyStuff If true, the device may do things that might affect the output (temporarily)
	 * @param activeRundownId Session ID for automation systems
	 * @returns
	 */
	async makeReady(_okToDestroyStuff?: boolean, _activeRundownId?: string) {
		return Promise.resolve() // to be overwritten by implementing integration
	}
	/**
	 *
	 * The standDown event could be triggered at a time after broadcast
	 * The exact implementation differ between different devices
	 * @deprecated to be replaced by executeAction
	 * @param okToDestroyStuff If true, the device may do things that might affect the output (temporarily)
	 */
	async standDown(_okToDestroyStuff?: boolean) {
		return Promise.resolve() // to be overwritten by implementing integration
	}
	async executeAction(actionId: string, actionPayload: Record<string, any>): Promise<{ error?: Error; result?: any }> {
		switch (actionId) {
			case 'makeReady': {
				const result = await this.makeReady(actionPayload.okToDestroyStuff, actionPayload.activeRundownId)
				return { result }
			}
			case 'standDown': {
				const result = await this.standDown(actionPayload.okToDestroyStuff)
				return { result }
			}
			default: {
				return { error: new Error('ActionId not found') }
			}
		}
	}

	getStatus(): DeviceStatus {
		return {
			canConnect: this._canConnect,
			connected: this._connected,
			status: {
				...this._getStatus(),
				active: this._isActive,
			},
		}
	}
	getDeviceProperties(): DeviceProperties {
		return {
			deviceId: this._deviceId,
			deviceName: this._deviceName,
			deviceType: this._options.type,
			deviceOptions: this._options,
			instanceId: this._instanceId,
			startTime: this._startTime,
			supportsExpectedPlayoutItems: this._supportsExpectedPlayoutItems,
		}
	}

	handleExpectedPlayoutItems(_expectedPlayoutItems: Array<ExpectedPlayoutItem>): void {
		// When receiving a new list of playoutItems.
		// by default, do nothing
	}

	private updateIsActive(mappings: Mappings) {
		// If there are no mappings assigned to this device, it is considered inactive

		const ownMappings: Mappings = {}
		let isActive = false

		_.each(mappings, (mapping, layerId) => {
			if (mapping.deviceId === this._deviceId) {
				isActive = true
				ownMappings[layerId] = mapping
			}
		})
		this._isActive = isActive
	}
	private _syncCurrentTime() {
		if (this._getCurrentTime) {
			const startTime = Date.now()
			Promise.resolve(this._getCurrentTime())
				.then((parentTime) => {
					const endTime = Date.now()
					const clientTime = Math.round((startTime + endTime) / 2)

					this._currentTimeDiff = clientTime - parentTime
					this._currentTimeLastUpdated = endTime
				})
				.catch((err) => {
					this.emit('error', 'device._updateCurrentTime', err)
				})
		}
	}
}

export abstract class AbstractStateBasedIntegration<
	TState,
	TOptions extends DeviceOptionsBase<any>
> extends AbstractIntegration<TOptions> {
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
