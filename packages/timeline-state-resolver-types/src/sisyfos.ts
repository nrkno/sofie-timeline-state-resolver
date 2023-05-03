import { DeviceType } from '.'

export enum TimelineContentTypeSisyfos {
	CHANNEL = 'channel',
	CHANNELS = 'channels',
	TRIGGERVALUE = 'triggerValue',
}

export type TimelineContentSisyfosAny =
	| TimelineContentSisyfosChannel
	| TimelineContentSisyfosChannels
	| TimelineContentSisyfosTriggerValue

export interface TimelineContentSisyfos {
	deviceType: DeviceType.SISYFOS
	type: TimelineContentTypeSisyfos
}

export interface SisyfosChannelOptions {
	isPgm?: 0 | 1 | 2 // 0=off 1=PGM 2=VO
	faderLevel?: number
	label?: string
	visible?: boolean
	fadeTime?: number
}

export interface TimelineContentSisyfosTriggerValue extends TimelineContentSisyfos {
	type: TimelineContentTypeSisyfos.TRIGGERVALUE

	triggerValue: string
}
export interface TimelineContentSisyfosChannel extends TimelineContentSisyfos, SisyfosChannelOptions {
	type: TimelineContentTypeSisyfos.CHANNEL
	resync?: boolean
	overridePriority?: number // defaults to 0
}
export interface TimelineContentSisyfosChannels extends TimelineContentSisyfos {
	type: TimelineContentTypeSisyfos.CHANNELS
	channels: ({
		/** The mapping layer to look up the channel from */
		mappedLayer: string
	} & SisyfosChannelOptions)[]
	resync?: boolean
	overridePriority?: number // defaults to 0
	triggerValue?: string
}
