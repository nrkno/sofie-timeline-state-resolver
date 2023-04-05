import * as _ from 'underscore'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode, literal } from './../../devices/device'
import {
	DeviceType,
	SingularLiveOptions,
	TimelineContentTypeSingularLive,
	MappingSingularLive,
	DeviceOptionsSingularLive,
	SingularCompositionControlNode,
	Mappings,
	TSRTimelineContent,
	Timeline,
} from 'timeline-state-resolver-types'
import { DoOnTime, SendMode } from '../../devices/doOnTime'
import * as request from 'request'

export interface DeviceOptionsSingularLiveInternal extends DeviceOptionsSingularLive {
	commandReceiver?: CommandReceiver
}
export type CommandReceiver = (
	time: number,
	cmd: SingularLiveCommandContent,
	context: CommandContext,
	timelineObjId: string
) => Promise<any>

export interface SingularLiveControlNodeCommandContent extends SingularLiveCommandContent {
	state?: string
	payload?: { [controlNodeField: string]: string }
}

export interface SingularLiveCommandContent {
	subCompositionName: string
}

interface Command {
	commandName: 'added' | 'changed' | 'removed'
	content: SingularLiveCommandContent
	context: CommandContext
	timelineObjId: string
	layer: string
}
export type CommandContext = string

export interface SingularComposition {
	timelineObjId: string
	controlNode: SingularCompositionControlNode
}

export interface SingularLiveState {
	compositions: {
		[key: string]: SingularComposition
	}
}

const SINGULAR_LIVE_API = 'https://app.singular.live/apiv2/controlapps/'

/**
 * This is a Singular.Live device, it talks to a Singular.Live App Instance using an Access Token
 */
export class SingularLiveDevice extends DeviceWithState<SingularLiveState, DeviceOptionsSingularLiveInternal> {
	// private _makeReadyCommands: SingularLiveCommandContent[]
	private _accessToken: string
	private _doOnTime: DoOnTime
	private _deviceStatus: DeviceStatus = {
		statusCode: StatusCode.GOOD,
		messages: [],
		active: this.isActive,
	}

	private _commandReceiver: CommandReceiver

