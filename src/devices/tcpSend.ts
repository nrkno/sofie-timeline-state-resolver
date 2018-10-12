import { Socket } from 'net'
import * as _ from 'underscore'
import { Device, DeviceOptions, CommandWithContext } from './device'
import { DeviceType } from './mapping'
import { DoOnTime } from '../doOnTime'

import { TimelineState, TimelineResolvedObject } from 'superfly-timeline'

const TIMEOUT = 3000 // ms
const RETRY_TIMEOUT = 5000 // ms
/*
	This is a TCPSendDevice, it sends commands over tcp when it feels like it
*/
export interface TCPSendDeviceOptions extends DeviceOptions {
	options?: {
		commandReceiver?: (time: number, cmd) => Promise<any>
	}
}
interface TCPSendCommand {
	commandName: 'added' | 'changed' | 'removed',
	content: CommandContent,
	context: CommandContext
}
interface CommandContent {
	message: string
}
export interface TCPSendOptions {
	makeReadyCommands?: CommandContent[]

	host: string
	port: number
	bufferEncoding?: string // encoding of messages, ex 'hex', default is 'utf8'
}
interface LLayer extends TimelineResolvedObject {
	content: {
		message: string
	}
}
type CommandContext = any
export class TCPSendDevice extends Device {

	private _makeReadyCommands: CommandContent[]
	private _doOnTime: DoOnTime
	private _tcpClient: Socket | null = null
	private _connected: boolean = false
	private _host: string
	private _port: number
	private _bufferEncoding?: string
	private _setDisconnected: boolean = false // set to true if disconnect() has been called (then do not trye to reconnect)
	private _retryConnectTimeout: NodeJS.Timer
	// private _queue: Array<any>

	private _commandReceiver: (time: number, cmd: CommandContent, context: CommandContext) => Promise<any>

