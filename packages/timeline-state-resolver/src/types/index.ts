export * from '../integrations/abstract/types'
export * from '../integrations/atem/types'
export * from '../integrations/casparCG/types'
export * from '../integrations/httpSend/types'
export * from '../integrations/httpWatcher/types'
export * from '../integrations/hyperdeck/types'
export * from '../integrations/lawo/types'
export * from '../integrations/osc/types'
export * from '../integrations/pharos/types'
export * from '../integrations/panasonicPTZ/types'
export * from '../integrations/sisyfos/types'
export * from '../integrations/quantel/types'
export * from '../integrations/shotoku/types'
export * from '../integrations/tcpSend/types'
export * from '../integrations/vizMSE/types'
export * from '../integrations/singularLive/types'
export * from '../integrations/vmix/types'
export * from '../integrations/obs/types'

export * from './device'
export * from './mapping'

import * as Timeline from './superfly-timeline'
import { TimelineObjAtemAny } from '../integrations/atem/types'
import { TimelineObjCasparCGAny } from '../integrations/casparCG/types'
import { TimelineObjHTTPSendAny } from '../integrations/httpSend/types'
import { TimelineObjTCPSendAny } from '../integrations/tcpSend/types'
import { TimelineObjHyperdeckAny } from '../integrations/hyperdeck/types'
import { TimelineObjLawoAny } from '../integrations/lawo/types'
import { TimelineObjOSCAny } from '../integrations/osc/types'
import { TimelineObjPharosAny } from '../integrations/pharos/types'
import { TimelineObjPanasonicPtzAny } from '../integrations/panasonicPTZ/types'
import { TimelineObjAbstractAny } from '../integrations/abstract/types'
import { TSRTimelineObjProps } from './mapping'
import { TimelineObjQuantelAny } from '../integrations/quantel/types'
import { TimelineObjShotoku } from '../integrations/shotoku/types'
import { TimelineObjSisyfosAny } from '../integrations/sisyfos/types'
import { TimelineObjVIZMSEAny } from '../integrations/vizMSE/types'
import { TimelineObjSingularLiveAny } from '../integrations/singularLive/types'
import { TimelineObjVMixAny } from '../integrations/vmix/types'
import { TimelineObjOBSAny } from '../integrations/obs/types'

export { Timeline }
export * from './mapping'
export * from './expectedPlayoutItems'
export * from './mediaObject'

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

export enum DeviceType {
	ABSTRACT = 0,
	CASPARCG = 1,
	ATEM = 2,
	LAWO = 3,
	HTTPSEND = 4,
	PANASONIC_PTZ = 5,
	TCPSEND = 6,
	HYPERDECK = 7,
	PHAROS = 8,
	OSC = 9,
	HTTPWATCHER = 10,
	SISYFOS = 11,
	QUANTEL = 12,
	VIZMSE = 13,
	SINGULAR_LIVE = 14,
	SHOTOKU = 15,
	VMIX = 20,
	OBS = 21,
}

export interface TSRTimelineKeyframe<T> extends Timeline.TimelineKeyframe {
	content: Partial<T>
}

export interface TSRTimelineObjBase extends Omit<Timeline.TimelineObject, 'content'>, TSRTimelineObjProps {
	content: {
		deviceType: DeviceType
	}
	keyframes?: Array<TSRTimelineKeyframe<this['content']>>
}

export interface TSRTimelineObjBaseWithOnAir extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType
		/** If the object in question is intended to NOT be on air.
		 * The exact result depends on the device, but it could affect things like making in-transitions quicker, faster camera movements, etc..
		 */
		notOnAir?: boolean
	}
}

export interface TimelineObjEmpty extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.ABSTRACT
		type: 'empty'
	}
	classes: Array<string>
}

export type TSRTimelineObj =
	| TimelineObjEmpty
	| TimelineObjAbstractAny
	| TimelineObjAtemAny
	| TimelineObjCasparCGAny
	| TimelineObjHTTPSendAny
	| TimelineObjTCPSendAny
	| TimelineObjHyperdeckAny
	| TimelineObjLawoAny
	| TimelineObjOBSAny
	| TimelineObjOSCAny
	| TimelineObjPharosAny
	| TimelineObjPanasonicPtzAny
	| TimelineObjQuantelAny
	| TimelineObjShotoku
	| TimelineObjSisyfosAny
	| TimelineObjSingularLiveAny
	| TimelineObjVMixAny
	| TimelineObjVIZMSEAny

export type TSRTimeline = Array<TSRTimelineObj>
