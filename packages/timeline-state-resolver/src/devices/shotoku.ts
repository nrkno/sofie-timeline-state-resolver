import * as _ from 'underscore'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode } from './device'
import {
	DeviceType,
	ShotokuCommandContent,
	ShotokuOptions,
	DeviceOptionsShotoku,
	ShotokuTransitionType,
	Mappings,
	TimelineObjShotoku,
	TimelineContentTypeShotoku,
	TimelineObjShotokuSequence,
} from 'timeline-state-resolver-types'
import { DoOnTime, SendMode } from '../doOnTime'

import { TimelineState } from 'superfly-timeline'
import { ShotokuAPI, ShotokuCommand, ShotokuCommandType } from './shotokuAPI'
import { startTrace, endTrace } from '../lib'

export interface DeviceOptionsShotokuInternal extends DeviceOptionsShotoku {
	commandReceiver?: CommandReceiver
}
export type CommandReceiver = (
	time: number,
	cmd: ShotokuCommand,
	context: CommandContext,
	timelineObjId: string
) => Promise<any>
interface Command {
	command: ShotokuCommand
	context: CommandContext
	timelineObjId: string
}
type CommandContext = string
type ShotokuDeviceState = {
	shots: Record<string, ShotokuCommandContent & { fromTlObject: string }>
	sequences: Record<
		string,
		{
			fromTlObject: string
			shots: TimelineObjShotokuSequence['content']['shots']
		}
	>
}
interface ShotokuDeviceStateContent extends ShotokuCommandContent {
	fromTlObject: string
}
/**
 * This is a generic wrapper for any osc-enabled device.
 */
export class ShotokuDevice extends DeviceWithState<ShotokuDeviceState, DeviceOptionsShotokuInternal> {
	private _doOnTime: DoOnTime
	private _shotoku: ShotokuAPI

	private _commandReceiver: CommandReceiver

