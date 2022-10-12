export * from './abstract'
export * from './atem'
export * from './casparcg'
export * from './httpSend'
export * from './httpWatcher'
export * from './hyperdeck'
export * from './lawo'
export * from './osc'
export * from './pharos'
export * from './panasonicPTZ'
export * from './sisyfos'
export * from './sofieChef'
export * from './quantel'
export * from './shotoku'
export * from './tcpSend'
export * from './vizMSE'
export * from './singularLive'
export * from './vmix'
export * from './obs'

export * from './device'
export * from './mapping'

import * as Timeline from './superfly-timeline'
import { TimelineObjAtemAny } from './atem'
import { TimelineObjCasparCGAny } from './casparcg'
import { TimelineObjHTTPSendAny } from './httpSend'
import { TimelineObjTCPSendAny } from './tcpSend'
import { TimelineObjHyperdeckAny } from './hyperdeck'
import { TimelineObjLawoAny } from './lawo'
import { TimelineObjOSCAny } from './osc'
import { TimelineObjPharosAny } from './pharos'
import { TimelineObjPanasonicPtzAny } from './panasonicPTZ'
import { TimelineObjAbstractAny } from './abstract'
import { TSRTimelineObjProps } from './mapping'
import { TimelineObjQuantelAny } from './quantel'
import { TimelineObjShotoku } from './shotoku'
import { TimelineObjSisyfosAny } from './sisyfos'
import { TimelineObjSofieChefAny } from './sofieChef'
import { TimelineObjVIZMSEAny } from './vizMSE'
import { TimelineObjSingularLiveAny } from './singularLive'
import { TimelineObjVMixAny } from './vmix'
import { TimelineObjOBSAny } from './obs'

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
	SOFIE_CHEF = 22,
}

export interface TSRTimelineKeyframe<T> extends Timeline.TimelineKeyframe {
	content: Partial<T>
}

/**
 * An object containing references to the datastore
 */
export interface TimelineDatastoreReferences {
	/**
	 * localPath is the path to the property in the content object to override
	 */
	[localPath: string]: {
		/** Reference to the Datastore key where to fetch the value */
		datastoreKey: string
		/**
		 * If true, the referenced value in the Datastore is only applied after the timeline-object has started (ie a later-started timeline-object will not be affected)
		 */
		overwrite: boolean
	}
}
export interface TimelineDatastoreReferencesContent {
	$references?: TimelineDatastoreReferences
}

export interface TSRTimelineObjBase extends Omit<Timeline.TimelineObject, 'content'>, TSRTimelineObjProps {
	content: {
		deviceType: DeviceType
	} & TimelineDatastoreReferencesContent
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
	| TimelineObjSofieChefAny
	| TimelineObjSingularLiveAny
	| TimelineObjVMixAny
	| TimelineObjVIZMSEAny

export type TSRTimeline = Array<TSRTimelineObj>

/**
 * A simple key value store that can be referred to from the timeline objects
 */
export interface Datastore {
	[datastoreKey: string]: {
		/** The value that will replace a value in the Timeline-object content */
		value: any
		/** A unix-Timestamp of when the value was set. (Note that this must not be set a value in the future.) */
		modified: number
	}
}
