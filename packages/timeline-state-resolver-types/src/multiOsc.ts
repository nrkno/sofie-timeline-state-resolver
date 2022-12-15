import { Mapping } from './mapping'
import { DeviceType, OSCDeviceType } from '.'

export interface MultiOSCOptions {
	connections: {
		connectionId: string
		host: string
		port: number
		type: OSCDeviceType
	}[]
	timeBetweenCommands: number // todo - move this to the individual timeline objects?
}

export interface MappingMultiOSC extends Mapping {
	device: DeviceType.MULTI_OSC
	connectionId: string
}

export enum TimelineContentTypeMultiOSC {
	OSC = 'osc',
}
