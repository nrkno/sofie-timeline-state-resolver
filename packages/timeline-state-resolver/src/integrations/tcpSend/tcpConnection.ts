import { EventEmitter } from 'eventemitter3'
import { TcpSendOptions } from 'timeline-state-resolver-types'
import { Socket } from 'net'

const TIMEOUT = 3000 // ms
const RETRY_TIMEOUT_FIRST = 500 // ms
const RETRY_TIMEOUT_SUBSEQUENT = 5000 // ms
export interface TcpConnectionEvents {
	connectionChanged: [connected: boolean]
	error: [context: string, error: Error]
}

export class TcpConnection extends EventEmitter<TcpConnectionEvents> {
	/**
	 * Is set when the connection is active.
	 * is set to undefined if disconnect() has been called (then do not try to reconnect)
	 */
	private activeOptions: TcpSendOptions | undefined = undefined
	private _tcpClient: Socket | null = null

	private _connected = false
	private _retryConnectTimeout: NodeJS.Timer | undefined

	get connected(): boolean {
		return this._connected
	}
	activate(options: TcpSendOptions): void {
		this.activeOptions = options

		this.ensureConnection().catch((err) => {
			this.emit('error', 'activate TCP', err)
		})
	}
	async ensureConnection(): Promise<Socket> {
		if (!this.activeOptions) throw new Error('TCP connection not activated')
		const activeOptions = this.activeOptions

		if (!this._tcpClient) {
			this._tcpClient = new Socket()
			this._tcpClient.on('connect', () => {
				this._setConnected(true)
			})
			this._tcpClient.on('close', () => {
				this._setConnected(false)
			})
			this._tcpClient.on('end', () => {
				this._setConnected(false)
			})
		}
		const tcpClient: Socket = this._tcpClient

		return new Promise((resolve, reject) => {
			if (!this.connected) {
				tcpClient.connect(activeOptions.port, activeOptions.host, () => {
					resolve(tcpClient)
				})
				tcpClient.once('error', (err) => {
					reject(err)
				})
				setTimeout(() => {
					reject(new Error(`TCP timeout: Unable to connect to ${activeOptions.host}:${activeOptions.port}`))
				}, TIMEOUT)
			} else {
				resolve(tcpClient)
			}
		})
	}
	async deactivate(): Promise<void> {
		this.activeOptions = undefined // prevent reconnecting

		if (this._tcpClient) {
			const tcpClient = this._tcpClient

			await new Promise<void>((resolve) => {
				tcpClient.once('close', () => {
					resolve()
				})
				tcpClient.once('end', () => {
					resolve()
				})

				tcpClient.end()
				setTimeout(() => {
					resolve()
				}, TIMEOUT)
				setTimeout(() => {
					if (this._tcpClient) {
						// Forcefully destroy the connection:
						this._tcpClient.destroy()
					}
				}, Math.floor(TIMEOUT / 2))
			})
		}

		this._cleanupTcpClient()
		this._setConnected(false)
	}
	async reconnect() {
		if (!this.activeOptions) throw new Error('TCP connection not activated')

		const options = this.activeOptions
		await this.deactivate()
		this.activate(options)
	}
	async sendTCPMessage(message: string): Promise<void> {
		if (!this.activeOptions) throw new Error('TCP connection not activated')
		const tcpClient = await this.ensureConnection()

		tcpClient.write(Buffer.from(message, this.activeOptions.bufferEncoding))
	}
	private _cleanupTcpClient(): void {
		if (this._tcpClient) {
			this._tcpClient.removeAllListeners('connect')
			this._tcpClient.removeAllListeners('close')
			this._tcpClient.removeAllListeners('end')
			this._tcpClient.removeAllListeners('error')

			this._tcpClient = null
		}
	}

	private _setConnected(connected: boolean) {
		if (this._connected !== connected) {
			this._connected = connected
			this._connectionChanged()

			if (!connected) {
				this._tcpClient = null
				this._triggerRetryConnection(true)
			}
		}
	}
	private _triggerRetryConnection(firstTry: boolean) {
		if (!this._retryConnectTimeout) {
			this._retryConnectTimeout = setTimeout(
				() => {
					this._retryConnection()
				},
				firstTry ? RETRY_TIMEOUT_FIRST : RETRY_TIMEOUT_SUBSEQUENT
			)
		}
	}
	private _retryConnection() {
		clearTimeout(this._retryConnectTimeout)
		if (!this.activeOptions) return

		if (this.activeOptions && !this.connected) {
			this.ensureConnection().catch((err) => {
				if (`${err}`.includes('TCP timeout')) {
					this._triggerRetryConnection(false)
				} else {
					this.emit('error', 'reconnect TCP', err)
				}
			})
		}
	}
	private _connectionChanged() {
		this.emit('connectionChanged', this._connected)
	}
}
