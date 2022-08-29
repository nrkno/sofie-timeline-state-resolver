import {
	DeviceOptionsTelemetrics,
	DeviceType,
	Mappings,
	StatusCode,
	TimelineObjTelemetrics,
	TelemetricsOptions,
} from 'timeline-state-resolver-types'
import { TimelineState } from 'superfly-timeline'
import { Device, DeviceStatus } from './device'
import { Socket } from 'net'
import * as _ from 'underscore'

const TELEMETRICS_NAME = 'Telemetrics'
const SOCKET_PORT = 5000

/**
 * Connects to a Telemetrics Device on port 5000 using a TCP socket.
 * This class uses a fire and forget approach.
 */
export class TelemetricsDevice extends Device<DeviceOptionsTelemetrics> {
	private socket: Socket
	private statusCode: StatusCode = StatusCode.UNKNOWN
	private errorMessage: string

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

	getStatus() {
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

		const deviceStatus: DeviceStatus = {
			statusCode: this.statusCode,
			messages,
			active: this.isActive,
		}
		return deviceStatus
	}

	handleState(newState: TimelineState, mappings: Mappings): void {
		super.onHandleState(newState, mappings)
		_.each(newState.layers, (timelineObject, _layerName) => {
			const telemetricsObject: TimelineObjTelemetrics = timelineObject as unknown as TimelineObjTelemetrics
			const preset: number = telemetricsObject.content.presetNumber
			const command = `P0C${preset}\r`
			this.socket.write(command)
		})
	}

	async init(options: TelemetricsOptions): Promise<boolean> {
		return Promise.resolve(this.setupSocket(options.host))
	}

	private async setupSocket(host: string): Promise<boolean> {
		this.socket = new Socket()

		this.socket.on('data', (data: Buffer) => {
			this.emit('debug', `${this.deviceName} received data: ${data.toString()}`)
		})

		this.socket.on('error', (error: Error) => {
			this.updateStatus(StatusCode.FATAL, error)
		})

		this.socket.on('close', (hadError: boolean) => {
			this.updateStatus(hadError ? StatusCode.FATAL : StatusCode.BAD)
		})

		this.socket.connect(SOCKET_PORT, host)

		return new Promise<boolean>((resolve) => {
			this.socket.on('connect', () => {
				this.updateStatus(StatusCode.GOOD)
				resolve(true)
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

	prepareForHandleState(_newStateTime: number): void {
		// No state to handle - we use a fire and forget approach
	}
}
