import { DeviceType } from '..'

export enum TimelineContentTypeSofieChef {
	URL = 'url',
}

export type TimelineContentSofieChefAny = TimelineContentSofieChefScene

export interface TimelineContentSofieChef {
	deviceType: DeviceType.SOFIE_CHEF
	type: TimelineContentTypeSofieChef
}
export interface TimelineContentSofieChefScene extends TimelineContentSofieChef {
	type: TimelineContentTypeSofieChef.URL

	url: string
}
