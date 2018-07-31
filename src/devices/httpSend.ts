import * as _ from 'underscore'
import { Device, DeviceOptions } from './device'
import { DeviceType } from './mapping'
import { DoOnTime } from '../doOnTime'
import * as request from 'request'

import { TimelineState } from 'superfly-timeline'

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
	content: any
}
enum ReqestType {
	POST = 'post',
	PUT = 'put',
	GET = 'get'
}
interface CommandContent {
	type: ReqestType
	url: string
	params: {[key: string]: number | string}
}
export class HttpSendDevice extends Device {

	private _doOnTime: DoOnTime
	// private _queue: Array<any>

	private _commandReceiver: (time: number, cmd) => Promise<any>

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

	/**
	 * Initiates the connection with CasparCG through the ccg-connection lib.
	 */
	init (): Promise<boolean> {
		return new Promise((resolve/*, reject*/) => {
			// This is where we would do initialization, like connecting to the devices, etc

			// myDevide.onConnectionChange((connected: boolean) => {
				// this.emit('connectionChanged', connected)
			// })
			resolve(true)
		})
	}
	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified

		// console.log('handleState')

		let oldState: TimelineState = this.getStateBefore(newState.time) || { time: 0, LLayers: {}, GLayers: {} }

		let oldAbstractState = this.convertStateToHttpSend(oldState)
		let newAbstractState = this.convertStateToHttpSend(newState)

		let commandsToAchieveState: Array<any> = this._diffStates(oldAbstractState, newAbstractState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueAfter(newState.time)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newState)
	}
	clearFuture (clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
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
					return this._commandReceiver(time, cmd.content)
				} else {
					return null
				}
			}, cmd)
		})
	}
	private _diffStates (oldhttpSendState, newhttpSendState): Array<Command> {
		// in this httpSend class, let's just cheat:

		let commands: Array<Command> = []

		_.each(newhttpSendState.LLayers, (newLayer: any, layerKey) => {
			let oldLayer = oldhttpSendState.LLayers[layerKey]
			if (!oldLayer) {
				// added!
				commands.push({
					commandName: 'added',
					content: newLayer.content
				})
			} else {
				// changed?
				if (!_.isEqual(oldLayer.content, newLayer.content)) {
					// changed!
					commands.push({
						commandName: 'changed',
						content: newLayer.content
					})
				}
			}
		})
		// removed
		_.each(oldhttpSendState.LLayers, (oldLayer: any, layerKey) => {
			let newLayer = newhttpSendState.LLayers[layerKey]
			if (!newLayer) {
				// removed!
				commands.push({
					commandName: 'removed',
					content: oldLayer.content
				})
			}
		})
		return commands
	}
	private _defaultCommandReceiver (time: number, cmd: CommandContent): Promise<any> {
		time = time
		this.emit('info', 'HTTP: Send ', cmd)
		if (cmd.type === ReqestType.POST) {

			return new Promise((resolve, reject) => {
				request.post(
					cmd.url, // 'http://www.yoursite.com/formpage',
					{ json: cmd.params },
					(error, response) => {
						if (error) {
							this.emit('error', 'Error in httpSend POST: ' + error)
							reject(error)
						} else if (response.statusCode === 200) {
							// console.log('200 Response from ' + cmd.url, body)
							resolve()
						} else {
							// console.log(response.statusCode + ' Response from ' + cmd.url, body)
							resolve()
						}
					}
				)
			})
		} else if (cmd.type === ReqestType.PUT) {

			return new Promise((resolve, reject) => {
				request.put(
					cmd.url, // 'http://www.yoursite.com/formpage',
					{ json: cmd.params },
					(error, response) => {
						if (error) {
							this.emit('error', 'Error in httpSend PUT: ' + error)
							reject(error)
						} else if (response.statusCode === 200) {
							// console.log('200 Response from ' + cmd.url, body)
							resolve()
						} else {
							// console.log(response.statusCode + ' Response from ' + cmd.url, body)
							resolve()
						}
					}
				)
			})
		} else if (cmd.type === ReqestType.GET) {

			// console.log('Sending POST request to ',
			// 	cmd.url,
			// 	cmd.params
			// )
			return new Promise((resolve, reject) => {
				request.get(
					cmd.url, // 'http://www.yoursite.com/formpage',
					{ json: cmd.params },
					(error, response) => {
						if (error) {
							this.emit('error', 'Error in httpSend GET: ' + error)
							reject(error)
						} else if (response.statusCode === 200) {
							// console.log('200 Response from ' + cmd.url, body)
							resolve()
						} else {
							// console.log(response.statusCode + ' Response from ' + cmd.url, body)
							resolve()
						}
					}
				)
			})
		} else {
			return Promise.reject('Unknown HTTP-send type: "' + cmd.type + '"')
		}
	}
}
