import {
	BaseDeviceAPI,
	CommandWithContext,
	DeviceContextAPI,
	Device as DeviceInterface,
} from 'timeline-state-resolver-api'
import {
	ActionExecutionResult,
	DeviceStatus,
	Mappings,
	Timeline,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'

export {
	CommandWithContext,
	BaseDeviceAPI,
	DeviceContextAPI,
	DeviceEvents,
} from 'timeline-state-resolver-api/src/device'

/**
 * API for use by the DeviceInstance to be able to use a device
 */
/** @deprecated use the interface directly */
export abstract class Device<DeviceOptions, DeviceState, Command extends CommandWithContext>
	implements BaseDeviceAPI<DeviceState, Command>, DeviceInterface<DeviceOptions, DeviceState, Command>
{
	constructor(protected context: DeviceContextAPI<DeviceState>) {
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
	abstract diffStates(
		oldState: DeviceState | undefined,
		newState: DeviceState,
		mappings: Mappings,
		time: number
	): Array<Command>
	abstract sendCommand(command: Command): Promise<void>
	// -------------------------------------------------------------------
}
