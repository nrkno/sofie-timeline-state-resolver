import * as _ from 'underscore'
import { Device, DeviceOptions, CommandWithContext } from './device'
import { DeviceType, MappingPanasonicPtz, Mappings, MappingPanasonicPtzType } from './mapping'
import * as request from 'request'
import * as querystring from 'querystring'
import { sprintf } from 'sprintf-js'

import { TimelineState, TimelineKeyframe, TimelineResolvedObject } from 'superfly-timeline'
import { DoOnTime } from '../doOnTime'
import { EventEmitter } from 'events'

export interface PanasonicPtzOptions extends DeviceOptions {
	options?: {
		commandReceiver?: (time: number, cmd) => Promise<any>,
		host?: string
		port?: number
		https?: boolean
	}
}
export enum TimelineContentTypePanasonicPtz {
	PRESET = 'presetMem',
	SPEED = 'presetSpeed'
}
export interface TimelineObjPanasonicPtz extends TimelineResolvedObject {
	content: {
		keyframes?: Array<TimelineKeyframe>
		type: TimelineContentTypePanasonicPtz
	}
}
export interface TimelineObjPanasonicPtzPresetSpeed extends TimelineObjPanasonicPtz {
	content: {
		type: TimelineContentTypePanasonicPtz.SPEED
		speed: number
	}
}

export interface TimelineObjPanasonicPtzPreset extends TimelineObjPanasonicPtz {
	content: {
		type: TimelineContentTypePanasonicPtz.PRESET
		preset: number
	}
}

export interface PanasonicPtzState {
	speed: number | undefined,
	preset: number | undefined
}

export interface PanasonicPtzCommand {
	type: TimelineContentTypePanasonicPtz,
	speed?: number,
	preset?: number
}
export interface PanasonicPtzCommandWithContext {
	command: PanasonicPtzCommand,
	context: CommandContext
}
type CommandContext = any
interface CommandQueueItem {
	command: string
	executing: boolean
	resolve: (response: string) => void
	reject: (error: any) => void
}
export class PanasonicPtzCamera extends EventEmitter {
	private _url: string
	private _commandDelay: number
	private _commandQueue: Array<CommandQueueItem> = []
	private _executeQueueTimeout: Array<NodeJS.Timer> = []

	constructor (url: string, commandDelay: number = 130) {
		super()

		this._commandDelay = commandDelay
		this._url = url
	}

	get url () {
		return this._url
	}

	sendCommand (command: string): Promise<string> {
		const p: Promise<string> = new Promise((resolve, reject) => {
			this._commandQueue.push({ command: command, executing: false, resolve: resolve, reject: reject })
		})
		if (this._commandQueue.filter(i => i.executing).length === 0) this._executeQueue()
		return p
	}
	dispose () {
		this._commandQueue = []
		_.each(this._executeQueueTimeout, (item) => {
			clearTimeout(item)
		})
	}

	private _dropFromQueue (item: CommandQueueItem) {
		const index = this._commandQueue.findIndex(i => i === item)
		if (index >= 0) {
			this._commandQueue.splice(index, 1)
		} else {
			throw new Error(`Command ${item.command} should be dropped from the queue, but could not be found!`)
		}
	}

