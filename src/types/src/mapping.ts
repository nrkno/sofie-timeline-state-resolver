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
	PHAROS = 8,
	OSC = 9,
	HTTPWATCHER = 10
}

export interface DeviceOptions extends SlowReportOptions {
	type: DeviceType
	isMultiThreaded?: boolean
	threadUsage?: number
	options?: {}
}

export interface TimelineResolvedObjectExtended extends TimelineResolvedObject {
	isBackground?: boolean
	originalLLayer?: string | number
}

export interface SlowReportOptions {
	/** If set, report back that a command was slow if not sent at this time */
	limitSlowSentCommand?: number
	/** If set, report back that a command was slow if not fullfilled (sent + ack:ed) at this time */
	limitSlowFulfilledCommand?: number
}
