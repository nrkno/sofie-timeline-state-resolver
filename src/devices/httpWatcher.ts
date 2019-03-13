import * as _ from 'underscore'
import {
	DeviceStatus,
	StatusCode,
	Device
} from './device'
import {
	DeviceType,
	DeviceOptions,
	TimelineContentTypeHttp
} from '../types/src'
import * as request from 'request'

import {
	TimelineState
} from 'superfly-timeline'

/*
	This is a HTTPSendDevice, it sends http commands when it feels like it
*/
export interface HttpWatcherDeviceOptions extends DeviceOptions {
	options?: {
		uri?: string
		httpMethod?: string
		expectedHttpResponse?: number
		keyword?: string
		interval?: number
	}
}

export class HttpWatcherDevice extends Device {
	private uri?: string
	private httpMethod: TimelineContentTypeHttp
	private expectedHttpResponse: number | undefined
	private keyword: string | undefined
	private intervalTime: number
	private interval: NodeJS.Timer | undefined
	private status: StatusCode = StatusCode.UNKNOWN
	private statusReason: string | undefined
	constructor (deviceId: string, deviceOptions: HttpWatcherDeviceOptions, options) {
		super(deviceId, deviceOptions, options)
		const opts = deviceOptions.options || {}
		switch (opts.httpMethod) {
			case 'post':
				this.httpMethod = TimelineContentTypeHttp.POST
				break
			case 'delete':
				this.httpMethod = TimelineContentTypeHttp.DELETE
				break
			case 'put':
				this.httpMethod = TimelineContentTypeHttp.PUT
				break
			case 'get':
			case undefined:
			default:
				this.httpMethod = TimelineContentTypeHttp.GET
				break
		}

		this.expectedHttpResponse = Number(opts.expectedHttpResponse) || undefined
		this.keyword = opts.keyword
		this.intervalTime = Math.max(Number(opts.interval) || 1000, 1000)
		this.uri = opts.uri
	}

	onInterval () {
		if (!this.uri) {
			this._setStatus(StatusCode.BAD, 'URI not set')
			return
		}
		let reqMethod = request[this.httpMethod]
		if (reqMethod) {
			reqMethod(
				this.uri,
				{},
				this.handleResponse.bind(this)
			)
		} else {
			this._setStatus(StatusCode.BAD, `Bad request method: "${this.httpMethod}"`)
		}
	}
	stopInterval () {
		if (this.interval) {
			clearInterval(this.interval)
			this.interval = undefined
		}
	}
	startInterval () {
		this.stopInterval()
		this.interval = setInterval(this.onInterval.bind(this), this.intervalTime)
	}

	handleResponse (error: any, response: request.Response, body: any) {
		if (error) {
			this._setStatus(StatusCode.BAD, error.toString() || 'Unknown')
		} else if (
			this.expectedHttpResponse &&
			this.expectedHttpResponse !== response.statusCode
		) {
			this._setStatus(StatusCode.BAD, `Expected status code ${this.expectedHttpResponse}, got ${response.statusCode}`)
		} else if (
			this.keyword &&
			body &&
			(body.toString() || '').indexOf(this.keyword) === -1
		) {
			this._setStatus(StatusCode.BAD, `Expected keyword "${this.keyword}" not found`)
		} else {
			this._setStatus(StatusCode.GOOD)
		}
	}

	init (): Promise<boolean> {
		this.startInterval()

		return Promise.resolve(true)
	}
	handleState (_newState: TimelineState) {
		// NOP
	}
	clearFuture (_clearAfterTime: number) {
		// NOP
	}
	getStatus (): DeviceStatus {
		let s: DeviceStatus = {
			statusCode: this.status
		}
		if (this.statusReason) s.messages = [this.statusReason]
		return s
	}
	terminate (): Promise<boolean> {
		this.stopInterval()

		return Promise.resolve(true)
	}
	private _setStatus (status: StatusCode, reason?: string) {
		if (
			this.status !== status ||
			this.statusReason !== reason
		) {
			this.status = status
			this.statusReason = reason

			this.emit('connectionChanged', this.getStatus())
		}
	}

	get canConnect (): boolean {
		return false
	}
	get connected (): boolean {
		return false
	}
	get deviceType () {
		return DeviceType.HTTPWATCHER
	}
	get deviceName (): string {
		return 'HTTP-Watch ' + this.deviceId
	}
}