	private _executeQueue () {
		const qItem = this._commandQueue.find(i => !i.executing)
		if (!qItem) {
			return
		}

		qItem.executing = true
		request.get(
			this._url + '?' + querystring.stringify({ 'cmd': qItem.command, 'res': '1' }),
			{},
			(error, response) => {
				if (error) {
					this.emit('error', error)
					this._dropFromQueue(qItem)
					qItem.reject(error)
					return
				}
				this._dropFromQueue(qItem)
				qItem.resolve(response.body)
			}
		)

		// find any commands that aren't executing yet and execute one after 130ms
		if (this._commandQueue.filter(i => !i.executing).length > 0) {
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
enum PanasonicHttpCommands {
	POWER_MODE_QUERY = '#O',

	PRESET_NUMBER_CONTROL_TPL = '#R%02i',
	PRESET_NUMBER_QUERY = '#S',
	PRESET_SPEED_CONTROL_TPL = '#UPVS%03i',
	PRESET_SPEED_QUERY = '#UPVS'
}
enum PanasonicHttpResponse {
	POWER_MODE_ON = 'p1',
	POWER_MODE_STBY = 'p0',
	POWER_MODE_TURNING_ON = 'p3',

	PRESET_NUMBER_TPL = 's',
	PRESET_SPEED_TPL = 'uPVS',

	ERROR_1 = 'E1',
	ERROR_2 = 'E2',
	ERROR_3 = 'E3'
}
export class PanasonicPtzHttpInterface extends EventEmitter {
	private _device: PanasonicPtzCamera

	constructor (host: string, port?: number, https?: boolean) {
		super()

		this._device = new PanasonicPtzCamera(
			(https ? 'https' : 'http') + '://' + host + (port ? ':' + port : '') + '/cgi-bin/aw_ptz'
		)
		this._device.on('error', (err) => {
			this.emit('error', err)
		})
	}

	private static _isError (response: string) {
		if (response === PanasonicHttpResponse.ERROR_1 ||
			response === PanasonicHttpResponse.ERROR_2 ||
			response === PanasonicHttpResponse.ERROR_3) {
			return true
		} else {
			return false
		}
	}
	dispose () {
		this._device.dispose()
	}
	/**
	 * Get the last preset recalled in the camera
	 * @returns {Promise<number>}
	 * @memberof PanasonicPtzHttpInterface
	 */
	getPreset (): Promise<number> {
		const device = this._device

		return new Promise((resolve, reject) => {
			device.sendCommand(PanasonicHttpCommands.PRESET_NUMBER_QUERY).then((response) => {
				if (PanasonicPtzHttpInterface._isError(response)) {
					this.emit('error', response)
					reject(response)
				} else if (response.startsWith(PanasonicHttpResponse.PRESET_NUMBER_TPL)) {
					const preset = Number.parseInt(response.substr(PanasonicHttpResponse.PRESET_NUMBER_TPL.length))
					resolve(preset)
				} else {
					this.emit('error', response)
					reject(response)
				}
			}).catch((error) => {
				this.emit('disconnected', error)
				reject(error)
			})
		})
	}

	/**
	 * Recall camera preset
	 * @param {number} preset The preset to be recalled in the camera. 0-99
	 * @returns {Promise<number>} A promise: the preset the camera will transition to
	 * @memberof PanasonicPtzHttpInterface
	 */
	recallPreset (preset: number): Promise<number> {
		const device = this._device

		if (!_.isFinite(preset)) throw new Error('Camera speed preset is not a finite number')
		if (preset < 0 || preset > 99) throw new Error('Illegal preset number')

		return new Promise((resolve, reject) => {
			device.sendCommand(sprintf(PanasonicHttpCommands.PRESET_NUMBER_CONTROL_TPL, preset)).then((response) => {
				if (PanasonicPtzHttpInterface._isError(response)) {
					this.emit('error', response)
					reject(response)
				} else if (response.startsWith(PanasonicHttpResponse.PRESET_NUMBER_TPL)) {
					const preset = Number.parseInt(response.substr(PanasonicHttpResponse.PRESET_NUMBER_TPL.length))
					resolve(preset)
				} else {
					this.emit('error', response)
					reject(response)
				}
			}).catch((error) => {
				this.emit('disconnected', error)
				reject(error)
			})
		})
	}

	/**
	 * Get camera preset recall speed, within speed table
	 * @returns {Promise<number>} A promise: the speed set in the camera
	 * @memberof PanasonicPtzHttpInterface
	 */
	getSpeed (): Promise<number> {
		const device = this._device

		return new Promise((resolve, reject) => {
			device.sendCommand(PanasonicHttpCommands.PRESET_SPEED_QUERY).then((response) => {
				if (PanasonicPtzHttpInterface._isError(response)) {
					this.emit('error', response)
					reject(response)
				} else if (response.startsWith(PanasonicHttpResponse.PRESET_SPEED_TPL)) {
					const speed = Number.parseInt(response.substr(PanasonicHttpResponse.PRESET_SPEED_TPL.length))
					resolve(speed)
				} else {
					this.emit('error', response)
					reject(response)
				}
			}).catch((error) => {
				this.emit('disconnected', error)
				reject(error)
			})
		})
	}

	/**
	 * Set camera preset recall speed, within speed table
	 * @param {number} speed Speed to be set for the camera preset recall. 250-999 or 0. 0 is maximum speed
	 * @returns {Promise<number>} A promise: the speed set in the camera
	 * @memberof PanasonicPtzHttpInterface
	 */
	setSpeed (speed: number): Promise<number> {
		const device = this._device

		if (!_.isFinite(speed)) throw new Error('Camera speed preset is not a finite number')
		if ((speed < 250 || speed > 999) && (speed !== 0)) throw new Error('Camera speed must be between 250 and 999 or needs to be 0')

		return new Promise((resolve, reject) => {
			device.sendCommand(sprintf(PanasonicHttpCommands.PRESET_SPEED_CONTROL_TPL, speed)).then((response) => {
				if (PanasonicPtzHttpInterface._isError(response)) {
					this.emit('error', response)
					reject(response)
				} else if (response.startsWith(PanasonicHttpResponse.PRESET_SPEED_TPL)) {
					const speed = Number.parseInt(response.substr(PanasonicHttpResponse.PRESET_SPEED_TPL.length))
					resolve(speed)
				} else {
					this.emit('error', response)
					reject(response)
				}
			}).catch((error) => {
				this.emit('disconnected', error)
				reject(error)
			})
		})
	}

	/**
	 * Ping a camera by checking it's power status. Will return true if the camera is on, false if it's off but reachable and will fail otherwise
	 * @returns {Promose<boolean | string>} A promise: true if the camera is ON, false if the camera is off, 'turningOn' if transitioning from STBY to ON
	 * @memberof PanasonicPtzHttpInterface
	 */
	ping (): Promise<boolean | string> {
		const device = this._device
		return new Promise((resolve, reject) => {
			device.sendCommand(PanasonicHttpCommands.POWER_MODE_QUERY).then((response) => {
				if (PanasonicPtzHttpInterface._isError(response)) {
					this.emit('error', response)
					reject(response)
				} else if (response === PanasonicHttpResponse.POWER_MODE_ON) {
					resolve(true)
				} else if (response === PanasonicHttpResponse.POWER_MODE_STBY) {
					resolve(false)
				} else if (response === PanasonicHttpResponse.POWER_MODE_TURNING_ON) {
					resolve('turningOn')
				} else {
					this.emit('error', response)
					reject(response)
				}
			}).catch((error) => {
				this.emit('disconnected', error)
				reject(error)
			})
		})
	}
}

const PROBE_INTERVAL = 10 * 1000 // Probe every 10s
export class PanasonicPtzDevice extends Device {
	private _doOnTime: DoOnTime
	private _device: PanasonicPtzHttpInterface | undefined
	private _connected: boolean = false

	private _commandReceiver: (time: number, cmd: PanasonicPtzCommand, context: CommandContext) => Promise<any>

	constructor (deviceId: string, deviceOptions: PanasonicPtzOptions, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) {
				this._commandReceiver = deviceOptions.options.commandReceiver
			} else {
				this._commandReceiver = this._defaultCommandReceiver
			}
		}
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		})
		this._doOnTime.on('error', e => this.emit('error', e))

