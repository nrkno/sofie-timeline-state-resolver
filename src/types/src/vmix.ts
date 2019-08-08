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
	FADER = 'FADER'
}

export type TimelineObjVMixAny = TimelineObjVMixInput | TimelineObjVMixPreview | TimelineObjVMixAudio | TimelineObjVMixFader
export enum TimelineContentTypeVMix {
	INPUT,
	PREVIEW,
	AUDIO,
	FADER
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
