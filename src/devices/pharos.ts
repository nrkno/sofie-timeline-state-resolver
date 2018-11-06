import * as _ from 'underscore'
import {
	DeviceWithState,
	DeviceOptions,
	CommandWithContext,
	DeviceStatus,
	StatusCode
} from './device'
import { DeviceType } from '../types/mapping'

import { TimelineState, TimelineResolvedObject, TimelineResolvedKeyframe } from 'superfly-timeline'
import { DoOnTime } from '../doOnTime'
import { Pharos, ProjectInfo } from './pharosAPI'

export enum TimelineContentTypePharos {
	SCENE = 'scene',
	TIMELINE = 'timeline'
}

/*
	This is a wrapper for an Pharos-devices,
	https://www.pharoscontrols.com/downloads/documentation/application-notes/
*/
export interface PharosDeviceOptions extends DeviceOptions {
	options?: {
		commandReceiver?: (time: number, cmd) => Promise<any>
	}
}
export interface PharosOptions {
	host: string
	ssl: boolean
}
export interface Command {
	content: CommandContent,
	context: CommandContext
}
type TimelinePharosObj = TimelineObjPharosScene & TimelineObjPharosTimeline
export interface PharosState extends TimelineState {
	LLayers: {
		[LLayer: string]: TimelinePharosObj
	}
}
export interface TimelineObjPharosScene extends TimelineResolvedObject {
	content: {
		keyframes?: Array<TimelineResolvedKeyframe>
		type: TimelineContentTypePharos.SCENE
		attributes: {
			scene: number,
			fade?: number,
			stopped?: boolean,
			noRelease?: true
		}
	}
}
export interface TimelineObjPharosTimeline extends TimelineResolvedObject {
	content: {
		keyframes?: Array<TimelineResolvedKeyframe>
		type: TimelineContentTypePharos.TIMELINE
		attributes: {
			timeline: number,
			pause?: boolean,
			rate?: boolean,
			fade?: number,
			stopped?: boolean,
			noRelease?: true
		}
	}
}

interface CommandContent {
	fcn: (...args: any[]) => Promise<any>,
	args: any[]
}
type CommandContext = string
export class PharosDevice extends DeviceWithState<TimelineState> {
	private _doOnTime: DoOnTime

	private _pharos: Pharos
	private _pharosProjectInfo?: ProjectInfo
	// private _queue: Array<any>

	private _commandReceiver: (time: number, cmd: Command, context: CommandContext) => Promise<any>

