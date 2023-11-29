import { DeviceType } from '..'

export interface SingularLiveContent {
	type: TimelineContentTypeSingularLive
	temporalPriority?: number // default: 0
	/** Commands in the same queue will be sent in order (will wait for the previous to finish before sending next */
	queueId?: string
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
	controlNode: SingularCompositionControlNode
}
export interface SingularCompositionControlNode {
	/** The animation state that the node should be in. I.e. "In", "Out", etc. */
	state?: string
	/** The data that should be consumed by the node. Could be text, colors, etc. */
	payload?: { [key: string]: string }
}
