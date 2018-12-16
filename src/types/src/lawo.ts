import { TimelineObject } from './superfly-timeline'
import { Mapping, DeviceType } from './mapping'

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

export interface TimelineObjLawo extends TimelineObject {
	content: {
		type: TimelineContentTypeLawo,
		attributes: {
			[key: string]: {
				[attr: string]: any
				triggerValue?: string // only used for trigging new command sent
			}
		}
	}
}
export interface TimelineObjLawoSource extends TimelineObjLawo {
	content: {
		type: TimelineContentTypeLawo,
		attributes: {
			'Fader/Motor dB Value': {
				value: number,
				transitionDuration?: number,
				triggerValue?: string // only used for trigging new command sent
			}
		}
	}
}
