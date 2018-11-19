import { TimelineKeyframe, TimelineObject } from 'superfly-timeline'
import { Mapping, DeviceType } from './mapping'

export interface MappingPanasonicPtz extends Mapping {
	device: DeviceType.PANASONIC_PTZ
	mappingType: MappingPanasonicPtzType
}
export enum MappingPanasonicPtzType {
	PRESET_SPEED = 0,
	PRESET = 1,
	ZOOM = 2,
	ZOOM_SPEED = 3
}

export enum TimelineContentTypePanasonicPtz {
	PRESET = 'presetMem',
	SPEED = 'presetSpeed',
	ZOOM_SPEED = 'zoomSpeed',
	ZOOM = 'zoom'
}

export type TimelineObjPanasonicPtzAny = TimelineObjPanasonicPtz | TimelineObjPanasonicPtzPresetSpeed | TimelineObjPanasonicPtzPreset

export interface TimelineObjPanasonicPtz extends TimelineObject {
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
