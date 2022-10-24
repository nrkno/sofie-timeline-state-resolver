import {
	DeviceOptionsTelemetrics,
	DeviceType,
	Mappings,
	StatusCode,
	TelemetricsOptions,
	TimelineObjTelemetrics,
} from 'timeline-state-resolver-types'
import { TimelineState } from 'superfly-timeline'
import { DeviceStatus, DeviceWithState } from '../../devices/device'
import { Socket } from 'net'
import * as _ from 'underscore'
import { DoOnTime } from '../../devices/doOnTime'
import Timer = NodeJS.Timer

const TELEMETRICS_NAME = 'Telemetrics'
const TELEMETRICS_COMMAND_PREFIX = 'P0C'
const DEFAULT_SOCKET_PORT = 5000
const TIMEOUT_IN_MS = 2000

interface TelemetricsState {
	presetShotIdentifiers: number[]
}

/**
 * Connects to a Telemetrics Device on port 5000 using a TCP socket.
 * This class uses a fire and forget approach.
 */
export class TelemetricsDevice extends DeviceWithState<TelemetricsState, DeviceOptionsTelemetrics> {
	private doOnTime: DoOnTime

	private socket: Socket
	private statusCode: StatusCode = StatusCode.UNKNOWN
	private errorMessage: string
	private resolveInitPromise: (value: boolean) => void

	private retryConnectionTimer: Timer | undefined

	constructor(deviceId: string, deviceOptions: DeviceOptionsTelemetrics, getCurrentTime: () => Promise<number>) {
		super(deviceId, deviceOptions, getCurrentTime)

		this.doOnTime = new DoOnTime(() => this.getCurrentTime())
		this.handleDoOnTime(this.doOnTime, 'telemetrics')
	}

	get canConnect(): boolean {
		return true
	}

	clearFuture(_clearAfterTime: number): void {
		// No state to handle - we use a fire and forget approach
	}

	get connected(): boolean {
		return this.statusCode === StatusCode.GOOD
	}

	get deviceName(): string {
		return `${TELEMETRICS_NAME} ${this.deviceId}`
	}

	get deviceType() {
		return DeviceType.TELEMETRICS
	}

	getStatus(): DeviceStatus {
		const messages: string[] = []

		switch (this.statusCode) {
			case StatusCode.GOOD:
				this.errorMessage = ''
				messages.push('Connected')
				break
			case StatusCode.BAD:
				messages.push('No connection')
				break
			case StatusCode.UNKNOWN:
				this.errorMessage = ''
				messages.push('Not initialized')
				break
		}

		if (this.errorMessage) {
			messages.push(this.errorMessage)
		}

		return {
			statusCode: this.statusCode,
			messages,
			active: this.isActive,
		}
	}

	handleState(newState: TimelineState, mappings: Mappings): void {
		super.onHandleState(newState, mappings)
		const previousStateTime: number = Math.max(this.getCurrentTime(), newState.time)
		const oldState: TelemetricsState = this.getStateBefore(previousStateTime)?.state ?? { presetShotIdentifiers: [] }
		const newTelemetricsState: TelemetricsState = this.findNewTelemetricsState(newState)

		this.doOnTime.clearQueueNowAndAfter(previousStateTime)

		this.setState(newTelemetricsState, newState.time)
		const presetIdentifiersToSend: number[] = this.filterNewPresetIdentifiersFromOld(newTelemetricsState, oldState)

		presetIdentifiersToSend.forEach((presetShotIdentifier) => this.queueCommand(presetShotIdentifier, newState))
	}

	private findNewTelemetricsState(newState: TimelineState): TelemetricsState {
		const newTelemetricsState: TelemetricsState = { presetShotIdentifiers: [] }

		newTelemetricsState.presetShotIdentifiers = _.map(newState.layers, (timelineObject, _layerName) => {
			const telemetricsObject: TimelineObjTelemetrics = timelineObject as unknown as TimelineObjTelemetrics
			return telemetricsObject.content.presetShotIdentifiers
		}).flat()

		return newTelemetricsState
	}

	private filterNewPresetIdentifiersFromOld(newState: TelemetricsState, oldState: TelemetricsState): number[] {
		return newState.presetShotIdentifiers.filter((preset) => !oldState.presetShotIdentifiers.includes(preset))
	}

	private queueCommand(presetShotIdentifier: number, newState: TimelineState) {
		const command = `${TELEMETRICS_COMMAND_PREFIX}${presetShotIdentifier}\r`
		this.doOnTime.queue(newState.time, undefined, () => this.socket.write(command))
	}

	async init(options: TelemetricsOptions): Promise<boolean> {
		const initPromise = new Promise<boolean>((resolve) => {
			this.resolveInitPromise = resolve
		})
		this.connectToDevice(options.host, options.port ?? DEFAULT_SOCKET_PORT)
		return initPromise
	}

	private connectToDevice(host: string, port: number) {
		if (!this.socket || this.socket.destroyed) {
			this.setupSocket(host, port)
		}
		this.socket.connect(port, host)
	}

	private setupSocket(host: string, port: number) {
		this.socket = new Socket()

		this.socket.on('data', (data: Buffer) => {
			this.emit('debug', `${this.deviceName} received data: ${data.toString()}`)
		})

		this.socket.on('error', (error: Error) => {
			this.updateStatus(StatusCode.BAD, error)
		})

		this.socket.on('close', (hadError: boolean) => {
			this.doOnTime.dispose()
			if (hadError) {
				this.updateStatus(StatusCode.BAD)
				this.reconnect(host, port)
			} else {
				this.updateStatus(StatusCode.UNKNOWN)
			}
		})

		this.socket.on('connect', () => {
			this.emit('debug', 'Successfully connected to device')
			this.updateStatus(StatusCode.GOOD)
			this.resolveInitPromise(true)
		})
	}

	private updateStatus(statusCode: StatusCode, error?: Error): void {
		this.statusCode = statusCode
		if (error) {
			this.errorMessage = error.message
		}
		this.emit('connectionChanged', this.getStatus())
	}

	private reconnect(host: string, port: number): void {
		if (this.retryConnectionTimer) {
			return
		}
		this.retryConnectionTimer = setTimeout(() => {
			this.emit('debug', 'Reconnecting...')
			clearTimeout(this.retryConnectionTimer)
			this.retryConnectionTimer = undefined
			this.connectToDevice(host, port)
		}, TIMEOUT_IN_MS)
	}

	prepareForHandleState(newStateTime: number): void {
		this.doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}

	async terminate(): Promise<boolean> {
		this.doOnTime.dispose()
		if (this.retryConnectionTimer) {
			clearTimeout(this.retryConnectionTimer)
			this.retryConnectionTimer = undefined
		}
		this.socket?.destroy()
		return true
	}
}
