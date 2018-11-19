import { TimelineResolvedObject } from './superfly-timeline'

export interface Mappings {
	[layerName: string]: Mapping
}
export interface Mapping {
	device: DeviceType,
	deviceId: string,
	channel?: number,
	layer?: number
	// [key: string]: any
}
export interface MappingAbstract extends Mapping {
	device: DeviceType.ABSTRACT
}
export enum DeviceType {
	ABSTRACT = 0,
	CASPARCG = 1,
	ATEM = 2,
	LAWO = 3, // yet to be implemented
	HTTPSEND = 4,
	PANASONIC_PTZ = 5,
	HYPERDECK = 7,
	PHAROS = 8
}

export interface TimelineResolvedObjectExtended extends TimelineResolvedObject {
	isBackground?: boolean
	originalLLayer?: string | number
}
