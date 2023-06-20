import {
	ActionExecutionResult,
	DeviceStatus,
	Mappings,
	StatusCode,
	TSRTimelineContent,
	Timeline,
} from 'timeline-state-resolver-types'
import { Device } from '../../service/device'
import { EventEmitter } from 'eventemitter3'
import { convertObjectToCasparState, convertTimelineStateToDeviceState } from './state'
import { diffStates } from './diff'

type DeviceOptions = any
type DeviceState = any
type Command = any

export class CasparCGDevice extends EventEmitter implements Device<DeviceOptions, DeviceState, Command> {
	async init(options: DeviceOptions): Promise<boolean> {
		return true
	}
	async terminate(): Promise<boolean> {
		return true
	}

	get connected(): boolean {
		return false
	}
	getStatus(): Omit<DeviceStatus, 'active'> {
		return {
			statusCode: StatusCode.GOOD,
			messages: [],
		}
	}

	actions: Record<string, (id: string, payload?: Record<string, any>) => Promise<ActionExecutionResult>> = {}

	convertTimelineStateToDeviceState(
		state: Timeline.TimelineState<TSRTimelineContent>,
		newMappings: Mappings
	): DeviceState {
		return convertTimelineStateToDeviceState(state, newMappings)
	}
	diffStates(oldState: DeviceState | undefined, newState: DeviceState, mappings: Mappings): Array<Command> {
		return diffStates(oldState, newState, mappings)
	}
	async sendCommand(command: Command): Promise<any> {
		console.log(command)
		return true
	}
}
