import * as _ from 'underscore'
import { EventEmitter } from 'events'
import got from 'got'
import * as querystring from 'querystring'
import { Command, PowerMode, PowerModeQuery } from './commands'

const PROBE_INTERVAL = 10 * 1000 // Probe every 10s

interface CommandQueueItem {
	command: string
	executing: boolean
	resolve: (response: string) => void
	reject: (error: any) => void
}
/**
 * Low level device class for Panasonic PTZ devices executing a
 * basic queue.
 */
export class PanasonicPtzCamera extends EventEmitter {
	private _url: string
	private _commandDelay: number
	private _commandQueue: Array<CommandQueueItem> = []
	private _executeQueueTimeout: Array<NodeJS.Timer> = []

	constructor(url: string, commandDelay = 130) {
		super()

		this._commandDelay = commandDelay
		this._url = url
	}

	async sendCommand(command: string): Promise<string> {
		const p: Promise<string> = new Promise((resolve, reject) => {
			this._commandQueue.push({ command: command, executing: false, resolve: resolve, reject: reject })
		})
		if (this._commandQueue.filter((i) => i.executing).length === 0) this._executeQueue()
		return p
	}
	dispose() {
		this._commandQueue = []
		_.each(this._executeQueueTimeout, (item) => {
			clearTimeout(item)
		})
	}

	private _dropFromQueue(item: CommandQueueItem) {
		const index = this._commandQueue.findIndex((i) => i === item)
		if (index >= 0) {
			this._commandQueue.splice(index, 1)
		} else {
			throw new Error(`Command ${item.command} should be dropped from the queue, but could not be found!`)
		}
	}

	private _executeQueue() {
		const qItem = this._commandQueue.find((i) => !i.executing)
		if (!qItem) {
			return
		}

		const queryUrl = this._url + '?' + querystring.stringify({ cmd: qItem.command, res: '1' })
		this.emit('debug', 'Command sent', queryUrl)

		qItem.executing = true
		got
			.get(queryUrl)
			.then((response) => {
				this._dropFromQueue(qItem)
				qItem.resolve(response.body)
			})
			.catch((error) => {
				this.emit('error', error)
				this._dropFromQueue(qItem)
				qItem.reject(error)
			})

		// find any commands that aren't executing yet and execute one after 130ms
		if (this._commandQueue.filter((i) => !i.executing).length > 0) {
			const timeout = setTimeout(() => {
				// remove from timeouts list
				const index = this._executeQueueTimeout.indexOf(timeout)
				if (index >= 0) {
					this._executeQueueTimeout.splice(index, 1)
				}

				this._executeQueue()
			}, this._commandDelay)
			// add to timeouts list so that we can cancel them when disposing
			this._executeQueueTimeout.push(timeout)
		}
	}
}
export enum PanasonicFocusMode {
	MANUAL = 0,
	AUTO = 1,
}
enum PanasonicHttpResponse {
	POWER_MODE_ON = 'p1',
	POWER_MODE_STBY = 'p0',
	POWER_MODE_TURNING_ON = 'p3',

	ERROR_1 = 'E1',
	ERROR_2 = 'E2',
	ERROR_3 = 'E3',
}
/**
 * High level methods for interfacing with a panasonic PTZ camera. This class
 * depends on the PanasonicPtzCamera class.
 */
export class PanasonicPtzHttpInterface extends EventEmitter {
	private _device: PanasonicPtzCamera

	private _connected = false
	private _pingInterval: NodeJS.Timer | undefined

	constructor(host: string, port?: number, https?: boolean) {
		super()

		this._device = new PanasonicPtzCamera(
			(https ? 'https' : 'http') + '://' + host + (port ? ':' + port : '') + '/cgi-bin/aw_ptz'
		)
		this._device.on('error', (err) => {
			this.emit('error', err)
		})
		this._device.on('debug', (...args) => {
			this.emit('debug', ...args)
		})
	}

	init() {
		const check = () => {
			this.ping()
				.then((result) => {
					this._connected = result !== PowerMode.POWER_MODE_STBY
				})
				.catch(() => {
					this._connected = false
				})
		}

		this._pingInterval = setInterval(check, PROBE_INTERVAL)
		check() // do a check right away
	}

	private static _isError(response: string) {
		if (
			response === PanasonicHttpResponse.ERROR_1 ||
			response === PanasonicHttpResponse.ERROR_2 ||
			response === PanasonicHttpResponse.ERROR_3
		) {
			return true
		} else {
			return false
		}
	}
	dispose() {
		this._device.dispose()
		if (this._pingInterval) clearInterval(this._pingInterval)
		this._connected = false
	}
	get connected() {
		return this._connected
	}

	/**
	 * Ping a camera by checking its power status. Will return true if the camera is on, false if it's off but reachable and will fail otherwise
	 * @returns {Promose<boolean | string>} A promise: true if the camera is ON, false if the camera is off, 'turningOn' if transitioning from STBY to ON
	 * @memberof PanasonicPtzHttpInterface
	 */
	async ping(): Promise<PowerMode> {
		return this.executeCommand(new PowerModeQuery())
	}

	async executeCommand<T extends Command<any>>(command: T): Promise<ReturnType<T['deserializeResponse']>> {
		let response: string
		try {
			response = await this._device.sendCommand(command.serialize())
		} catch (error) {
			this.emit('disconnected', error)
			throw error
		}
		if (PanasonicPtzHttpInterface._isError(response)) {
			throw new Error(`Device returned an error: ${response}`)
		}
		return command.deserializeResponse(response)
	}
}
