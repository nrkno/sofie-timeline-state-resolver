import { DeviceType, Mapping } from '.'

export interface MappingAbstract extends Mapping {
	device: DeviceType.ABSTRACT
}

export type TimelineContentAbstractAny = TSRTimelineContentAbstract
export interface TSRTimelineContentAbstract {
	deviceType: DeviceType.ABSTRACT
	//		[key: string]: any
}
