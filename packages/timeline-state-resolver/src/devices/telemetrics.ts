import {
	DeviceOptionsTelemetrics,
	DeviceType,
	Mappings,
	StatusCode,
	TelemetricsOptions,
	TimelineObjTelemetrics,
} from 'timeline-state-resolver-types'
import { TimelineState } from 'superfly-timeline'
import { Device, DeviceStatus } from './device'
import { Socket } from 'net'
import * as _ from 'underscore'
import { DoOnTime } from '../doOnTime'
import Timer = NodeJS.Timer
import { ObjectId } from 'timeline-state-resolver-types/src/superfly-timeline'

const TELEMETRICS_NAME = 'Telemetrics'
const SOCKET_PORT = 5000
const TIMEOUT_IN_MS = 2000

/**
 * Connects to a Telemetrics Device on port 5000 using a TCP socket.
 * This class uses a fire and forget approach.
 */
export class TelemetricsDevice extends Device<DeviceOptionsTelemetrics> {
	private doOnTime: DoOnTime

	private socket: Socket
	private statusCode: StatusCode = StatusCode.UNKNOWN
	private errorMessage: string

	private lastReceivedCommandId: ObjectId
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
		_.each(newState.layers, (timelineObject, _layerName) => {
			const telemetricsObject: TimelineObjTelemetrics = timelineObject as unknown as TimelineObjTelemetrics
			if (this.hasCommandBeenSent(telemetricsObject.id)) {
				return
			}
			this.lastReceivedCommandId = telemetricsObject.id

			telemetricsObject.content.presetShotIdentifiers.forEach((presetShotIdentifier: number) => {
				const command = `P0C${presetShotIdentifier}\r`
				this.doOnTime.queue(newState.time, undefined, () => this.socket.write(command))
			})
		})
	}

	private hasCommandBeenSent(commandId: ObjectId): boolean {
		return this.lastReceivedCommandId === commandId
	}

	async init(options: TelemetricsOptions): Promise<boolean> {
		return this.setupSocket(options.host)
	}

	private async setupSocket(host: string): Promise<boolean> {
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
				this.reconnect(host)
			} else {
				this.updateStatus(StatusCode.UNKNOWN)
			}
		})

		this.socket.connect(SOCKET_PORT, host)

		return new Promise((resolve) => {
			this.socket.on('connect', () => {
				this.updateStatus(StatusCode.GOOD)
				return resolve(true)
			})
		})
	}

	private updateStatus(statusCode: StatusCode, error?: Error): void {
		this.statusCode = statusCode
		if (error) {
			this.errorMessage = error.message
		}
		this.emit('connectionChanged', this.getStatus())
	}

	private reconnect(host: string): void {
		if (this.retryConnectionTimer) {
			return
		}
		this.retryConnectionTimer = setTimeout(() => {
			this.emit('info', 'Reconnecting...')
			clearTimeout(this.retryConnectionTimer!)
			this.retryConnectionTimer = undefined
			void this.setupSocket(host)
		}, TIMEOUT_IN_MS)
	}

	prepareForHandleState(newStateTime: number): void {
		this.doOnTime.clearQueueNowAndAfter(newStateTime)
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
