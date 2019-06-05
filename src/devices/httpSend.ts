import * as _ from 'underscore'
import {
	DeviceWithState,
	CommandWithContext,
	DeviceStatus,
	StatusCode
} from './device'
import {
	DeviceType,
	DeviceOptions,
	HttpSendOptions,
	HttpSendCommandContent
} from '../types/src'
import { DoOnTime, SendMode } from '../doOnTime'
import * as request from 'request'

import {
	TimelineState, ResolvedTimelineObjectInstance
} from 'superfly-timeline'
export interface HttpSendDeviceOptions extends DeviceOptions {
	options?: {
		commandReceiver?: CommandReceiver
	}
}
export type CommandReceiver = (time: number, cmd: HttpSendCommandContent, context: CommandContext, timelineObjId: string) => Promise<any>
interface Command {
	commandName: 'added' | 'changed' | 'removed'
	content: HttpSendCommandContent
	context: CommandContext
	timelineObjId: string
	layer: string
}
type CommandContext = string

/**
 * This is a HTTPSendDevice, it sends http commands when it feels like it
 */
export class HttpSendDevice extends DeviceWithState<TimelineState> {

	private _makeReadyCommands: HttpSendCommandContent[]
	private _doOnTime: DoOnTime

	private _commandReceiver: CommandReceiver

	constructor (deviceId: string, deviceOptions: HttpSendDeviceOptions, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		}, SendMode.IN_ORDER, this._deviceOptions)
		this._doOnTime.on('error', e => this.emit('error', 'HTTPSend.doOnTime', e))
		this._doOnTime.on('slowCommand', msg => this.emit('slowCommand', this.deviceName + ': ' + msg))
	}
	init (options: HttpSendOptions): Promise<boolean> {
		this._makeReadyCommands = options.makeReadyCommands || []

		return Promise.resolve(true) // This device doesn't have any initialization procedure
	}
	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified

		let previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		let oldState: TimelineState = (this.getStateBefore(previousStateTime) || { state: { time: 0, layers: {}, nextEvents: [] } }).state

		let oldAbstractState = this.convertStateToHttpSend(oldState)
		let newAbstractState = this.convertStateToHttpSend(newState)

		let commandsToAchieveState: Array<any> = this._diffStates(oldAbstractState, newAbstractState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
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
	async makeReady (okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff && this._makeReadyCommands && this._makeReadyCommands.length > 0) {
			const time = this.getCurrentTime()
			_.each(this._makeReadyCommands, (cmd: HttpSendCommandContent) => {
				// add the new commands to the queue:
				this._doOnTime.queue(time, cmd.queueId, (cmd: HttpSendCommandContent) => {
					return this._commandReceiver(time, cmd, 'makeReady', '')
				}, cmd)
			})
		}
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
			this._doOnTime.queue(time, cmd.content.queueId, (cmd: Command) => {
				if (
					cmd.commandName === 'added' ||
					cmd.commandName === 'changed'
				) {
					return this._commandReceiver(time, cmd.content, cmd.context, cmd.timelineObjId)
				} else {
					return null
				}
			}, cmd)
		})
	}
	private _diffStates (oldhttpSendState: TimelineState, newhttpSendState: TimelineState): Array<Command> {
		// in this httpSend class, let's just cheat:

		let commands: Array<Command> = []

		_.each(newhttpSendState.layers, (newLayer: ResolvedTimelineObjectInstance, layerKey: string) => {
			let oldLayer = oldhttpSendState.layers[layerKey]
			if (!oldLayer) {
				// added!
				commands.push({
					timelineObjId:	newLayer.id,
					commandName:	'added',
					content:		newLayer.content as HttpSendCommandContent,
					context:		`added: ${newLayer.id}`,
					layer:			layerKey
				})
			} else {
				// changed?
				if (!_.isEqual(oldLayer.content, newLayer.content)) {
					// changed!
					commands.push({
						timelineObjId:	newLayer.id,
						commandName:	'changed',
						content:		newLayer.content as HttpSendCommandContent,
						context:		`changed: ${newLayer.id} (previously: ${oldLayer.id})`,
						layer:			layerKey
					})
				}
			}
		})
		// removed
		_.each(oldhttpSendState.layers, (oldLayer: ResolvedTimelineObjectInstance, layerKey) => {
			let newLayer = newhttpSendState.layers[layerKey]
			if (!newLayer) {
				// removed!
				commands.push({
					timelineObjId:	oldLayer.id,
					commandName:	'removed',
					content:		oldLayer.content as HttpSendCommandContent,
					context:		`removed: ${oldLayer.id}`,
					layer:			 layerKey
				})
			}
		})
		return commands
		.sort((a, b) => a.layer.localeCompare(b.layer))
		.sort((a, b) => {
			return (a.content.temporalPriority || 0) - (b.content.temporalPriority || 0)
		})
	}
	private _defaultCommandReceiver (time: number, cmd: HttpSendCommandContent, context: CommandContext, timelineObjId: string): Promise<any> {
		time = time

		let cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId
		}
		this.emit('debug', cwc)

		return new Promise((resolve, reject) => {
			let handleResponse = (error, response) => {
				if (error) {
					this.emit('error', `HTTPSend.response error ${cmd.type} (${context}`, error)
					reject(error)
				} else if (response.statusCode === 200) {
					this.emit('debug', `HTTPSend: ${cmd.type}: Good statuscode response on url "${cmd.url}": ${response.statusCode} (${context})`)
					resolve()
				} else {
					this.emit('warning', `HTTPSend: ${cmd.type}: Bad statuscode response on url "${cmd.url}": ${response.statusCode} (${context})`)
					resolve()
				}
			}

			// send the http request:
			let requestMethod = request[cmd.type]
			if (requestMethod) {
				requestMethod(
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
