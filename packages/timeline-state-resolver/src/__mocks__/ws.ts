import { EventEmitter } from 'events'

const orgSetTimeout = setTimeout

const instances: Array<WebSocket> = []
let mockConstructor: Function

class WebSocket extends EventEmitter {
	public CONNECTING = 1
	public OPEN = 2
	public CLOSING = 3
	public CLOSED = 4

	public binaryType = ''
	private _pathName: string

	private _mockHost = 'ws://127.0.0.1'
	private _mockConnect = true
	private _emittedConnected = false
	private _hasEmittedConnected = false
	private _failConnectEmitTimeout = 3000
	private _replyFunction?: Function

	private _readyState: number = this.CLOSED

	public onerror: ((err) => void) | undefined = undefined
	public onopen: (() => void) | undefined = undefined
	public onclose: (() => void) | undefined = undefined
	public onmessage: ((msg) => void) | undefined = undefined

	constructor(pathName) {
		super()
		this._pathName = pathName

		instances.push(this)

		if (mockConstructor) {
			mockConstructor(this)
		}

		this._readyState = this.CONNECTING

		orgSetTimeout(() => {
			if (!this._updateConnectionStatus()) {
				setTimeout(() => {
					const error = new Error('Unable to Connect')
					if (typeof this.onerror === 'function') this.onerror(error)
					this.emit('error', error)
				}, this._failConnectEmitTimeout)
			}
		}, 1)

		// this.emit('open')
		// this.emit('message', message)
		// this.emit('error', error)
		// this.emit('close')
	}
	public static getMockInstances() {
		return instances
	}
	public static clearMockInstances() {
		return instances.splice(0, 9999)
	}
	public static mockConstructor(fcn: (WebSocket) => void) {
		mockConstructor = fcn
	}
	public send(message, callback?: (err?: Error) => void) {
		if (!this._emittedConnected) {
			if (typeof callback === 'function') callback(new Error('Error, not connected'))
		} else {
			if (this._replyFunction) {
				if (typeof callback === 'function') callback()

				Promise.resolve(this._replyFunction(message))
					.then((reply) => {
						if (reply) {
							if (typeof this.onmessage === 'function') this.onmessage(reply)
							this.emit('message', reply)
						}
					})
					.catch((err) => {
						console.log(err)
						if (typeof this.onerror === 'function') this.onerror(err)
						this.emit('error', err)
					})
			} else {
				throw new Error('mock ws._replyFunction not set')
			}
		}
	}
	public get readyState() {
		return this._readyState
	}
	public mockReplyFunction(fcn: (msg: string) => Promise<string> | string) {
		this._replyFunction = fcn
	}
	public mockSetConnected(connected) {
		this._mockConnect = connected

		this._updateConnectionStatus()
	}
	public mockSendMessage(message: string | object) {
		if (typeof message !== 'string') message = JSON.stringify(message)
		this.emit('message', message)
	}
	public close() {
		this._readyState = this.CLOSING

		orgSetTimeout(() => {
			this.mockSetConnected(false)
		}, 1)
	}
	private _updateConnectionStatus() {
		const connected = !!(this._pathName.match(this._mockHost) && this._mockConnect)

		if (connected !== this._emittedConnected || !this._hasEmittedConnected) {
			this._emittedConnected = connected
			this._hasEmittedConnected = true

			if (connected) {
				this._readyState = this.OPEN
				if (typeof this.onopen === 'function') this.onopen()
				this.emit('open')
			} else {
				this._readyState = this.CLOSED
				if (typeof this.onclose === 'function') this.onclose()
				this.emit('close')
			}
		}
		return connected
	}
}
namespace WebSocket {}
export = WebSocket
