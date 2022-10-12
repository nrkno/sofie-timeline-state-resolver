import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType, TimelineDatastoreReferencesContent } from '.'

export interface SofieChefOptions {
	address: string
}

export interface MappingSofieChef extends Mapping {
	device: DeviceType.SOFIE_CHEF
	windowIndex: number
}

export enum TimelineContentTypeSofieChef {
	URL = 'url',
}

export type TimelineObjSofieChefAny = TimelineObjSofieChefScene

export interface TimelineObjSofieChef extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.SOFIE_CHEF
		type: TimelineContentTypeSofieChef
	}
}
export interface TimelineObjSofieChefScene extends TimelineObjSofieChef {
	content: {
		deviceType: DeviceType.SOFIE_CHEF
		type: TimelineContentTypeSofieChef.URL

		url: string
	} & TimelineDatastoreReferencesContent
}
