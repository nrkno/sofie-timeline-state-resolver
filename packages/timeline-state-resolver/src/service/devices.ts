import { DeviceType, Mapping } from 'timeline-state-resolver-types'
import { Device } from './device'

import { CasparCGDevice } from '../integrations/casparCG'
import { OscDevice } from '../integrations/osc'

export interface DeviceEntry {
	deviceClass: new () => Device<any, any, any, any>
	canConnect: boolean
	deviceName: (deviceId: string, options: any) => string
	executionMode: (options: any) => 'salvo' | 'sequential'
}

type ImplementedDeviceTypes = DeviceType.OSC | DeviceType.CASPARCG

// TODO - move all device implementations here and remove the old Device classes
export const DevicesDict: Record<ImplementedDeviceTypes, DeviceEntry> = {
	[DeviceType.OSC]: {
		deviceClass: OscDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'OSC ' + deviceId,
		executionMode: () => 'salvo',
	},
	[DeviceType.CASPARCG]: {
		deviceClass: CasparCGDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'CasparCG ' + deviceId,
		executionMode: () => 'salvo',
	},
}
