import * as osc from 'osc'
import { SisyfosState, SisyfosCommand, Commands, ToggleCommand, FaderCommand } from '../types/src/sisyfos'
import { EventEmitter } from 'events'

export class SisyfosInterface extends EventEmitter {
	host: string
	port: number

	private _oscClient: osc.UDPPort
	private _state: SisyfosState

	/**
	 * Connnects to the OSC server.
	 * @param host ip to connect to
	 * @param port port the osc server is hosted on
	 */
	connect (host: string, port: number): Promise<void> {
		this.host = host
		this.port = port

		this._oscClient = new osc.UDPPort({
			localAddress: '0.0.0.0',
			localPort: 0,

			remoteAddress: this.host,
			remotePort: this.port,
			metadata: true
		})
		this._oscClient.on('message', (received: osc.OscMessage) => this.receiver(received))

		return new Promise((resolve) => {
			this._oscClient.open()
			this._oscClient.once('ready', () => {
				// resolve()
				this._oscClient.send({ address: '/state/full', args: [] })
			})
			resolve()
		})
	}

	send (command: SisyfosCommand) {
		if (command.type === Commands.TAKE) {
			this._oscClient.send({ address: '/take', args: [] })
		} else if (command.type === Commands.TOGGLE_PGM) {
			this._oscClient.send({ address: `/ch/${(command as ToggleCommand).channel}/pgm`, args: [{
				type: 'i',
				value: (command as ToggleCommand).value ? 1 : 0
			}] })
		} else if (command.type === Commands.TOGGLE_PST) {
			this._oscClient.send({ address: `/ch/${(command as ToggleCommand).channel}/pst`, args: [{
				type: 'i',
				value: (command as ToggleCommand).value ? 1 : 0
			}] })
		} else if (command.type === Commands.SET_FADER) {
			this._oscClient.send({ address: `/ch/${(command as FaderCommand).channel}/faderlevel`, args: [{
				type: 'f',
				value: (command as FaderCommand).value
			}] })
		}
	}

	disconnect () {
		this._oscClient.close()
	}

	get state (): SisyfosState {
		return this._state
	}

	private receiver (message: osc.OscMessage) {
		const address = message.address.split('/')

		if (address[0] === 'state') {
			if (address[1] === 'full') {
				const extState = JSON.parse(message.args[0].value)
				this._state = {
					channels: extState.channel,
					groups: extState.grpFader
				}
				this.emit('initialized')
			} else if (address[1] === 'ch') {
				const ch = address[2]
				this._state.channels[ch] = {
					...this._state.channels[ch],
					...this.parseChannelCommand(message, address.slice(3))
				}
			} else if (address[1] === 'grp') {
				const grp = address[2]
				this._state.groups[grp] = {
					...this._state.channels[grp],
					...this.parseChannelCommand(message, address.slice(3))
				}
			}
		}
	}

	private parseChannelCommand (message: osc.OscMessage, address: Array<String>) {
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
