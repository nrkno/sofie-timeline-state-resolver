import got from 'got'
import { EventEmitter } from 'eventemitter3'
import WebSocket = require('ws')
import { TriCasterInfoParser, TriCasterProductInfo, TriCasterSwitcherInfo } from './triCasterInfoParser'
import { serializeToWebSocketMessage, TriCasterCommand } from './triCasterCommands'

export interface TriCasterConnectionEvents {
	connected: (info: TriCasterInfo, shortcutStateXml: string) => void
	disconnected: (reason: string) => void
	error: (reason: any) => void
}

export interface TriCasterInfo extends TriCasterSwitcherInfo, TriCasterProductInfo {}

const RECONNECT_TIMEOUT = 1000
const PING_INTERVAL = 10000
const GOT_OPTIONS = {
	retry: { limit: 0 },
	timeout: { request: 10000 },
}

export class TriCasterConnection extends EventEmitter<TriCasterConnectionEvents> {
	private _socket: WebSocket
	private _pingTimeout: NodeJS.Timeout | null = null
	private _isClosing = false

	constructor(private _host: string, private _port: number) {
		super()
	}

	connect() {
		this._socket = new WebSocket(`ws://${this._host}:${this._port}/v1/shortcut_notifications`)
		this._socket.on('open', () => this.handleOpen())
		this._socket.on('close', (_, reason) => this.handleClose(reason))
		this._socket.on('error', (error) => this.handleError(error))
	}

	private handleOpen() {
		Promise.all([this.getInfo(), this.getShortcutStates()])
			.then(([info, shortcutStates]) => {
				this.emit('connected', info, shortcutStates)
				this.ping()
			})
			.catch((reason) => {
				this.emit('error', reason)
			})
	}

	private handleClose(reason: string) {
		this.emit('disconnected', reason)
		if (!this._isClosing) {
			setTimeout(() => {
				this.connect()
			}, RECONNECT_TIMEOUT)
		}
		if (this._pingTimeout) {
			clearTimeout(this._pingTimeout)
		}
	}

	private handleError(error: Error) {
		this.emit('error', `Socket error: ${error.message}`)
		this._socket.close()
	}

	private ping() {
		if (this._socket.readyState === WebSocket.OPEN) {
			this._socket.ping()
		}
		this._pingTimeout = setTimeout(() => {
			this.ping()
		}, PING_INTERVAL)
	}

	async send(message: TriCasterCommand): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this._socket.readyState !== WebSocket.OPEN) {
				reject(new Error('Socket not connected'))
			}
			this._socket.send(serializeToWebSocketMessage(message), (err) => {
				if (err) reject(err)
				resolve()
			})
		})
	}

	close() {
		this._isClosing = true
		this._socket.close()
	}

	private async getInfo(): Promise<TriCasterInfo> {
		const switcherUpdateXml = got.get(`http://${this._host}:${this._port}/v1/dictionary?key=switcher`, GOT_OPTIONS)
		const productInformationXml = got.get(`http://${this._host}:${this._port}/v1/version`, GOT_OPTIONS)
		const parser = new TriCasterInfoParser()
		return {
			...parser.parseSwitcherUpdate(await switcherUpdateXml.text()),
			...parser.parseProductInformation(await productInformationXml.text()),
		}
	}

	private async getShortcutStates(): Promise<string> {
		return got.get(`http://${this._host}:${this._port}/v1/dictionary?key=shortcut_states`, GOT_OPTIONS).text()
	}
}
