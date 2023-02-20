import * as _ from 'underscore'
import { DeviceWithState, DeviceStatus, StatusCode } from '../../devices/device'
import {
	DeviceType,
	OSCMessageCommandContent,
	Mappings,
	Timeline,
	TSRTimelineContent,
	DeviceOptionsMultiOSC,
	MultiOSCOptions,
	MappingMultiOSC,
} from 'timeline-state-resolver-types'
import { DoOnTime, SendMode } from '../../devices/doOnTime'

import * as osc from 'osc'

import { OSCConnection } from './deviceConnection'

export interface DeviceOptionsMultiOSCInternal extends DeviceOptionsMultiOSC {
	oscSenders?: Record<string, (msg: osc.OscMessage, address?: string | undefined, port?: number | undefined) => void>
}
export type CommandReceiver = (
	time: number,
	cmd: OSCMessageCommandContent,
	context: CommandContext,
	timelineObjId: string
) => Promise<any>
interface Command {
	commandName: 'added' | 'changed' | 'removed'
	connectionId: string
	content: OSCMessageCommandContent
	context: CommandContext
	timelineObjId: string
}
type CommandContext = string
interface OSCDeviceState {
	[connectionId: string]: {
		[address: string]: OSCDeviceStateContent
	}
}
interface OSCDeviceStateContent extends OSCMessageCommandContent {
	connectionId: string
	fromTlObject: string
}
/**
 * This is a generic wrapper for any osc-enabled device.
 */
export class MultiOSCMessageDevice extends DeviceWithState<OSCDeviceState, DeviceOptionsMultiOSCInternal> {
	private _doOnTime: DoOnTime

	private _connections: Record<string, OSCConnection> = {}
	private _commandQueue: Array<Command> = []
	private _commandQueueTimer: NodeJS.Timeout | undefined

