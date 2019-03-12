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
		host?: string
		port?: string
		httpMethod?: string
		expectedHttpResponse?: number
		keyword?: string
		interval?: number
	}
}

export class HttpWatcherDevice extends Device {
	private host: string
	private port: number
	private uri: string
	private httpMethod: TimelineContentTypeHttp
	private expectedHttpResponse: number = 200
	private keyword: string
	private intervalTime: number
	private interval: NodeJS.Timer | undefined
	private status: StatusCode = StatusCode.UNKNOWN
	constructor (deviceId: string, deviceOptions: HttpWatcherDeviceOptions, options) {
		super(deviceId, deviceOptions, options)
		const opts = deviceOptions.options || {}

		this.host = opts.host || 'localhost'
		this.port = Number(opts.port) || 80

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
			case '':
			case undefined:
			default:
				this.httpMethod = TimelineContentTypeHttp.GET
				break
		}

		// this.httpMethod = opts.httpMethod || 'localhost'
		this.expectedHttpResponse = Number(opts.expectedHttpResponse) || 200
		this.keyword = opts.keyword || 'localhost'
		this.intervalTime = (Number(opts.interval) || 30) * 1000

		this.uri = this.host + ':' + this.port
	}

	onInterval () {
		let reqMethod = request[this.httpMethod]
		if (reqMethod) {

			reqMethod(
				this.uri,
				{},
				this.handleResponse.bind(this)
			)
		} else {
			this.status = StatusCode.BAD
			this.emit('connectionChanged', this.getStatus())
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
			this.emit('error', `HTTPWatch: Error ${this.uri}`, error)
			this.status = StatusCode.BAD
			this.emit('connectionChanged', this.getStatus())
			return
		}
		if (response.statusCode === this.expectedHttpResponse
			&& body && (body.toString() || '').indexOf(this.keyword) >= 0) {
			this.emit('debug', `HTTPWatch: ${this.httpMethod}: Good statuscode response on url "${this.uri}": ${response.statusCode}`)
			this.status = StatusCode.GOOD
			this.emit('connectionChanged', this.getStatus())
		} else {
			this.emit('warning', `HTTPWatch: ${this.httpMethod}: Bad statuscode response on url "${this.uri}": ${response.statusCode}`)
			this.status = StatusCode.BAD
			this.emit('connectionChanged', this.getStatus())
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
		return {
			statusCode: this.status
		}
	}

	get canConnect (): boolean {
		return false
	}
	get connected (): boolean {
		return false
	}
	get deviceType () {
		return DeviceType.HTTPSEND
	}
	get deviceName (): string {
		return 'HTTP-Watch ' + this.deviceId
	}
}