	constructor (deviceId: string, deviceOptions: PharosDeviceOptions, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		})
		this._doOnTime.on('error', e => this.emit('error', e))

		this._pharos = new Pharos()

		this._pharos.on('error', e => this.emit('error', e))
		this._pharos.on('connected', () => {
			this._connectionChanged()
		})
		this._pharos.on('disconnected', () => {
			this._connectionChanged()
		})
	}

	/**
	 * Initiates the connection with CasparCG through the ccg-connection lib.
	 */
	init (connectionOptions: PharosOptions): Promise<boolean> {
		return new Promise((resolve, reject) => {
			// This is where we would do initialization, like connecting to the devices, etc
			this._pharos.connect(connectionOptions)
			.then(() => {
				return this._pharos.getProjectInfo()
			})
			.then((systemInfo) => {
				this._pharosProjectInfo = systemInfo
			})
			.then(() => resolve(true))
			.catch(e => reject(e))
		})
	}
	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified

		let oldState: TimelineState = (this.getStateBefore(newState.time) || { state: { time: 0, LLayers: {}, GLayers: {} } }).state

		let oldPharosState = this.convertStateToPharos(oldState)
		let newPharosState = this.convertStateToPharos(newState)

		let commandsToAchieveState: Array<Command> = this._diffStates(oldPharosState, newPharosState)

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
		return this._pharos.dispose()
		.then(() => {
			return true
		})
	}
	get canConnect (): boolean {
		return true
	}
	get connected (): boolean {
		return this._pharos.connected
	}
	convertStateToPharos (state: TimelineState): PharosState {
		return state as PharosState
	}
	get deviceType () {
		return DeviceType.PHAROS
	}
	get deviceName (): string {
		return 'Pharos ' + this.deviceId + (this._pharosProjectInfo ? ', ' + this._pharosProjectInfo.name : '')
	}
	get queue () {
		return this._doOnTime.getQueue()
	}
	makeReady (okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			this._doOnTime.clearQueueNowAndAfter(this.getCurrentTime())
		}
		return Promise.resolve()
	}
	getStatus (): DeviceStatus {
		return {
			statusCode: this._pharos.connected ? StatusCode.GOOD : StatusCode.BAD
		}
	}
	private _addToQueue (commandsToAchieveState: Array<Command>, time: number) {
		_.each(commandsToAchieveState, (cmd: Command) => {

			// add the new commands to the queue:
			this._doOnTime.queue(time, (cmd: Command) => {
				return this._commandReceiver(time, cmd, cmd.context)
			}, cmd)
		})
	}
	private _diffStates (oldPharosState: PharosState, newPharosState: PharosState) {
		// in this Pharos class, let's just cheat:

		let commands: Array<Command> = []
		let stoppedLayers: {[layerKey: string]: true} = {}

		let stopLayer = (oldLayer: TimelinePharosObj, reason?: string) => {
			let oldAttrs = oldLayer.content.attributes

			if (stoppedLayers[oldLayer.id]) return // don't send several remove commands for the same object

			if (oldAttrs.noRelease) return // override: don't stop / release

			stoppedLayers[oldLayer.id] = true

			if (oldLayer.content.type === TimelineContentTypePharos.SCENE) {
				if (!reason) reason = 'removed scene'
				commands.push({
					content: {
						args: [oldAttrs.scene, oldAttrs.fade],
						fcn: (scene, fade) => this._pharos.releaseScene(scene, fade)
					},
					context: `${reason}: ${oldLayer.id} ${oldAttrs.scene}`
				})
			} else if (oldLayer.content.type === TimelineContentTypePharos.TIMELINE) {
				if (!reason) reason = 'removed timeline'
				commands.push({
					content: {
						args: [oldAttrs.timeline, oldAttrs.fade],
						fcn: (timeline, fade) => this._pharos.releaseTimeline(timeline, fade)
					},
					context: `${reason}: ${oldLayer.id} ${oldAttrs.timeline}`
				})
			}
		}
		let modifyTimelinePlay = (newLayer: TimelinePharosObj, oldLayer?: TimelinePharosObj) => {
			let newAttrs = newLayer.content.attributes
			let oldAttrs = oldLayer ? oldLayer.content.attributes : { pause: undefined, rate: undefined }

			if (newLayer.content.type === TimelineContentTypePharos.TIMELINE) {
				if ((newAttrs.pause || false) !== (oldAttrs.pause || false)) {
					if (newAttrs.pause) {
						commands.push({
							content: {
								args: [newAttrs.timeline],
								fcn: (timeline) => this._pharos.pauseTimeline(timeline)
							},
							context: `pause timeline: ${newLayer.id} ${newAttrs.timeline}`
						})
					} else {
						commands.push({
							content: {
								args: [newAttrs.timeline],
								fcn: (timeline) => this._pharos.resumeTimeline(timeline)
							},
							context: `resume timeline: ${newLayer.id} ${newAttrs.timeline}`
						})
					}
				}
				if ((newAttrs.rate || null) !== (oldAttrs.rate || null)) {
					commands.push({
						content: {
							args: [newAttrs.timeline, newAttrs.rate],
							fcn: (timeline, rate) => this._pharos.setTimelineRate(timeline, rate)
						},
						context: `pause timeline: ${newLayer.id} ${newAttrs.timeline}: ${newAttrs.rate}`
					})
				}
				// @todo: support pause / setTimelinePosition
			}
		}
		let startLayer = (newLayer: TimelinePharosObj, reason?: string) => {
			let newAttrs = newLayer.content.attributes

			if (!newAttrs.stopped) {
				if (newLayer.content.type === TimelineContentTypePharos.SCENE) {
					if (!reason) reason = 'added scene'
					commands.push({
						content: {
							args: [newAttrs.scene],
							fcn: (scene) => this._pharos.startScene(scene)
						},
						context: `${reason}: ${newLayer.id} ${newAttrs.scene}`
					})
				} else if (newLayer.content.type === TimelineContentTypePharos.TIMELINE) {
					if (!reason) reason = 'added timeline'
					commands.push({
						content: {
							args: [newAttrs.timeline],
							fcn: (timeline) => this._pharos.startTimeline(timeline)
						},
						context: `${reason}: ${newLayer.id} ${newAttrs.timeline}`
					})
					modifyTimelinePlay(newLayer)
				}
			} else {
				// Item is set to "stopped"
				stopLayer(newLayer)
			}
		}

		// Added / Changed things:
		_.each(newPharosState.LLayers, (newLayer: TimelinePharosObj, layerKey) => {
			let oldLayer = oldPharosState.LLayers[layerKey]

			if (!oldLayer) {
				// item is new
				startLayer(newLayer)
			} else {
				// item is not new, but maybe it has changed:
				if (
					newLayer.content.type !== oldLayer.content.type || // item has changed type!
					(newLayer.content.attributes.stopped || false) !== (oldLayer.content.attributes.stopped || false) // item has stopped / unstopped
				) {
					if (!oldLayer.content.attributes.stopped) {
						// If it was stopped before, we don't have to stop it now:
						stopLayer(oldLayer)
					}
					startLayer(newLayer)
				} else {
					if (newLayer.content.type === TimelineContentTypePharos.SCENE) {
						if (
							newLayer.content.attributes.scene !== oldLayer.content.attributes.scene
						) {
							// scene has changed
							stopLayer(oldLayer, 'scene changed from')
							startLayer(newLayer, 'scene changed to')
						}
					} else if (newLayer.content.type === TimelineContentTypePharos.TIMELINE) {
						if (
							newLayer.content.attributes.timeline !== oldLayer.content.attributes.timeline
						) {
							// timeline has changed
							stopLayer(oldLayer, 'timeline changed from')
							startLayer(newLayer, 'timeline changed to')
						} else {
							modifyTimelinePlay(newLayer, oldLayer)
						}
					}
				}
			}

		})
		// Removed things
		_.each(oldPharosState.LLayers, (oldLayer: TimelinePharosObj, layerKey) => {
			let newLayer = newPharosState.LLayers[layerKey]
			if (!newLayer) {
				// removed item
				stopLayer(oldLayer)
			}
		})

		return commands
	}
	private _defaultCommandReceiver (time: number, cmd: Command, context: CommandContext): Promise<any> {
		time = time

		// emit the command to debug:
		let cwc: CommandWithContext = {
			context: context,
			command: {
				// commandName: cmd.content.args,
				args: cmd.content.args
				// content: cmd.content
			}
		}
		this.emit('debug', cwc)

		// execute the command here
		return cmd.content.fcn(...cmd.content.args)
	}
	private _connectionChanged () {
		this.emit('connectionChanged', this.getStatus())
	}
}
