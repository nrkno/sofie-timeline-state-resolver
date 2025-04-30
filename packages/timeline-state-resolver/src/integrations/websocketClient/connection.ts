import * as WebSocket from 'ws'
import { DeviceStatus, StatusCode, WebsocketClientOptions } from 'timeline-state-resolver-types'

export class WebSocketConnection {
	private ws?: WebSocket
	private isWsConnected = false
	private readonly options: WebsocketClientOptions

	constructor(options: WebsocketClientOptions) {
		this.options = options
	}

	async connect(): Promise<void> {
		try {
			// WebSocket connection
			if (this.options.webSocket?.uri) {
				this.ws = new WebSocket(this.options.webSocket.uri, this.options.bufferEncoding || 'utf8')

				await new Promise<void>((resolve, reject) => {
					if (!this.ws) return reject(new Error('WebSocket not initialized'))

					const timeout = setTimeout(() => {
						reject(new Error('WebSocket connection timeout'))
					}, this.options.webSocket?.reconnectInterval || 5000)

					this.ws.on('open', () => {
						clearTimeout(timeout)
						this.isWsConnected = true
						resolve()
					})

					this.ws.on('error', (error) => {
						clearTimeout(timeout)
						reject(error)
					})
				})

				this.ws.on('close', () => {
					this.isWsConnected = false
				})
			}
		} catch (error) {
			this.isWsConnected = false
			throw error
		}
	}

	connected(): boolean {
		return this.isWsConnected ? true : false
	}

	connectionStatus(): Omit<DeviceStatus, 'active'> {
		const messages: string[] = []
		// Prepare for more detailed status messages:
		messages.push(this.isWsConnected ? 'WS Connected' : 'WS Disconnected')
		return {
			statusCode: this.isWsConnected ? StatusCode.GOOD : StatusCode.BAD,
			messages,
		}
	}

	sendWebSocketMessage(message: string | Buffer): void {
		if (!this.ws) {
			this.isWsConnected = false
			throw new Error('WebSocket not connected')
		}
		this.ws.send(message)
	}

	async disconnect(): Promise<void> {
		if (this.ws) {
			this.ws.close()
			this.ws = undefined
		}

		this.isWsConnected = false
	}
}
