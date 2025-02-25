import * as osc from 'osc'
import { EventEmitter } from 'eventemitter3'
import { MetaArgument } from 'osc'

/** How often to check connection status */
const CONNECTIVITY_INTERVAL = 3000 // ms
const CONNECTIVITY_TIMEOUT = 1000 // ms

interface SisyfosApiEvents {
	error: [Error]
	initialized: []
	mixerOnline: [boolean]
	connected: []
	disconnected: []
}

export class SisyfosApi extends EventEmitter<SisyfosApiEvents> {
	private _oscClient: osc.UDPPort | undefined
	private _state?: SisyfosState
	private _labelToChannel: Map<string, number> = new Map()

	private _connectivityCheckInterval: NodeJS.Timer | undefined
	private _pingCounter: number = Math.round(Math.random() * 10000)
	private _connectivityTimeout: NodeJS.Timer | null = null
	private _connected = false
	private _mixerOnline = true

	/**
	 * Connnects to the OSC server.
	 * @param host ip to connect to
	 * @param port port the osc server is hosted on
	 */
	async connect(host: string, port: number): Promise<void> {
		const client = (this._oscClient = new osc.UDPPort({
			localAddress: '0.0.0.0',
			localPort: 0,
			remoteAddress: host,
			remotePort: port,
			metadata: true,
		}))
		this._oscClient.on('error', (error: any) => this.emit('error', error))
		this._oscClient.on('message', (received: osc.OscMessage) => this.receiver(received))

		return new Promise((resolve) => {
			client.once('ready', () => {
				// Monitor connectivity:
				this._monitorConnectivity()

				// Request initial, full state:
				client.send({ address: '/state/full', args: [] })
			})
			client.open()

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
	dispose() {
		this.updateIsConnected(false)
		if (this._connectivityCheckInterval) {
			clearInterval(this._connectivityCheckInterval)
		}
		if (this._oscClient) this._oscClient.close()
	}

	send(command: SisyfosCommand) {
		if (!this._oscClient) {
			throw new Error(`OSC client not initialised`)
		}

		if (command.type === SisyfosCommandType.TAKE) {
			this._oscClient.send({ address: '/take', args: [] })
		} else if (command.type === SisyfosCommandType.CLEAR_PST_ROW) {
			this._oscClient.send({ address: '/clearpst', args: [] })
		} else if (command.type === SisyfosCommandType.RESYNC_CHANNEL) {
			this._oscClient.send({
				address: `/ch/${command.channel + 1}/state`,
				args: [
					{
						type: 'i',
						value: command.value,
					},
				],
			})
		} else if (command.type === SisyfosCommandType.LABEL) {
			this._oscClient.send({
				address: `/ch/${command.channel + 1}/label`,
				args: [
					{
						type: 's',
						value: command.value,
					},
				],
			})
		} else if (command.type === SisyfosCommandType.TOGGLE_PGM) {
			const args: Array<MetaArgument> = command.values.map((value) => {
				return {
					type: 'i',
					value,
				}
			})
			this._oscClient.send({
				address: `/ch/${command.channel + 1}/pgm`,
				args,
			})
		} else if (command.type === SisyfosCommandType.TOGGLE_PST) {
			this._oscClient.send({
				address: `/ch/${command.channel + 1}/pst`,
				args: [
					{
						type: 'i',
						value: command.value,
					},
				],
			})
		} else if (command.type === SisyfosCommandType.SET_FADER) {
			const args: Array<MetaArgument> = command.values.map((value) => {
				return {
					type: 'f',
					value,
				}
			})
			this._oscClient.send({
				address: `/ch/${command.channel + 1}/faderlevel`,
				args,
			})
		} else if (command.type === SisyfosCommandType.VISIBLE) {
			this._oscClient.send({
				address: `/ch/${command.channel + 1}/visible`,
				args: [
					{
						type: 'i',
						value: command.value === true ? 1 : 0,
					},
				],
			})
		} else if (command.type === SisyfosCommandType.SET_MUTE) {
			this._oscClient.send({
				address: `/ch/${command.channel + 1}/mute`,
				args: [
					{
						type: 'i',
						value: command.value === true ? 1 : 0,
					},
				],
			})
		} else if (command.type === SisyfosCommandType.SET_INPUT_GAIN) {
			this._oscClient.send({
				address: `/ch/${command.channel + 1}/inputgain`,
				args: [
					{
						type: 'f',
						value: command.value,
					},
				],
			})
		} else if (command.type === SisyfosCommandType.SET_INPUT_SELECTOR) {
			this._oscClient.send({
				address: `/ch/${command.channel + 1}/inputselector`,
				args: [
					{
						type: 'i',
						value: command.value,
					},
				],
			})
		} else if (command.type === SisyfosCommandType.SET_CHANNEL) {
			// Resync all properties for a channel
			const channelState = {
				...command.values,
			}
			this.setSisyfosChannel(command.channel + 1, channelState)
		} else if (command.type === SisyfosCommandType.LOAD_MIXER_PRESET) {
			this.sendLoadMixerPresetCommand(command.presetName)
		}
	}

	disconnect() {
		if (this._oscClient) this._oscClient.close()
	}
	isInitialized(): boolean {
		return !!this._state
	}
	reInitialize() {
		this._state = undefined

		if (!this._oscClient) {
			throw new Error(`OSC client not initialised`)
		}
		this._oscClient.send({ address: '/state/full', args: [] })
	}

	reSyncOneChannel(channel: number) {
		if (!this._oscClient) {
			throw new Error(`Can't resync channel, OSC client not initialised`)
		}
		// This will trigger Sisyfos to emit its state of that channel, to be picked up in this.receiver()
		this._oscClient.send({ address: `/ch/${channel}/state`, args: [] })
	}

	setSisyfosChannel(channel: number, apiState: Partial<SisyfosChannelAPI>) {
		if (!this._oscClient) {
			throw new Error(`Can't set channel, OSC client not initialised`)
		}
		const oscApiState: SisyfosChannelOSCAPI = {
			pgmOn: apiState.pgmOn === 1,
			voOn: apiState.pgmOn === 2,
			pstOn: apiState.pstOn === 1,
			label: apiState.label ?? '',
			faderLevel: apiState.faderLevel ?? 0.75,
			muteOn: apiState.muteOn ?? false,
			inputGain: apiState.inputGain ?? 0.75,
			inputSelector: apiState.inputSelector ?? 1,
			fadeTime: apiState.fadeTime,
			showChannel: apiState.visible,
		}
		this._oscClient.send({ address: `/setchannel/${channel}`, args: { type: 's', value: JSON.stringify(oscApiState) } })
	}

	getChannelByLabel(label: string): number | undefined {
		return this._labelToChannel.get(label)
	}

	get connected(): boolean {
		return this._connected
	}
	get state(): SisyfosAPIState | undefined {
		return this._state
	}

	get mixerOnline(): boolean {
		return this._mixerOnline
	}

	setMixerOnline(state: boolean) {
		this._mixerOnline = state
	}

	private _monitorConnectivity() {
		const pingSisyfos = () => {
			if (this._oscClient) this._oscClient.send({ address: `/ping/${this._pingCounter}`, args: [] })

			const waitingForPingCounter = this._pingCounter
			// Expect a reply within a certain time:
			this._clearPingTimer()

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

	private _clearPingTimer() {
		if (this._connectivityTimeout) {
			clearTimeout(this._connectivityTimeout)
			this._connectivityTimeout = null
		}
	}

	private receiver(message: osc.OscMessage) {
		const address = message.address.substr(1).split('/')
		if (address[0] === 'state' && address[1] === 'full') {
			this._state = this.parseSisyfosState(message)
			this._labelToChannel = new Map(
				Object.entries<SisyfosChannel>(this._state.channels).map((v) => [v[1].label, Number(v[0])])
			)
			this.emit('initialized')
		} else if (address[0] === 'ch' && this._state) {
			// This receives updates for a single channel
			// But is not used in TSR as of now
			// If once neeeded a new event should be implemented:
			// like: this.emit('channel-state-changed')
			const ch = Number(address[1]) - 1
			this._state.channels[ch] = {
				...this._state.channels[ch],
				...this.parseChannelCommand(message, address.slice(2)),
			}
		} else if (address[0] === 'pong') {
			// a reply to "/ping"
			const pingValue = parseInt(message.args[0].value, 10)
			if (pingValue && this._pingCounter === pingValue) {
				this._clearPingTimer()
				this.updateIsConnected(true)
				this._pingCounter++
				this.emit('mixerOnline', true)
			} else if (message.args[0].value === 'offline') {
				this._clearPingTimer()
				this.updateIsConnected(true)
				this._pingCounter++
				this.emit('mixerOnline', false)
			}
		}
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

	private parseChannelCommand(message: osc.OscMessage, address: Array<string>): Partial<SisyfosChannel> {
		if (address[0] === 'pgm') {
			return { pgmOn: message.args[0].value }
		} else if (address[0] === 'pst') {
			return { pstOn: message.args[0].value }
		} else if (address[0] === 'faderlevel') {
			return { faderLevel: message.args[0].value }
		} else if (address[0] === 'state') {
			const stateFromChannel = this.parseSisyfosState(message).channels[0]
			return {
				pgmOn: stateFromChannel.pgmOn,
				pstOn: stateFromChannel.pstOn,
				faderLevel: stateFromChannel.faderLevel,
				visible: stateFromChannel.visible,
				label: stateFromChannel.label,
				fadeTime: stateFromChannel.fadeTime,
				muteOn: stateFromChannel.muteOn,
				inputGain: stateFromChannel.inputGain,
				inputSelector: stateFromChannel.inputSelector,
			}
		}
		return {}
	}

	private parseSisyfosState(message: osc.OscMessage): SisyfosState {
		const extState = JSON.parse(message.args[0].value)
		const deviceState: SisyfosState = { channels: {}, resync: false }

		Object.keys(extState.channel).forEach((index: string) => {
			const ch = extState.channel[index] as SisyfosChannelOSCAPI

			let pgmOn = 0
			if (ch.pgmOn === true) {
				pgmOn = 1
			} else if (ch.voOn === true) {
				pgmOn = 2
			}
			const channel: SisyfosChannel = {
				faderLevel: ch.faderLevel || 0.75,
				pgmOn: pgmOn,
				pstOn: ch.pstOn === true ? 1 : 0,
				label: ch.label || '',
				visible: ch.showChannel ? true : false,
				fadeTime: ch.fadeTime || undefined,
				muteOn: ch.muteOn || false,
				inputGain: ch.inputGain || 0.75,
				inputSelector: ch.inputSelector || 1,
				timelineObjIds: [],
			}

			deviceState.channels[index] = channel
		})

		return deviceState
	}

	protected sendLoadMixerPresetCommand(presetName: string) {
		if (!this._oscClient) {
			throw new Error(`Can't load mixer preset, OSC client not initialised`)
		}
		this._oscClient.send({
			address: `/loadmixerpreset`,
			args: [
				{
					type: 's',
					value: presetName,
				},
			],
		})
	}
}

export enum SisyfosCommandType {
	TOGGLE_PGM = 'togglePgm',
	TOGGLE_PST = 'togglePst',
	SET_FADER = 'setFader',
	SET_INPUT_GAIN = 'setInputGain',
	SET_INPUT_SELECTOR = 'setInputSelector',
	SET_MUTE = 'setMute',
	CLEAR_PST_ROW = 'clearPstRow',
	LABEL = 'label',
	TAKE = 'take',
	VISIBLE = 'visible',
	RESYNC = 'resync',
	RESYNC_CHANNEL = 'resyncChannel',
	SET_CHANNEL = 'setChannel',
	LOAD_MIXER_PRESET = 'loadMixerPreset',
}

export interface BaseCommand {
	type: SisyfosCommandType
}

export interface SetChannelCommand {
	type: SisyfosCommandType.SET_CHANNEL
	channel: number
	values: Partial<SisyfosChannelAPI>
}

export interface LoadMixerPresetCommand {
	type: SisyfosCommandType.LOAD_MIXER_PRESET
	presetName: string
}

export interface ChannelCommand extends BaseCommand {
	type:
		| SisyfosCommandType.SET_FADER
		| SisyfosCommandType.TOGGLE_PGM
		| SisyfosCommandType.TOGGLE_PST
		| SisyfosCommandType.LABEL
		| SisyfosCommandType.VISIBLE
		| SisyfosCommandType.RESYNC_CHANNEL
		| SisyfosCommandType.SET_INPUT_SELECTOR
		| SisyfosCommandType.SET_INPUT_GAIN
		| SisyfosCommandType.SET_MUTE
	channel: number
}

export interface GlobalCommand extends BaseCommand {
	type: SisyfosCommandType.CLEAR_PST_ROW | SisyfosCommandType.TAKE | SisyfosCommandType.RESYNC
}

export interface GlobalCommand extends BaseCommand {
	type: SisyfosCommandType.CLEAR_PST_ROW | SisyfosCommandType.TAKE | SisyfosCommandType.RESYNC
}

export interface BoolCommand extends ChannelCommand {
	type: SisyfosCommandType.VISIBLE | SisyfosCommandType.SET_MUTE
	value: boolean
}
export interface ValueCommand extends ChannelCommand {
	type:
		| SisyfosCommandType.TOGGLE_PST
		| SisyfosCommandType.VISIBLE
		| SisyfosCommandType.RESYNC_CHANNEL
		| SisyfosCommandType.SET_INPUT_SELECTOR
		| SisyfosCommandType.SET_INPUT_GAIN
	value: number
}

export interface ValuesCommand extends ChannelCommand {
	type: SisyfosCommandType.TOGGLE_PGM | SisyfosCommandType.SET_FADER
	values: number[]
}

export interface StringCommand extends ChannelCommand {
	type: SisyfosCommandType.LABEL
	value: string
}

export type SisyfosCommand =
	| GlobalCommand
	| ValueCommand
	| ValuesCommand
	| BoolCommand
	| StringCommand
	| SetChannelCommand
	| LoadMixerPresetCommand

export interface SisyfosChannel extends SisyfosChannelAPI {
	timelineObjIds: string[]
	triggerValue?: string
}
export interface SisyfosState {
	channels: { [index: string]: SisyfosChannel }
	resync: boolean
	triggerValue?: string
}

// ------------------------------------------------------
// Interfaces for the data that comes over OSC:
export interface SisyfosChannelAPI {
	faderLevel: number | undefined
	pgmOn: number | undefined
	pstOn: number | undefined
	label: string
	visible: boolean | undefined
	fadeTime?: number
	muteOn: boolean | undefined
	inputGain: number | undefined
	inputSelector: number | undefined
}

// ------------------------------------------------------
// Interfaces for the data that sends over OSC to Sisyfos:
export interface SisyfosChannelOSCAPI {
	faderLevel?: number
	pgmOn?: boolean
	voOn?: boolean
	pstOn?: boolean
	label?: string
	showChannel?: boolean
	fadeTime?: number
	muteOn?: boolean
	inputGain?: number
	inputSelector?: number
}

export interface SisyfosAPIState {
	channels: {
		[index: string]: SisyfosChannelAPI
	}
}
