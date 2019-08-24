import * as _ from 'underscore'
import {
	DeviceWithState,
	CommandWithContext,
	DeviceStatus,
	StatusCode
} from './device'
import { DeviceType, DeviceOptions } from '../types/src'

import { TimelineState, ResolvedTimelineObjectInstance } from 'superfly-timeline'
import { DoOnTime, SendMode } from '../doOnTime'

export interface AbstractDeviceOptions extends DeviceOptions {
	options?: {
		commandReceiver?: (time: number, cmd) => Promise<any>
	}
}
export interface Command {
	commandName: string
	timelineObjId: string
	content: CommandContent
	context: CommandContext
}
type CommandContent = any
type CommandContext = string

/*
	This is a wrapper for an "Abstract" device

	An abstract device is just a test-device that doesn't really do anything, but can be used
	as a preliminary mock
*/
export class AbstractDevice extends DeviceWithState<TimelineState> {
	private _doOnTime: DoOnTime

	private _commandReceiver: (time: number, cmd: Command, context: CommandContext, timelineObjId: string) => Promise<any>

	constructor (deviceId: string, deviceOptions: AbstractDeviceOptions, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		}, SendMode.BURST, this._deviceOptions)
		this.handleDoOnTime(this._doOnTime, 'Abstract')
	}

	/**
	 * Initiates the connection with CasparCG through the ccg-connection lib.
	 */
	init (): Promise<boolean> {
		return new Promise((resolve/*, reject*/) => {
			// This is where we would do initialization, like connecting to the devices, etc
			resolve(true)
		})
	}
	/**
	 * Handle a new state, at the point in time specified
	 * @param newState
	 */
	handleState (newState: TimelineState) {
		let previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		let oldState: TimelineState = (this.getStateBefore(previousStateTime) || { state: { time: 0, layers: {}, nextEvents: [] } }).state

		let oldAbstractState = this.convertStateToAbstract(oldState)
		let newAbstractState = this.convertStateToAbstract(newState)

		let commandsToAchieveState: Array<Command> = this._diffStates(oldAbstractState, newAbstractState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newState, newState.time)
	}
	/**
	 * Clear any scheduled commands after this time
	 * @param clearAfterTime
	 */
	clearFuture (clearAfterTime: number) {
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	/**
	 * Dispose of the device so it can be garbage collected.
	 */
	terminate () {
		this._doOnTime.dispose()
		return Promise.resolve(true)
	}
	get canConnect (): boolean {
		return false
	}
	get connected (): boolean {
		return false
	}
	/**
	 * converts the timeline state into something we can use
	 * @param state
	 */
	convertStateToAbstract (state: TimelineState) {
		return state
	}
	get deviceType () {
		return DeviceType.ABSTRACT
	}
	get deviceName (): string {
		return 'Abstract ' + this.deviceId
	}
	get queue () {
		return this._doOnTime.getQueue()
	}
	getStatus (): DeviceStatus {
		return {
			statusCode: StatusCode.GOOD
		}
	}
	private _addToQueue (commandsToAchieveState: Array<Command>, time: number) {
		_.each(commandsToAchieveState, (cmd: Command) => {

			// add the new commands to the queue:
			this._doOnTime.queue(time, undefined, (cmd: Command) => {
				return this._commandReceiver(time, cmd, cmd.context, cmd.timelineObjId)
			}, cmd)
		})
	}
	/**
	 * Generates commands based such that we will transition from the old state
	 * to the new state.
	 * @param oldAbstractState
	 * @param newAbstractState
	 */
	private _diffStates (oldAbstractState: TimelineState, newAbstractState: TimelineState) {
		// in this abstract class, let's just cheat:

		let commands: Array<Command> = []

		_.each(newAbstractState.layers, (newLayer: ResolvedTimelineObjectInstance, layerKey) => {
			let oldLayer = oldAbstractState.layers[layerKey]
			if (!oldLayer) {
				// added!
				commands.push({
					commandName: 'addedAbstract',
					content: newLayer.content,
					timelineObjId: newLayer.id,
					context: `added: ${newLayer.id}`
				})
			} else {
				// changed?
				if (oldLayer.id !== newLayer.id) {
					// changed!
					commands.push({
						commandName: 'changedAbstract',
						content: newLayer.content,
						timelineObjId: newLayer.id,
						context: `changed: ${newLayer.id}`
					})
				}
			}
		})
		// removed
		_.each(oldAbstractState.layers, (oldLayer: ResolvedTimelineObjectInstance, layerKey) => {
			let newLayer = newAbstractState.layers[layerKey]
			if (!newLayer) {
				// removed!
				commands.push({
					commandName: 'removedAbstract',
					content: oldLayer.content,
					timelineObjId: oldLayer.id,
					context: `removed: ${oldLayer.id}`
				})
			}
		})
		return commands
	}
	private _defaultCommandReceiver (time: number, cmd: Command, context: CommandContext, timelineObjId: string): Promise<any> {
		time = time

		// emit the command to debug:
		let cwc: CommandWithContext = {
			timelineObjId: timelineObjId,
			context: context,
			command: {
				commandName: cmd.commandName,
				content: cmd.content
			}
		}
		this.emit('debug', cwc)

		// Note: In the Abstract case, the execution does nothing

		return Promise.resolve()
	}
}
