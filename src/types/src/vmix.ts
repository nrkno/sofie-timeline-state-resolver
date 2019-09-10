import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'

export interface MappingVMix extends Mapping {
	device: DeviceType.VMIX
	deviceId: string
}
export interface VMixCommandContent {
	// type: TimelineContentType

}
export interface VMixOptions {
	makeReadyCommands?: VMixCommandContent[],
	host: string,
	port: number
}

export enum VMixCommand {
	PREVIEW_INPUT = 'PREVIEW_INPUT',
	ACTIVE_INPUT = 'ACTIVE_INPUT',
	TRANSITION = 'TRANSITION',
	TRANSITION_EFFECT = 'TRANSITION_EFFECT',
	TRANSITION_DURATION = 'TRANSITION_DURATION',
	AUDIO = 'AUDIO',
	FADER = 'FADER',
	START_STREAMING = 'START_STREAMING',
	STOP_STREAMING = 'STOP_STREAMING',
	START_RECORDING = 'START_RECORDING',
	STOP_RECORDING = 'STOP_RECORDING',
	FADE_TO_BLACK = 'FADE_TO_BLACK',
	ADD_INPUT = 'ADD_INPUT',
	PLAY_INPUT = 'PLAY_INPUT',
	PAUSE_INPUT = 'PAUSE_INPUT',
	SET_POSITION = 'SET_POSITION',
	SET_INPUT_NAME = 'SET_INPUT_NAME',
	SET_OUPUT = 'SET_OUTPUT',
	START_EXTERNAL = 'START_EXTERNAL',
	STOP_EXTERNAL = 'STOP_EXTERNAL',
	OVERLAY_INPUT_IN = 'OVERLAY_INPUT_IN',
	OVERLAY_INPUT_OUT = 'OVERLAY_INPUT_OUT',
	OVERLAY_INPUT_OFF = 'OVERLAY_INPUT_OFF',
	PLAY_CLIP = 'PLAY_CLIP',
	STOP_CLIP = 'STOP_CLIP',
	CLIP_TO_PROGRAM = 'CLIP_TO_PROGRAM',
	CAMERA_ACTIVE = 'CAMERA_ACTIVE',
	OVERLAY_INPUT_BY_NAME_IN = 'OVERLAY_INPUT_BY_NAME_IN'
}

export type TimelineObjVMixAny =
	TimelineObjVMixInput |
	TimelineObjVMixPreview |
	TimelineObjVMixAudio |
	TimelineObjVMixFader |
	TimelineObjVmixStartRecording |
	TimelineObjVMixStopRecording |
	TimelineObjVMixStartStreaming |
	TimelineObjVMixStopStreaming |
	TimelineObjVMixFadeToBlack |
	TimelineObjVMixAddInput |
	TimelineObjVMixPlayInput |
	TimelineObjVMixPauseInput |
	TimelineObjVMixRestartInput |
	TimelineObjVMixSetPosition |
	TimelineObjVMixSetInputName |
	TimelineObjVMixSetOutput |
	TimelineObjVMixStartExternal |
	TimelineObjVMixStopExternal |
	TimelineObjVMixOverlayInputIn |
	TimelineObjVMixOverlayInputOut |
	TimelineObjVMixOverlayInputOFF |
	TimelineObjVMixPlayClip |
	TimelineObjVMixStopClip |
	TimelineObjVMixClipToProgram |
	TimelineObjVMixCameraActive |
	TimelineObjVMixOverlayInputByNameIn

export enum TimelineContentTypeVMix {
	INPUT = 'INPUT',
	PREVIEW = 'PREVIEW',
	AUDIO = 'AUDIO',
	FADER = 'FADER',
	START_STREAMING = 'START_STREAMING',
	STOP_STREAMING = 'STOP_STREAMING',
	START_RECORDING = 'START_RECORDING',
	STOP_RECORDING = 'STOP_RECORDING',
	FADE_TO_BLACK = 'FADE_TO_BLACK',
	ADD_INPUT = 'ADD_INPUT',
	PLAY_INPUT = 'PLAY_INPUT',
	PAUSE_INPUT = 'PAUSE_INPUT',
	RESTART_INPUT = 'RESTART_INPUT',
	SET_POSITION = 'SET_POSITION',
	SET_INPUT_NAME = 'SET_INPUT_NAME',
	SET_OUTPUT = 'SET_OUT',
	START_EXTERNAL = 'START_EXTERNAL',
	STOP_EXTERNAL = 'STOP_EXTERNAL',
	OVERLAY_INPUT_IN = 'OVERLAY_INPUT_IN',
	OVERLAY_INPUT_OUT = 'OVERLAY_INPUT_OUT',
	OVERLAY_INPUT_OFF = 'OVERLAY_INPUT_OFF',
	PLAY_CLIP = 'PLAY_CLIP',
	STOP_CLIP = 'STOP_CLIP',
	CLIP_TO_PROGRAM = 'CLIP_TO_PROGRAM',
	CAMERA_ACTIVE = 'CAMERA_ACTIVE',
	OVERLAY_INPUT_BY_NAME_IN = 'OVERLAY_INPUT_BY_NAME_IN'
}
export interface TimelineObjVMixBase extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix
	}
}

