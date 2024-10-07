import {
	DeviceType,
	Mapping,
	MappingPanasonicPTZType,
	Mappings,
	SomeMappingPanasonicPTZ,
	TSRTimelineContent,
	Timeline,
	TimelineContentTypePanasonicPtz,
} from 'timeline-state-resolver-types'
import _ = require('underscore')

export interface PanasonicPtzState {
	speed?: {
		value: number
		timelineObjId: string
	}
	preset?: {
		value: number
		timelineObjId: string
	}
	zoomSpeed?: {
		value: number
		timelineObjId: string
	}
	zoom?: {
		value: number
		timelineObjId: string
	}
}

export function convertStateToPtz(
	state: Timeline.TimelineState<TSRTimelineContent>,
	mappings: Mappings
): PanasonicPtzState {
	// convert the timeline state into something we can use
	const ptzState: PanasonicPtzState = getDefaultState()

	_.each(state.layers, (tlObject, layerName: string) => {
		const mapping = mappings[layerName] as Mapping<SomeMappingPanasonicPTZ> | undefined
		if (
			mapping &&
			mapping.device === DeviceType.PANASONIC_PTZ &&
			tlObject.content.deviceType === DeviceType.PANASONIC_PTZ
			// todo - filter for deviceId?
		) {
			if (
				mapping.options.mappingType === MappingPanasonicPTZType.PresetMem &&
				tlObject.content.type === TimelineContentTypePanasonicPtz.PRESET
			) {
				ptzState.preset = {
					value: tlObject.content.preset,
					timelineObjId: tlObject.id,
				}
			} else if (
				mapping.options.mappingType === MappingPanasonicPTZType.PresetSpeed &&
				tlObject.content.type === TimelineContentTypePanasonicPtz.SPEED
			) {
				ptzState.speed = {
					value: tlObject.content.speed,
					timelineObjId: tlObject.id,
				}
			} else if (
				mapping.options.mappingType === MappingPanasonicPTZType.ZoomSpeed &&
				tlObject.content.type === TimelineContentTypePanasonicPtz.ZOOM_SPEED
			) {
				ptzState.zoomSpeed = {
					value: tlObject.content.zoomSpeed,
					timelineObjId: tlObject.id,
				}
			} else if (
				mapping.options.mappingType === MappingPanasonicPTZType.Zoom &&
				tlObject.content.type === TimelineContentTypePanasonicPtz.ZOOM
			) {
				ptzState.zoom = {
					value: tlObject.content.zoom,
					timelineObjId: tlObject.id,
				}
			}
		}
	})

	return ptzState
}

export function getDefaultState(): PanasonicPtzState {
	return {
		// preset: undefined,
		// speed: undefined,
		zoomSpeed: {
			value: 0,
			timelineObjId: 'default',
		},
		// zoom: undefined
	}
}
