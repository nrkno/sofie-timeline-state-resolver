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
	ACTIVE_INPUT = 'ACTIVE_INPUT'
}

export type TimelineObjVMixAny = TimelineObjVMixInput | TimelineObjVMixMedia
export enum TimelineContentTypeVMix {
	INPUT,
	MEDIAPLAYER,
	AUDIO
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
		input: string
	}
}

export interface TimelineObjVMixMedia extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX,
		type: TimelineContentTypeVMix.MEDIAPLAYER

		asdf: number
	}
}