export interface TimelineObjVMixMedia extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix
		mediaDirectory: string
	}
}

export interface TimelineObjVMixInput extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.INPUT
		input: number
		transition?: VMixTransition
	}
}

export interface TimelineObjVMixPreview extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.PREVIEW
		input: number
	}
}

export interface TimelineObjVMixAudio extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.AUDIO
		input: number
		volume: number
	}
}

export interface TimelineObjVMixFader extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.FADER,
		position: number
	}
}

export interface TimelineObjVMixStartStreaming extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.START_STREAMING
	}
}

export interface TimelineObjVMixStopStreaming extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.STOP_STREAMING
	}
}

export interface TimelineObjVmixStartRecording extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.START_RECORDING
	}
}

export interface TimelineObjVMixStopRecording extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.STOP_RECORDING
	}
}

export interface TimelineObjVMixFadeToBlack extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.FADE_TO_BLACK
	}
}

export interface TimelineObjVMixAddInput extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.ADD_INPUT
		mediaType: VMixInputType
		filePath: string
	}
}

export interface TimelineObjVMixPlayInput extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.PLAY_INPUT
		input: string
	}
}

export interface TimelineObjVMixPauseInput extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.PAUSE_INPUT
		input: string
	}
}

export interface TimelineObjVMixRestartInput extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.RESTART_INPUT
		input: string
	}
}

export interface TimelineObjVMixSetPosition extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.SET_POSITION
		input: string,
		position: number
	}
}

export interface TimelineObjVMixSetInputName extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.SET_INPUT_NAME
		input: string
		name: string
	}
}

export interface TimelineObjVMixSetOutput extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.SET_OUTPUT
		name: '2' | '3' | '4' | 'External2' | 'Fullscreen' | 'Fullscreen2'
		output: string
	}
}

export interface TimelineObjVMixStartExternal extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.START_EXTERNAL
	}
}

export interface TimelineObjVMixStopExternal extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.STOP_EXTERNAL
	}
}

export interface TimelineObjVMixOverlayInputIn extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.OVERLAY_INPUT_IN
		overlay: 1 | 2 | 3 | 4 | 5 | 6
		input: string
	}
}

export interface TimelineObjVMixOverlayInputOut extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.OVERLAY_INPUT_OUT
		overlay: 1 | 2 | 3 | 4 | 5 | 6
	}
}

export interface TimelineObjVMixOverlayInputOFF extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.OVERLAY_INPUT_OFF
		overlay: 1 | 2 | 3 | 4 | 5 | 6
	}
}

export interface TimelineObjVMixPlayClip extends TimelineObjVMixMedia {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.PLAY_CLIP
		mediaDirectory: string
		clipName: string
	}
}

export interface TimelineObjVMixStopClip extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.STOP_CLIP
		clipName: string
	}
}

export interface TimelineObjVMixClipToProgram extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.CLIP_TO_PROGRAM
		clipName: string
		transition?: VMixTransition
	}
}

export interface TimelineObjVMixCameraActive extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.CAMERA_ACTIVE
		camera: string
		transition?: VMixTransition
	}
}

export interface TimelineObjVMixOverlayInputByNameIn extends TimelineObjVMixMedia {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.OVERLAY_INPUT_BY_NAME_IN
		inputName: string
		mediaDirectory: string
		overlay: 1 | 2 | 3 | 4 | 5 | 6
	}
}

export interface VMixTransition {
	number: 1 | 2 | 3 | 4
	effect: VMixTransitionType
	duration: number
}

export enum VMixTransitionType {
	Cut = 'Cut',
	Fade = 'Fade',
	Zoom = 'Zoom',
	Wipe = 'Wipe',
	Slide = 'Slide',
	Fly = 'Fly',
	CrossZoom = 'CrossZoom',
	FlyRotate = 'FlyRotate',
	Cube = 'Cube',
	CubeZoom = 'CubeZoom',
	VerticalWipe = 'VerticalWipe',
	VerticalSlide = 'VerticalSlide',
	Merge = 'Merge',
	WipeReverse = 'WipeReverse',
	SlideReverse = 'SlideReverse',
	VerticalWipeReverse = 'VerticalWipeReverse',
	VerticalSlideReverse = 'VerticalSlideReverse' // TODO: Add stingers
}

export type VMixInputType = 'Video' | 'Image' | 'Photos' | 'Xaml' | 'VideoList' | 'Colour' | 'AudioFile' | 'Flash' | 'PowerPoint' | 'Capture'
