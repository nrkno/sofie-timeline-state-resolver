import { Mapping } from './mapping'
import { DeviceType } from '.'

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
	COMPOSITION = 'composition',
}

export type TimelineContentSingularLiveAny = TimelineContentSingularLiveComposition
export interface TimelineContentSingularLiveBase {
	deviceType: DeviceType.SINGULAR_LIVE
	type: TimelineContentTypeSingularLive
}

export interface TimelineContentSingularLiveComposition extends TimelineContentSingularLiveBase {
	type: TimelineContentTypeSingularLive.COMPOSITION

	animation?: SingularCompositionAnimation
	controlNode: SingularCompositionControlNode
}
export interface SingularCompositionAnimation {
	action: 'jump' | 'play'
	// stage: string
}
export interface SingularCompositionControlNode {
	payload: { [key: string]: string }
}
