import { EventEmitter } from 'events'
import { AbstractCommand } from './commands'
import { ViscaUdpSocket } from './lib/socket'

export class ViscaDevice extends EventEmitter {
	private _address: string
	private _socket: ViscaUdpSocket

	constructor(address: string, port?: number, debug?: boolean, private log?: (...args) => void) {
		super()
		this._address = address
		this._socket = new ViscaUdpSocket({ address, port, debug, log })

		this._socket.on('connected', () => this.emit('connected'))
		this._socket.on('disconnected', () => this.emit('disconnected'))
	}

	connect() {
		this._socket.connect(this._address)
	}

	disconnect() {
		this._socket.disconnect().catch((reason) => this.log?.(reason))
	}

	get address() {
		return this._address
	}

	set address(address: string) {
		if (address !== this._address) {
			this._socket.disconnect().catch((reason) => this.log?.(reason))
			this._address = address
			this._socket.connect(address)
		}
	}

	async sendCommand<T extends AbstractCommand>(command: T) {
		return this._socket.sendCommand<T>(command)
	}
}
