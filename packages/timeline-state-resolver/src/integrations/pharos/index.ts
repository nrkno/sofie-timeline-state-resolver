import * as _ from 'underscore'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode } from './../../devices/device'
import {
	DeviceType,
	PharosOptions,
	TimelineContentTypePharos,
	TimelineContentPharosScene,
	TimelineContentPharosTimeline,
	DeviceOptionsPharos,
	Mappings,
	TimelineContentPharosAny,
	TSRTimelineContent,
	Timeline,
} from 'timeline-state-resolver-types'

import { DoOnTime, SendMode } from '../../devices/doOnTime'
import { Pharos, ProjectInfo } from './connection'

export interface DeviceOptionsPharosInternal extends DeviceOptionsPharos {
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
type PharosState = Timeline.TimelineState<TSRTimelineContent>

interface CommandContent {
	fcn: (...args: any[]) => Promise<any>
	args: any[]
}
type CommandContext = string
/**
 * This is a wrapper for a Pharos-devices,
 * https://www.pharoscontrols.com/downloads/documentation/application-notes/
 */
export class PharosDevice extends DeviceWithState<PharosState, DeviceOptionsPharosInternal> {
	private _doOnTime: DoOnTime

	private _pharos: Pharos
	private _pharosProjectInfo?: ProjectInfo

	private _commandReceiver: CommandReceiver

	constructor(deviceId: string, deviceOptions: DeviceOptionsPharosInternal, getCurrentTime: () => Promise<number>) {
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
		this.handleDoOnTime(this._doOnTime, 'Pharos')

		this._pharos = new Pharos()

		this._pharos.on('error', (e) => this.emit('error', 'Pharos', e))
		this._pharos.on('connected', () => {
			this._connectionChanged()
		})
		this._pharos.on('disconnected', () => {
			this._connectionChanged()
		})
	}

