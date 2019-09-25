import * as osc from 'osc'
import {
	SisyfosState,
	SisyfosCommand,
	Commands,
	ToggleCommand,
	FaderCommand,
	SisyfosAPIState
} from '../types/src/sisyfos'
import { EventEmitter } from 'events'

/** How often to check connection status */
const CONNECTIVITY_INTERVAL = 3000 // ms
const CONNECTIVITY_TIMEOUT = 1000 // ms

export class SisyfosInterface extends EventEmitter {
	host: string
	port: number

	private _oscClient: osc.UDPPort
	private _state: SisyfosState

	private _connectivityCheckInterval: NodeJS.Timer
	private _pingCounter: number = Math.round(Math.random() * 10000)
	private _connectivityTimeout: NodeJS.Timer | null = null
	private _connected: boolean = false

	/**
	 * Connnects to the OSC server.
	 * @param host ip to connect to
	 * @param port port the osc server is hosted on
	 */
	connect (host: string, port: number): Promise<void> {
		this.host = host
		this.port = port

		this._oscClient = new osc.UDPPort({
			remoteAddress: this.host,
			remotePort: this.port,
			metadata: true
		})
		this._oscClient.on('error', (error: any) => this.emit('error', error))
		this._oscClient.on('message', (received: osc.OscMessage) => this.receiver(received))

		return new Promise((resolve) => {
			this._oscClient.once('ready', () => {
				// Monitor connectivity:
				this._monitorConnectivity()

				// Request initial, full state:
				this._oscClient.send({ address: '/state/full', args: [] })
			})
			this._oscClient.open()

			if (this.isInitialized()) {
				resolve()
			} else {
				// Wait for the state to be received from sisyfos
				this.once('initialized', () => {
					resolve()
				})
			}
		})
	}
	dispose () {
		this.updateIsConnected(false)
		if (this._connectivityCheckInterval) {
			clearInterval(this._connectivityCheckInterval)
		}
		this._oscClient.close()
	}

	send (command: SisyfosCommand) {
		if (command.type === Commands.TAKE) {
			this._oscClient.send({ address: '/take', args: [] })
		} else if (command.type === Commands.TOGGLE_PGM) {
			this._oscClient.send({ address: `/ch/${(command as ToggleCommand).channel + 1}/pgm`, args: [{
				type: 'i',
				value: (command as ToggleCommand).value ? 1 : 0
			}] })
		} else if (command.type === Commands.TOGGLE_PST) {
			this._oscClient.send({ address: `/ch/${(command as ToggleCommand).channel + 1}/pst`, args: [{
				type: 'i',
				value: (command as ToggleCommand).value ? 1 : 0
			}] })
		} else if (command.type === Commands.SET_FADER) {
			this._oscClient.send({ address: `/ch/${(command as FaderCommand).channel + 1}/faderlevel`, args: [{
				type: 'f',
				value: (command as FaderCommand).value
			}] })
		}
	}

	disconnect () {
		this._oscClient.close()
	}
	isInitialized (): boolean {
		return !!this._state
	}

	get connected (): boolean {
		return this._connected
	}
	get state (): SisyfosAPIState {
		return this._state
	}

	private _monitorConnectivity () {
		const pingSisyfos = () => {
			this._oscClient.send({ address: `/ping/${this._pingCounter}`, args: [] })

			const waitingForPingCounter = this._pingCounter
			// Expect a reply within a certain time:
			if (this._connectivityTimeout) {
				clearTimeout(this._connectivityTimeout)
			}
			this._connectivityTimeout = setTimeout(() => {
				if (waitingForPingCounter === this._pingCounter) {
					// this._pingCounter hasn't changed, ie no response has been received
					this.updateIsConnected(false)
				}
			}, CONNECTIVITY_TIMEOUT)
		}
		// Ping Sisyfos and expect a reply back:
		pingSisyfos()
		this._connectivityCheckInterval = setInterval(() => {
			pingSisyfos()
		}, CONNECTIVITY_INTERVAL)
	}

	private receiver (message: osc.OscMessage) {
		const address = message.address.substr(1).split('/')
		if (address[0] === 'state') {
			if (address[1] === 'full') {
				const extState = JSON.parse(message.args[0].value)
				this._state = {
					channels: extState.channel
				}
				this.emit('initialized')
			} else if (address[1] === 'ch') {
				const ch = address[2]
				this._state.channels[ch] = {
					...this._state.channels[ch],
					...this.parseChannelCommand(message, address.slice(3))
				}
			}
		} else if (address[0] === 'pong') { // a reply to "/ping"
			let pingValue = parseInt(message.args[0].value, 10)
			if (pingValue && this._pingCounter === pingValue) {
				if (this._connectivityTimeout) {
					clearTimeout(this._connectivityTimeout)
					this._connectivityTimeout = null
				}
				this.updateIsConnected(true)
				this._pingCounter++
			}
		}
	}
	private updateIsConnected (connected: boolean) {
		if (this._connected !== connected) {
			this._connected = connected

			if (connected) {
				this.emit('connected')
			} else {
				this.emit('disconnected')
			}
		}

	}

	private parseChannelCommand (message: osc.OscMessage, address: Array<string>) {
		const boolVal = message.args[0].value === 1 || message.args[0].value === true
		if (address[0] === 'pgm') {
			return { pgmOn: boolVal }
		} else if (address[0] === 'pst') {
			return { pstOn: boolVal }
		} else if (address[0] === 'faderlevel') {
			return { faderLevel: message.args[0].value }
		}
		return {}
	}
}
