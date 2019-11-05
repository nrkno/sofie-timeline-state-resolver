import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'

export interface MappingSingularLive extends Mapping {
	device: DeviceType.SINGULAR_LIVE
	compositionName: string
}

export interface SingularLiveContent {
	type: TimelineContentTypeSingularLive
	temporalPriority?: number // default: 0
	/** Commands in the same queue will be sent in order (will wait for the previous to finish before sending next */
	queueId?: string
}
export interface SingularLiveOptions {
	accessToken: string
	// makeReadyCommands?: SingularLiveContent[]
}

export enum TimelineContentTypeSingularLive {
	COMPOSITION = 'composition'
}

export type TimelineObjSingularLiveAny = TimelineObjSingularLiveComposition
export interface TimelineObjSingularLiveBase extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.SINGULAR_LIVE
		type: TimelineContentTypeSingularLive
	}
}

export interface TimelineObjSingularLiveComposition extends TimelineObjSingularLiveBase {
	content: {
		deviceType: DeviceType.SINGULAR_LIVE
		type: TimelineContentTypeSingularLive.COMPOSITION
		controlNode: {
			payload: { [key: string]: string }
		}
	}
}
