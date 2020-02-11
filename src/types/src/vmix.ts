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
	AUDIO_VOLUME = 'AUDIO_VOLUME',
	AUDIO_BALANCE = 'AUDIO_BALANCE',
	AUDIO_ON = 'AUDIO_ON',
	AUDIO_OFF = 'AUDIO_OFF',
	AUDIO_AUTO_ON = 'AUDIO_AUTO_ON',
	AUDIO_AUTO_OFF = 'AUDIO_AUTO_OFF',
	AUDIO_BUS_ON = 'AUDIO_BUS_ON',
	AUDIO_BUS_OFF = 'AUDIO_BUS_OFF',
	FADER = 'FADER',
	SET_PAN_X = 'SET_PAN_X',
	SET_PAN_Y = 'SET_PAN_Y',
	SET_ZOOM = 'SET_ZOOM',
	SET_ALPHA = 'SET_ALPHA',
	START_STREAMING = 'START_STREAMING',
	STOP_STREAMING = 'STOP_STREAMING',
	START_RECORDING = 'START_RECORDING',
	STOP_RECORDING = 'STOP_RECORDING',
	FADE_TO_BLACK = 'FADE_TO_BLACK',
	ADD_INPUT = 'ADD_INPUT',
	REMOVE_INPUT = 'REMOVE_INPUT',
	PLAY_INPUT = 'PLAY_INPUT',
	PAUSE_INPUT = 'PAUSE_INPUT',
	LOOP_ON = 'LOOP_ON',
	LOOP_OFF = 'LOOP_OFF',
	SET_POSITION = 'SET_POSITION',
	SET_INPUT_NAME = 'SET_INPUT_NAME',
	SET_OUPUT = 'SET_OUTPUT',
	START_EXTERNAL = 'START_EXTERNAL',
	STOP_EXTERNAL = 'STOP_EXTERNAL',
	OVERLAY_INPUT_IN = 'OVERLAY_INPUT_IN',
	OVERLAY_INPUT_OUT = 'OVERLAY_INPUT_OUT',
	SET_INPUT_OVERLAY = 'SET_INPUT_OVERLAY'
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
	TimelineObjVMixInput

export enum TimelineContentTypeVMix {
	PROGRAM = 'PROGRAM',
	PREVIEW = 'PREVIEW',
	AUDIO = 'AUDIO',
	FADER = 'FADER',
	STREAMING = 'STREAMING',
	RECORDING = 'RECORDING',
	FADE_TO_BLACK = 'FADE_TO_BLACK',
	INPUT = 'INPUT',
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

export interface TimelineObjVMixProgram extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.PROGRAM

		/** Input number or name */
		input?: number | string

		/** Input layer name */
		inputLayer?: string

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

		input: number | string // should this be set here or gotten from the mapping

		/** Channel volume (0 - 100) */
		volume?: number

		/** Volume change fade length in milliseconds */
		fade?: number

		/** Channel balance (-1 - 1) */
		balance?: number

		/** If input is muted */
		muted?: boolean

		/** Comma separated list of busses to enable (M,A,B,C,D,E,F,G) */
		audioBuses?: string

		/** Audio follow video */
		audioAuto?: boolean
	}
}

export interface TimelineObjVMixFader extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.FADER,

		/** Position of the transition fader (0 - 100) */
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

export interface TimelineObjVMixInput extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.INPUT

		/** Input name, number, or file path */
		input: number | string

		/** Set only when dealing with media */
		inputType?: VMixInputType

		/** If media should be playing */
		playing?: boolean

		/** Starting position in milliseconds */
		seek?: number

		/** If media should loop */
		loop?: boolean

		transform?: VMixTransform

		/** List of input (Multi View) overlays; indexes start from 1 */
		overlays?: VMixInputOverlays
	}
}

/*
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
	}
}

export interface VMixTransform {
	/** Scale (0 - 5) */
	zoom: number

	/** Horizontal pan (-2 - 2) */
	panX: number

	/** Vertical pan (-2 - 2) */
	panY: number

	/** Transparency (0 - 255) */
	alpha: number
}

export interface VMixInputOverlays {
	[index: number]: number | string
}

export interface VMixTransition {
	effect: VMixTransitionType

	/** Duration in milliseconds */
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

export enum VMixInputType {
	Video = 'Video',
	Image = 'Image',
	Photos = 'Photos',
	Xaml = 'Xaml',
	AudioFile = 'AudioFile',
	Flash = 'Flash',
	PowerPoint = 'PowerPoint'
}
