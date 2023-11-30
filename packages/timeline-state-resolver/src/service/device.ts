import { SlowSentCommandInfo, SlowFulfilledCommandInfo, CommandReport } from '../'
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

export type CommandWithContext = {
	command: any
	context: CommandContext
	/** ID of the timeline-object that the command originated from */
	timelineObjId: string
}

/**
 * API for use by the DeviceInstance to be able to use a device
 */
export abstract class Device<DeviceOptions, DeviceState, Command extends CommandWithContext>
	implements BaseDeviceAPI<DeviceState, Command>
{
	constructor(protected context: DeviceContextAPI) {
		// Nothing
	}
	/**
	 * Initiates the device connection, after this has resolved the device
	 * is ready to be controlled
	 */
	abstract init(options: DeviceOptions): Promise<boolean>
	/**
	 * Ready this class for garbage collection
	 */
	abstract terminate(): Promise<void>

	/** @deprecated */
	async makeReady(_okToDestroyStuff?: boolean): Promise<void> {
		// Do nothing by default
	}
	/** @deprecated */
	async standDown(): Promise<void> {
		// Do nothing by default
	}

	abstract get connected(): boolean
	abstract getStatus(): Omit<DeviceStatus, 'active'>

	abstract actions: Record<string, (id: string, payload?: Record<string, any>) => Promise<ActionExecutionResult>>

	// todo - add media objects

	// From BaseDeviceAPI: -----------------------------------------------
	abstract convertTimelineStateToDeviceState(
		state: Timeline.TimelineState<TSRTimelineContent>,
		newMappings: Mappings
	): DeviceState
	abstract diffStates(oldState: DeviceState | undefined, newState: DeviceState, mappings: Mappings): Array<Command>
	abstract sendCommand(command: Command): Promise<void>
	// -------------------------------------------------------------------
}

/**
 * Minimal API for the StateHandler to be able to use a device
 */
export interface BaseDeviceAPI<DeviceState, Command extends CommandWithContext> {
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
	sendCommand(command: Command): Promise<void>
}

/** Events emitted by the device, to be listened on by Conductor */
export interface DeviceEvents {
	info: [info: string]
	warning: [warning: string]
	error: [context: string, err: Error]
	debug: [...debug: any[]]
	debugState: [state: object]
	/** The connection status has changed */
	connectionChanged: [status: Omit<DeviceStatus, 'active'>]
	/** A message to the resolver that something has happened that warrants a reset of the resolver (to re-run it again) */
	resetResolver: []

	/** @deprecated replaced by slowSentCommand & slowFulfilledCommand  */
	slowCommand: [commandInfo: string]
	/** A report that a command was sent too late */
	slowSentCommand: [info: SlowSentCommandInfo]
	/** A report that a command was fullfilled too late */
	slowFulfilledCommand: [info: SlowFulfilledCommandInfo]
	commandReport: [commandReport: CommandReport]

	/** Something went wrong when executing a command  */
	commandError: [error: Error, context: CommandWithContext]
	/** Update a MediaObject  */
	updateMediaObject: [collectionId: string, docId: string, doc: MediaObject | null]
	/** Clear a MediaObjects collection */
	clearMediaObjects: [collectionId: string]

	timeTrace: [trace: FinishedTrace]
}

/** Various methods that the Devices can call */
export interface DeviceContextAPI {
	logger: {
		/** Emit a "error" message */
		error: (context: string, err: Error) => void
		/** Emit a "warning" message */
		warning: (warning: string) => void
		/** Emit a "info" message */
		info: (info: string) => void
		/** Emit a "debug" message */
		debug: (...debug: any[]) => void
	}

	/** Emit a "debugState" message */
	emitDebugState: (state: object) => void

	/** Notify that the connection status has changed. */
	connectionChanged: (status: Omit<DeviceStatus, 'active'>) => void
	/**
	 * Notify the conductor that it should reset the resolver, in order to trigger it again.
	 * Note: this will not change anything about the current state and should technically not lead
	 * to any new commands being sent
	 */
	resetResolver: () => void

	/** Something went wrong when executing a command  */
	commandError: (error: Error, context: CommandWithContext) => void
	/** Update a MediaObject  */
	updateMediaObject: (collectionId: string, docId: string, doc: MediaObject | null) => void
	/** Clear a MediaObjects collection */
	clearMediaObjects: (collectionId: string) => void

	timeTrace: (trace: FinishedTrace) => void

	/** Reset the tracked device state to undefined and notify the conductor to reset the resolver */
	resetState: () => Promise<void>

	/** Reset the tracked device state to "state" and notify the conductor to reset the resolver */
	resetToState: (state: any) => Promise<void> // todo - types?
}
