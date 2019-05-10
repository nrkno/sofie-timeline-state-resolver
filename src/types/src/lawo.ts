import { Mapping, DeviceType } from './mapping'
import { TSRTimelineObjBase } from '.'

export interface MappingLawo extends Mapping {
	device: DeviceType.LAWO,
	mappingType: MappingLawoType,
	identifier: string
}
export enum MappingLawoType {
	SOURCE = 'source'
}

export enum TimelineContentTypeLawo { //  Lawo-state
	SOURCE = 'lawosource' // a general content type, possibly to be replaced by specific ones later?
}

export type TimelineObjLawoAny = TimelineObjLawoSource

export interface TimelineObjLawoBase extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.LAWO
		type: TimelineContentTypeLawo
	}
}
export interface TimelineObjLawoSource extends TimelineObjLawoBase {
	content: {
		deviceType: DeviceType.LAWO
		type: TimelineContentTypeLawo.SOURCE,

		'Fader/Motor dB Value': {
			value: number,
			transitionDuration?: number,
			triggerValue?: string // only used for trigging new command sent
		}
	}
}
