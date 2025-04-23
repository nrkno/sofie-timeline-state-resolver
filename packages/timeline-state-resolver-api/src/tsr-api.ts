import type { Device, DeviceContextAPI } from './device'

export * from './commandReport'
export * from './device'
export * from './manifest'
export * from './trace'

export { DeviceStatus, StatusCode } from 'timeline-state-resolver-types'

export interface DeviceEntry {
	deviceClass: new (context: DeviceContextAPI<any>) => Device<any, any, any>
	canConnect: boolean
	deviceName: (deviceId: string, options: any) => string
	executionMode: (options: any) => 'salvo' | 'sequential'
}