	constructor(
		deviceId: string,
		deviceOptions: DeviceOptionsSingularLiveInternal,
		getCurrentTime: () => Promise<number>
	) {
		super(deviceId, deviceOptions, getCurrentTime)
		if (deviceOptions.options) {
			if (deviceOptions.commandReceiver) this._commandReceiver = deviceOptions.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver.bind(this)
		}
		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.IN_ORDER,
			this._deviceOptions
		)
		this.handleDoOnTime(this._doOnTime, 'SingularLive')
	}
	async init(initOptions: SingularLiveOptions): Promise<boolean> {
		// this._makeReadyCommands = options.makeReadyCommands || []
		this._accessToken = initOptions.accessToken || ''

		if (!this._accessToken)
			throw new Error('Singular.Live bad connection option: accessToken. An accessToken is required.')

		return Promise.resolve(true) // This device doesn't have any initialization procedure
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	handleState(newState: Timeline.TimelineState<TSRTimelineContent>, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		// Handle this new state, at the point in time specified

		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		const oldSingularState: SingularLiveState = (
			this.getStateBefore(previousStateTime) || { state: { compositions: {} } }
		).state

		const newSingularState = this.convertStateToSingularLive(newState, newMappings)

		const commandsToAchieveState: Array<any> = this._diffStates(oldSingularState, newSingularState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newSingularState, newState.time)
	}
	clearFuture(clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	async terminate() {
		this._doOnTime.dispose()
		return Promise.resolve(true)
	}
	getStatus(): DeviceStatus {
		// Good, since this device has no status, really
		return this._deviceStatus
	}
	async makeReady(_okToDestroyStuff?: boolean): Promise<void> {
		// if (okToDestroyStuff && this._makeReadyCommands && this._makeReadyCommands.length > 0) {
		// 	const time = this.getCurrentTime()
		// 	_.each(this._makeReadyCommands, (cmd: SingularLiveCommandContent) => {
		// 		// add the new commands to the queue:
		// 		this._doOnTime.queue(time, undefined, (cmd: SingularLiveCommandContent) => {
		// 			return this._commandReceiver(time, cmd, 'makeReady', '')
		// 		}, cmd)
		// 	})
		// }
	}

	get canConnect(): boolean {
		return false
	}
	get connected(): boolean {
		return false
	}
	private _getDefaultState(): SingularLiveState {
		return {
			compositions: {},
		}
	}
	convertStateToSingularLive(state: Timeline.TimelineState<TSRTimelineContent>, newMappings: Mappings) {
		// convert the timeline state into something we can use
		// (won't even use this.mapping)
		const singularState: SingularLiveState = this._getDefaultState()

		_.each(state.layers, (tlObject, layerName: string) => {
			const mapping: MappingSingularLive | undefined = newMappings[layerName] as MappingSingularLive
			if (
				mapping &&
				mapping.device === DeviceType.SINGULAR_LIVE &&
				mapping.deviceId === this.deviceId &&
				tlObject.content.deviceType === DeviceType.SINGULAR_LIVE
			) {
				const content = tlObject.content

				if (content.type === TimelineContentTypeSingularLive.COMPOSITION) {
					singularState.compositions[mapping.compositionName] = {
						timelineObjId: tlObject.id,
						controlNode: content.controlNode,
					}
				}
			}
		})

		return singularState
	}
	get deviceType() {
		return DeviceType.SINGULAR_LIVE
	}
	get deviceName(): string {
		return 'Singular.Live ' + this.deviceId
	}
	get queue() {
		return this._doOnTime.getQueue()
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
					return this._commandReceiver(time, cmd.content, cmd.context, cmd.timelineObjId)
				},
				cmd
			)
		})
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 */
	private _diffStates(
		oldSingularLiveState: SingularLiveState,
		newSingularLiveState: SingularLiveState
	): Array<Command> {
		const commands: Array<Command> = []

		_.each(newSingularLiveState.compositions, (composition: SingularComposition, compositionName: string) => {
			const oldComposition = oldSingularLiveState.compositions[compositionName]
			if (!oldComposition) {
				// added!
				commands.push({
					timelineObjId: composition.timelineObjId,
					commandName: 'added',
					content: literal<SingularLiveControlNodeCommandContent>({
						subCompositionName: compositionName,
						state: composition.controlNode.state,
						payload: composition.controlNode.payload,
					}),
					context: `added: ${composition.timelineObjId}`,
					layer: compositionName,
				})
			} else {
				// changed?
				if (!_.isEqual(oldComposition.controlNode, composition.controlNode)) {
					// changed!
					commands.push({
						timelineObjId: composition.timelineObjId,
						commandName: 'changed',
						content: literal<SingularLiveControlNodeCommandContent>({
							subCompositionName: compositionName,
							state: composition.controlNode.state,
							payload: composition.controlNode.payload,
						}),
						context: `changed: ${composition.timelineObjId}  (previously: ${oldComposition.timelineObjId})`,
						layer: compositionName,
					})
				}
			}
		})
		// removed
		_.each(oldSingularLiveState.compositions, (composition: SingularComposition, compositionName) => {
			const newComposition = newSingularLiveState.compositions[compositionName]
			if (!newComposition) {
				// removed!
				commands.push({
					timelineObjId: composition.timelineObjId,
					commandName: 'removed',
					content: literal<SingularLiveControlNodeCommandContent>({
						subCompositionName: compositionName,
						state: 'Out',
					}),
					context: `removed: ${composition.timelineObjId}`,
					layer: compositionName,
				})
			}
		})
		return commands
			.sort((a, b) =>
				(a.content as any).state && !(b.content as any).state
					? 1
					: !(a.content as any).state && (b.content as any).state
					? -1
					: 0
			)
			.sort((a, b) => a.layer.localeCompare(b.layer))
	}
	private async _defaultCommandReceiver(
		_time: number,
		cmd: SingularLiveCommandContent,
		context: CommandContext,
		timelineObjId: string
	): Promise<any> {
		const cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId,
		}
		this.emitDebug(cwc)

		const url = SINGULAR_LIVE_API + this._accessToken + '/control'

		return new Promise<void>((resolve, reject) => {
			const handleResponse = (error, response) => {
				if (error) {
					this.emit('error', `SingularLive.response error ${cmd.subCompositionName} (${context}`, error)
					reject(error)
				} else if (response.statusCode === 200) {
					this.emitDebug(
						`SingularLive: ${cmd.subCompositionName}: Good statuscode response on url "${url}": ${response.statusCode} (${context})`
					)
					resolve()
				} else {
					this.emit(
						'warning',
						`SingularLive: ${cmd.subCompositionName}: Bad statuscode response on url "${url}": ${response.statusCode} (${context})`
					)
					resolve()
				}
			}

			request.patch(url, { json: [cmd] }, handleResponse)
		}).catch((error) => {
			this.emit('commandError', error, cwc)
		})
	}
}
