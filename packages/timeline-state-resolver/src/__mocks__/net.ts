import { EventEmitter } from 'events'
const sockets: Array<Socket> = []
const onNextSocket: Array<Function> = []

const orgSetImmediate = setImmediate

export class Socket extends EventEmitter {
	public onWrite: (buff: Buffer, encoding: string) => void
	public onConnect: (port: number, host: string) => void
	public onClose: () => void

	// private _port: number
	// private _host: string
	private _connected = false

	public destroyed = false

	constructor() {
		super()

		const cb = onNextSocket.shift()
		if (cb) {
			cb(this)
		}

		sockets.push(this)
	}

	public static mockSockets() {
		return sockets
	}
	public static openSockets() {
		return sockets.filter((s) => !s.destroyed)
	}
	public static mockOnNextSocket(cb: (s: Socket) => void) {
		onNextSocket.push(cb)
	}
	public static clearMockOnNextSocket() {
		onNextSocket.splice(0, 99999)
	}
	// this.emit('connect')
	// this.emit('close')
	// this.emit('end')

	public connect(port: number, host = 'localhost', cb?: () => void) {
		// this._port = port
		// this._host = host

		if (this.onConnect) this.onConnect(port, host)
		orgSetImmediate(() => {
			if (cb) {
				cb()
			}
			this.setConnected()
		})
	}
	public write(buf: Buffer, cb?: () => void)
	public write(buf: Buffer, encoding?: BufferEncoding, cb?: () => void)
	public write(buf: Buffer, encodingOrCb?: BufferEncoding | (() => void), cb?: () => void) {
		const DEFAULT_ENCODING = 'utf-8'
		cb = typeof encodingOrCb === 'function' ? encodingOrCb : cb
		const encoding = typeof encodingOrCb === 'function' ? DEFAULT_ENCODING : encodingOrCb
		if (this.onWrite) {
			this.onWrite(buf, encoding ?? DEFAULT_ENCODING)
		}
		if (cb) cb()
	}
	public end() {
		this.setEnd()
		this.setClosed()
	}

	public mockClose() {
		this.setClosed()
	}
	public mockData(data: Buffer) {
		this.emit('data', data)
	}

	public setNoDelay(_noDelay?: boolean) {
		// noop
	}

	public setEncoding(_encoding?: BufferEncoding) {
		// noop
	}

	public destroy() {
		this.destroyed = true
	}

	private setConnected() {
		if (this._connected !== true) {
			this._connected = true
		}
		this.emit('connect')
	}
	private setClosed() {
		if (this._connected !== false) {
			this._connected = false
		}
		this.destroyed = true
		this.emit('close')
		if (this.onClose) this.onClose()
	}
	private setEnd() {
		if (this._connected !== false) {
			this._connected = false
		}
		this.emit('end')
	}
}
