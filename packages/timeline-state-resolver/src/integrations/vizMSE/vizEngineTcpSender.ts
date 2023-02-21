import { EventEmitter } from 'events'
import * as net from 'net'

export class VizEngineTcpSender extends EventEmitter {
	private _socket: net.Socket = new net.Socket()
	private _port: number
	private _host: string
	private _connected = false
	private _commandCount = 0
	private _sendQueue: string[] = []
	private _waitQueue: Set<number> = new Set()
	private _incomingData = ''
	private _responseTimeoutMs = 6000

	constructor(port: number, host: string) {
		super()
		this._port = port
		this._host = host
	}

	send(commands: string[]) {
		commands.forEach((command) => {
			this._sendQueue.push(command)
		})
		if (this._connected) {
			this._flushQueue()
		} else {
			this._connect()
		}
	}

	private _connect() {
		this._socket.on('connect', () => {
			this._connected = true
			if (this._sendQueue.length) {
				this._flushQueue()
			}
		})
		this._socket.on('error', (e) => {
			this.emit('error', e)
			this._destroy()
		})
		this._socket.on('lookup', () => {
			// this handles a dns exception, but the error is handled on 'error' event
		})
		this._socket.on('data', this._processData.bind(this))
		this._socket.connect(this._port, this._host)
	}

	private _flushQueue() {
		this._sendQueue.forEach((command) => {
			this._socket.write(`${++this._commandCount} ${command}\x00`)
			this._waitQueue.add(this._commandCount)
		})
		setTimeout(() => {
			if (this._waitQueue.size) {
				this.emit('warning', `Response from ${this._host}:${this._port} not received on time`)
				this._destroy()
			}
		}, this._responseTimeoutMs)
	}

	private _processData(data: Buffer) {
		this._incomingData = this._incomingData.concat(data.toString())
		const split = this._incomingData.split('\x00')
		if (split.length === 0 || (split.length === 1 && split[0] === '')) return
		if (split[split.length - 1] !== '') {
			this._incomingData = split.pop()!
		} else {
			this._incomingData = ''
		}
		split.forEach((message) => {
			const firstSpace = message.indexOf(' ')
			const id = message.substr(0, firstSpace)
			const contents = message.substr(firstSpace + 1)
			if (contents.startsWith('ERROR')) {
				this.emit('warning', contents)
			}
			this._waitQueue.delete(parseInt(id, 10))
		})
		if (this._waitQueue.size === 0) {
			this._destroy()
		}
	}

	private _destroy() {
		this._socket.destroy()
		this.removeAllListeners()
	}
}
