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
	AUDIO_VOLUME = 'AUDIO_VOLUME',
	FADER = 'FADER',
	START_STREAMING = 'START_STREAMING',
	STOP_STREAMING = 'STOP_STREAMING',
	START_RECORDING = 'START_RECORDING',
	STOP_RECORDING = 'STOP_RECORDING',
	FADE_TO_BLACK = 'FADE_TO_BLACK',
	ADD_INPUT = 'ADD_INPUT',
	REMOVE_INPUT = 'REMOVE_INPUT',
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
	TimelineObjVMixProgram |
	TimelineObjVMixPreview |
	TimelineObjVMixAudio |
	TimelineObjVMixFader |
	TimelineObjVMixRecording |
	TimelineObjVMixStreaming |
	TimelineObjVMixExternal |
	TimelineObjVMixFadeToBlack |
	TimelineObjVMixOutput |
	TimelineObjVMixOverlay |
	TimelineObjVMixMedia
	// TimelineObjVMixAddInput |
	// TimelineObjVMixSetInputName |
	// TimelineObjVMixOverlayInputOFF |
	// TimelineObjVMixPlayClip |
	// TimelineObjVMixStopClip |
	// TimelineObjVMixClipToProgram |
	// TimelineObjVMixCameraActive |
	// TimelineObjVMixOverlayInputByNameIn

export enum TimelineContentTypeVMix {
	PROGRAM = 'PROGRAM',
	PREVIEW = 'PREVIEW',
	AUDIO = 'AUDIO',
	FADER = 'FADER',
	STREAMING = 'STREAMING',
	RECORDING = 'RECORDING',
	FADE_TO_BLACK = 'FADE_TO_BLACK',
	MEDIA = 'MEDIA',
	OUTPUT = 'OUTPUT',
	EXTERNAL = 'EXTERNAL',
	OVERLAY = 'OVERLAY'
}
export interface TimelineObjVMixBase extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix
	}
}

/*
export interface TimelineObjVMixMedia extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix
		mediaDirectory: string
	}
}
*/

export interface TimelineObjVMixProgram extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.PROGRAM
		input: number | string

		/** Transition effect (Stingers work only for Mix number 1) */
		transition?: VMixTransition

		/** Number of the mix (1 is the main mix, 2-4 are optional Mix Inputs) */
		mix?: 1 | 2 | 3 | 4
	}
}

export interface TimelineObjVMixPreview extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.PREVIEW
		input: number | string

		/** Number of the mix (1 is the main mix, 2-4 are optional Mix Inputs) */
		mix?: 1 | 2 | 3 | 4
	}
}

export interface TimelineObjVMixAudio extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.AUDIO
		input: number

		/** Channel volume (0-100) */
		volume?: number

		/** Channel balance (-1-1) */
		balance?: number

		/** If solo is enabled */
		solo?: boolean

		/** If input is muted */
		muted?: boolean

		/** Comma separated list of busses (M,A,B,C,D,E,F,G) */
		audioBusses?: string

		/** Audio followvideo */
		audioAuto?: boolean

		/** Fade length in milliseconds */
		// fade?: number
	}
}

export interface TimelineObjVMixFader extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.FADER,

		/** Position of the transition fader (0-100) */
		position: number
	}
}

export interface TimelineObjVMixStreaming extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.STREAMING

		/** If streaming should be turned on */
		on: boolean
	}
}

export interface TimelineObjVMixRecording extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.RECORDING

		/** If recording should be turned on */
		on: boolean
	}
}

export interface TimelineObjVMixFadeToBlack extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.FADE_TO_BLACK

		/** If Fade To Black should be turned on */
		on: boolean
	}
}

export interface TimelineObjVMixMedia extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.MEDIA
		// mediaType: VMixInputType
		filePath: string
		playing?: boolean
		seek?: number // position
		loop?: boolean
	}
}
/*
export interface TimelineObjVMixAddInput extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.ADD_INPUT
		mediaType: VMixInputType
		filePath: string
	}
}

export interface TimelineObjVMixRestartInput extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.RESTART_INPUT
		input: string
	}
}
*/

export interface TimelineObjVMixOutput extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.OUTPUT
		name: '2' | '3' | '4' | 'External2' | 'Fullscreen' | 'Fullscreen2'

		/** Type of the source sent to output */
		source: 'Preview' | 'Program' | 'MultiView' | 'Input'

		/** Number/name of the input when source:'Input' is chosen */
		input?: number | string
	}
}

export interface TimelineObjVMixExternal extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.EXTERNAL

		/** If external should be turned on */
		on: boolean
	}
}

export interface TimelineObjVMixOverlay extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.OVERLAY
		overlay: 1 | 2 | 3 | 4 | 5 | 6
		input: number | string
		// on: boolean // if that input should be on
	}
}

/* 
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
*/

export interface VMixTransition {
	// number: 1 | 2 | 3 | 4
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
	VerticalSlideReverse = 'VerticalSlideReverse',
	Stinger1 = 'Stinger1',
	Stinger2 = 'Stinger2'
}

export type VMixInputType = 'Video' | 'Image' | 'Photos' | 'Xaml' | 'VideoList' | 'Colour' | 'AudioFile' | 'Flash' | 'PowerPoint' | 'Capture' | 'NDI' | 'Audio'
