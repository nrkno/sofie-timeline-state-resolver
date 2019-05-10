export * from './atem'
export * from './casparcg'
export * from './http'
export * from './hyperdeck'
export * from './lawo'
export * from './osc'
export * from './pharos'
export * from './ptz'
import * as Timeline from './superfly-timeline'
import { TimelineObjAtemAny } from './atem'
import { TimelineObjCasparCGAny } from './casparcg'
import { TimelineObjHTTPSendAny } from './http'
import { TimelineObjHyperdeckAny } from './hyperdeck'
import { TimelineObjLawoAny } from './lawo'
import { TimelineObjOSCAny } from './osc'
import { TimelineObjPharosAny } from './pharos'
import { TimelineObjPanasonicPtzAny } from './ptz'
import { TimelineObjAbstractAny } from './abstract'
export { Timeline }

export * from './mapping'

export interface TimelineObjEmpty extends Timeline.TimelineObject {
	content: {}
	classes: Array<string>
}

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

export enum DeviceType {
	ABSTRACT = 0,
	CASPARCG = 1,
	ATEM = 2,
	LAWO = 3,
	HTTPSEND = 4,
	PANASONIC_PTZ = 5,
	HYPERDECK = 7,
	PHAROS = 8,
	OSC = 9,
	HTTPWATCHER = 10
}

// export type TimelineContentTypeAny = TimelineContentTypeAtem
// 	| TimelineContentTypeCasparCg
// 	| TimelineContentTypeHttp
// 	| TimelineContentTypeHyperdeck
// 	| TimelineContentTypeLawo
// 	| TimelineContentTypeOSC
// 	| TimelineContentTypePharos
// 	| TimelineContentTypePanasonicPtz

// export type TimelineObjectAny = TimelineObjEmpty
// 	| TimelineObjAtemAny
// 	| TimelineObjCCGAny
// 	| TimelineObjHTTPRequest
// 	| TimelineObjHyperdeckAny
// 	| TimelineObjLawoAny
// 	| TimelineObjOSCMessage
// 	| TimelineObjPanasonicPtzAny
// 	| TimelineObjPharosAny

export interface TSRTimelineObjBase extends Omit<Timeline.TimelineObject, 'content'> {
	content: {
		deviceType: DeviceType
	}
}

export type TSRTimelineObj = (
	TimelineObjAbstractAny |
	TimelineObjAtemAny |
	TimelineObjCasparCGAny |
	TimelineObjHTTPSendAny |
	TimelineObjHyperdeckAny |
	TimelineObjLawoAny |
	TimelineObjOSCAny |
	TimelineObjPharosAny |
	TimelineObjPanasonicPtzAny
)

export type TSRTimeline = Array<TSRTimelineObj>