	constructor(deviceId: string, deviceOptions: DeviceOptionsMultiOSCInternal, getCurrentTime: () => Promise<number>) {
		super(deviceId, deviceOptions, getCurrentTime)
		if (deviceOptions.options) {
			deviceOptions.options.connections.forEach(({ connectionId }) => {
				this._connections[connectionId] = new OSCConnection()
			})
		}
		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.BURST,
			this._deviceOptions
		)
		this.handleDoOnTime(this._doOnTime, 'OSC')
	}
	async init(initOptions: MultiOSCOptions): Promise<boolean> {
		for (const connOptions of initOptions.connections) {
			await this._connections[connOptions.connectionId]?.connect({
				...connOptions,
				oscSender: this._deviceOptions?.oscSenders?.[connOptions.connectionId] || undefined,
			})
		}

		return Promise.resolve(true) // This device doesn't have any initialization procedure
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
		// Transform timeline states into device states
		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		const oldOSCState: OSCDeviceState = (this.getStateBefore(previousStateTime) || { state: {} }).state

		const newOSCState = this.convertStateToOSCMessage(newState, newMappings)

		// Generate commands necessary to transition to the new state
		const commandsToAchieveState: Array<any> = this._diffStates(oldOSCState, newOSCState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newOSCState, newState.time)
	}
	/**
	 * Clear any scheduled commands after this time
	 * @param clearAfterTime
	 */
	clearFuture(clearAfterTime: number) {
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	async terminate() {
		this._doOnTime.dispose()
		return Promise.resolve(true)
	}
	getStatus(): DeviceStatus {
		const status = {
			statusCode: StatusCode.GOOD,
			messages: [] as string[],
			active: this.isActive,
		}

		for (const conn of Object.values(this._connections)) {
			if (!conn.connected) {
				;(status.statusCode = StatusCode.BAD), status.messages.push(`${conn.connectionId} is disconnected`)
			}
		}

		return status
	}
	async makeReady(_okToDestroyStuff?: boolean): Promise<void> {
		return Promise.resolve()
	}

	get canConnect(): boolean {
		return false
	}
	get connected(): boolean {
		return false
	}
	/**
	 * Transform the timeline state into a device state, which is in this case also
	 * a timeline state.
	 * @param state
	 */
	convertStateToOSCMessage(state: Timeline.TimelineState<TSRTimelineContent>, mappings: Mappings) {
		const addrToOSCMessage: OSCDeviceState = Object.fromEntries(Object.keys(this._connections).map((id) => [id, {}]))
		const addrToPriority: { [connectionId: string]: { [address: string]: number } } = Object.fromEntries(
			Object.keys(this._connections).map((id) => [id, {}])
		)

		_.each(state.layers, (layer) => {
			const mapping = mappings[layer.layer] as MappingMultiOSC | undefined
			if (!mapping) return

			if (layer.content.deviceType === DeviceType.OSC) {
				const content: OSCDeviceStateContent = {
					...layer.content,
					connectionId: mapping.connectionId,
					fromTlObject: layer.id,
				}
				if (
					(addrToOSCMessage[mapping.connectionId][content.path] &&
						addrToPriority[mapping.connectionId][content.path] <= (layer.priority || 0)) ||
					!addrToOSCMessage[mapping.connectionId][content.path]
				) {
					addrToOSCMessage[mapping.connectionId][content.path] = content
					addrToPriority[mapping.connectionId][content.path] = layer.priority || 0
				}
			}
		})

		return addrToOSCMessage
	}
	get deviceType() {
		return DeviceType.MULTI_OSC
	}
	get deviceName(): string {
		return 'OSC ' + this.deviceId
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
					if (cmd.commandName === 'added' || cmd.commandName === 'changed') {
						return this._addAndProcessQueue(cmd)
					} else {
						return null
					}
				},
				cmd
			)
		})
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 * @param oldOscSendState The assumed current state
	 * @param newOscSendState The desired state of the device
	 */
	private _diffStates(oldOscSendState: OSCDeviceState, newOscSendState: OSCDeviceState): Array<Command> {
		// in this oscSend class, let's just cheat:

		const commands: Array<Command> = []

		for (const connectionId of Object.keys(this._connections)) {
			_.each(newOscSendState[connectionId], (newCommandContent: OSCDeviceStateContent, address: string) => {
				const oldLayer = oldOscSendState[connectionId][address]
				if (!oldLayer) {
					// added!
					commands.push({
						commandName: 'added',
						context: `added: ${newCommandContent.fromTlObject}`,
						connectionId: newCommandContent.connectionId,
						timelineObjId: newCommandContent.fromTlObject,
						content: newCommandContent,
					})
				} else {
					// changed?
					if (!_.isEqual(oldLayer, newCommandContent)) {
						// changed!
						commands.push({
							commandName: 'changed',
							context: `changed: ${newCommandContent.fromTlObject}`,
							connectionId: newCommandContent.connectionId,
							timelineObjId: newCommandContent.fromTlObject,
							content: newCommandContent,
						})
					}
				}
			})
			// removed
			_.each(oldOscSendState[connectionId], (oldCommandContent: OSCDeviceStateContent, address) => {
				const newLayer = newOscSendState[connectionId][address]
				if (!newLayer) {
					// removed!
					commands.push({
						commandName: 'removed',
						context: `removed: ${oldCommandContent.fromTlObject}`,
						connectionId: oldCommandContent.connectionId,
						timelineObjId: oldCommandContent.fromTlObject,
						content: oldCommandContent,
					})
				}
			})
		}
		return commands
	}

	private async _addAndProcessQueue(cmd: Command): Promise<void> {
		this._commandQueue.push(cmd)

		await this._processQueue()
	}
	private async _processQueue() {
		if (this._commandQueueTimer) return

		const nextCommand = this._commandQueue.shift()
		if (!nextCommand) return

		try {
			this._connections[nextCommand.connectionId]?.sendOsc({
				address: nextCommand.content.path,
				args: nextCommand.content.values,
			})
		} catch (e) {
			this.emit('commandError', new Error('Command failed: ' + e), { ...nextCommand, command: nextCommand })
		}

		this._commandQueueTimer = setTimeout(() => {
			this._commandQueueTimer = undefined
			this._processQueue().catch((e) => this.emit('error', 'Error in processing queue', e))
		}, this.deviceOptions.options?.timeBetweenCommands || 0)
	}
}
