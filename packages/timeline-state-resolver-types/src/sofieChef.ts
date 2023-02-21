import { Mapping } from './mapping'
import { DeviceType } from '.'

export interface SofieChefOptions {
	/** Address to the Sofie Chef websocket server. Example: 'ws://127.0.0.1:5271' */
	address: string
	/** Access key to the Sofie Chef API */
	apiKey?: string
}

export interface MappingSofieChef extends Mapping {
	device: DeviceType.SOFIE_CHEF
	windowId: string
}

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