	constructor(deviceId: string, deviceOptions: DeviceOptionsShotokuInternal, getCurrentTime: () => Promise<number>) {
		super(deviceId, deviceOptions, getCurrentTime)
		if (deviceOptions.options) {
			if (deviceOptions.commandReceiver) this._commandReceiver = deviceOptions.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}
		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.BURST,
			this._deviceOptions
		)
		this._shotoku = new ShotokuAPI()
		this._shotoku.on('error', (info, e) => this.emit(e, info))
		this.handleDoOnTime(this._doOnTime, 'OSC')
	}
	async init(initOptions: ShotokuOptions): Promise<boolean> {
		try {
			await this._shotoku.connect(initOptions.host, initOptions.port)
		} catch (e) {
			return false
		}

		return true
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
		// Transform timeline states into device states
		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		const oldState: ShotokuDeviceState = (
			this.getStateBefore(previousStateTime) || { state: { shots: {}, sequences: {} } }
		).state

		const convertTrace = startTrace(`device:${this.deviceId}:convertState`)
		const newShotokuState = this.convertStateToShotokuShots(newState)
		this.emit('timeTrace', endTrace(convertTrace))

		// Generate commands necessary to transition to the new state
		const diffTrace = startTrace(`device:${this.deviceId}:diffState`)
		const commandsToAchieveState = this._diffStates(oldState, newShotokuState)
		this.emit('timeTrace', endTrace(diffTrace))

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newShotokuState, newState.time)
	}
	/**
	 * Clear any scheduled commands after this time
	 * @param clearAfterTime
	 */
	clearFuture(clearAfterTime: number) {
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	terminate() {
		this._doOnTime.dispose()
		return Promise.resolve(true)
	}
	getStatus(): DeviceStatus {
		return {
			statusCode: this._shotoku.connected ? StatusCode.GOOD : StatusCode.BAD,
			active: this.isActive,
		}
	}
	makeReady(_okToDestroyStuff?: boolean): Promise<void> {
		return Promise.resolve() // TODO - enforce current state?
	}

	get canConnect(): boolean {
		return true // TODO?
	}
	get connected(): boolean {
		return this._shotoku.connected
	}
	/**
	 * Transform the timeline state into a device state, which is in this case also
	 * a timeline state.
	 * @param state
	 */
	convertStateToShotokuShots(state: TimelineState) {
		const deviceState: ShotokuDeviceState = {
			shots: {},
			sequences: {},
		}

		_.each(state.layers, (layer) => {
			const content = layer.content as TimelineObjShotoku['content']

			if (content.type === TimelineContentTypeShotoku.SHOT) {
				const show = content.show || 1

				if (!content.shot) return

				deviceState.shots[show + '.' + content.shot] = {
					...content,
					fromTlObject: layer.id,
				}
			} else {
				deviceState.sequences[content.sequenceId] = {
					shots: content.shots.filter((s) => !!s.shot),
					fromTlObject: layer.id,
				}
			}
		})

		return deviceState
	}
	get deviceType() {
		return DeviceType.SHOTOKU
	}
	get deviceName(): string {
		return 'Shotoku ' + this.deviceId
	}
	get queue() {
		return this._doOnTime.getQueue()
	}
	/**
	 * Add commands to queue, to be executed at the right time
	 */
	private _addToQueue(commandsToAchieveState: Array<Command>, time: number) {
		_.each(commandsToAchieveState, (cmd: Command) => {
			this._doOnTime.queue(
				time,
				undefined,
				(cmd: Command) => {
					return this._commandReceiver(time, cmd.command, cmd.context, cmd.timelineObjId)
				},
				cmd
			)
		})
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 * @param oldState The assumed current state
	 * @param newState The desired state of the device
	 */
	private _diffStates(oldState: ShotokuDeviceState, newState: ShotokuDeviceState): Array<Command> {
		// unfortunately we don't know what shots belong to what camera, so we can't do anything smart

		const commands: Array<Command> = []

		_.each(newState.shots, (newCommandContent: ShotokuDeviceStateContent, index: string) => {
			const oldLayer = oldState.shots[index]
			if (!oldLayer) {
				// added!
				const shotokuCommand: ShotokuCommand = {
					show: newCommandContent.show,
					shot: newCommandContent.shot,
					type:
						newCommandContent.transitionType === ShotokuTransitionType.Fade
							? ShotokuCommandType.Fade
							: ShotokuCommandType.Cut,
					changeOperatorScreen: newCommandContent.changeOperatorScreen,
				}
				commands.push({
					context: `added: ${newCommandContent.fromTlObject}`,
					timelineObjId: newCommandContent.fromTlObject,
					command: shotokuCommand,
				})
			} else {
				// since there is nothing but a trigger, we know nothing changed.
			}
		})

		Object.entries(newState.sequences).forEach(([index, newCommandContent]) => {
			const oldLayer = oldState.sequences[index]
			if (!oldLayer) {
				// added!
				const shotokuCommand: ShotokuCommand = {
					shots: newCommandContent.shots.map((s) => ({
						show: s.show,
						shot: s.shot,
						type: s.transitionType === ShotokuTransitionType.Fade ? ShotokuCommandType.Fade : ShotokuCommandType.Cut,
						changeOperatorScreen: s.changeOperatorScreen,
						offset: s.offset,
					})),
				}
				commands.push({
					context: `added: ${newCommandContent.fromTlObject}`,
					timelineObjId: newCommandContent.fromTlObject,
					command: shotokuCommand,
				})
			} else {
				// since there is nothing but a trigger, we know nothing changed.
			}
		})

		return commands
	}
	private _defaultCommandReceiver(
		_time: number,
		cmd: ShotokuCommand,
		context: CommandContext,
		timelineObjId: string
	): Promise<any> {
		const cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId,
		}
		this.emitDebug(cwc)

		try {
			if (this._shotoku.connected) {
				this._shotoku.executeCommand(cmd).catch((e) => {
					throw new Error(e)
				})
			}

			return Promise.resolve()
		} catch (e) {
			this.emit('commandError', e, cwc)
			return Promise.resolve()
		}
	}
}
