import * as osc from 'osc'
import { EventEmitter } from 'events'
import { MultiOSCDeviceType, MultiOscOptions } from 'timeline-state-resolver-types'

export type OSCConnectionOptions = MultiOscOptions['connections'][any] & {
	oscSender?: OSCSender
}

type OSCSender = (msg: osc.OscMessage, address?: string | undefined, port?: number | undefined) => void

export class OSCConnection extends EventEmitter {
	connectionId: string | undefined
	private _type: MultiOSCDeviceType | undefined

	private _oscClient: osc.UDPPort | osc.TCPSocketPort | undefined
	private _oscSender: OSCSender = this._defaultOscSender.bind(this)

	private _connected = false

	/**
	 * Connnects to the OSC server.
	 * @param host ip to connect to
	 * @param port port the osc server is hosted on
	 */
	async connect(options: OSCConnectionOptions): Promise<void> {
		this.connectionId = options.connectionId
		this._type = options.type
		if (options.oscSender) this._oscSender = options.oscSender

		if (options.type === MultiOSCDeviceType.UDP) {
			this._oscClient = new osc.UDPPort({
				localAddress: '0.0.0.0',
				localPort: 0,
				remoteAddress: options.host,
				remotePort: options.port,
				metadata: true,
			})
		} else {
			this._oscClient = new osc.TCPSocketPort({
				address: options.host,
				port: options.port,
				metadata: true,
			})
			;(this._oscClient as osc.TCPSocketPort).socket.on('close', () => this.updateIsConnected(false))
			;(this._oscClient as osc.TCPSocketPort).socket.on('connect', () => this.updateIsConnected(true))
		}
		this._oscClient.on('error', (error: any) => this.emit('error', error))

		return new Promise((resolve) => {
			this._oscClient!.on('ready', () => {
				resolve()
			})
			this._oscClient!.open()
		})
	}
	dispose() {
		this.updateIsConnected(false)
		if (this._oscClient) this._oscClient.close()
	}

	private _defaultOscSender(msg: osc.OscMessage, address?: string | undefined, port?: number | undefined): void {
		this.emit('debug', 'sending ' + msg.address)
		if (this._oscClient) this._oscClient.send(msg, address, port)
	}

	sendOsc(msg: osc.OscMessage, address?: string | undefined, port?: number | undefined): void {
		this._oscSender(msg, address, port)
	}

	disconnect() {
		if (this._oscClient) this._oscClient.close()
	}

	get connected(): boolean {
		return this._type === MultiOSCDeviceType.TCP ? this._connected : true
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
