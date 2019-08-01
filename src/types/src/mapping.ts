import { ResolvedTimelineObjectInstance } from './superfly-timeline'
import { DeviceType } from '.'

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

export interface DeviceOptions extends SlowReportOptions {
	type: DeviceType
	isMultiThreaded?: boolean
	threadUsage?: number
	options?: {}
}

export interface ResolvedTimelineObjectInstanceExtended extends ResolvedTimelineObjectInstance, TSRTimelineObjProps {
}

export interface TSRTimelineObjProps {
	/** Only set to true when an object is inserted by lookahead */
	isLookahead?: boolean
	/** Only valid when isLookahead is true. Set so that a lookahead object knows what layer it belongs to */
	lookaheadForLayer?: string | number
}

export interface SlowReportOptions {
	/** If set, report back that a command was slow if not sent at this time */
	limitSlowSentCommand?: number
	/** If set, report back that a command was slow if not fullfilled (sent + ack:ed) at this time */
	limitSlowFulfilledCommand?: number
}
