import { LayerState } from 'timeline-state-resolver-types/src'
import { SlowSentCommandInfo, SlowFulfilledCommandInfo, CommandReport } from '../'
import { FinishedTrace } from '../lib'
import {
	Timeline,
	TSRTimelineContent,
	Mappings,
	DeviceStatus,
	ActionExecutionResult,
	MediaObject,
	Mapping as TSRMapping,
	TSRMappingOptions,
} from 'timeline-state-resolver-types'

type CommandContext = any

export type CommandWithContext = {
	command: any
	context: CommandContext
	/** ID of the timeline-object that the command originated from */
	timelineObjId: string
	/** this command is to be executed x ms _before_ the scheduled time */
	preliminary?: number
	address?: string
}

/**
 * API for use by the DeviceInstance to be able to use a device
 */
export abstract class Device<
	DeviceOptions,
	AddressState,
	Command extends CommandWithContext,
	MappingOptions extends TSRMappingOptions,
	CommandResult = void
> implements BaseDeviceAPI<AddressState, Command, CommandResult>
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
	): Record<string, AddressState>
	abstract diffStates(
		oldState: Record<string, AddressState | undefined>,
		newState: Record<string, AddressState>,
		mappings: Mappings
	): Array<Command>
	abstract sendCommand(command: Command): Promise<CommandResult>
	abstract mappingToAddress(mapping: TSRMapping<MappingOptions>): string
	// -------------------------------------------------------------------
}

/**
 * Minimal API for the StateHandler to be able to use a device
 */
export interface BaseDeviceAPI<AddressState, Command extends CommandWithContext, CommandResult = void> {
	/**
	 * This method takes in a Timeline State that describes a point
	 * in time on the timeline and returns a device state that
	 * describes how the device should be according to the timeline state
	 *
	 * @param state State obj from timeline
	 * @param newMappings Mappings to resolve devices with
	 */
	convertTimelineStateToDeviceState(
		state: Timeline.TimelineState<TSRTimelineContent>,
		newMappings: Mappings
	): Record<string, AddressState>
	/**
	 * This method takes 2 states and returns a set of commands that will
	 * transition the device from oldState to newState
	 */
	diffStates(
		oldState: Record<string, AddressState | undefined>,
		newState: Record<string, AddressState>,
		mappings: Mappings
	): Array<Command>
	/** This method will take a command and send it to the device */
	sendCommand(command: Command): Promise<CommandResult>
	/** The implementation shall return a string literal that can be used to identify a part of the device */
	mappingToAddress(mapping: TSRMapping<TSRMappingOptions>): string

	/**
	 * The implementation shall return a LayerState as derived from the currentState and expectedState
	 */
	getLayerStatus?(currentState: AddressState, expectedState: AddressState): LayerState
	stateUpdatesFromCommands?(
		currentState: AddressState | undefined,
		expectedState: AddressState | undefined,
		commands: Command[],
		results: PromiseSettledResult<CommandResult>[]
	): AddressState
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
	/** Notify the conductor that it should reset the resolver, in order to trigger it again. */
	resetResolver: () => void

	/** Something went wrong when executing a command  */
	commandError: (error: Error, context: CommandWithContext) => void
	/** Update a MediaObject  */
	updateMediaObject: (collectionId: string, docId: string, doc: MediaObject | null) => void
	/** Clear a MediaObjects collection */
	clearMediaObjects: (collectionId: string) => void

	timeTrace: (trace: FinishedTrace) => void

	/** Reset the state of the State, this will clear any known state about the device */
	resetState: () => Promise<void>
}
