import EventEmitter = require('eventemitter3')
import {
	ActionExecutionResult,
	Timeline,
	TSRTimelineContent,
	Mappings,
	DeviceStatus,
} from 'timeline-state-resolver-types'
import type { DeviceEvents } from '../service/device'
import type { DeviceInstanceWrapper, DeviceDetails } from '../service/DeviceInstance'
import type { DeviceOptionsAnyInternal } from '../conductor'
import type { ExpectedPlayoutItem } from '../expectedPlayoutItems'

export const ConstructedMockDevices: Record<string, MockDeviceInstanceWrapper> = {}
export class MockDeviceInstanceWrapper
	extends EventEmitter<DeviceEvents>
	implements
		Omit<
			DeviceInstanceWrapper,
			// Private properties
			| '_device'
			| '_stateHandler'
			| '_deviceId'
			| '_deviceType'
			| '_deviceName'
			| '_instanceId'
			| '_startTime'
			| '_isActive'
			| '_logDebug'
			| '_logDebugStates'
			// EventEmitter
			| 'on'
			| 'off'
			| 'once'
			| 'addListener'
			| 'removeListener'
			| 'removeAllListeners'
		>
{
	constructor(
		public readonly deviceId: string,
		_startTime: string,
		public readonly pluginPath,
		public readonly config: DeviceOptionsAnyInternal
	) {
		super()

		// const deviceSpecs = DevicesDict[config.type]

		// if (!deviceSpecs) {
		// 	throw new Error('Could not find device of type ' + config.type)
		// }

		ConstructedMockDevices[deviceId] = this
	}

	getCurrentTime = jest.fn((): number => {
		// throw new Error('Method not implemented.')
		return Date.now()
	})

	initDevice = jest.fn(async (_activeRundownPlaylistId?: string | undefined): Promise<boolean> => {
		// throw new Error('Method not implemented.')
		return true
	})
	terminate = jest.fn(async (): Promise<void> => {
		if (!ConstructedMockDevices[this.deviceId]) throw new Error(`Device "${this.deviceId}" has already been terminated`)
		delete ConstructedMockDevices[this.deviceId]
	})
	executeAction = jest.fn(
		async (_id: string, _payload?: Record<string, any> | undefined): Promise<ActionExecutionResult> => {
			throw new Error('Method not implemented.')
		}
	)
	makeReady = jest.fn(async (_okToDestroyStuff?: boolean | undefined): Promise<void> => {
		throw new Error('Method not implemented.')
	})
	standDown = jest.fn(async (): Promise<void> => {
		throw new Error('Method not implemented.')
	})

	/** @deprecated - just here for API compatiblity with the old class */
	prepareForHandleState(): void {
		//
	}

	handleState = jest.fn(
		(_newState: Timeline.TimelineState<TSRTimelineContent>, _newMappings: Mappings<unknown>): void => {
			// throw new Error('Method not implemented.')
		}
	)
	clearFuture = jest.fn((_t: number): void => {
		// throw new Error('Method not implemented.')
	})
	getDetails(): DeviceDetails {
		return {
			deviceId: this.deviceId,
			deviceType: this.config.type,
			deviceName: 'Mock Device',
			instanceId: 0,
			startTime: 0,

			supportsExpectedPlayoutItems: false,
			canConnect: false,
		}
	}
	handleExpectedPlayoutItems = jest.fn((_expectedPlayoutItems: ExpectedPlayoutItem[]): void => {
		throw new Error('Method not implemented.')
	})
	getStatus = jest.fn((): DeviceStatus => {
		throw new Error('Method not implemented.')
	})
	setDebugLogging = jest.fn((_value: boolean): void => {
		throw new Error('Method not implemented.')
	})
	setDebugState = jest.fn((_value: boolean): void => {
		throw new Error('Method not implemented.')
	})
}

export function DiscardAllMockDevices(): void {
	for (const key of Object.keys(ConstructedMockDevices)) {
		console.log(`Disposing forgotten mock ${key}`)

		ConstructedMockDevices[key].terminate().catch((e) => {
			console.error(`Dispose mock ${key}:`, e)
		})
		delete ConstructedMockDevices[key]
	}
}
