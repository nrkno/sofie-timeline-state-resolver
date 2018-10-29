import {
	TimelineKeyframe,
	TimelineResolvedObject
} from 'superfly-timeline' // TODO - strip down to reduce dependency size

import {
	TimelineContentTypePanasonicPtz
} from './enums'

export type TimelineObjAny = TimelineObjPanasonicPtzAny | any

export type TimelineObjPanasonicPtzAny = TimelineObjPanasonicPtz | TimelineObjPanasonicPtzPresetSpeed | TimelineObjPanasonicPtzPreset

export interface TimelineObjPanasonicPtz extends TimelineResolvedObject {
	content: {
		keyframes?: Array<TimelineKeyframe>
		type: TimelineContentTypePanasonicPtz
	}
}
export interface TimelineObjPanasonicPtzZoomSpeed extends TimelineObjPanasonicPtz {
	content: {
		type: TimelineContentTypePanasonicPtz.ZOOM_SPEED
		zoomSpeed: number
	}
}

export interface TimelineObjPanasonicPtzZoom extends TimelineObjPanasonicPtz {
	content: {
		type: TimelineContentTypePanasonicPtz.ZOOM
		zoom: number
	}
}

export interface TimelineObjPanasonicPtzPresetSpeed extends TimelineObjPanasonicPtz {
	content: {
		type: TimelineContentTypePanasonicPtz.SPEED
		speed: number
	}
}

export interface TimelineObjPanasonicPtzPreset extends TimelineObjPanasonicPtz {
	content: {
		type: TimelineContentTypePanasonicPtz.PRESET
		preset: number
	}
}