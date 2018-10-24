import { EventEmitter } from 'events'

const orgSetTimeout = setTimeout

const instances: Array<WebSocket> = []
let mockConstructor: Function

class WebSocket extends EventEmitter {
	public CONNECTING = 1
	public OPEN = 2
	public CLOSING = 3
	public CLOSED = 4

	public binaryType: string = ''
	private _pathName: string

	private _mockHost: string = 'ws://127.0.0.1'
	private _mockConnect: boolean = true
	private _emittedConnected: boolean = false
	private _replyFunction?: Function

	constructor (pathName) {
		super()
		this._pathName = pathName

		instances.push(this)

		if (mockConstructor) {
			mockConstructor(this)
		}

		orgSetTimeout(() => {
			if (!this._updateConnectionStatus()) {
				this.emit('error', new Error('Unable to Connect'))
			}
		}, 1)

		// this.emit('open')
		// this.emit('message', message)
		// this.emit('error', error)
		// this.emit('close')
	}
	public static getMockInstances () {
		return instances
	}
	public static mockConstructor (fcn: (WebSocket) => void) {
		mockConstructor = fcn
	}
	public send (message, callback: (err?: Error) => void) {
		if (!this._emittedConnected) {
			callback(new Error('Error, not connected'))
		} else {
			if (this._replyFunction) {
				callback()

				Promise.resolve(this._replyFunction(message))
				.then((reply) => {
					if (typeof reply !== 'string') reply = JSON.stringify(reply)
					this.emit('message', reply)
				})
				.catch((err) => {
					this.emit('error', err)
				})
			} else {
				throw new Error('mock ws._replyFunction not set')
			}
		}
	}
	public get readyState () {
		return this.OPEN
	}
	public mockReplyFunction (fcn: (msg: string) => Promise<string> | string) {
		this._replyFunction = fcn
	}
	public mockSetConnected (connected) {
		this._mockConnect = connected

		this._updateConnectionStatus()
	}
	private _updateConnectionStatus () {

		let connected = (
			this._pathName.match(this._mockHost) &&
			this._mockConnect
		)

		if (connected !== this._emittedConnected) {
			this._emittedConnected = connected

			if (connected) {
				this.emit('open')
			} else {
				this.emit('close')
			}
		}
		return connected
	}
}
module.exports = WebSocket
