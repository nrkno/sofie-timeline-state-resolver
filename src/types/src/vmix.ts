import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'
import { VMixInputType } from '../../../src/devices/vmix'

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
	port: string
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
	SET_INPUT_NAME = 'SET_INPUT_NAME'
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
	TimelineObjVMixSetInputName

export enum TimelineContentTypeVMix {
	INPUT,
	PREVIEW,
	AUDIO,
	FADER,
	START_STREAMING,
	STOP_STREAMING,
	START_RECORDING,
	STOP_RECORDING,
	FADE_TO_BLACK,
	ADD_INPUT,
	PLAY_INPUT,
	PAUSE_INPUT,
	RESTART_INPUT,
	SET_POSITION,
	SET_INPUT_NAME
}
export interface TimelineObjVMixBase extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix
	}
}
export interface TimelineObjVMixInput extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.INPUT
		input: string
		transition?: VMixTransition
	}
}

export interface TimelineObjVMixPreview extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.PREVIEW
		input: string
	}
}

export interface TimelineObjVMixAudio extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.AUDIO
		input: string
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

export interface VMixTransition {
	type: VMixTransitionType
	duration: number
	button: 1 | 2 | 3 | 4
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
