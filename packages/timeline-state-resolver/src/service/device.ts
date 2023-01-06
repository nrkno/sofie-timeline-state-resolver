import { SlowSentCommandInfo, SlowFulfilledCommandInfo, CommandWithContext, CommandReport } from '../'
import { FinishedTrace } from '../lib'
import {
	Timeline,
	TSRTimelineContent,
	Mappings,
	DeviceStatus,
	ActionExecutionResult,
	MediaObject,
} from 'timeline-state-resolver-types'

type CommandContext = any

export interface Device<DeviceOptions, DeviceState, Command> {
	/**
	 * Initiates the device connection, after this has resolved the device
	 * is ready to be controlled
	 */
	init(options: DeviceOptions): Promise<boolean>
	/**
	 * Ready this class for garbage collection
	 */
	terminate(): Promise<boolean>

	/** @deprecated */
	makeReady?(okToDestroyStuff?: boolean): Promise<void>
	standDown?(): Promise<void>

	/**
	 * This method takes in a Timeline State that describes a point
	 * in time on the timeline and returns a decice state that
	 * describes how the device should be according to the timeline state
	 *
	 * @param state State obj from timeline
	 * @param newMappings Mappings to resolve devices with
	 */
	convertTimelineStateToDeviceState(
		state: Timeline.TimelineState<TSRTimelineContent>,
		newMappings: Mappings
	): DeviceState
	/**
	 * This method takes 2 states and returns a set of commands that will
	 * transition the device from oldState to newState
	 */
	diffStates(oldState: DeviceState | undefined, newState: DeviceState, mappings: Mappings): Array<Command>
	/** This method will take a command and send it to the device */
	sendCommand(command: Command, context: CommandContext, timelineObjId: string): Promise<any>

	get connected(): boolean
	getStatus(): Omit<DeviceStatus, 'active'>

	actions: Record<string, (id: string, payload: Record<string, any>) => Promise<ActionExecutionResult>>

	// todo - add media objects
}

export interface DeviceEvents {
	info: [info: string]
	warning: [warning: string]
	error: [context: string, err: Error]
	debug: [...debug: any[]]

	debugState: [state: object]
	/** The connection status has changed */
	connectionChanged: [status: DeviceStatus]
	/** A message to the resolver that something has happened that warrants a reset of the resolver (to re-run it again) */
	resetResolver: []

	/** A report that a command was sent too late */
	slowCommand: [commandInfo: string]
	/** A report that a command was sent too late */
	slowSentCommand: [info: SlowSentCommandInfo]
	/** A report that a command was fullfilled too late */
	slowFulfilledCommand: [info: SlowFulfilledCommandInfo]

	/** Something went wrong when executing a command  */
	commandError: [error: Error, context: CommandWithContext]
	/** Update a MediaObject  */
	updateMediaObject: [collectionId: string, docId: string, doc: MediaObject | null]
	/** Clear a MediaObjects collection */
	clearMediaObjects: [collectionId: string]

	commandReport: [commandReport: CommandReport]
	timeTrace: [trace: FinishedTrace]
}