	constructor (deviceId: string, deviceOptions: TCPSendDeviceOptions, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		})
		this._doOnTime.on('error', e => this.emit('error', e))
	}
	init (options: TCPSendOptions): Promise<boolean> {
		this._makeReadyCommands = options.makeReadyCommands || []

		this._host = options.host
		this._port = options.port
		this._bufferEncoding = options.bufferEncoding

		return this._connectTCPClient()
		.then(() => {
			return true
		})
	}
	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified

		let oldState: TimelineState = (this.getStateBefore(newState.time) || { state: { time: 0, LLayers: {}, GLayers: {} } }).state

		let oldAbstractState = this.convertStateToTCPSend(oldState)
		let newAbstractState = this.convertStateToTCPSend(newState)

		let commandsToAchieveState: Array<any> = this._diffStates(oldAbstractState, newAbstractState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newState.time)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newState, newState.time)
	}
	clearFuture (clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}

	makeReady (okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			this._disconnectTCPClient()
			.then(() => {
				return this._connectTCPClient()
			})
			.catch((err) => {
				this.emit('error', err)
			})
		}
		if (okToDestroyStuff && this._makeReadyCommands && this._makeReadyCommands.length > 0) {
			const time = this.getCurrentTime()
			_.each(this._makeReadyCommands, (cmd: CommandContent) => {
				// add the new commands to the queue:
				this._doOnTime.queue(time, (cmd: CommandContent) => {
					return this._commandReceiver(time, cmd, 'makeReady')
				}, cmd)
			})
		}
		return Promise.resolve()
	}
	terminate () {
		this._doOnTime.dispose()
		clearTimeout(this._retryConnectTimeout)

		return this._disconnectTCPClient()
		.then(() => {
			return true
		})
	}

	get canConnect (): boolean {
		return true
	}
	get connected (): boolean {
		return this._connected
	}
	convertStateToTCPSend (state: TimelineState) {
		// convert the timeline state into something we can use
		// (won't even use this.mapping)
		return state
	}
	get deviceType () {
		return DeviceType.TCPSEND
	}
	get deviceName (): string {
		return 'TCP-Send ' + this.deviceId
	}
	get queue () {
		return this._doOnTime.getQueue()
	}
	private _setConnected (connected: boolean) {
		if (this._connected !== connected) {

			this._connected = connected
			this.emit('connectionChanged', connected)

			if (!connected) {
				this._triggerRetryConnection()
			}
		}
	}
	private _triggerRetryConnection () {
		if (!this._retryConnectTimeout) {
			this._retryConnectTimeout = setTimeout(() => {
				this._retryConnection()
			}, RETRY_TIMEOUT)
		}
	}
	private _retryConnection () {
		clearTimeout(this._retryConnectTimeout)

		if (!this.connected && !this._setDisconnected) {
			this._connectTCPClient()
			.catch((err) => {
				this.emit('error', err)
			})
		}
	}
	private _addToQueue (commandsToAchieveState: Array<TCPSendCommand>, time: number) {
		_.each(commandsToAchieveState, (cmd: TCPSendCommand) => {

			// add the new commands to the queue:
			this._doOnTime.queue(time, (cmd: TCPSendCommand) => {
				if (
					cmd.commandName === 'added' ||
					cmd.commandName === 'changed'
				) {
					return this._commandReceiver(time, cmd.content, cmd.context)
				} else {
					return null
				}
			}, cmd)
		})
	}
	private _diffStates (oldTCPSendState: TimelineState , newTCPSendState: TimelineState): Array<TCPSendCommand> {
		// in this TCPSend class, let's just cheat:
		let commands: Array<TCPSendCommand> = []

		_.each(newTCPSendState.LLayers, (newLayer: LLayer, layerKey: string) => {
			let oldLayer = oldTCPSendState.LLayers[layerKey]
			// added/changed
			if (newLayer.content) {
				if (!oldLayer) {
					// added!
					commands.push({
						commandName: 'added',
						content: newLayer.content,
						context: `added: ${newLayer.id}`
					})
				} else {
					// changed?
					if (!_.isEqual(oldLayer.content, newLayer.content)) {
						// changed!
						commands.push({
							commandName: 'changed',
							content: newLayer.content,
							context: `changed: ${newLayer.id}`
						})
					}
				}
			}
		})
		// removed
		_.each(oldTCPSendState.LLayers, (oldLayer: LLayer, layerKey) => {
			let newLayer = newTCPSendState.LLayers[layerKey]
			if (!newLayer) {
				// removed!
				commands.push({
					commandName: 'removed',
					content: oldLayer.content,
					context: `removed: ${oldLayer.id}`
				})
			}
		})
		return commands
	}
	private _disconnectTCPClient (): Promise<void> {
		return new Promise((resolve) => {
			this._setDisconnected = true
			if (this._tcpClient) {
				if (this.connected) {
					this._tcpClient.once('close', () => {
						resolve()
					})
					this._tcpClient.once('end', () => {
						resolve()
					})
					this._tcpClient.end()

					setTimeout(() => {
						resolve()
					}, TIMEOUT)
					setTimeout(() => {
						if (this._tcpClient && this.connected) {
							// Forcefully destroy the connection:
							this._tcpClient.destroy()
						}
					}, Math.floor(TIMEOUT / 2))
				} else {
					resolve()
				}
			} else {
				resolve()
			}
		})
		.then(() => {
			if (this._tcpClient) {
				this._tcpClient.removeAllListeners('connect')
				this._tcpClient.removeAllListeners('close')
				this._tcpClient.removeAllListeners('end')
				this._tcpClient.removeAllListeners('error')

				this._tcpClient = null
			}
			this._setConnected(false)
		})
	}
	private _connectTCPClient (): Promise<void> {
		this._setDisconnected = false

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
		if (!this.connected) {
			return new Promise((resolve, reject) => {
				this._tcpClient!.connect(this._port, this._host, () => {
					resolve()
					// client.write('Hello, server! Love, Client.');
				})
				setTimeout(() => {
					reject(`TCP timeout: Unable to connect to ${this._host}:${this._port}`)
				}, TIMEOUT)
			})
		} else {
			return Promise.resolve()
		}
	}
	private _sendTCPMessage (message: string): Promise<void> {
		// Do we have a client?
		return this._connectTCPClient()
		.then(() => {
			if (this._tcpClient) {
				this._tcpClient.write(Buffer.from(message, this._bufferEncoding))
			} else throw Error('_sendTCPMessage: _tcpClient is falsy!')
		})
	}
	private _defaultCommandReceiver (time: number, cmd: CommandContent, context: CommandContext): Promise<any> {
		time = time
		// this.emit('info', 'TCTSend ', cmd)

		let cwc: CommandWithContext = {
			context: context,
			command: cmd
		}
		this.emit('debug', cwc)

		if (cmd.message) {
			return this._sendTCPMessage(cmd.message)
		} else {
			return Promise.reject('tcpCommand.message not set')
		}
	}
}
