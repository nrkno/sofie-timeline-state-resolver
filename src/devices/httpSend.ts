import * as _ from 'underscore'
import {
	DeviceWithState,
	DeviceOptions,
	CommandWithContext,
	DeviceStatus,
	StatusCode
} from './device'
import { DeviceType } from './mapping'
import { DoOnTime } from '../doOnTime'
import * as request from 'request'

import {
	TimelineState,
	TimelineResolvedObject
} from 'superfly-timeline'

/*
	This is a HTTPSendDevice, it sends http commands when it feels like it
*/
export interface HttpSendDeviceOptions extends DeviceOptions {
	options?: {
		commandReceiver?: (time: number, cmd) => Promise<any>
	}
}
interface Command {
	commandName: 'added' | 'changed' | 'removed',
	content: CommandContent,
	context: CommandContext
}
enum RequestType {
	GET = 'get',
	POST = 'post',
	PUT = 'put',
	DELETE = 'delete'
}
type CommandContext = string
interface CommandContent {
	type: RequestType
	url: string
	params: {[key: string]: number | string}
}
export interface HttpSendOptions {
	makeReadyCommands?: CommandContent[]
}
export class HttpSendDevice extends DeviceWithState<TimelineState> {

	private _makeReadyCommands: CommandContent[]
	private _doOnTime: DoOnTime

	private _commandReceiver: (time: number, cmd: CommandContent, context: CommandContext) => Promise<any>

	constructor (deviceId: string, deviceOptions: HttpSendDeviceOptions, options) {
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
	init (options: HttpSendOptions): Promise<boolean> {
		this._makeReadyCommands = options.makeReadyCommands || []

		return Promise.resolve(true) // This device doesn't have any initialization procedure
	}
	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified

		// console.log('handleState')

		let oldState: TimelineState = (this.getStateBefore(newState.time) || { state: { time: 0, LLayers: {}, GLayers: {} } }).state

		let oldAbstractState = this.convertStateToHttpSend(oldState)
		let newAbstractState = this.convertStateToHttpSend(newState)

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
	terminate () {
		this._doOnTime.dispose()
		return Promise.resolve(true)
	}
	getStatus (): DeviceStatus {
		// Good, since this device has no status, really
		return {
			statusCode: StatusCode.GOOD
		}
	}
	makeReady (okToDestroyStuff?: boolean): Promise<void> {
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

	get canConnect (): boolean {
		return false
	}
	get connected (): boolean {
		return false
	}
	convertStateToHttpSend (state: TimelineState) {
		// convert the timeline state into something we can use
		// (won't even use this.mapping)
		return state
	}
	get deviceType () {
		return DeviceType.HTTPSEND
	}
	get deviceName (): string {
		return 'HTTP-Send ' + this.deviceId
	}
	get queue () {
		return this._doOnTime.getQueue()
	}
	private _addToQueue (commandsToAchieveState: Array<Command>, time: number) {
		_.each(commandsToAchieveState, (cmd: Command) => {

			// add the new commands to the queue:
			this._doOnTime.queue(time, (cmd: Command) => {
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
	private _diffStates (oldhttpSendState: TimelineState, newhttpSendState: TimelineState): Array<Command> {
		// in this httpSend class, let's just cheat:

		let commands: Array<Command> = []

		_.each(newhttpSendState.LLayers, (newLayer: TimelineResolvedObject, layerKey: string) => {
			let oldLayer = oldhttpSendState.LLayers[layerKey]
			if (!oldLayer) {
				// added!
				commands.push({
					commandName: 'added',
					content: newLayer.content as CommandContent,
					context: `added: ${newLayer.id}`
				})
			} else {
				// changed?
				if (!_.isEqual(oldLayer.content, newLayer.content)) {
					// changed!
					commands.push({
						commandName: 'changed',
						content: newLayer.content as CommandContent,
						context: `changed: ${newLayer.id}`
					})
				}
			}
		})
		// removed
		_.each(oldhttpSendState.LLayers, (oldLayer: TimelineResolvedObject, layerKey) => {
			let newLayer = newhttpSendState.LLayers[layerKey]
			if (!newLayer) {
				// removed!
				commands.push({
					commandName: 'removed',
					content: oldLayer.content as CommandContent,
					context: `removed: ${oldLayer.id}`
				})
			}
		})
		return commands
	}
	private _defaultCommandReceiver (time: number, cmd: CommandContent, context: CommandContext): Promise<any> {
		time = time
		// this.emit('info', 'HTTP: Send ', cmd)

		let cwc: CommandWithContext = {
			context: context,
			command: cmd
		}
		this.emit('debug', cwc)

		return new Promise((resolve, reject) => {
			let handleResponse = (error, response) => {
				if (error) {
					this.emit('error', `HTTPSend: Error ${cmd.type}: ${error}`)
					reject(error)
				} else if (response.statusCode === 200) {
					// console.log('200 Response from ' + cmd.url, body)
					this.emit('debug', `HTTPSend: ${cmd.type}: Good statuscode response on url "${cmd.url}": ${response.statusCode}`)
					resolve()
				} else {
					this.emit('warning', `HTTPSend: ${cmd.type}: Bad statuscode response on url "${cmd.url}": ${response.statusCode}`)
					// console.log(response.statusCode + ' Response from ' + cmd.url, body)
					resolve()
				}
			}
			if (cmd.type === RequestType.POST) {
				request.post(
					cmd.url,
					{ json: cmd.params },
					handleResponse
				)
			} else if (cmd.type === RequestType.PUT) {
				request.put(
					cmd.url,
					{ json: cmd.params },
					handleResponse
				)
			} else if (cmd.type === RequestType.GET) {
				request.get(
					cmd.url,
					{ json: cmd.params },
					handleResponse
				)
			} else if (cmd.type === RequestType.DELETE) {
				request.delete(
					cmd.url,
					{ json: cmd.params },
					handleResponse
				)
			} else {
				reject(`Unknown HTTP-send type: "${cmd.type}"`)
			}
		})
	}
}
