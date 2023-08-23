import { SlowSentCommandInfo, SlowFulfilledCommandInfo, CommandReport } from '../'
import { FinishedTrace } from '../lib'
import {
	Timeline,
	TSRTimelineContent,
	Mappings,
	DeviceStatus,
	ActionExecutionResult,
	MediaObject,
	LayerState,
	Mapping as TSRMapping,
	TSRMappingOptions,
} from 'timeline-state-resolver-types'

type CommandContext = any

export type CommandWithContext = {
	command: any
	context: CommandContext
	tlObjId: string
	address?: string
}

export interface Device<
	DeviceOptions,
	DeviceState,
	Command extends CommandWithContext,
	AddressState = void,
	CommandResult = void
> extends BaseDeviceAPI<DeviceState, Command, AddressState, CommandResult> {
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

	get connected(): boolean
	getStatus(): Omit<DeviceStatus, 'active'>

	actions: Record<string, (id: string, payload?: Record<string, any>) => Promise<ActionExecutionResult>>

	// todo - add media objects
}

/**
 * Minimal API for the StateHandler to be able to use a device
 */
export interface BaseDeviceAPI<
	DeviceState,
	Command extends CommandWithContext,
	AddressState = {},
	CommandResult = void
> {
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
	sendCommand(command: Command): Promise<CommandResult>

	updateExpectedState?(state: DeviceState, mappings: Mappings): void
	finishedStateChange?(commands: Command[], results: any[]): void // todo

	/**
	 * The implementaiton should return a set of commands to transition the addressed part of the device from the currentState to the expectedState.
	 */
	diffLayer?(address: string, currentState: AddressState | undefined, expectedState: AddressState): Command[]
	/**
	 * The implementation shall return a LayerState as derived from the currentState and expectedState
	 */
	getLayerStatus?(currentState: AddressState, expectedState: AddressState): LayerState
	/** The eimplementation shall return a string literal that can be used to identify a part of the device */
	mappingToAddress?<Mapping extends TSRMapping<TSRMappingOptions>>(mapping: Mapping): string
	getAddressStateFromDeviceState?(address: string, state: DeviceState): AddressState
	stateUpdatesFromCommands?(
		currentState: AddressState | undefined,
		expectedState: AddressState,
		commands: Command[],
		results: any[]
	): AddressState
}

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
	resetFromState: [any] // @nocommit - any

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
	/** layerState */
	layerState: [address: string, state: LayerState]
	/** getMappings */
	getMappings: [cb: (mappings: any) => void]

	commandReport: [commandReport: CommandReport]
	timeTrace: [trace: FinishedTrace]
}
