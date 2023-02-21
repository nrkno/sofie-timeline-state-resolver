import { ResolvedTimelineObjectInstance } from './superfly-timeline'
import { DeviceType, TSRTimelineContent } from '.'

export interface Mappings {
	[layerName: string]: Mapping
}
export interface Mapping {
	device: DeviceType
	deviceId: string
	/** Human-readable name given to the layer. Can be used by devices to set the label of e.g. a fader a mapping points to. */
	layerName?: string
}

export interface ResolvedTimelineObjectInstanceExtended<TContent = TSRTimelineContent>
	extends ResolvedTimelineObjectInstance<TContent>,
		TSRTimelineObjProps {}

export interface TSRTimelineObjProps {
	/** Only set to true when an object is inserted by lookahead */
	isLookahead?: boolean
	/** Only valid when isLookahead is true. Set so that a lookahead object knows what layer it belongs to */
	lookaheadForLayer?: string | number
}
