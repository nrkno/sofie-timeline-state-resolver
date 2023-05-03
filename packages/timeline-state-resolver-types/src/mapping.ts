import { ResolvedTimelineObjectInstance } from './superfly-timeline'
import { DeviceType, TSRTimelineContent } from '.'

export interface Mappings<TOptions extends { mappingType: string } | unknown = unknown> {
	[layerName: string]: Mapping<TOptions>
}

export interface Mapping<TOptions extends { mappingType: string } | unknown, TType = DeviceType> {
	device: TType // TODO - is this helpful being generic?
	deviceId: string

	/** Human-readable name given to the layer. Can be used by devices to set the label of e.g. a fader a mapping points to. */
	layerName?: string

	/** Mapping specific options */
	options: TOptions
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
