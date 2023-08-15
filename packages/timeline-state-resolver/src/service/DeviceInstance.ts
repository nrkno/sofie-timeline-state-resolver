import EventEmitter = require('eventemitter3')
import { FinishedTrace, t } from '../lib'
import {
	ActionExecutionResultCode,
	DeviceStatus,
	DeviceType,
	Mappings,
	MediaObject,
	Timeline,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { CommandWithContext, Device } from './device'
import { StateHandler } from './stateHandler'
import { DevicesDict } from './devices'
import { DeviceEvents } from './device'
import { DeviceOptionsAnyInternal, ExpectedPlayoutItem } from '..'
import { StateChangeReport } from './measure'

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
	private _device: Device<any, DeviceState, CommandWithContext> & EventEmitter<DeviceEvents>
	private _stateHandler: StateHandler<DeviceState, CommandWithContext>

	private _deviceId: string
	private _deviceType: DeviceType
	private _deviceName: string
	private _instanceId: number
	private _startTime: number

	private _isActive = false
	private _logDebug = false
	private _logDebugStates = false

	constructor(id: string, private config: Config, public getCurrentTime: () => number) {
		super()

		const deviceSpecs = DevicesDict[config.type]

		if (!deviceSpecs) {
			throw new Error('Could not find device of type ' + config.type)
		}

		this._device = new deviceSpecs.deviceClass()
		this._deviceId = id
		this._deviceType = config.type
		this._deviceName = deviceSpecs.deviceName(id, config)
		this._startTime = this.getCurrentTime()

		this._setupDeviceEventHandlers()

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
				getCurrentTime: this.getCurrentTime,
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
			return {
				result: ActionExecutionResultCode.Error,
				response: t('Action "{{id}}" not found', { id }),
			}
		}

		return action(id, payload)
	}

	async makeReady(okToDestroyStuff?: boolean): Promise<void> {
		if (this._device.makeReady) {
			return this._device.makeReady(okToDestroyStuff)
		}
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

	// @todo - should some of these be moved over to a context object?
	private _setupDeviceEventHandlers() {
		this._device.on('info', (info: string) => {
			this.emit('info', info)
		})
		this._device.on('warning', (warning: string) => {
			this.emit('warning', warning)
		})
		this._device.on('error', (context: string, err: Error) => {
			this.emit('error', context, err)
		})
		this._device.on('debug', (...debug: any[]) => {
			if (this._logDebug) {
				this.emit('debug', ...debug)
			}
		})

		this._device.on('debugState', (state: object) => {
			if (this._logDebugStates) {
				this.emit('debugState', state)
			}
		})
		/** The connection status has changed */
		this._device.on('connectionChanged', (status) => {
			this.emit('connectionChanged', {
				...status,
				active: this._isActive,
			})
		})
		/** A message to the resolver that something has happened that warrants a reset of the resolver (to re-run it again) */
		this._device.on('resetResolver', () => {
			this.emit('resetResolver')
		})

		/** Something went wrong when executing a command  */
		this._device.on('commandError', (error: Error, context: CommandWithContext) => {
			this.emit('commandError', error, context)
		})
		/** Update a MediaObject  */
		this._device.on('updateMediaObject', (collectionId: string, docId: string, doc: MediaObject | null) => {
			this.emit('updateMediaObject', collectionId, docId, doc)
		})
		/** Clear a MediaObjects collection */
		this._device.on('clearMediaObjects', (collectionId: string) => {
			this.emit('clearMediaObjects', collectionId)
		})

		this._device.on('timeTrace', (trace: FinishedTrace) => {
			this.emit('timeTrace', trace)
		})
	}
}