		if (deviceOptions.options && deviceOptions.options.host) {
			this._device = new PanasonicPtzHttpInterface(deviceOptions.options.host, deviceOptions.options.port, deviceOptions.options.https)
			this._device.on('error', (msg) => {
				this.emit('error', msg)
			})
			this._device.on('disconnected', (msg) => {
				this.emit('error', msg)
				this._setConnected(false)
			})
		} else {
			this._device = undefined
		}
	}

	init (): Promise<boolean> {
		if (this._device) {
			return new Promise((resolve, reject) => {
				this._device!.ping().then((result) => {
					this._setConnected(!!result)

					if (result) {
						setInterval(() => {
							this._device!.ping().then((result) => {
								this._setConnected(!!result)
							}).catch((e) => {
								this.emit('error', e)
								this._setConnected(false)
							})
						}, PROBE_INTERVAL)
					}

					resolve(true)
				}).catch((e) => {
					reject(e)
				})
			})
		}
		// @ts-ignore no-unused-vars
		return Promise.reject('There are no cameras set up for this device')
	}

	convertStateToPtz (state: TimelineState): PanasonicPtzState {
		// convert the timeline state into something we can use
		const ptzState: PanasonicPtzState = this._getDefaultState()

		_.each(state.LLayers, (tlObject: TimelineObjPanasonicPtz, layerName: string) => {
			const mapping: MappingPanasonicPtz | undefined = this.mapping[layerName] as MappingPanasonicPtz
			if (mapping && mapping.device === DeviceType.PANASONIC_PTZ) {
				if (mapping.mappingType === MappingPanasonicPtzType.PRESET) {
					let tlObjectSource = tlObject as TimelineObjPanasonicPtzPreset
					_.extend(ptzState, {
						preset: tlObjectSource.content.preset
					})
				} else if (mapping.mappingType === MappingPanasonicPtzType.PRESET_SPEED) {
					let tlObjectSource = tlObject as TimelineObjPanasonicPtzPresetSpeed
					_.extend(ptzState, {
						speed: tlObjectSource.content.speed
					})
				}
			}
		})

		return ptzState
	}

	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified
		let oldState: TimelineState = (this.getStateBefore(newState.time) || { state: { time: 0, LLayers: {}, GLayers: {} } }).state

		let oldPtzState = this.convertStateToPtz(oldState)
		let newPtzState = this.convertStateToPtz(newState)

		let commandsToAchieveState: Array<PanasonicPtzCommandWithContext> = this._diffStates(oldPtzState, newPtzState)

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
	terminate () {
		if (this._device) {
			this._device.dispose()
		}
		return Promise.resolve(true)
	}
	private _getDefaultState (): PanasonicPtzState {
		return {
			preset: undefined,
			speed: undefined
		}
	}

	// @ts-ignore no-unused-vars
	private _defaultCommandReceiver (time: number, cmd: PanasonicPtzCommand, context: CommandContext): Promise<any> {
		let cwc: CommandWithContext = {
			context: context,
			command: cmd
		}
		if (cmd.type === TimelineContentTypePanasonicPtz.PRESET) {

			if (this._device && cmd.preset) {
				this.emit('debug', cwc)
				this._device.recallPreset(cmd.preset)
				.then((res) => {
					this.emit('debug', `Panasonic PTZ result: ${res}`)
				})
				.catch((e) => this.emit('error', e))
			} // @todo: else: add throw here?
		} else if (cmd.type === TimelineContentTypePanasonicPtz.SPEED) {
			if (this._device && cmd.speed) {
				this.emit('debug', cwc)
				this._device.setSpeed(cmd.speed)
				.then((res) => {
					this.emit('debug', `Panasonic PTZ result: ${res}`)
				})
				.catch((e) => this.emit('error', e))
			} // @todo: else: add throw here?
		}
	}

	private _addToQueue (commandsToAchieveState: Array<PanasonicPtzCommandWithContext>, time: number) {
		_.each(commandsToAchieveState, (cmd: PanasonicPtzCommandWithContext) => {

			// add the new commands to the queue:
			this._doOnTime.queue(time, (cmd: PanasonicPtzCommandWithContext) => {
				return this._commandReceiver(time, cmd.command, cmd.context)
			}, cmd)
		})
	}
	private _diffStates (oldPtzState: PanasonicPtzState, newPtzState: PanasonicPtzState): Array<PanasonicPtzCommandWithContext> {

		let commands: Array<PanasonicPtzCommandWithContext> = []

		let addCommands = (newNode: PanasonicPtzState, oldValue: PanasonicPtzState) => {
			if (newNode.preset !== oldValue.preset && newNode.preset !== undefined) {
				commands.push({
					command: {
						type: TimelineContentTypePanasonicPtz.PRESET,
						preset: newNode.preset
					},
					context: `preset differ (${newNode.preset}, ${oldValue.preset})`
				})
			}
			if (newNode.speed !== oldValue.speed && newNode.speed !== undefined) {
				commands.push({
					command: {
						type: TimelineContentTypePanasonicPtz.SPEED,
						speed: newNode.speed
					},
					context: `preset differ (${newNode.speed}, ${oldValue.speed})`
				})
			}
		}

		if (!_.isEqual(newPtzState, oldPtzState)) {
			addCommands(newPtzState, oldPtzState)
		}
		return commands
	}

	get canConnect (): boolean {
		return true
	}
	get connected (): boolean {
		return this._connected
	}
	get deviceType () {
		return DeviceType.PANASONIC_PTZ
	}
	get deviceName (): string {
		return 'Panasonic PTZ ' + this.deviceId
	}
	get queue () {
		return this._doOnTime.getQueue()
	}

	set mapping (mappings: Mappings) {
		super.mapping = mappings
	}
	get mapping () {
		return super.mapping
	}
	private _setConnected (connected: boolean) {
		if (this._connected !== connected) {
			this._connected = connected
			this.emit('connectionChanged', this.connected)
		}
	}
}
