import { TimelineObject, TimelineKeyframe } from './superfly-timeline'
import { Mapping, DeviceType } from './mapping'

export interface OSCOptions {
	host: string
	port: number
}

export interface MappingOSC extends Mapping {
	device: DeviceType.OSC
}

export enum TimelineContentTypeOSC {
	OSC = 'osc'
}

export enum OSCValueType {
	INT = 'i',
	FLOAT = 'f',
	STRING = 's',
	BLOB = 'b'
}

export interface OSCValueNumber {
	type: OSCValueType.INT | OSCValueType.FLOAT,
	value: number
}
export interface OSCValueString {
	type: OSCValueType.STRING,
	value: string
}
export interface OSCValueBlob {
	type: OSCValueType.BLOB,
	value: Uint8Array
}
export type SomeOSCValue = OSCValueNumber | OSCValueString | OSCValueBlob

export interface OSCMessageCommandContent {
	type: TimelineContentTypeOSC.OSC
	path: string
	values: SomeOSCValue[]
}

export interface TimelineObjOSCMessage extends TimelineObject {
	content: OSCMessageCommandContent & {
		keyframes?: Array<TimelineKeyframe>
	}
}
