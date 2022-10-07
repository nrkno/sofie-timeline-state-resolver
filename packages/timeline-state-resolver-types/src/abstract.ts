import { TSRTimelineObjBase, DeviceType, Mapping, TimelineDatastoreReferencesContent } from '.'

export interface MappingAbstract extends Mapping {
	device: DeviceType.ABSTRACT
}

export type AbstractOptions = Record<string, never>

export type TimelineObjAbstractAny = TSRTimelineObjAbstract
export interface TSRTimelineObjAbstract extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.ABSTRACT
		[key: string]: any
	} & TimelineDatastoreReferencesContent
}
