import * as _ from 'underscore'
import {
	SofieChefOptions,
	Mappings,
	TSRTimelineContent,
	Timeline,
	ActionExecutionResultCode,
	SofieChefActions,
	ActionExecutionResult,
	StatusCode,
	DeviceStatus,
} from 'timeline-state-resolver-types'
import * as WebSocket from 'ws'
import {
	ReceiveWSMessageAny,
	ReceiveWSMessageType,
	SendWSMessageAny,
	SendWSMessageStatus,
	SendWSMessageType,
	StatusCode as ChefStatusCode,
	StatusObject,
	ReceiveWSMessageResponse,
} from './api'
import { t } from '../../lib'
import { CommandWithContext, Device } from '../../service/device'
import { diffStates } from './diffStates'
import { buildSofieChefState } from './stateBuilder'

export interface SofieChefCommandWithContext extends CommandWithContext {
	command: ReceiveWSMessageAny
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

/**
 * This is a wrapper for a SofieChef-devices,
 * https://github.com/nrkno/sofie-chef
 */
export class SofieChefDevice extends Device<SofieChefOptions, SofieChefState, SofieChefCommandWithContext> {
	readonly actions: {
		[id in SofieChefActions]: (id: string, payload?: Record<string, any>) => Promise<ActionExecutionResult>
	} = {
		[SofieChefActions.RestartAllWindows]: async () =>
			this.restartAllWindows()
				.then(() => ({
					result: ActionExecutionResultCode.Ok,
				}))
				.catch(() => ({ result: ActionExecutionResultCode.Error })),
		[SofieChefActions.RestartWindow]: async (_id, payload) => {
			if (!payload?.windowId) {
				return { result: ActionExecutionResultCode.Error, response: t('Missing window id') }
			}
			return this.restartWindow(payload.windowId)
				.then(() => ({
					result: ActionExecutionResultCode.Ok,
				}))
				.catch(() => ({ result: ActionExecutionResultCode.Error }))
		},
	}

	// private _doOnTime: DoOnTime
	private _ws?: WebSocket
	private _connected = false
	private _status: SendWSMessageStatus['status'] = {
		app: {
			statusCode: ChefStatusCode.ERROR,
			message: 'No status received yet',
		},
		windows: {},
	}
	private initOptions?: SofieChefOptions
	private msgId = 0

	/**
	 * Initiates the connection with SofieChed through a websocket connection.
	 */
	async init(initOptions: SofieChefOptions): Promise<boolean> {
		// This is where we would do initialization, like connecting to the devices, etc
		this.initOptions = initOptions

		this._setupWSConnection()
			.then(() => {
				// assume empty state on start (would be nice if we could get the url for each window on connection)
				this.context.resetToState({ windows: {} }).catch((e) => this.context.logger.error('Failed to reset state', e))
			})
			.catch((e) => this.context.logger.error('Failed to initialise Sofie Chef connection', e))

		return true
	}
	private async _setupWSConnection() {
		return new Promise<void>((resolve, reject) => {
			if (!this.initOptions) {
				reject(new Error(`this.initOptions not set, run init() first!`))
				return
			}
			if (this._ws) {
				// Clean up previous connection:
				this._ws.removeAllListeners()
				delete this._ws
			}
			this._ws = new WebSocket(this.initOptions.address)
			this._ws.on('error', (e) => {
				reject(new Error(`Error when connecting: ${e}`))
				this.context.logger.error('SofieChef', e)
			})
			this._ws.on('open', () => {
				this._updateConnected(true)
				resolve()
			})
			this._ws.on('close', () => {
				this._ws?.removeAllListeners()
				delete this._ws
				this._updateConnected(false)
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
				.then(async () => {
					// is connected, yay!
					// Resync state:
					await this.resyncState()
				})
				.catch(() => {
					// Unable to reconnect, try again later:
					this.tryReconnect()
				})
		}, RECONNECT_WAIT_TIME)
	}
	private async resyncState() {
		const response = await this._sendMessage({
			msgId: 0, // set later
			type: ReceiveWSMessageType.LIST,
		})
		if (response.code === 200) {
			// Update state to reflec the actual state of Chef:
			const state: SofieChefState = { windows: {} }
			for (const window of response.body) {
				state.windows[window.id] = {
					url: window.url ?? '',
					urlTimelineObjId: 'N/A',
				}
			}
			await this.context.resetToState(state)
		}
	}
	async terminate() {
		this._ws?.terminate()
		this._ws?.removeAllListeners()
	}

	get connected(): boolean {
		return this._connected
	}

	convertTimelineStateToDeviceState(
		timelineState: Timeline.TimelineState<TSRTimelineContent>,
		mappings: Mappings
	): SofieChefState {
		return buildSofieChefState(timelineState, mappings)
	}

	/** Restart (reload) all windows */
	private async restartAllWindows() {
		return this._sendMessage({
			msgId: 0, // set later
			type: ReceiveWSMessageType.RESTART,
			windowId: '$all', // Magic token, restart all windows
		})
	}
	/** Restart (reload) a window */
	private async restartWindow(windowId: string) {
		return this._sendMessage({
			msgId: 0, // set later
			type: ReceiveWSMessageType.RESTART,
			windowId: windowId,
		})
	}

	getStatus(): Omit<DeviceStatus, 'active'> {
		let statusCode = StatusCode.GOOD
		const messages: string[] = []
		if (!this.connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		} else if (this._status.app.statusCode !== ChefStatusCode.GOOD) {
			statusCode = this.convertStatusCode(this._status.app.statusCode)
			messages.push(this._status.app.message)
		} else {
			for (const [index, window] of Object.entries<StatusObject>(this._status.windows)) {
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
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 */
	public diffStates(
		oldSofieChefState: SofieChefState | undefined,
		newSofieChefState: SofieChefState,
		mappings: Mappings
	): Array<SofieChefCommandWithContext> {
		return diffStates(oldSofieChefState, newSofieChefState, mappings)
	}

	public async sendCommand({ command, context, timelineObjId }: SofieChefCommandWithContext): Promise<any> {
		// emit the command to debug:
		const cwc: CommandWithContext = {
			context,
			command,
			timelineObjId,
		}
		this.context.logger.debug(cwc)

		// execute the command here
		try {
			await this._sendMessage(command)
		} catch (e) {
			this.context.commandError(e as Error, cwc)
		}
	}

	private _updateConnected(connected: boolean) {
		if (this._connected !== connected) {
			this._connected = connected
			this.context.connectionChanged(this.getStatus())
		}
	}
	private _updateStatus(status: SendWSMessageStatus['status']) {
		if (!_.isEqual(this._status, status)) {
			this._status = status
			this.context.connectionChanged(this.getStatus())
		}
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
					this._updateStatus(message.status)
				} else {
					// @ts-expect-error never
					this.emit('error', 'SofieChef', new Error(`Unknown command ${message.type}`))
				}
			}
		} catch (err) {
			this.context.logger.error('SofieChef', err as Error)
		}
	}

	private waitingForReplies: {
		[msgId: string]: {
			resolve: (result: any) => void
			reject: (error: any) => void
		}
	} = {}
	private async _sendMessage<M extends ReceiveWSMessageAny>(msg: M): Promise<ReceiveWSMessageResponse<M['type']>> {
		return new Promise((resolve, reject) => {
			msg.msgId = this.msgId++
			if (this.initOptions?.apiKey) {
				msg.apiKey = this.initOptions?.apiKey
			}
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
