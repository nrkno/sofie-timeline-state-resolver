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
import { Device } from './device'
import { StateHandler } from './stateHandler'
import { DevicesDict } from './devices'
import { DeviceEvents } from './device'
import { SlowSentCommandInfo, SlowFulfilledCommandInfo, CommandWithContext, CommandReport } from '../'

type Config = any
type DeviceState = any
type Command = {
	command: any
	context: any
	tlObjId: string
}

export interface ServiceDetails {
	deviceId: string
	deviceType: DeviceType
	deviceName: string
	instanceId: number
	startTime: number
}

/**
 * Top level container for setting up and interacting with any device integrations
 */
export class Service extends EventEmitter<DeviceEvents> {
	private _device: Device<any, DeviceState, Command> & EventEmitter<DeviceEvents>
	private _stateHandler: StateHandler<DeviceState, Command>

	private _deviceId: string
	private _deviceType: DeviceType
	private _deviceName: string
	private _instanceId: number
	private _startTime: number

	private _isActive = false
	private _logDebug = false
	private _logDebugStates = false

	constructor(id: string, private config: Config) {
		super()

		const deviceSpecs = DevicesDict[config.type]

		if (!deviceSpecs) {
			throw new Error('Could not find device of type ' + config.type)
		}

		this._device = new deviceSpecs.deviceClass()
		this._deviceId = id
		this._deviceType = config.type
		this._deviceName = deviceSpecs.deviceName(id, config)
		this._startTime = Date.now()

		this._setupDeviceEventHandlers()

		// set up state handler
		this._stateHandler = new StateHandler(
			(state, mappings) => this._device.convertTimelineStateToDeviceState(state, mappings),
			(o, n, m) => this._device.diffStates(o, n, m),
			(command) => this._device.sendCommand(command.command, command.context, command.tlObjId)
		)
	}

	async initDevice(_activeRundownPlaylistId?: string) {
		const res = await this._device.init(this.config.options)
		this._stateHandler.setCurrentState(undefined) // todo - temporary
		return res
	}
	async terminate() {
		await this._stateHandler.terminate()
		return this._device.terminate()
	}

	async executeAction(id: string, payload: Record<string, any>) {
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

	handleState(newState: Timeline.TimelineState<TSRTimelineContent>, newMappings: Mappings) {
		this._stateHandler.handleState(newState, newMappings)

		this._isActive = Object.keys(newMappings).length > 0
	}

	// @todo - do we still need this?
	clearFuture() {
		this._stateHandler.clearFuture()
	}

	getDetails(): ServiceDetails {
		return {
			deviceId: this._deviceId,
			deviceType: this._deviceType,
			deviceName: this._deviceName,
			instanceId: this._instanceId,
			startTime: this._startTime,
		}
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
		this._device.on('connectionChanged', () => {
			this.emit('connectionChanged', this.getStatus())
		})
		/** A message to the resolver that something has happened that warrants a reset of the resolver (to re-run it again) */
		this._device.on('resetResolver', () => {
			this.emit('resetResolver')
		})

		/** A report that a command was sent too late */
		this._device.on('slowCommand', (commandInfo: string) => {
			this.emit('slowCommand', commandInfo)
		})
		/** A report that a command was sent too late */
		this._device.on('slowSentCommand', (info: SlowSentCommandInfo) => {
			this.emit('slowSentCommand', info)
		})
		/** A report that a command was fullfilled too late */
		this._device.on('slowFulfilledCommand', (info: SlowFulfilledCommandInfo) => {
			this.emit('slowFulfilledCommand', info)
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

		this._device.on('commandReport', (commandReport: CommandReport) => {
			this.emit('commandReport', commandReport)
		})
		this._device.on('timeTrace', (trace: FinishedTrace) => {
			this.emit('timeTrace', trace)
		})
	}
}
