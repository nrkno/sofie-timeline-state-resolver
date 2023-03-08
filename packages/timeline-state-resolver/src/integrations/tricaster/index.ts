import * as _ from 'underscore'
import { DeviceWithState, DeviceStatus, StatusCode } from './../../devices/device'
import { DoOnTime, SendMode } from '../../devices/doOnTime'

import { TimelineState } from 'superfly-timeline'
import {
	DeviceType,
	Mappings,
	TriCasterOptions,
	DeviceOptionsTriCaster,
	MappingTriCaster,
} from 'timeline-state-resolver-types'
import { ExtendedState, MappingsTriCaster, TriCasterState, TriCasterStateDiffer } from './triCasterStateDiffer'
import { TriCasterCommandWithContext } from './triCasterCommands'
import { TriCasterConnection } from './triCasterConnection'

const DEFAULT_PORT = 5951

export type DeviceOptionsTriCasterInternal = DeviceOptionsTriCaster

export class TriCasterDevice extends DeviceWithState<ExtendedState<TriCasterState>, DeviceOptionsTriCasterInternal> {
	private _doOnTime: DoOnTime

	private _resolveInitPromise: (value: boolean) => void
	private _connected = false
	private _initialized = false
	private _isTerminating = false
	private _connection?: TriCasterConnection
	private _stateDiffer?: TriCasterStateDiffer

	constructor(deviceId: string, deviceOptions: DeviceOptionsTriCasterInternal, getCurrentTime: () => Promise<number>) {
		super(deviceId, deviceOptions, getCurrentTime)

		this._doOnTime = new DoOnTime(() => this.getCurrentTime(), SendMode.BURST, this._deviceOptions)
		this._doOnTime.on('error', (e) => this.emit('error', 'TriCasterDevice.doOnTime', e))
		this._doOnTime.on('slowCommand', (msg) => this.emit('slowCommand', this.deviceName + ': ' + msg))
		this._doOnTime.on('slowSentCommand', (info) => this.emit('slowSentCommand', info))
		this._doOnTime.on('slowFulfilledCommand', (info) => this.emit('slowFulfilledCommand', info))
	}
	async init(options: TriCasterOptions): Promise<boolean> {
		const initPromise = new Promise<boolean>((resolve) => {
			this._resolveInitPromise = resolve
		})
		this._connection = new TriCasterConnection(options.host, options.port ?? DEFAULT_PORT)
		this._connection.on('connected', (info, shortcutStateXml) => {
			this._stateDiffer = new TriCasterStateDiffer(info)
			this._setInitialState(shortcutStateXml)
			this._setConnected(true)
			this._initialized = true
			this._resolveInitPromise(true)
			this.emit('info', `Connected to TriCaster ${info.productModel}, session: ${info.sessionName}`)
		})
		this._connection.on('disconnected', (reason) => {
			if (!this._isTerminating) {
				this.emit('warning', `TriCaster disconected due to: ${reason}`)
			}
			this._setConnected(false)
		})
		this._connection.on('error', (reason) => {
			this.emit('error', 'TriCasterConnection', reason)
		})
		this._connection.connect()
		return initPromise
	}

	private _setInitialState(shortcutStateXml: string): void {
		if (!this._stateDiffer) {
			throw new Error('State Differ not available')
		}
		const time = this.getCurrentTime()
		const state = this._stateDiffer.shortcutStateConverter.getTriCasterStateFromShortcutState(shortcutStateXml)
		this.setState(state, time)
	}

	private _connectionChanged(): void {
		this.emit('connectionChanged', this.getStatus())
	}

	private _setConnected(connected: boolean): void {
		if (this._connected !== connected) {
			this._connected = connected
			this._connectionChanged()
		}
	}

	/** Called by the Conductor a bit before handleState is called */
	prepareForHandleState(newStateTime: number): void {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}

	handleState(newState: TimelineState, newMappings: Mappings): void {
		const triCasterMappings: MappingsTriCaster = this.filterTriCasterMappings(newMappings)
		super.onHandleState(newState, newMappings)
		if (!this._initialized || !this._stateDiffer) {
			// before it's initialized don't do anything
			this.emit('warning', 'TriCaster not initialized yet')
			return
		}

		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		const oldState =
			this.getStateBefore(previousStateTime)?.state ?? this._stateDiffer.getDefaultState(triCasterMappings)

		const newTriCasterState = this._stateDiffer.timelineStateConverter.getTriCasterStateFromTimelineState(
			newState,
			triCasterMappings
		)

		const commandsToAchieveState = this._stateDiffer.getCommandsToAchieveState(newTriCasterState, oldState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)

		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newTriCasterState, newState.time)
	}

	private filterTriCasterMappings(newMappings: Mappings): MappingsTriCaster {
		return Object.entries(newMappings).reduce<MappingsTriCaster>((accumulator, [layerName, mapping]) => {
			if (mapping.device === DeviceType.TRICASTER && mapping.deviceId === this.deviceId) {
				accumulator[layerName] = mapping as MappingTriCaster
			}
			return accumulator
		}, {})
	}

	clearFuture(clearAfterTime: number): void {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}

	async terminate(): Promise<boolean> {
		this._isTerminating = true
		this._doOnTime.dispose()
		this._connection?.close()
		return Promise.resolve(true)
	}

	getStatus(): DeviceStatus {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		}

		return {
			statusCode: statusCode,
			messages: messages,
			active: this.isActive,
		}
	}

	async makeReady(okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			// do something?
		}
	}

	get canConnect(): boolean {
		return true
	}

	get connected(): boolean {
		return this._connected
	}

	get deviceType() {
		return DeviceType.TRICASTER
	}

	get deviceName(): string {
		return 'TriCaster ' + this.deviceId
	}

	get queue() {
		return this._doOnTime.getQueue()
	}

	private _addToQueue(commandsToAchieveState: Array<TriCasterCommandWithContext>, time: number): void {
		_.each(commandsToAchieveState, (cmd: TriCasterCommandWithContext) => {
			this._doOnTime.queue(time, undefined, async (cmd: TriCasterCommandWithContext) => this._sendCommand(cmd), cmd)
		})
	}

	private _sendCommand = (commandWithContext: TriCasterCommandWithContext): Promise<void> | undefined => {
		this.emitDebug(commandWithContext)

		return this._connection?.send(commandWithContext.command)
	}
}
