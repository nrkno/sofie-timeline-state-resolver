import EventEmitter = require('eventemitter3')
import { actionNotFoundMessage, FinishedTrace } from '../lib'
import {
	type DeviceStatus,
	type DeviceType,
	type Mappings,
	type MediaObject,
	type Timeline,
	type TSRTimelineContent,
} from 'timeline-state-resolver-types'
import type { CommandWithContext, Device, DeviceContextAPI, DeviceEvents } from './device'
import { StateHandler } from './stateHandler'
import { DeviceEntry, DevicesDict } from './devices'
import type { DeviceOptionsAnyInternal, ExpectedPlayoutItem } from '..'
import type { StateChangeReport } from './measure'

type Config = DeviceOptionsAnyInternal
type DeviceState = any

export interface DeviceDetails {
	deviceId: string
	deviceType: DeviceType
	deviceName: string
	instanceId: number
	startTime: number

	supportsExpectedPlayoutItems: boolean
	canConnect: boolean
}

export interface DeviceInstanceEvents extends Omit<DeviceEvents, 'connectionChanged'> {
	/** The connection status has changed */
	connectionChanged: [status: DeviceStatus]
}

/**
 * Top level container for setting up and interacting with any device integrations
 */
export class DeviceInstanceWrapper extends EventEmitter<DeviceInstanceEvents> {
	private _device: Device<any, DeviceState, CommandWithContext>
	private _stateHandler: StateHandler<DeviceState, CommandWithContext>

	private _deviceId: string
	private _deviceType: DeviceType
	private _deviceName: string
	private _instanceId: number
	private _startTime: number

	private _isActive = false
	private _logDebug = false
	private _logDebugStates = false

	private _lastUpdateCurrentTime: number | undefined
	private _tDiff: number | undefined

	constructor(id: string, time: number, private config: Config, private getRemoteCurrentTime: () => Promise<number>) {
		super()

		const deviceSpecs: DeviceEntry = DevicesDict[config.type]

		if (!deviceSpecs) {
			throw new Error('Could not find device of type ' + config.type)
		}

		this._device = new deviceSpecs.deviceClass(this._getDeviceContextAPI())
		this._deviceId = id
		this._deviceType = config.type
		this._deviceName = deviceSpecs.deviceName(id, config)
		this._startTime = time

		this._updateTimeSync()

		this._stateHandler = new StateHandler(
			{
				deviceId: id,
				logger: {
					debug: (...args: any[]) => this.emit('debug', ...args),
					info: (info: string) => this.emit('info', info),
					warn: (warn: string) => this.emit('warning', warn),
					error: (context: string, e: Error) => this.emit('error', context, e),
				},
				emitTimeTrace: (trace: FinishedTrace) => this.emit('timeTrace', trace),
				reportStateChangeMeasurement: (report: StateChangeReport) => {
					report.commands.forEach((cReport) => {
						if (cReport.executeDelay && cReport.executeDelay > (this.config.limitSlowSentCommand || 40)) {
							this.emit('slowSentCommand', {
								added: report.added,
								prepareTime: 0,
								plannedSend: report.scheduled,
								send: report.executed || 0,
								queueId: '',
								args: cReport.args,
								sendDelay: cReport.executeDelay,
								addedDelay: 0,
								internalDelay: 0,
							})
						}
						if (cReport.fulfilledDelay && cReport.fulfilledDelay > (this.config.limitSlowFulfilledCommand || 100)) {
							this.emit('slowFulfilledCommand', {
								added: report.added,
								prepareTime: 0,
								plannedSend: report.scheduled,
								send: report.executed || 0,
								queueId: '',
								args: cReport.args,
								fullfilled: cReport.fulfilled || 0,
								fulfilledDelay: cReport.fulfilledDelay,
							})
						}
						this.emit('commandReport', {
							plannedSend: report.scheduled,
							queueId: '',
							added: report.added,
							prepareTime: 0,
							send: cReport.executed,
							fullfilled: cReport.fulfilled || 0,
							args: cReport.args,
						})
					})
				},
				getCurrentTime: () => this.getCurrentTime(),
			},
			{
				executionType: deviceSpecs.executionMode(config.options),
			},
			this._device
		)
	}

