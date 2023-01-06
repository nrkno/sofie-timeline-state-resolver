import { OscDevice } from '../integrations/osc/device'
import { DeviceType } from 'timeline-state-resolver-types'
import { Device } from './device'

export interface DeviceEntry {
	deviceClass: new () => Device<any, any, any>
	canConnect: boolean
	deviceName: (deviceId: string, options: any) => string
}

export const DevicesDict: Record<DeviceType.OSC, DeviceEntry> = {
	[DeviceType.OSC]: {
		deviceClass: OscDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'OSC ' + deviceId,
	},
}
