import { Mapping } from './mapping'
import { DeviceType, OSCDeviceType } from '.'

export interface MultiOSCOptions {
	connections: {
		connectionId: string
		host: string
		port: number
		type: OSCDeviceType
	}[]
	timeBetweenCommands: number
}

export interface MappingMultiOSC extends Mapping {
	device: DeviceType.MULTI_OSC
	connectionId: string
}

export enum TimelineContentTypeMultiOSC {
	OSC = 'osc',
}
