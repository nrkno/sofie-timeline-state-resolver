import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'

export type MappingOBSAny =
	| MappingOBSCurrentScene
	| MappingOBSCurrentTransition
	| MappingOBSStreaming
	| MappingOBSRecording
	| MappingOBSSceneItemRender
	| MappingOBSMute

export interface MappingOBS extends Mapping {
	device: DeviceType.OBS
	mappingType: MappingOBSType
	deviceId: string
}

export interface MappingOBSCurrentScene extends MappingOBS {
	mappingType: MappingOBSType.CurrentScene
}

export interface MappingOBSCurrentTransition extends MappingOBS {
	mappingType: MappingOBSType.CurrentTransition
}

export interface MappingOBSRecording extends MappingOBS {
	mappingType: MappingOBSType.Recording
}

export interface MappingOBSStreaming extends MappingOBS {
	mappingType: MappingOBSType.Streaming
}

export interface MappingOBSSceneItemRender extends MappingOBS {
	mappingType: MappingOBSType.SceneItemRender

	/** Name of the scene item to be modified */
	sceneName: string

	/** Scene item source name */
	source: string
}

export interface MappingOBSMute extends MappingOBS {
	mappingType: MappingOBSType.Mute

	/** Source name */
	source: string
}

export enum MappingOBSType {
	CurrentTransition = 0,
	CurrentScene = 1,
	Recording = 2,
	Streaming = 3,
	SceneItemRender = 4,
	Mute = 5
}

export interface OBSOptions {
	host: string
	port: number
	password?: string
}

export enum OBSRequest {
	SET_CURRENT_SCENE = 'SetCurrentScene',
	SET_CURRENT_TRANSITION = 'SetCurrentTransition',
	START_RECORDING = 'StartRecording',
	STOP_RECORDING = 'StopRecording',
	START_STREAMING = 'StartStreaming',
	STOP_STREAMING = 'StopStreaming',
	SET_SCENE_ITEM_RENDEER = 'SetSceneItemRender',
	SET_MUTE = 'SetMute'
}

export type TimelineObjOBSAny =
	| TimelineObjOBSCurrentScene
	| TimelineObjOBSCurrentTransition
	| TimelineObjOBSRecording
	| TimelineObjOBSStreaming
	| TimelineObjOBSSceneItemRender
	| TimelineObjOBSMute

export enum TimelineContentTypeOBS {
	CURRENT_SCENE = 'CURRENT_SCENE',
	CURRENT_TRANSITION = 'CURRENT_TRANSITION',
	RECORDING = 'RECORDING',
	STREAMING = 'STREAMING',
	SCENE_ITEM_RENDER = 'SCENE_ITEM_RENDER',
	MUTE = 'MUTE'
}
export interface TimelineObjOBSBase extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.OBS;
		type: TimelineContentTypeOBS;
	}
}

export interface TimelineObjOBSCurrentScene extends TimelineObjOBSBase {
	content: {
		deviceType: DeviceType.OBS;
		type: TimelineContentTypeOBS.CURRENT_SCENE;

		/** Name of the scene that should be current */
		sceneName: string;
	}
}

export interface TimelineObjOBSCurrentTransition extends TimelineObjOBSBase {
	content: {
		deviceType: DeviceType.OBS;
		type: TimelineContentTypeOBS.CURRENT_TRANSITION;

		/** Name of the transition that should be current */
		transitionName: string;
	}
}

export interface TimelineObjOBSRecording extends TimelineObjOBSBase {
	content: {
		deviceType: DeviceType.OBS;
		type: TimelineContentTypeOBS.RECORDING;

		/** Should recording be turned on */
		on: boolean;
	}
}

export interface TimelineObjOBSStreaming extends TimelineObjOBSBase {
	content: {
		deviceType: DeviceType.OBS;
		type: TimelineContentTypeOBS.STREAMING;

		/** Should streaming be turned on */
		on: boolean;
	}
}

export interface TimelineObjOBSSceneItemRender extends TimelineObjOBSBase {
	content: {
		deviceType: DeviceType.OBS;
		type: TimelineContentTypeOBS.SCENE_ITEM_RENDER;

		/** Should the scene item be enabled */
		on: boolean;
	}
}

export interface TimelineObjOBSMute extends TimelineObjOBSBase {
	content: {
		deviceType: DeviceType.OBS;
		type: TimelineContentTypeOBS.MUTE;

		/** If the audio should be muted (`true`: audio will not be output, `false`: audio will be output) */
		mute: boolean;
	}
}