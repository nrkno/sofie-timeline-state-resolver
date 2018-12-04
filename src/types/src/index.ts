export * from './atem'
export * from './casparcg'
export * from './http'
export * from './hyperdeck'
export * from './lawo'
export * from './osc'
export * from './pharos'
export * from './ptz'
import * as Timeline from './superfly-timeline'
export { Timeline }

export * from './mapping'

import { TimelineContentTypeAtem, TimelineObjAtemAny } from './atem'
import { TimelineContentTypeCasparCg, TimelineObjCCGAny } from './casparcg'
import { TimelineContentTypeHttp, TimelineObjHTTPRequest } from './http'
import { TimelineContentTypeHyperdeck, TimelineObjHyperdeckAny } from './hyperdeck'
import { TimelineContentTypeLawo, TimelineObjLawoAny } from './lawo'
import { TimelineContentTypeOSC, TimelineObjOSCMessage } from './osc'
import { TimelineContentTypePharos, TimelineObjPharosAny } from './pharos'
import { TimelineContentTypePanasonicPtz, TimelineObjPanasonicPtzAny } from './ptz'

export interface TimelineObjEmpty extends Timeline.TimelineObject {
	content: {}
	classes: Array<string>
}

export type TimelineContentTypeAny = TimelineContentTypeAtem
	| TimelineContentTypeCasparCg
	| TimelineContentTypeHttp
	| TimelineContentTypeHyperdeck
	| TimelineContentTypeLawo
	| TimelineContentTypeOSC
	| TimelineContentTypePharos
	| TimelineContentTypePanasonicPtz

export type TimelineObjectAny = TimelineObjEmpty
	| TimelineObjAtemAny
	| TimelineObjCCGAny
	| TimelineObjHTTPRequest
	| TimelineObjHyperdeckAny
	| TimelineObjLawoAny
	| TimelineObjOSCMessage
	| TimelineObjPanasonicPtzAny
	| TimelineObjPharosAny
