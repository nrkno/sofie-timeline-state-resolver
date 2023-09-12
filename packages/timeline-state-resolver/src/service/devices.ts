import { OscDevice } from '../integrations/osc'
import { DeviceType } from 'timeline-state-resolver-types'
import { Device, DeviceContextAPI } from './device'
import { HTTPSendDevice } from '../integrations/httpSend'
import { ShotokuDevice } from '../integrations/shotoku'
import { HTTPWatcherDevice } from '../integrations/httpWatcher'
import { AbstractDevice } from '../integrations/abstract'
import { TcpSendDevice } from '../integrations/tcpSend'

export interface DeviceEntry {
	deviceClass: new (context: DeviceContextAPI) => Device<any, any, any>
	canConnect: boolean
	deviceName: (deviceId: string, options: any) => string
	executionMode: (options: any) => 'salvo' | 'sequential'
}

export type ImplementedServiceDeviceTypes =
	| DeviceType.ABSTRACT
	| DeviceType.HTTPSEND
	| DeviceType.HTTPWATCHER
	| DeviceType.OSC
	| DeviceType.SHOTOKU
	| DeviceType.TCPSEND

// TODO - move all device implementations here and remove the old Device classes
export const DevicesDict: Record<ImplementedServiceDeviceTypes, DeviceEntry> = {
	[DeviceType.ABSTRACT]: {
		deviceClass: AbstractDevice,
		canConnect: false,
		deviceName: (deviceId: string) => 'Abstract ' + deviceId,
		executionMode: () => 'salvo',
	},
	[DeviceType.HTTPSEND]: {
		deviceClass: HTTPSendDevice,
		canConnect: false,
		deviceName: (deviceId: string) => 'HTTP ' + deviceId,
		executionMode: () => 'sequential', // todo - config?
	},
	[DeviceType.HTTPWATCHER]: {
		deviceClass: HTTPWatcherDevice,
		canConnect: false,
		deviceName: (deviceId: string) => 'HTTP-Watch ' + deviceId,
		executionMode: () => 'sequential',
	},
	[DeviceType.OSC]: {
		deviceClass: OscDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'OSC ' + deviceId,
		executionMode: () => 'salvo',
	},
	[DeviceType.SHOTOKU]: {
		deviceClass: ShotokuDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'SHOTOKU' + deviceId,
		executionMode: () => 'salvo',
	},
	[DeviceType.TCPSEND]: {
		deviceClass: TcpSendDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'TCP' + deviceId,
		executionMode: () => 'sequential', // todo: should this be configurable?
	},
}
