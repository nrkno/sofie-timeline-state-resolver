import { TimelineResolvedObject } from 'superfly-timeline'

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
export interface MappingCasparCG extends Mapping {
	device: DeviceType.CASPARCG,
	channel: number,
	layer: number
}
export interface MappingAbstract extends Mapping {
	device: DeviceType.ABSTRACT,
	abstractPipe: number
}
export interface MappingAtem extends Mapping {
	device: DeviceType.ATEM,
	mappingType: MappingAtemType
	index?: number
}
export interface MappingHTTPSend extends Mapping {
	device: DeviceType.HTTPSEND
}
export interface MappingLawo extends Mapping {
	device: DeviceType.LAWO,
	mappingType: MappingLawoType,
	identifier: string
}
export enum MappingAtemType {
	MixEffect,
	DownStreamKeyer,
	SuperSourceBox,
	Auxilliary,
	MediaPlayer,
	SuperSourceProperties
}
export enum MappingLawoType {
	SOURCE = 'source'
}
export enum DeviceType {
	ABSTRACT = 0,
	CASPARCG = 1,
	ATEM = 2,
	LAWO = 3, // yet to be implemented
	HTTPSEND = 4
}

export interface TimelineResolvedObjectExtended extends TimelineResolvedObject {
	isBackground?: boolean
	originalLLayer?: string | number
}
