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
	OSCMessageCommandContent,
	OSCOptions
} from '../types/src'
import { DoOnTime, SendMode } from '../doOnTime'

import {
	TimelineState,
	TimelineResolvedObject
} from 'superfly-timeline'
import * as osc from 'osc'

export interface OSCMessageDeviceOptions extends DeviceOptions {
	options?: {
		commandReceiver?: (time: number, cmd) => Promise<any>
	}
}
interface Command {
	commandName: 'added' | 'changed' | 'removed',
	content: OSCMessageCommandContent,
	context: CommandContext
}
type CommandContext = string
export class OSCMessageDevice extends DeviceWithState<TimelineState> {

	private _doOnTime: DoOnTime
	private _oscClient: osc.UDPPort

	private _commandReceiver: (time: number, cmd: OSCMessageCommandContent, context: CommandContext) => Promise<any>

	constructor (deviceId: string, deviceOptions: OSCMessageDeviceOptions, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		}, SendMode.BURST, this._deviceOptions)
		this._doOnTime.on('error', e => this.emit('error', e))
		this._doOnTime.on('slowCommand', msg => this.emit('slowCommand', this.deviceName + ': ' + msg))
	}
	init (options: OSCOptions): Promise<boolean> {
		this._oscClient = new osc.UDPPort({
			localAddress: '0.0.0.0',
			localPort: 0,

			remoteAddress: options.host,
			remotePort: options.port,
			metadata: true
		})
		this._oscClient.open()

		return Promise.resolve(true) // This device doesn't have any initialization procedure
	}
	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified

		// console.log('handleState')

		let oldState: TimelineState = (this.getStateBefore(newState.time) || { state: { time: 0, LLayers: {}, GLayers: {} } }).state

		let oldAbstractState = this.convertStateToOSCMessage(oldState)
		let newAbstractState = this.convertStateToOSCMessage(newState)

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
		okToDestroyStuff = okToDestroyStuff
		return Promise.resolve()
	}

	get canConnect (): boolean {
		return false
	}
	get connected (): boolean {
		return false
	}
	convertStateToOSCMessage (state: TimelineState) {
		// convert the timeline state into something we can use
		// (won't even use this.getMapping())
		return state
	}
	get deviceType () {
		return DeviceType.OSC
	}
	get deviceName (): string {
		return 'OSC ' + this.deviceId
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
	private _diffStates (oldoscSendState: TimelineState, newOscSendState: TimelineState): Array<Command> {
		// in this oscSend class, let's just cheat:

		let commands: Array<Command> = []

		_.each(newOscSendState.LLayers, (newLayer: TimelineResolvedObject, layerKey: string) => {
			let oldLayer = oldoscSendState.LLayers[layerKey]
			if (!oldLayer) {
				// added!
				commands.push({
					commandName: 'added',
					content: newLayer.content as OSCMessageCommandContent, // tslint:disable-line
					context: `added: ${newLayer.id}`
				})
			} else {
				// changed?
				if (!_.isEqual(oldLayer.content, newLayer.content)) {
					// changed!
					commands.push({
						commandName: 'changed',
						content: newLayer.content as OSCMessageCommandContent, // tslint:disable-line
						context: `changed: ${newLayer.id}`
					})
				}
			}
		})
		// removed
		_.each(oldoscSendState.LLayers, (oldLayer: TimelineResolvedObject, layerKey) => {
			let newLayer = newOscSendState.LLayers[layerKey]
			if (!newLayer) {
				// removed!
				commands.push({
					commandName: 'removed',
					content: oldLayer.content as OSCMessageCommandContent, // tslint:disable-line
					context: `removed: ${oldLayer.id}`
				})
			}
		})
		return commands
	}
	private _defaultCommandReceiver (time: number, cmd: OSCMessageCommandContent, context: CommandContext): Promise<any> {
		time = time
		// this.emit('info', 'OSC: Send ', cmd)

		let cwc: CommandWithContext = {
			context: context,
			command: cmd
		}
		this.emit('debug', cwc)

		try {
			this._oscClient.send({
				address: cmd.path,
				args: cmd.values
			})

			return Promise.resolve()
		} catch (e) {
			return Promise.reject(e)
		}
	}
}
