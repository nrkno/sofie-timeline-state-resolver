import { Mapping, DeviceType } from './mapping'

import { TimelineObject, TimelineKeyframe } from 'superfly-timeline'

export interface MappingAtem extends Mapping {
	device: DeviceType.ATEM,
	mappingType: MappingAtemType
	index?: number
}
export enum MappingAtemType {
	MixEffect,
	DownStreamKeyer,
	SuperSourceBox,
	Auxilliary,
	MediaPlayer,
	SuperSourceProperties
}

export interface AtemOptions {
	host: string
	port?: number
}

export enum TimelineContentTypeAtem { //  Atem-state
	ME = 'me',
	DSK = 'dsk',
	AUX = 'aux',
	SSRC = 'ssrc',
	SSRCPROPS = 'ssrcProps',
	MEDIAPLAYER = 'mp'
}

export interface TimelineObjAtemAUX extends TimelineObject {
	content: {
		keyframes?: Array<TimelineKeyframe>
		type: TimelineContentTypeAtem.AUX
		attributes: {
			input: number
		}
	}
}
