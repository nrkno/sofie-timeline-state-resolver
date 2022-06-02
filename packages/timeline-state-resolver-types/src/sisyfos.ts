import { Mapping } from './mapping'
import { DeviceType, TSRTimelineObjBase } from '.'

export interface SisyfosOptions {
	host: string
	port: number
}

export enum MappingSisyfosType {
	CHANNEL = 'channel',
	CHANNEL_BY_LABEL = 'channel_by_label',
	CHANNELS = 'channels',
}
export type MappingSisyfos = MappingSisyfosChannel | MappingSisyfosChannelByLabel | MappingSisyfosChannels
interface MappingSisyfosBase extends Mapping {
	device: DeviceType.SISYFOS
	mappingType: MappingSisyfosType // defaults to MappingSisyfosType.CHANNEL if not set
}
export interface MappingSisyfosChannelByLabel extends MappingSisyfosBase {
	mappingType: MappingSisyfosType.CHANNEL_BY_LABEL
	label: string
}
export interface MappingSisyfosChannel extends MappingSisyfosBase {
	mappingType: MappingSisyfosType.CHANNEL
	channel: number
	setLabelToLayerName: boolean
}
export interface MappingSisyfosChannels extends MappingSisyfosBase {
	mappingType: MappingSisyfosType.CHANNELS
}

export enum TimelineContentTypeSisyfos {
	CHANNEL = 'channel',
	CHANNELS = 'channels',
	TRIGGERVALUE = 'triggerValue',
}

export type TimelineObjSisyfosAny =
	| TimelineObjSisyfosChannel
	| TimelineObjSisyfosChannels
	| TimelineObjSisyfosTriggerValue

export interface TimelineObjSisyfos extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.SISYFOS
		type: TimelineContentTypeSisyfos
	}
}

export interface SisyfosChannelOptions {
	isPgm?: 0 | 1 | 2 // 0=off 1=PGM 2=VO
	faderLevel?: number
	label?: string
	visible?: boolean
	fadeTime?: number
}

export interface TimelineObjSisyfosTriggerValue extends TimelineObjSisyfos {
	content: {
		deviceType: DeviceType.SISYFOS
		type: TimelineContentTypeSisyfos.TRIGGERVALUE

		triggerValue: string
	}
}
export interface TimelineObjSisyfosChannel extends TimelineObjSisyfos {
	content: {
		deviceType: DeviceType.SISYFOS
		type: TimelineContentTypeSisyfos.CHANNEL
		resync?: boolean
		overridePriority?: number // defaults to 0
	} & SisyfosChannelOptions
}
export interface TimelineObjSisyfosChannels extends TimelineObjSisyfos {
	content: {
		deviceType: DeviceType.SISYFOS
		type: TimelineContentTypeSisyfos.CHANNELS
		channels: ({
			/** The mapping layer to look up the channel from */
			mappedLayer: string
		} & SisyfosChannelOptions)[]
		resync?: boolean
		overridePriority?: number // defaults to 0
		triggerValue?: string
	}
}