	/**
	 * Initiates the connection with Pharos through the PharosAPI.
	 */
	async init(initOptions: PharosOptions): Promise<boolean> {
		return new Promise((resolve, reject) => {
			// This is where we would do initialization, like connecting to the devices, etc
			this._pharos
				.connect(initOptions)
				.then(async () => {
					return this._pharos.getProjectInfo()
				})
				.then((systemInfo) => {
					this._pharosProjectInfo = systemInfo
				})
				.then(() => resolve(true))
				.catch((e) => reject(e))
		})
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
	handleState(newState: Timeline.TimelineState<TSRTimelineContent>, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		// Handle this new state, at the point in time specified

		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		const oldPharosState: PharosState = (
			this.getStateBefore(previousStateTime) || { state: { time: 0, layers: {}, nextEvents: [] } }
		).state

		const newPharosState = this.convertStateToPharos(newState)

		const commandsToAchieveState: Array<Command> = this._diffStates(oldPharosState, newPharosState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newPharosState, newState.time)
	}
	clearFuture(clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	async terminate() {
		this._doOnTime.dispose()
		return this._pharos.dispose().then(() => {
			return true
		})
	}
	get canConnect(): boolean {
		return true
	}
	get connected(): boolean {
		return this._pharos.connected
	}
	convertStateToPharos(state: Timeline.TimelineState<TSRTimelineContent>): PharosState {
		return state
	}
	get deviceType() {
		return DeviceType.PHAROS
	}
	get deviceName(): string {
		return 'Pharos ' + this.deviceId + (this._pharosProjectInfo ? ', ' + this._pharosProjectInfo.name : '')
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
		const messages: Array<string> = []

		if (!this._pharos.connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		}

		return {
			statusCode: statusCode,
			messages: messages,
			active: this.isActive,
		}
	}
	/**
	 * Add commands to queue, to be executed at the right time
	 */
	private _addToQueue(commandsToAchieveState: Array<Command>, time: number) {
		_.each(commandsToAchieveState, (cmd: Command) => {
			// add the new commands to the queue:
			this._doOnTime.queue(
				time,
				undefined,
				async (cmd: Command) => {
					return this._commandReceiver(time, cmd, cmd.context, cmd.timelineObjId)
				},
				cmd
			)
		})
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 */
	private _diffStates(oldPharosState: PharosState, newPharosState: PharosState) {
		const commands: Array<Command> = []
		const stoppedLayers: { [layerKey: string]: true } = {}

		const stopLayer = (
			oldLayer: Timeline.ResolvedTimelineObjectInstance<TimelineContentPharosAny>,
			reason?: string
		) => {
			if (stoppedLayers[oldLayer.id]) return // don't send several remove commands for the same object

			if (oldLayer.content.noRelease) return // override: don't stop / release

			stoppedLayers[oldLayer.id] = true

			if (oldLayer.content.type === TimelineContentTypePharos.SCENE) {
				if (!reason) reason = 'removed scene'
				commands.push({
					content: {
						args: [oldLayer.content.scene, oldLayer.content.fade],
						fcn: async (scene, fade) => this._pharos.releaseScene(scene, fade),
					},
					context: `${reason}: ${oldLayer.id} ${oldLayer.content.scene}`,
					timelineObjId: oldLayer.id,
				})
			} else if (oldLayer.content.type === TimelineContentTypePharos.TIMELINE) {
				if (!reason) reason = 'removed timeline'
				commands.push({
					content: {
						args: [oldLayer.content.timeline, oldLayer.content.fade],
						fcn: async (timeline, fade) => this._pharos.releaseTimeline(timeline, fade),
					},
					context: `${reason}: ${oldLayer.id} ${oldLayer.content.timeline}`,
					timelineObjId: oldLayer.id,
				})
			}
		}
		const modifyTimelinePlay = (
			newLayer: Timeline.ResolvedTimelineObjectInstance<TimelineContentPharosAny>,
			oldLayer?: Timeline.ResolvedTimelineObjectInstance<TimelineContentPharosAny>
		) => {
			if (newLayer.content.type === TimelineContentTypePharos.TIMELINE) {
				if (
					(newLayer.content.pause || false) !==
						(oldLayer?.content as TimelineContentPharosTimeline | undefined)?.pause ||
					false
				) {
					if (newLayer.content.pause) {
						commands.push({
							content: {
								args: [newLayer.content.timeline],
								fcn: async (timeline) => this._pharos.pauseTimeline(timeline),
							},
							context: `pause timeline: ${newLayer.id} ${newLayer.content.timeline}`,
							timelineObjId: newLayer.id,
						})
					} else {
						commands.push({
							content: {
								args: [newLayer.content.timeline],
								fcn: async (timeline) => this._pharos.resumeTimeline(timeline),
							},
							context: `resume timeline: ${newLayer.id} ${newLayer.content.timeline}`,
							timelineObjId: newLayer.id,
						})
					}
				}
				if (
					(newLayer.content.rate || null) !==
					((oldLayer?.content as TimelineContentPharosTimeline | undefined)?.rate || null)
				) {
					commands.push({
						content: {
							args: [newLayer.content.timeline, newLayer.content.rate],
							fcn: async (timeline, rate) => this._pharos.setTimelineRate(timeline, rate),
						},
						context: `pause timeline: ${newLayer.id} ${newLayer.content.timeline}: ${newLayer.content.rate}`,
						timelineObjId: newLayer.id,
					})
				}
				// @todo: support pause / setTimelinePosition
			}
		}
		const startLayer = (
			newLayer: Timeline.ResolvedTimelineObjectInstance<TimelineContentPharosAny>,
			reason?: string
		) => {
			if (!newLayer.content.stopped) {
				if (newLayer.content.type === TimelineContentTypePharos.SCENE) {
					if (!reason) reason = 'added scene'
					commands.push({
						content: {
							args: [newLayer.content.scene],
							fcn: async (scene) => this._pharos.startScene(scene),
						},
						context: `${reason}: ${newLayer.id} ${newLayer.content.scene}`,
						timelineObjId: newLayer.id,
					})
				} else if (newLayer.content.type === TimelineContentTypePharos.TIMELINE) {
					if (!reason) reason = 'added timeline'
					commands.push({
						content: {
							args: [newLayer.content.timeline],
							fcn: async (timeline) => this._pharos.startTimeline(timeline),
						},
						context: `${reason}: ${newLayer.id} ${newLayer.content.timeline}`,
						timelineObjId: newLayer.id,
					})
					modifyTimelinePlay(newLayer)
				}
			} else {
				// Item is set to "stopped"
				stopLayer(newLayer)
			}
		}

		const isPharosObject = (
			obj: Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent> | undefined
		): obj is Timeline.ResolvedTimelineObjectInstance<TimelineContentPharosAny> => {
			return !!obj && obj.content.deviceType === DeviceType.PHAROS
		}

		// Added / Changed things:
		_.each(newPharosState.layers, (newLayer, layerKey) => {
			const oldPharosObj0 = oldPharosState.layers[layerKey]
			const oldPharosObj: Timeline.ResolvedTimelineObjectInstance<TimelineContentPharosAny> | undefined =
				isPharosObject(oldPharosObj0) ? oldPharosObj0 : undefined

			const pharosObj: Timeline.ResolvedTimelineObjectInstance<TimelineContentPharosAny> | undefined = isPharosObject(
				newLayer
			)
				? newLayer
				: undefined

			if (!pharosObj) {
				if (oldPharosObj) {
					stopLayer(oldPharosObj)
				}
			} else if (!oldPharosObj || !isPharosObject(oldPharosObj)) {
				// item is new
				startLayer(pharosObj)
			} else {
				// item is not new, but maybe it has changed:
				if (
					pharosObj.content.type !== oldPharosObj.content.type || // item has changed type!
					(pharosObj.content.stopped || false) !== (oldPharosObj.content.stopped || false) // item has stopped / unstopped
				) {
					if (!oldPharosObj.content.stopped) {
						// If it was stopped before, we don't have to stop it now:
						stopLayer(oldPharosObj)
					}
					startLayer(pharosObj)
				} else {
					if (pharosObj.content.type === TimelineContentTypePharos.SCENE) {
						if (pharosObj.content.scene !== (oldPharosObj.content as TimelineContentPharosScene).scene) {
							// scene has changed
							stopLayer(oldPharosObj, 'scene changed from')
							startLayer(pharosObj, 'scene changed to')
						}
					} else if (pharosObj.content.type === TimelineContentTypePharos.TIMELINE) {
						if (pharosObj.content.timeline !== (oldPharosObj.content as TimelineContentPharosTimeline).timeline) {
							// timeline has changed
							stopLayer(oldPharosObj, 'timeline changed from')
							startLayer(pharosObj, 'timeline changed to')
						} else {
							modifyTimelinePlay(pharosObj, oldPharosObj)
						}
					}
				}
			}
		})
		// Removed things
		_.each(oldPharosState.layers, (oldLayer, layerKey) => {
			const newLayer = newPharosState.layers[layerKey]
			if (!newLayer && isPharosObject(oldLayer)) {
				// removed item
				stopLayer(oldLayer)
			}
		})

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
			command: {
				// commandName: cmd.content.args,
				args: cmd.content.args,
				// content: cmd.content
			},
			timelineObjId: timelineObjId,
		}
		this.emitDebug(cwc)

		// execute the command here
		try {
			await cmd.content.fcn(...cmd.content.args)
		} catch (e) {
			this.emit('commandError', e as Error, cwc)
		}
	}
	private _connectionChanged() {
		this.emit('connectionChanged', this.getStatus())
	}
}
