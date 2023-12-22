import { DeviceType } from '..'

export enum OBSRequest {
	SET_CURRENT_SCENE = 'SetCurrentProgramScene',
	SET_PREVIEW_SCENE = 'SetCurrentPreviewScene',
	SET_CURRENT_TRANSITION = 'SetCurrentSceneTransition',
	START_RECORDING = 'StartRecord',
	STOP_RECORDING = 'StopRecord',
	START_STREAMING = 'StartStream',
	STOP_STREAMING = 'StopStream',
	SET_SCENE_ITEM_ENABLED = 'SetSceneItemEnabled',
	SET_SCENE_ITEM_TRANSFORM = 'SetSceneItemTransform',
	SET_MUTE = 'SetInputMute',
	SET_SOURCE_SETTINGS = 'SetInputSettings',
	SET_INPUT_VOLUME = 'SetInputVolume',
	TRIGGER_MEDIA_INPUT_ACTION = 'TriggerMediaInputAction',
	SET_MEDIA_INPUT_CURSOR = 'SetMediaInputCursor',
}

export type TimelineContentOBSAny =
	| TimelineContentOBSCurrentScene
	| TimelineContentOBSCurrentTransition
	| TimelineContentOBSRecording
	| TimelineContentOBSStreaming
	| TimelineContentOBSSceneItem
	| TimelineContentOBSInputAudio
	| TimelineContentOBSInputSettings
	| TimelineContentOBSInputMedia

export enum TimelineContentTypeOBS {
	CURRENT_SCENE = 'CURRENT_SCENE',
	CURRENT_TRANSITION = 'CURRENT_TRANSITION',
	RECORDING = 'RECORDING',
	STREAMING = 'STREAMING',

	SCENE_ITEM = 'SCENE_ITEM',

	INPUT_AUDIO = 'INPUT_AUDIO',
	INPUT_SETTINGS = 'INPUT_SETTINGS',
	INPUT_MEDIA = 'INPUT_MEDIA',
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

export interface TimelineContentOBSSceneItem extends TimelineContentOBSBase {
	deviceType: DeviceType.OBS
	type: TimelineContentTypeOBS.SCENE_ITEM

	/** Should the scene item be enabled */
	on?: boolean

	/** Should the scene item be enabled */
	transform?: OBSSceneItemTransform
}

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }
type XOR<T, U> = T | U extends Record<string, any> ? (Without<T, U> & U) | (Without<U, T> & T) : T | U

export type TimelineContentOBSInputSettings = TimelineContentOBSBase & {
	type: TimelineContentTypeOBS.INPUT_SETTINGS
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

export interface TimelineContentOBSInputAudio extends TimelineContentOBSBase {
	type: TimelineContentTypeOBS.INPUT_AUDIO

	/** If the audio should be muted (`true`: audio will not be output, `false`: audio will be output) */
	mute?: boolean

	volume?: number
}
export interface TimelineContentOBSInputMedia extends TimelineContentOBSBase {
	type: TimelineContentTypeOBS.INPUT_MEDIA

	seek?: number
	state?: 'playing' | 'paused' | 'stopped'
}

export interface OBSSceneItemTransform {
	cropBottom?: number
	cropLeft?: number
	cropRight?: number
	cropTop?: number

	height?: number
	width?: number

	positionX?: number
	positionY?: number

	rotation?: number

	scaleX?: number
	scaleY?: number
}