	async initDevice(_activeRundownPlaylistId?: string) {
		return this._device.init(this.config.options)
	}
	async terminate() {
		await this._stateHandler.terminate()
		return this._device.terminate()
	}

	async executeAction(id: string, payload?: Record<string, any>) {
		const action = this._device.actions[id]

		if (!action) {
			return actionNotFoundMessage(id as never)
		}

		return action(id, payload)
	}

	async makeReady(okToDestroyStuff?: boolean): Promise<void> {
		return this._device.makeReady(okToDestroyStuff)
	}
	async standDown(): Promise<void> {
		if (this._device.standDown) {
			return this._device.standDown()
		}
	}

	/** @deprecated - just here for API compatiblity with the old class */
	prepareForHandleState() {
		//
	}

	handleState(newState: Timeline.TimelineState<TSRTimelineContent>, newMappings: Mappings) {
		this._stateHandler.handleState(newState, newMappings).catch((e) => {
			this.emit('error', 'Error while handling state', e)
		})

		this._isActive = Object.keys(newMappings).length > 0
	}

	clearFuture(t: number) {
		this._stateHandler.clearFutureAfterTimestamp(t)
	}

	getDetails(): DeviceDetails {
		return {
			deviceId: this._deviceId,
			deviceType: this._deviceType,
			deviceName: this._deviceName,
			instanceId: this._instanceId,
			startTime: this._startTime,

			supportsExpectedPlayoutItems: false,
			canConnect: DevicesDict[this.config.type].canConnect,
		}
	}

	handleExpectedPlayoutItems(_expectedPlayoutItems: Array<ExpectedPlayoutItem>): void {
		// do nothing yet, as this isn't implemented.
	}

	getStatus(): DeviceStatus {
		return { ...this._device.getStatus(), active: this._isActive }
	}

	setDebugLogging(value: boolean) {
		this._logDebug = value
	}
	setDebugState(value: boolean) {
		this._logDebugStates = value
	}

	getCurrentTime(): number {
		if (
			!this._lastUpdateCurrentTime ||
			this._tDiff === undefined ||
			Date.now() - this._lastUpdateCurrentTime > 5 * 60 * 1000
		) {
			this._updateTimeSync()
		}

		return Date.now() + (this._tDiff ?? 0)
	}

	private _getDeviceContextAPI(): DeviceContextAPI<any> {
		return {
			logger: {
				error: (context: string, err: Error) => {
					this.emit('error', context, err)
				},
				warning: (warning: string) => {
					this.emit('warning', warning)
				},
				info: (info: string) => {
					this.emit('info', info)
				},
				debug: (...debug: any[]) => {
					if (this._logDebug) this.emit('debug', ...debug)
				},
			},

			getCurrentTime: () => this.getCurrentTime(),

			emitDebugState: (state: object) => {
				if (this._logDebugStates) {
					this.emit('debugState', state)
				}
			},

			connectionChanged: (status: Omit<DeviceStatus, 'active'>) => {
				this.emit('connectionChanged', {
					...status,
					active: this._isActive,
				})
			},
			resetResolver: () => {
				this.emit('resetResolver')
			},

			commandError: (error: Error, context: CommandWithContext) => {
				this.emit('commandError', error, context)
			},
			updateMediaObject: (collectionId: string, docId: string, doc: MediaObject | null) => {
				this.emit('updateMediaObject', collectionId, docId, doc)
			},
			clearMediaObjects: (collectionId: string) => {
				this.emit('clearMediaObjects', collectionId)
			},

			timeTrace: (trace: FinishedTrace) => {
				this.emit('timeTrace', trace)
			},

			resetState: async () => {
				await this._stateHandler.setCurrentState(undefined)
				await this._stateHandler.clearFutureStates()
				this.emit('resetResolver')
			},

			resetToState: async (state: any) => {
				await this._stateHandler.setCurrentState(state)
				await this._stateHandler.clearFutureStates()
				this.emit('resetResolver')
			},
		}
	}

	private _updateTimeSync(): void {
		this._lastUpdateCurrentTime = Date.now() // set this first so we don't update twice at the same time

		const start = Date.now()
		this.getRemoteCurrentTime()
			.then((t) => {
				const end = Date.now()

				this._tDiff = t - Math.round((start + end) / 2)
			})
			.catch((e) => {
				this.emit('error', 'Error when syncing time', e)
			})
	}
}
