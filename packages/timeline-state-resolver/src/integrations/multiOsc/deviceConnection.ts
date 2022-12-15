import * as osc from 'osc'
import { EventEmitter } from 'events'
import { MultiOSCOptions, OSCDeviceType } from 'timeline-state-resolver-types'

export type OSCConnectionOptions = MultiOSCOptions['connections'][any] & {
	oscSender?: OSCSender
}

type OSCSender = (msg: osc.OscMessage, address?: string | undefined, port?: number | undefined) => void

export class OSCConnection extends EventEmitter {
	connectionId: string
	host: string
	port: number

	private _oscClient: osc.UDPPort | osc.TCPSocketPort
	private _oscSender: OSCSender

	private _connected = false

	/**
	 * Connnects to the OSC server.
	 * @param host ip to connect to
	 * @param port port the osc server is hosted on
	 */
	async connect(options: OSCConnectionOptions): Promise<void> {
		this.connectionId = options.connectionId
		this.host = options.host
		this.port = options.port
		this._oscSender = options.oscSender || this._defaultOscSender.bind(this)

		if (options.type === OSCDeviceType.UDP) {
			this._oscClient = new osc.UDPPort({
				localAddress: '0.0.0.0',
				localPort: 0,
				remoteAddress: this.host,
				remotePort: this.port,
				metadata: true,
			})
		} else {
			this._oscClient = new osc.TCPSocketPort({
				address: this.host,
				port: this.port,
				metadata: true,
			})
			;(this._oscClient as osc.TCPSocketPort).socket.on('close', () => this.updateIsConnected(false))
			;(this._oscClient as osc.TCPSocketPort).socket.on('connect', () => this.updateIsConnected(true))
		}
		this._oscClient.on('error', (error: any) => this.emit('error', error))
		// this._oscClient.on('message', (received: osc.OscMessage) => this.receiver(received))

		return new Promise((resolve) => {
			this._oscClient.on('ready', () => {
				resolve()
			})
			this._oscClient.open()
		})
	}
	dispose() {
		this.updateIsConnected(false)
		this._oscClient.close()
	}

	private _defaultOscSender(msg: osc.OscMessage, address?: string | undefined, port?: number | undefined): void {
		this.emit('debug', 'sending ' + msg.address)
		this._oscClient.send(msg, address, port)
	}

	sendOsc(msg: osc.OscMessage, address?: string | undefined, port?: number | undefined): void {
		this._oscSender(msg, address, port)
	}

	disconnect() {
		this._oscClient.close()
	}

	get connected(): boolean {
		return this._connected
	}

	private updateIsConnected(connected: boolean) {
		if (this._connected !== connected) {
			this._connected = connected

			if (connected) {
				this.emit('connected')
			} else {
				this.emit('disconnected')
			}
		}
	}
}
