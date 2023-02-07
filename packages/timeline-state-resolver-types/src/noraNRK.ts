import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType, TimelineDatastoreReferencesContent } from '.'

export interface MappingNoraNRK extends Mapping {
	device: DeviceType.NORA_NRK
}

export interface NoraNRKCommandContent {
	group: string
	groupSuffix?: string
	channel: string

	payload:
		| {
				manifest?: string
				template: {
					name: string
					event: 'take' | 'takeout' | 'preview'
					layer: string
					[key: string]: string | number | any
				}
				[key: string]: string | number | any
		  }
		| {
				template: {
					event: 'takeout'
					layer: string
				}
		  }

	/** How the params are sent. Ignored for GET since params are sent in querystring. Default is JSON. */
	temporalPriority?: number // default: 0
	/** Commands in the same queue will be sent in order (will wait for the previous to finish before sending next */
	queueId?: string
}
export interface NoraNRKOptions {
	// Base URL for relative urls
	coreUrl?: string

	// API Key to be added as a query argument ?apiKey=
	apiKey?: string

	makeReadyCommands?: NoraNRKCommandContent[]
	/** Whether a makeReady should be treated as a reset of the device. It should be assumed clean, with the queue discarded, and state reapplied from empty */
	makeReadyDoesReset?: boolean

	/** Minimum time in ms before a command is resent, set to <= 0 or undefined to disable */
	resendTime?: number
}

export type TimelineObjNoraNRKAny = TimelineObjNoraNRKRequest
export interface TimelineObjNoraNRKBase extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.NORA_NRK
		// type: TimelineContentTypeCasparCg
	}
}
export interface TimelineObjNoraNRKRequest extends TimelineObjNoraNRKBase {
	content: {
		deviceType: DeviceType.NORA_NRK
	} & NoraNRKCommandContent &
		TimelineDatastoreReferencesContent
}
