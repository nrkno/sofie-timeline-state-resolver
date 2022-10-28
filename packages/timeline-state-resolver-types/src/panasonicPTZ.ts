import { Mapping } from './mapping'
import { DeviceType } from '.'

export interface MappingPanasonicPtz extends Mapping {
	device: DeviceType.PANASONIC_PTZ
	mappingType: MappingPanasonicPtzType
}
export enum MappingPanasonicPtzType {
	PRESET_SPEED = 0,
	PRESET = 1,
	ZOOM = 2,
	ZOOM_SPEED = 3,
}

export interface PanasonicPTZOptions {
	host?: string
	port?: number
	https?: boolean
}

export enum TimelineContentTypePanasonicPtz {
	PRESET = 'presetMem',
	SPEED = 'presetSpeed',
	ZOOM_SPEED = 'zoomSpeed',
	ZOOM = 'zoom',
}

export type TimelineContentPanasonicPtzAny =
	| TimelineContentPanasonicPtzZoomSpeed
	| TimelineContentPanasonicPtzZoom
	| TimelineContentPanasonicPtzPresetSpeed
	| TimelineContentPanasonicPtzPreset
export interface TimelineContentPanasonicPtz {
	deviceType: DeviceType.PANASONIC_PTZ
	type: TimelineContentTypePanasonicPtz
}
export interface TimelineContentPanasonicPtzZoomSpeed extends TimelineContentPanasonicPtz {
	type: TimelineContentTypePanasonicPtz.ZOOM_SPEED
	zoomSpeed: number
}

export interface TimelineContentPanasonicPtzZoom extends TimelineContentPanasonicPtz {
	type: TimelineContentTypePanasonicPtz.ZOOM
	zoom: number
}

export interface TimelineContentPanasonicPtzPresetSpeed extends TimelineContentPanasonicPtz {
	type: TimelineContentTypePanasonicPtz.SPEED
	speed: number
}

export interface TimelineContentPanasonicPtzPreset extends TimelineContentPanasonicPtz {
	type: TimelineContentTypePanasonicPtz.PRESET
	preset: number
}
