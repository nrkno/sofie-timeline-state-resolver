export * from './atem'
export * from './casparcg'
export * from './http'
export * from './hyperdeck'
export * from './lawo'
export * from './osc'
export * from './pharos'
export * from './ptz'
export * from './sisyfos'
export * from './quantel'
export * from './tcpSend'
export * from './vizMSE'
import * as Timeline from './superfly-timeline'
import { TimelineObjAtemAny } from './atem'
import { TimelineObjCasparCGAny } from './casparcg'
import { TimelineObjHTTPSendAny } from './http'
import { TimelineObjTCPSendAny } from './tcpSend'
import { TimelineObjHyperdeckAny } from './hyperdeck'
import { TimelineObjLawoAny } from './lawo'
import { TimelineObjOSCAny } from './osc'
import { TimelineObjPharosAny } from './pharos'
import { TimelineObjPanasonicPtzAny } from './ptz'
import { TimelineObjAbstractAny } from './abstract'
import { TSRTimelineObjProps } from './mapping'
import { TimelineObjQuantelAny } from './quantel'
import { TimelineObjSisyfosAny } from './sisyfos'
import { TimelineObjVIZMSEAny } from './vizMSE'

export { Timeline }
export * from './mapping'

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
	VIZMSE = 13
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

export type TSRTimelineObj = (
	TimelineObjEmpty |
	TimelineObjAbstractAny |
	TimelineObjAtemAny |
	TimelineObjCasparCGAny |
	TimelineObjHTTPSendAny |
	TimelineObjTCPSendAny |
	TimelineObjHyperdeckAny |
	TimelineObjLawoAny |
	TimelineObjOSCAny |
	TimelineObjPharosAny |
	TimelineObjPanasonicPtzAny |
	TimelineObjQuantelAny |
	TimelineObjSisyfosAny |
	TimelineObjVIZMSEAny
)

export type TSRTimeline = Array<TSRTimelineObj>
