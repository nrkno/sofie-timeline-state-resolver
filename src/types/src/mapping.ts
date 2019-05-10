import { ResolvedTimelineObjectInstance } from './superfly-timeline'

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
import { DeviceType } from '../../types/src'
export { DeviceType }

export interface DeviceOptions extends SlowReportOptions {
	type: DeviceType
	isMultiThreaded?: boolean
	threadUsage?: number
	options?: {}
}

export interface ResolvedTimelineObjectInstanceExtended extends ResolvedTimelineObjectInstance {
	isLookahead?: boolean
	originalLayer?: string | number
}

export interface SlowReportOptions {
	/** If set, report back that a command was slow if not sent at this time */
	limitSlowSentCommand?: number
	/** If set, report back that a command was slow if not fullfilled (sent + ack:ed) at this time */
	limitSlowFulfilledCommand?: number
}
