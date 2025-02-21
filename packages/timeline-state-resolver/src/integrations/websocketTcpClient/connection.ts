import * as WebSocket from 'ws'
import { Socket } from 'net'
import { WebSocketTCPClientOptions } from 'timeline-state-resolver-types'

export class WebSocketTcpConnection {
	private ws: WebSocket | null = null
	private tcp: Socket | null = null
	private options: WebSocketTCPClientOptions

	constructor(options: WebSocketTCPClientOptions) {
		this.options = options
	}

	async connect(): Promise<void> {
		// WebSocket connection
		this.ws = new WebSocket(this.options.webSocket.uri)
		this.ws.on('open', () => console.log('WebSocket connected'))
		this.ws.on('error', (err) => console.error('WebSocket error:', err))
		this.ws.on('close', () => {
			console.log('WebSocket closed')
			if (this.options.webSocket.reconnectInterval) {
				setTimeout(() => this.connect(), this.options.webSocket.reconnectInterval)
			}
		})

		// TCP connection
		this.tcp = new Socket()
		this.tcp.connect(this.options.tcp.port, this.options.tcp.host, () => {
			console.log('TCP connected')
		})
		this.tcp.on('error', (err) => console.error('TCP error:', err))
		this.tcp.on('close', () => console.log('TCP closed'))
	}

	connected(): boolean {
		return (this.ws?.readyState === WebSocket.OPEN && this.tcp?.writable) || false
	}

	sendWebSocketMessage(message: string | Uint8Array): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(message)
		} else {
			console.warn('WebSocket not connected')
		}
	}

	sendTcpCommand(command: string | Uint8Array): void {
		if (this.tcp?.writable) {
			this.tcp.write(command)
		} else {
			console.warn('TCP not connected')
		}
	}

	async disconnect(): Promise<void> {
		if (this.ws) {
			this.ws.close()
			this.ws = null
		}
		if (this.tcp) {
			this.tcp.destroy()
			this.tcp = null
		}
	}
}
