import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'

export interface MappingSingularLive extends Mapping {
	device: DeviceType.SINGULAR_LIVE
}

export interface SingularLiveUpdateShowDataCommandContent extends SingularLiveCommandContent {
	type: TimelineContentTypeSingularLive.UPDATE_SHOW_DATA,
	controlNode: {
		payload: { [key: string]: string }
	}
}

export interface SingularLiveControlAnimationCommandContent extends SingularLiveCommandContent {
	type: TimelineContentTypeSingularLive.CONTROL_ANIMATION,
	animation: {
		action: 'play' | 'jump'
		to: string
	}
}

export interface SingularLiveCommandContent {
	type: TimelineContentTypeSingularLive
	compositionName: string
	temporalPriority?: number // default: 0
	/** Commands in the same queue will be sent in order (will wait for the previous to finish before sending next */
	queueId?: string
}
export interface SingularLiveOptions {
	accessToken: string
	makeReadyCommands?: SingularLiveCommandContent[]
}

export enum TimelineContentTypeSingularLive {
	CONTROL_ANIMATION = 'control_animation',
	UPDATE_SHOW_DATA = 'update_show_data'
}

export type TimelineObjSingularLiveAny = TimelineObjSingularLive
export interface TimelineObjSingularLiveBase extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.SINGULAR_LIVE
		// type: TimelineContentTypeCasparCg
	}
}
export interface TimelineObjSingularLive extends TimelineObjSingularLiveBase {
	content: {
		deviceType: DeviceType.SINGULAR_LIVE
	} & SingularLiveCommandContent
}
