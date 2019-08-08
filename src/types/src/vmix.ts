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
	STOP_RECORDING = 'STOP_RECORDING'
}

export type TimelineObjVMixAny = TimelineObjVMixInput | TimelineObjVMixPreview | TimelineObjVMixAudio | TimelineObjVMixFader | TimelineObjVmixStartRecording | TimelineObjVMixStopRecording | TimelineObjVMixStartStreaming | TimelineObjVMixStopStreaming
export enum TimelineContentTypeVMix {
	INPUT,
	PREVIEW,
	AUDIO,
	FADER,
	START_STREAMING,
	STOP_STREAMING,
	START_RECORDING,
	STOP_RECORDING
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

export interface VMixTransition {
	type: VMixTransitionType
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
