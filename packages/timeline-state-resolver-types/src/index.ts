import * as Timeline from './superfly-timeline'
import { TimelineContentTelemetricsAny } from './telemetrics'
import { TimelineContentAtemAny } from './atem'
import { TimelineContentCasparCGAny } from './casparcg'
import { TimelineContentHTTPSendAny } from './httpSend'
import { TimelineContentTCPSendAny } from './tcpSend'
import { TimelineContentHyperdeckAny } from './hyperdeck'
import { TimelineContentLawoAny } from './lawo'
import { TimelineContentOSCAny } from './osc'
import { TimelineContentPharosAny } from './pharos'
import { TimelineContentPanasonicPtzAny } from './panasonicPTZ'
import { TimelineContentAbstractAny } from './abstract'
import { TSRTimelineObjProps } from './mapping'
import { TimelineContentQuantelAny } from './quantel'
import { TimelineContentShotoku } from './shotoku'
import { TimelineContentSisyfosAny } from './sisyfos'
import { TimelineContentSofieChefAny } from './sofieChef'
import { TimelineContentVIZMSEAny } from './vizMSE'
import { TimelineContentSingularLiveAny } from './singularLive'
import { TimelineContentVMixAny } from './vmix'
import { TimelineContentOBSAny } from './obs'
import { TimelineContentTriCasterAny } from './tricaster'
import { ITranslatableMessage } from './translations'

export * from './abstract'
export * from './atem'
export * from './casparcg'
export * from './httpSend'
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
export * from './tricaster'
export * from './telemetrics'
export * from './multiOsc'

export * from './device'
export * from './mapping'

export { Timeline }
export * from './mapping'
export * from './expectedPlayoutItems'
export * from './mediaObject'
export * from './translations'

export * from './generated'

/**
 * An identifier of a particular device class
 *
 * @export
 * @enum {string}
 */
export enum DeviceType {
	ABSTRACT = 'ABSTRACT',
	CASPARCG = 'CASPARCG',
	ATEM = 'ATEM',
	LAWO = 'LAWO',
	HTTPSEND = 'HTTPSEND',
	PANASONIC_PTZ = 'PANASONIC_PTZ',
	TCPSEND = 'TCPSEND',
	HYPERDECK = 'HYPERDECK',
	PHAROS = 'PHAROS',
	OSC = 'OSC',
	HTTPWATCHER = 'HTTPWATCHER',
	SISYFOS = 'SISYFOS',
	QUANTEL = 'QUANTEL',
	VIZMSE = 'VIZMSE',
	SINGULAR_LIVE = 'SINGULAR_LIVE',
	SHOTOKU = 'SHOTOKU',
	VMIX = 'VMIX',
	OBS = 'OBS',
	SOFIE_CHEF = 'SOFIE_CHEF',
	TELEMETRICS = 'TELEMETRICS',
	TRICASTER = 'TRICASTER',
	MULTI_OSC = 'MULTI_OSC',
}

export type TSRTimelineKeyframe<TContent> = Timeline.TimelineKeyframe<TContent>

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

export type TSRTimeline = TSRTimelineObj<TSRTimelineContent>[]

export interface TSRTimelineObj<TContent extends { deviceType: DeviceType }>
	extends Omit<Timeline.TimelineObject<TContent & TimelineDatastoreReferencesContent>, 'children'>,
		TSRTimelineObjProps {
	children?: TSRTimelineObj<TSRTimelineContent>[]
}

export interface TimelineContentEmpty {
	deviceType: DeviceType.ABSTRACT
	type: 'empty'
}

export type TSRTimelineContent =
	| TimelineContentEmpty
	| TimelineContentAbstractAny
	| TimelineContentAtemAny
	| TimelineContentCasparCGAny
	| TimelineContentHTTPSendAny
	| TimelineContentTCPSendAny
	| TimelineContentHyperdeckAny
	| TimelineContentLawoAny
	| TimelineContentOBSAny
	| TimelineContentOSCAny
	| TimelineContentPharosAny
	| TimelineContentPanasonicPtzAny
	| TimelineContentQuantelAny
	| TimelineContentShotoku
	| TimelineContentSisyfosAny
	| TimelineContentSofieChefAny
	| TimelineContentSingularLiveAny
	| TimelineContentVMixAny
	| TimelineContentVIZMSEAny
	| TimelineContentTelemetricsAny
	| TimelineContentTriCasterAny

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

export interface ActionExecutionResult {
	result: ActionExecutionResultCode
	response?: ITranslatableMessage
}

export enum ActionExecutionResultCode {
	Error = 'ERROR',
	Ok = 'OK',
}
