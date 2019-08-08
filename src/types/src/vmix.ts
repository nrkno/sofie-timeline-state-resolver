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
	TRANSITION_DURATION = 'TRANSITION_DURATION'
}

export type TimelineObjVMixAny = TimelineObjVMixInput
export enum TimelineContentTypeVMix {
	INPUT
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
		type: TimelineContentTypeVMix.INPUT,
		input: string,
		transition?: VMixTransition
	}
}

export interface VMixTransition {
	type: string // TODO: Enum
	duration: number
}
