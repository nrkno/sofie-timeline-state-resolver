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
	SingularLiveCommandContent,
	SingularLiveOptions,
	TimelineContentTypeSingularLive,
	SingularLiveUpdateShowDataCommandContent,
	SingularLiveControlAnimationCommandContent
} from '../types/src'
import { DoOnTime, SendMode } from '../doOnTime'
import * as request from 'request'

import {
	TimelineState, ResolvedTimelineObjectInstance
} from 'superfly-timeline'
export interface SingularLiveDeviceOptions extends DeviceOptions {
	options?: {
		commandReceiver?: CommandReceiver
	}
}
export type CommandReceiver = (time: number, cmd: SingularLiveCommandContent, context: CommandContext, timelineObjId: string) => Promise<any>
interface Command {
	commandName: 'added' | 'changed' | 'removed'
	content: SingularLiveCommandContent
	context: CommandContext
	timelineObjId: string
	layer: string
}
export type CommandContext = string

const SINGULAR_LIVE_API = 'https://app.singular.live/apiv1/control/'

/**
 * This is a Singular.Live device, it talks to a Singular.Live App Instance using an Access Token
 */
export class SingularLiveDevice extends DeviceWithState<TimelineState> {

	private _makeReadyCommands: SingularLiveCommandContent[]
	private _accessToken: string
	private _doOnTime: DoOnTime
	private _deviceStatus: DeviceStatus = {
		statusCode: StatusCode.GOOD
	}

	private _commandReceiver: CommandReceiver

	constructor (deviceId: string, deviceOptions: SingularLiveDeviceOptions, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		}, SendMode.IN_ORDER, this._deviceOptions)
		this.handleDoOnTime(this._doOnTime, 'SingularLive')
	}
	init (options: SingularLiveOptions): Promise<boolean> {
		this._makeReadyCommands = options.makeReadyCommands || []
		this._accessToken = options.accessToken || ''

		if (!this._accessToken) throw new Error('Singular.Live bad connection option: accessToken. An accessToken is required.')

		return Promise.resolve(true) // This device doesn't have any initialization procedure
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState (newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified

		let previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		let oldState: TimelineState = (this.getStateBefore(previousStateTime) || { state: { time: 0, layers: {}, nextEvents: [] } }).state

		let oldAbstractState = this.convertStateToSingularLive(oldState)
		let newAbstractState = this.convertStateToSingularLive(newState)

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
		return this._deviceStatus
	}
	async makeReady (okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff && this._makeReadyCommands && this._makeReadyCommands.length > 0) {
			const time = this.getCurrentTime()
			_.each(this._makeReadyCommands, (cmd: SingularLiveCommandContent) => {
				// add the new commands to the queue:
				this._doOnTime.queue(time, cmd.queueId, (cmd: SingularLiveCommandContent) => {
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
	convertStateToSingularLive (state: TimelineState) {
		// convert the timeline state into something we can use
		// (won't even use this.mapping)
		return state
	}
	get deviceType () {
		return DeviceType.SINGULAR_LIVE
	}
	get deviceName (): string {
		return 'Singular.Live ' + this.deviceId
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
	private _diffStates (oldSingularLiveState: TimelineState, newSingularLiveState: TimelineState): Array<Command> {
		// in this httpSend class, let's just cheat:

		let commands: Array<Command> = []

		_.each(newSingularLiveState.layers, (newLayer: ResolvedTimelineObjectInstance, layerKey: string) => {
			let oldLayer = oldSingularLiveState.layers[layerKey]
			if (!oldLayer) {
				// added!
				commands.push({
					timelineObjId:	newLayer.id,
					commandName:	'added',
					content:		newLayer.content as SingularLiveCommandContent,
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
						content:		newLayer.content as SingularLiveCommandContent,
						context:		`changed: ${newLayer.id} (previously: ${oldLayer.id})`,
						layer:			layerKey
					})
				}
			}
		})
		// removed
		_.each(oldSingularLiveState.layers, (oldLayer: ResolvedTimelineObjectInstance, layerKey) => {
			let newLayer = newSingularLiveState.layers[layerKey]
			if (!newLayer) {
				// removed!
				commands.push({
					timelineObjId:	oldLayer.id,
					commandName:	'removed',
					content:		oldLayer.content as SingularLiveCommandContent,
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
	private _defaultCommandReceiver (_time: number, cmd: SingularLiveCommandContent, context: CommandContext, timelineObjId: string): Promise<any> {

		let cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId
		}
		this.emit('debug', cwc)

		const url = SINGULAR_LIVE_API + this._accessToken

		return new Promise((resolve, reject) => {
			let handleResponse = (error, response) => {
				if (error) {
					this.emit('error', `SingularLive.response error ${cmd.type} (${context}`, error)
					reject(error)
				} else if (response.statusCode === 200) {
					this.emit('debug', `SingularLive: ${cmd.type}: Good statuscode response on url "${url}": ${response.statusCode} (${context})`)
					resolve()
				} else {
					this.emit('warning', `SingularLive: ${cmd.type}: Bad statuscode response on url "${url}": ${response.statusCode} (${context})`)
					resolve()
				}
			}

			switch (cmd.type) {
				case TimelineContentTypeSingularLive.UPDATE_SHOW_DATA:
					const c0 = cmd as SingularLiveUpdateShowDataCommandContent
					request.put(
						url,
						{ json: {
							compositionName: cmd.compositionName,
							controlNode: c0.controlNode
						} },
						handleResponse
					)
					break;
				case TimelineContentTypeSingularLive.CONTROL_ANIMATION:
					const c1 = cmd as SingularLiveControlAnimationCommandContent
					request.put(
						url,
						{ json: {
							compositionName: cmd.compositionName,
							animation: c1.animation
						}}
					)
			}
		})
		.catch(error => {
			this.emit('commandError', error, cwc)
		})
	}
}
