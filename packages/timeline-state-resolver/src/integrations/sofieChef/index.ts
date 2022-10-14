import * as _ from 'underscore'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode } from '../../devices/device'
import {
	DeviceType,
	SofieChefOptions,
	DeviceOptionsSofieChef,
	Mappings,
	TimelineObjSofieChefAny,
	MappingSofieChef,
} from 'timeline-state-resolver-types'

import { TimelineState } from 'superfly-timeline'
import { DoOnTime, SendMode } from '../../devices/doOnTime'
import * as WebSocket from 'ws'
import {
	ReceiveWSMessageAny,
	ReceiveWSMessageType,
	SendWSMessageAny,
	SendWSMessageStatus,
	SendWSMessageType,
	StatusCode as ChefStatusCode,
} from './api'

export interface DeviceOptionsSofieChefInternal extends DeviceOptionsSofieChef {
	commandReceiver?: CommandReceiver
}
export type CommandReceiver = (
	time: number,
	cmd: Command,
	context: CommandContext,
	timelineObjId: string
) => Promise<any>

export interface Command {
	content: CommandContent
	context: CommandContext
	timelineObjId: string
}
export interface SofieChefState {
	windows: {
		[windowId: string]: {
			url: string
			/** The TimelineObject which set the url */
			urlTimelineObjId: string
		}
	}
}

const COMMAND_TIMEOUT_TIME = 5000
const RECONNECT_WAIT_TIME = 5000

type CommandContent = ReceiveWSMessageAny
type CommandContext = string
/**
 * This is a wrapper for a SofieChef-devices,
 * https://github.com/nrkno/sofie-chef
 */
export class SofieChefDevice extends DeviceWithState<SofieChefState, DeviceOptionsSofieChefInternal> {
	private _doOnTime: DoOnTime

	private _ws?: WebSocket
	private _connected = false
	private status: SendWSMessageStatus['status'] = {
		app: {
			statusCode: ChefStatusCode.ERROR,
			message: 'No status received yet',
		},
		windows: {},
	}

	private initOptions?: SofieChefOptions
	private msgId = 0
	private _commandReceiver: CommandReceiver

