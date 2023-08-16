import { OscDevice } from '../integrations/osc'
import { DeviceType } from 'timeline-state-resolver-types'
import { Device } from './device'
import { HTTPSendDevice } from '../integrations/httpSend'
import { ShotokuDevice } from '../integrations/shotoku'

export interface DeviceEntry {
	deviceClass: new () => Device<any, any, any>
	canConnect: boolean
	deviceName: (deviceId: string, options: any) => string
	executionMode: (options: any) => 'salvo' | 'sequential'
}

type ImplementedDeviceTypes = DeviceType.OSC | DeviceType.HTTPSEND | DeviceType.SHOTOKU

// TODO - move all device implementations here and remove the old Device classes
export const DevicesDict: Record<ImplementedDeviceTypes, DeviceEntry> = {
	[DeviceType.OSC]: {
		deviceClass: OscDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'OSC ' + deviceId,
		executionMode: () => 'salvo',
	},
	[DeviceType.HTTPSEND]: {
		deviceClass: HTTPSendDevice,
		canConnect: false,
		deviceName: (deviceId: string) => 'HTTP ' + deviceId,
		executionMode: () => 'sequential', // todo - config?
	},
	[DeviceType.SHOTOKU]: {
		deviceClass: ShotokuDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'SHOTOKU' + deviceId,
		executionMode: () => 'salvo',
	},
}
