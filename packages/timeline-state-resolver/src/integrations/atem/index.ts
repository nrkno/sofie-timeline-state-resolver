import { EventEmitter } from 'eventemitter3'
import * as _ from 'underscore'

import Debug from 'debug'
const debug = Debug('timeline-state-resolver:atem')

import { AtemState } from 'atem-state'
import { BasicAtem, Commands as AtemCommands } from 'atem-connection'
import { AtemDeviceState, tlStateToDeviceState } from './deviceState'

import {
	ActionExecutionResult,
	AtemOptions,
	DeviceStatus,
	Mappings,
	StatusCode,
	Timeline,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { Device, DeviceImplEvents } from '../../service/device'
import { diffDeviceStates } from './deviceDiff'

type AtemDeviceOptions = AtemOptions

export interface AtemCommandWithContext {
	command: AtemCommands.ISerializableCommand
	context: CommandContext
	tlObjId: string
	paths: string[]
}
type CommandContext = any

export class AtemDevice
	extends EventEmitter<DeviceImplEvents>
	implements Device<AtemDeviceOptions, AtemDeviceState, AtemCommandWithContext>
{
	private _state: AtemState
	private _atem: BasicAtem
	private _connected = false
	private _initialized = false

	private _lastUpdated: { [path: string]: number } = {}
	private _lastControlled: { [path: string]: number } = {}
	private _globalLastControlled: number = 0

	init(options: AtemDeviceOptions): Promise<boolean> {
		return new Promise((resolve, reject) => {
			this._state = new AtemState()
			this._atem = new BasicAtem()
			this._atem.once('connected', () => {
				// check if state has been initialized:
				this._connected = true
				this._initialized = true
				resolve(true)
			})
			this._atem.on('connected', () => {
				debug('connected')
				// const time = this.getCurrentTime()
				// if (this._atem.state) this.setState(this._atem.state, time)
				this._connected = true
				this.emit('connectionChanged')
				// this.emit('resetResolver')
			})
			this._atem.on('disconnected', () => {
				this._connected = false
				this.emit('connectionChanged')
			})
			this._atem.on('error', (e) => this.emit('error', 'Atem', new Error(e)))
			this._atem.on('stateChanged', (_, p) => {
				for (const path of p) {
					this._lastUpdated[path] = Date.now()
				}
				if (p.filter((p) => p !== 'info.lastTime').length > 0 && Date.now() - this._globalLastControlled > 40) {
					// todo - hardcoded 40ms
					debug('we should reset here')
					this.emit('recalculateNext')
				}
			})

			this._atem.connect(options.host, options.port).catch((e) => {
				reject(e)
			})
		})
	}

	async terminate(): Promise<boolean> {
		this._atem.destroy()
		return true
	}

	async makeReady(_okToDestroyStuff?: boolean): Promise<void> {
		// todo: implement reset
	}

	get connected(): boolean {
		return this._connected
	}

	getStatus(): Omit<DeviceStatus, 'active'> {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (statusCode === StatusCode.GOOD) {
			if (!this._connected) {
				statusCode = StatusCode.BAD
				messages.push(`Atem disconnected`)
			}
		}
		if (statusCode === StatusCode.GOOD) {
			const psus = this._atem.state?.info.power || []
			_.each(psus, (psu: boolean, i: number) => {
				if (!psu) {
					statusCode = StatusCode.WARNING_MAJOR
					messages.push(`Atem PSU ${i + 1} is faulty. The device has ${psus.length} PSU(s) in total.`)
				}
			})
		}
		if (!this._initialized) {
			statusCode = StatusCode.BAD
			messages.push(`ATEM device connection not initialized (restart required)`)
		}

		return {
			statusCode: statusCode,
			messages: messages,
		}
	}

	actions: Record<string, (id: string, payload: Record<string, any>) => Promise<ActionExecutionResult>> = {}

	convertTimelineStateToDeviceState(
		state: Timeline.TimelineState<TSRTimelineContent>,
		newMappings: Mappings
	): AtemDeviceState {
		if (!this._initialized) throw Error('convertStateToAtem cannot be used before inititialized')

		return tlStateToDeviceState(state, newMappings)
	}

	diffStates(
		oldState: AtemDeviceState | undefined,
		newState: AtemDeviceState,
		mappings: Mappings
	): Array<AtemCommandWithContext> {
		return diffDeviceStates(oldState, newState, mappings, this._lastUpdated, this._lastControlled)
	}

	async sendCommand(command: AtemCommandWithContext): Promise<any> {
		this.emit('debug', command)
		debug('Send cmd', Date.now(), command)

		for (const p of command.paths) {
			this._lastControlled[p] = Date.now()
		}
		this._globalLastControlled = Date.now()

		return this._atem
			.sendCommand(command.command)
			.then(() => {
				// @todo: command was acknowledged by atem, how will we check if it did what we wanted?
			})
			.catch((error) => {
				this.emit('commandError', error, command)
			})
	}
}