	constructor(deviceId: string, deviceOptions: DeviceOptionsSofieChefInternal, getCurrentTime: () => Promise<number>) {
		super(deviceId, deviceOptions, getCurrentTime)
		if (deviceOptions.options) {
			if (deviceOptions.commandReceiver) this._commandReceiver = deviceOptions.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver.bind(this)
		}
		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.BURST,
			this._deviceOptions
		)
		this.handleDoOnTime(this._doOnTime, 'SofieChef')
	}

	/**
	 * Initiates the connection with SofieChed through a websocket connection.
	 */
	async init(initOptions: SofieChefOptions): Promise<boolean> {
		// This is where we would do initialization, like connecting to the devices, etc

		this.initOptions = initOptions

		await this._setupWSConnection()
		return true
	}
	private async _setupWSConnection() {
		return new Promise<void>((resolve, reject) => {
			if (!this.initOptions) {
				reject(new Error(`this.initOptions not set, run init() first!`))
				return
			}
			this._ws = new WebSocket(this.initOptions.address)

			this._ws.on('error', (e) => {
				reject(new Error(`Error when connecting: ${e}`))
				this.emit('error', 'SofieChef', e)
			})
			this._ws.on('open', () => {
				this._connected = true
				this._connectionChanged()
				resolve()
			})
			this._ws.on('close', () => {
				this._connected = false
				this._ws?.removeAllListeners()
				delete this._ws
				this._connectionChanged()
				this.tryReconnect()
			})
			this._ws.on('message', (data) => {
				this._handleReceivedMessage(data)
			})
			setTimeout(() => {
				reject(new Error(`Timeout when connecting`))
			}, COMMAND_TIMEOUT_TIME)
		})
	}
	private reconnectTimeout?: NodeJS.Timer
	private tryReconnect() {
		if (this.reconnectTimeout) return

		this.reconnectTimeout = setTimeout(() => {
			delete this.reconnectTimeout

			this._setupWSConnection()
				.then(() => {
					// is connected, yay!
				})
				.catch(() => {
					// Unable to reconnect, try again later:
					this.tryReconnect()
				})
		}, RECONNECT_WAIT_TIME)
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	/**
	 * Handles a new state such that the device will be in that state at a specific point
	 * in time.
	 * @param newState
	 */
	handleState(newState: TimelineState, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		// Handle this new state, at the point in time specified

		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		const oldSofieChefState: SofieChefState = (this.getStateBefore(previousStateTime) || { state: { windows: {} } })
			.state

		const newSofieChefState = this.convertStateToSofieChef(newState, newMappings)

		const commandsToAchieveState: Array<Command> = this._diffStates(oldSofieChefState, newSofieChefState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newSofieChefState, newState.time)
	}
	clearFuture(clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	async terminate() {
		this._doOnTime.dispose()

		this._ws?.terminate()

		return true
	}
	get canConnect(): boolean {
		return true
	}
	get connected(): boolean {
		return this._connected
	}
	convertStateToSofieChef(state: TimelineState, mappings: Mappings): SofieChefState {
		const sofieChefState: SofieChefState = {
			windows: {},
		}
		for (const [layer, layerState] of Object.entries(state.layers)) {
			const mapping = mappings[layer] as MappingSofieChef
			const content = layerState.content as TimelineObjSofieChefAny['content']

			if (mapping) {
				sofieChefState.windows[mapping.windowId] = {
					url: content.url,
					urlTimelineObjId: layerState.id,
				}
			}
		}
		return sofieChefState
	}
	get deviceType() {
		return DeviceType.SOFIE_CHEF
	}
	get deviceName(): string {
		return 'SofieChef ' + this.deviceId
	}
	get queue() {
		return this._doOnTime.getQueue()
	}
	async makeReady(okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			this._doOnTime.clearQueueNowAndAfter(this.getCurrentTime())
		}
	}
	getStatus(): DeviceStatus {
		let statusCode = StatusCode.GOOD
		const messages: string[] = []

		if (!this.connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		} else if (this.status.app.statusCode !== ChefStatusCode.GOOD) {
			statusCode = this.convertStatusCode(this.status.app.statusCode)
			messages.push(this.status.app.message)
		} else {
			for (const [index, window] of Object.entries(this.status.windows)) {
				const windowStatusCode = this.convertStatusCode(window.statusCode)
				if (windowStatusCode > statusCode) {
					statusCode = windowStatusCode
					messages.push(`Window ${index}: ${window.message}`)
				}
			}
		}

		return {
			statusCode: statusCode,
			messages: messages,
			active: this.isActive,
		}
	}
	private convertStatusCode(s: ChefStatusCode): StatusCode {
		switch (s) {
			case ChefStatusCode.GOOD:
				return StatusCode.GOOD
			case ChefStatusCode.WARNING:
				return StatusCode.WARNING_MAJOR
			case ChefStatusCode.ERROR:
				return StatusCode.BAD
			default: {
				return StatusCode.BAD
			}
		}
	}
	/**
	 * Add commands to queue, to be executed at the right time
	 */
	private _addToQueue(commandsToAchieveState: Array<Command>, time: number) {
		for (const cmd of commandsToAchieveState) {
			// add the new commands to the queue:
			this._doOnTime.queue(
				time,
				undefined,
				async (cmd: Command) => {
					return this._commandReceiver(time, cmd, cmd.context, cmd.timelineObjId)
				},
				cmd
			)
		}
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 */
	private _diffStates(oldSofieChefState: SofieChefState, newSofieChefState: SofieChefState) {
		const commands: Command[] = []

		// Added / Changed things:
		for (const [windowId, window] of Object.entries(newSofieChefState.windows)) {
			const oldWindow = oldSofieChefState.windows[windowId]

			if (!oldWindow) {
				// Added
				commands.push({
					context: 'added',
					timelineObjId: window.urlTimelineObjId,
					content: {
						msgId: this.msgId++,
						type: ReceiveWSMessageType.PLAYURL,
						windowId: windowId,
						url: window.url,
					},
				})
			} else {
				// item is not new, but maybe it has changed:
				if (oldWindow.url !== window.url) {
					commands.push({
						context: 'changed',
						timelineObjId: window.urlTimelineObjId,
						content: {
							msgId: this.msgId++,
							type: ReceiveWSMessageType.PLAYURL,
							windowId: windowId,
							url: window.url,
						},
					})
				}
			}
		}
		// Removed things
		for (const [windowId, oldWindow] of Object.entries(oldSofieChefState.windows)) {
			const newWindow = newSofieChefState.windows[windowId]

			if (!newWindow) {
				// Removed
				commands.push({
					context: 'removed',
					timelineObjId: oldWindow.urlTimelineObjId,
					content: {
						msgId: this.msgId++,
						type: ReceiveWSMessageType.STOP,
						windowId: windowId,
					},
				})
			}
		}

		return commands
	}
	private async _defaultCommandReceiver(
		_time: number,
		cmd: Command,
		context: CommandContext,
		timelineObjId: string
	): Promise<any> {
		// emit the command to debug:
		const cwc: CommandWithContext = {
			context: context,
			command: cmd.content,
			timelineObjId: timelineObjId,
		}
		this.emitDebug(cwc)

		// execute the command here
		try {
			await this._sendMessage(cmd.content)
		} catch (e) {
			this.emit('commandError', e as Error, cwc)
		}
	}
	private _connectionChanged() {
		this.emit('connectionChanged', this.getStatus())
	}
	private _handleReceivedMessage(data: WebSocket.Data) {
		try {
			const message: SendWSMessageAny = JSON.parse(data.toString())
			if (message) {
				if (message.type === SendWSMessageType.REPLY) {
					const reply = this.waitingForReplies[message.replyTo]
					if (reply) {
						if (message.error) {
							reply.reject(message.error)
						} else {
							reply.resolve(message.result)
						}
					}
				} else if (message.type === SendWSMessageType.STATUS) {
					if (!_.isEqual(message.status, this.status)) {
						this.status = message.status
						this._connectionChanged()
					}
				} else {
					// @ts-expect-error never
					this.emit('error', 'SofieChef', new Error(`Unknown command ${message.type}`))
				}
			}
		} catch (err) {
			this.emit('error', 'SofieChef', err as Error)
		}
	}
	private waitingForReplies: {
		[msgId: string]: {
			resolve: (result: any) => void
			reject: (error: any) => void
		}
	} = {}

	private async _sendMessage(msg: ReceiveWSMessageAny): Promise<void> {
		return new Promise((resolve, reject) => {
			this.waitingForReplies[msg.msgId + ''] = {
				resolve,
				reject,
			}
			this._ws?.send(JSON.stringify(msg))

			setTimeout(() => {
				reject(new Error(`Command timed out`))
			}, COMMAND_TIMEOUT_TIME)
		})
	}
}
