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
	mappingType: MappingAtemType
	index?: number
}
export enum MappingAtemType {
	MixEffect,
	DownStreamKeyer,
	SuperSourceBox,
	Auxilliary,
	MediaPlayer
}
export enum DeviceType {
	ABSTRACT = 0,
	CASPARCG = 1,
	ATEM = 2,
	LAWO = 3, // yet to be implemented
	HTTPSEND = 4
}
