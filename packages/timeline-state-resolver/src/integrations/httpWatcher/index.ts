import {
	TimelineContentTypeHTTP,
	HTTPWatcherOptions,
	ActionExecutionResult,
	StatusCode,
	DeviceStatus,
} from 'timeline-state-resolver-types'
import got, { Headers, Response } from 'got'
import { CommandWithContext, Device } from '../../service/device'

type HTTPWatcherDeviceState = Record<string, never>

/**
 * This is a HTTPWatcherDevice, requests a uri on a regular interval and watches
 * it's response.
 */
export class HTTPWatcherDevice extends Device<HTTPWatcherOptions, HTTPWatcherDeviceState, CommandWithContext> {
	readonly actions: Record<string, (id: string, payload?: Record<string, any>) => Promise<ActionExecutionResult>> = {}

	private uri?: string
	/** Setup in init */
	private httpMethod!: TimelineContentTypeHTTP
	private expectedHttpResponse: number | undefined
	private headers?: Headers
	private keyword: string | undefined
	/** Setup in init */
	private intervalTime!: number
	private interval: NodeJS.Timer | undefined
	private status: StatusCode = StatusCode.UNKNOWN
	private statusReason: string | undefined

	private onInterval() {
		if (!this.uri) {
			this._setStatus(StatusCode.BAD, 'URI not set')
			return
		}

		const reqMethod = got[this.httpMethod]
		if (reqMethod) {
			reqMethod(this.uri, {
				headers: this.headers,
			})
				.then((response) => this.handleResponse(response))
				.catch((error) => {
					this._setStatus(StatusCode.BAD, error.toString() || 'Unknown')
				})
		} else {
			this._setStatus(StatusCode.BAD, `Bad request method: "${this.httpMethod}"`)
		}
	}
	private stopInterval() {
		if (this.interval) {
			clearInterval(this.interval)
			this.interval = undefined
		}
	}
	private startInterval() {
		this.stopInterval()
		this.interval = setInterval(() => this.onInterval(), this.intervalTime)
		// Also do a check right away:
		setTimeout(() => this.onInterval(), 300)
	}

	private handleResponse(response: Response<string>) {
		if (this.expectedHttpResponse && this.expectedHttpResponse !== response.statusCode) {
			this._setStatus(StatusCode.BAD, `Expected status code ${this.expectedHttpResponse}, got ${response.statusCode}`)
		} else if (this.keyword && response.body && response.body.indexOf(this.keyword) === -1) {
			this._setStatus(StatusCode.BAD, `Expected keyword "${this.keyword}" not found`)
		} else {
			this._setStatus(StatusCode.GOOD)
		}
	}

	async init(options: HTTPWatcherOptions): Promise<boolean> {
		switch (options.httpMethod) {
			case 'post':
				this.httpMethod = TimelineContentTypeHTTP.POST
				break
			case 'delete':
				this.httpMethod = TimelineContentTypeHTTP.DELETE
				break
			case 'put':
				this.httpMethod = TimelineContentTypeHTTP.PUT
				break
			case 'get':
			case undefined:
			default:
				this.httpMethod = TimelineContentTypeHTTP.GET
				break
		}

		this.expectedHttpResponse = Number(options.expectedHttpResponse) || undefined
		this.headers = options.headers
		this.keyword = options.keyword
		this.intervalTime = Math.max(Number(options.interval) || 1000, 1000)
		this.uri = options.uri

		this.startInterval()

		return Promise.resolve(true)
	}

	async terminate(): Promise<void> {
		this.stopInterval()
	}

	getStatus(): Omit<DeviceStatus, 'active'> {
		return {
			statusCode: this.status,
			messages: this.statusReason ? [this.statusReason] : [],
		}
	}
	private _setStatus(status: StatusCode, reason?: string) {
		if (this.status !== status || this.statusReason !== reason) {
			this.status = status
			this.statusReason = reason

			this.context.connectionChanged(this.getStatus())
		}
	}

	get connected(): boolean {
		return false
	}

	convertTimelineStateToDeviceState(): HTTPWatcherDeviceState {
		// Noop
		return {}
	}
	diffStates(): Array<CommandWithContext> {
		// Noop
		return []
	}
	async sendCommand(): Promise<void> {
		// Noop
	}
}
