import {
	ActionExecutionResult,
	DeviceStatus,
	Mappings,
	StatusCode,
	TelemetricsOptions,
	Timeline,
	TimelineContentTelemetrics,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { Socket } from 'net'
import { CommandWithContext, Device } from '../../service/device'

const TELEMETRICS_COMMAND_PREFIX = 'P0C'
const DEFAULT_SOCKET_PORT = 5000
const TIMEOUT_IN_MS = 2000

interface TelemetricsState {
	presetShotIdentifiers: number[]
}

interface TelemetricsCommandWithContext extends CommandWithContext {
	command: { presetShotIdentifier: number }
}

/**
 * Connects to a Telemetrics Device on port 5000 using a TCP socket.
 * This class uses a fire and forget approach.
 */
export class TelemetricsDevice extends Device<TelemetricsOptions, TelemetricsState, TelemetricsCommandWithContext> {
	readonly actions: {
		[id: string]: (id: string, payload?: Record<string, any>) => Promise<ActionExecutionResult>
	} = {}

	private socket: Socket | undefined
	private statusCode: StatusCode = StatusCode.UNKNOWN
	private errorMessage: string | undefined

	private retryConnectionTimer: NodeJS.Timer | undefined

	get connected(): boolean {
		return this.statusCode === StatusCode.GOOD
	}

	getStatus(): Omit<DeviceStatus, 'active'> {
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
		}
	}

	diffStates(
		oldState: TelemetricsState | undefined,
		newState: TelemetricsState,
		_mappings: Mappings<unknown>,
		_time: number
	): TelemetricsCommandWithContext[] {
		return newState.presetShotIdentifiers
			.filter((preset) => !oldState || !oldState.presetShotIdentifiers.includes(preset))
			.map((presetShotIdentifier) => {
				return {
					command: { presetShotIdentifier },
					context: '',
					timelineObjId: '',
				}
			})
	}

	convertTimelineStateToDeviceState(
		state: Timeline.TimelineState<TSRTimelineContent>,
		_newMappings: Mappings<unknown>
	): TelemetricsState {
		const newTelemetricsState: TelemetricsState = { presetShotIdentifiers: [] }

		newTelemetricsState.presetShotIdentifiers = Object.entries<Timeline.ResolvedTimelineObjectInstance>(state.layers)
			.map(([_layerName, timelineObject]) => {
				const telemetricsContent = timelineObject.content as TimelineContentTelemetrics
				return telemetricsContent.presetShotIdentifiers
			})
			.flat()

		return newTelemetricsState
	}

	async sendCommand({ command, context, timelineObjId }: TelemetricsCommandWithContext): Promise<void> {
		const cwc: CommandWithContext = {
			context,
			command,
			timelineObjId,
		}
		this.context.logger.debug(cwc)

		// Skip attempting send if not connected
		if (!this.socket) return

		const commandStr = `${TELEMETRICS_COMMAND_PREFIX}${command.presetShotIdentifier}\r`
		this.socket.write(commandStr)
	}

	async init(options: TelemetricsOptions): Promise<boolean> {
		this.connectToDevice(options.host, options.port ?? DEFAULT_SOCKET_PORT)
		return true
	}

	private connectToDevice(host: string, port: number) {
		if (!this.socket || this.socket.destroyed) {
			this.setupSocket(host, port)
		}
		if (this.socket) this.socket.connect(port, host)
	}

	private setupSocket(host: string, port: number) {
		this.socket = new Socket()

		this.socket.on('data', (data: Buffer) => {
			this.context.logger.debug(`received data: ${data.toString()}`)
		})

		this.socket.on('error', (error: Error) => {
			this.updateStatus(StatusCode.BAD, error)
		})

		this.socket.on('close', (hadError: boolean) => {
			if (hadError) {
				this.updateStatus(StatusCode.BAD)
				this.reconnect(host, port)
			} else {
				this.updateStatus(StatusCode.UNKNOWN)
			}
		})

		this.socket.on('connect', () => {
			this.context.logger.debug('Successfully connected to device')
			this.updateStatus(StatusCode.GOOD)
		})
	}

	private updateStatus(statusCode: StatusCode, error?: Error): void {
		this.statusCode = statusCode
		if (error) {
			this.errorMessage = error.message
		}
		this.context.connectionChanged(this.getStatus())
	}

	private reconnect(host: string, port: number): void {
		if (this.retryConnectionTimer) {
			return
		}
		this.retryConnectionTimer = setTimeout(() => {
			this.context.logger.debug('Reconnecting...')
			clearTimeout(this.retryConnectionTimer)
			this.retryConnectionTimer = undefined
			this.connectToDevice(host, port)
		}, TIMEOUT_IN_MS)
	}

	async terminate(): Promise<void> {
		if (this.retryConnectionTimer) {
			clearTimeout(this.retryConnectionTimer)
			this.retryConnectionTimer = undefined
		}
		this.socket?.destroy()
	}
}
