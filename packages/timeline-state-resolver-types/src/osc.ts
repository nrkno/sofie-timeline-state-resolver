import { Mapping } from './mapping'
import { DeviceType } from '.'

// Note: This type is a loose referral to (a copy of) keyof typeof Easing in '../../easings', so that Easing structure won't be included in the types package
export type OSCEasingType =
	| 'Linear'
	| 'Quadratic'
	| 'Cubic'
	| 'Quartic'
	| 'Quintic'
	| 'Sinusoidal'
	| 'Exponential'
	| 'Circular'
	| 'Elastic'
	| 'Back'
	| 'Bounce'

export interface MappingOSC extends Mapping {
	device: DeviceType.OSC
}

export enum TimelineContentTypeOSC {
	OSC = 'osc',
}

export enum OSCValueType {
	INT = 'i',
	FLOAT = 'f',
	STRING = 's',
	BLOB = 'b',
	TRUE = 'T',
	FALSE = 'F',
}

export interface OSCValueNumber {
	type: OSCValueType.INT | OSCValueType.FLOAT
	value: number
}
export interface OSCValueString {
	type: OSCValueType.STRING
	value: string
}
export interface OSCValueBlob {
	type: OSCValueType.BLOB
	value: Uint8Array
}
export interface OSCValueBoolean {
	type: OSCValueType.TRUE | OSCValueType.FALSE
	value: void
}
export type SomeOSCValue = OSCValueNumber | OSCValueString | OSCValueBlob | OSCValueBoolean

export interface OSCMessageCommandContent {
	type: TimelineContentTypeOSC.OSC
	path: string
	values: SomeOSCValue[]
	transition?: {
		duration: number
		type: OSCEasingType
		direction: 'In' | 'Out' | 'InOut' | 'None'
	}
	from?: SomeOSCValue[]
}
export type TimelineContentOSCAny = TimelineContentOSCMessage

export interface TimelineContentOSC {
	deviceType: DeviceType.OSC
	type: TimelineContentTypeOSC
}
export type TimelineContentOSCMessage = TimelineContentOSC & OSCMessageCommandContent
