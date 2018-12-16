import { TimelineObject, TimelineKeyframe } from './superfly-timeline'
import { Mapping, DeviceType } from './mapping'

export interface PharosOptions {
	host: string
	ssl: boolean
}

export interface MappingPharos extends Mapping {
	device: DeviceType.PHAROS
}

export enum TimelineContentTypePharos {
	SCENE = 'scene',
	TIMELINE = 'timeline'
}

export type TimelineObjPharosAny = TimelineObjPharosScene | TimelineObjPharosTimeline

export interface TimelineObjPharosScene extends TimelineObject {
	content: {
		keyframes?: Array<TimelineKeyframe>
		type: TimelineContentTypePharos.SCENE
		attributes: {
			scene: number,
			fade?: number,
			stopped?: boolean,
			noRelease?: true
		}
	}
}
export interface TimelineObjPharosTimeline extends TimelineObject {
	content: {
		keyframes?: Array<TimelineKeyframe>
		type: TimelineContentTypePharos.TIMELINE
		attributes: {
			timeline: number,
			pause?: boolean,
			rate?: boolean,
			fade?: number,
			stopped?: boolean,
			noRelease?: true
		}
	}
}
