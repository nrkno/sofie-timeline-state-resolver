import { Mapping } from './mapping'
import { DeviceType } from '.'

export type MappingOBSAny =
	| MappingOBSCurrentScene
	| MappingOBSCurrentTransition
	| MappingOBSStreaming
	| MappingOBSRecording
	| MappingOBSSceneItemRender
	| MappingOBSMute
	| MappingOBSSourceSettings

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

export interface MappingOBSSourceSettings extends MappingOBS {
	mappingType: MappingOBSType.SourceSettings

	/** Source name */
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
	Mute = 5,
	SourceSettings = 6,
}

export enum OBSRequest {
	SET_CURRENT_SCENE = 'SetCurrentScene',
	SET_PREVIEW_SCENE = 'SetPreviewScene',
	SET_CURRENT_TRANSITION = 'SetCurrentTransition',
	START_RECORDING = 'StartRecording',
	STOP_RECORDING = 'StopRecording',
	START_STREAMING = 'StartStreaming',
	STOP_STREAMING = 'StopStreaming',
	SET_SCENE_ITEM_RENDEER = 'SetSceneItemRender',
	SET_MUTE = 'SetMute',
	SET_SOURCE_SETTINGS = 'SetSourceSettings',
}

export type TimelineContentOBSAny =
	| TimelineContentOBSCurrentScene
	| TimelineContentOBSCurrentTransition
	| TimelineContentOBSRecording
	| TimelineContentOBSStreaming
	| TimelineContentOBSSceneItemRender
	| TimelineContentOBSMute
	| TimelineContentOBSSourceSettings

export enum TimelineContentTypeOBS {
	CURRENT_SCENE = 'CURRENT_SCENE',
	CURRENT_TRANSITION = 'CURRENT_TRANSITION',
	RECORDING = 'RECORDING',
	STREAMING = 'STREAMING',
	SCENE_ITEM_RENDER = 'SCENE_ITEM_RENDER',
	MUTE = 'MUTE',
	SOURCE_SETTINGS = 'SOURCE_SETTINGS',
}
export interface TimelineContentOBSBase {
	deviceType: DeviceType.OBS
	type: TimelineContentTypeOBS
}

export interface TimelineContentOBSCurrentScene extends TimelineContentOBSBase {
	type: TimelineContentTypeOBS.CURRENT_SCENE

	/** Name of the scene that should be current */
	sceneName: string
}

export interface TimelineContentOBSCurrentTransition extends TimelineContentOBSBase {
	type: TimelineContentTypeOBS.CURRENT_TRANSITION

	/** Name of the transition that should be current */
	transitionName: string
}

export interface TimelineContentOBSRecording extends TimelineContentOBSBase {
	type: TimelineContentTypeOBS.RECORDING

	/** Should recording be turned on */
	on: boolean
}

export interface TimelineContentOBSStreaming extends TimelineContentOBSBase {
	type: TimelineContentTypeOBS.STREAMING

	/** Should streaming be turned on */
	on: boolean
}

export interface TimelineContentOBSSceneItemRender extends TimelineContentOBSBase {
	deviceType: DeviceType.OBS
	type: TimelineContentTypeOBS.SCENE_ITEM_RENDER

	/** Should the scene item be enabled */
	on: boolean
}

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }
type XOR<T, U> = T | U extends Record<string, any> ? (Without<T, U> & U) | (Without<U, T> & T) : T | U

export type TimelineContentOBSSourceSettings = TimelineContentOBSBase & {
	type: TimelineContentTypeOBS.SOURCE_SETTINGS
} & XOR<
		{
			sourceType: 'ffmpeg_source'
			sourceSettings: {
				close_when_inactive?: boolean
				hw_decode?: boolean
				input?: string
				is_local_file?: boolean
				local_file?: string
				looping?: boolean
			}
		},
		{
			sourceType: 'dshow_input' | 'browser_source' | 'window_capture' | 'image_source'
		}
	>

export interface TimelineContentOBSMute extends TimelineContentOBSBase {
	type: TimelineContentTypeOBS.MUTE

	/** If the audio should be muted (`true`: audio will not be output, `false`: audio will be output) */
	mute: boolean
}
