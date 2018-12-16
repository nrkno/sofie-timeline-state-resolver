// Note: These types are copies from superfly-timeline

// Enums ------------------------------------------------------------
export enum TriggerType {
	TIME_ABSOLUTE = 0,
	TIME_RELATIVE = 1,
	LOGICAL = 3
}
export enum EventType {
	START = 0,
	END = 1,
	KEYFRAME = 2
}
export enum TraceLevel {
	ERRORS = 0,
	INFO = 1,
	TRACE = 2
}
export const Enums = {
	TriggerType: TriggerType,
	TimelineEventType: EventType,
	TraceLevel: TraceLevel
}
// Resolver ------------------------------------------------------------
export interface TimelineTrigger {
	type: TriggerType
	value: number | string
}
export interface TimelineObject {
	id: ObjectId
	trigger: TimelineTrigger
	duration?: number | string
	LLayer: string | number
	content: {
		objects?: Array<TimelineObject>
		keyframes?: Array<TimelineKeyframe>
		[key: string]: any
	}
	classes?: Array<string>
	disabled?: boolean
	isGroup?: boolean
	repeating?: boolean
	priority?: number
	externalFunction?: string
}
export interface TimelineGroup extends TimelineObject {
	resolved: ResolvedDetails
	parent?: TimelineGroup
}
export declare type TimeMaybe = number | null
export declare type StartTime = number | null
export declare type EndTime = number | null
export declare type Duration = number | null
export declare type SomeTime = number
export declare type ObjectId = string
export interface TimelineEvent {
	type: EventType
	time: SomeTime
	obj: TimelineObject
	kf?: TimelineResolvedKeyframe
}
export interface TimelineKeyframe {
	id: string
	trigger: {
		type: TriggerType
		value: number | string
	}
	duration?: number | string
	content?: {
		[key: string]: any
	}
	classes?: Array<string>
}
export interface TimelineResolvedObject extends TimelineObject {
	resolved: ResolvedDetails
	parent?: TimelineGroup
}
export interface TimelineResolvedKeyframe extends TimelineKeyframe {
	resolved: ResolvedDetails
	parent?: TimelineResolvedObject
}
export interface ResolvedDetails {
	startTime?: StartTime
	endTime?: EndTime
	innerStartTime?: StartTime
	innerEndTime?: EndTime
	innerDuration?: Duration
	outerDuration?: Duration
	parentStart?: StartTime
	parentId?: ObjectId
	disabled?: boolean
	referredObjectIds?: Array<ResolvedObjectId> | null
	repeatingStartTime?: StartTime
	templateData?: any
	developed?: boolean
	[key: string]: any
}
export interface ResolvedObjectId {
	id: string
	hook: string
}
export interface ResolvedTimeline {
	resolved: Array<TimelineResolvedObject>
	unresolved: Array<TimelineObject>
}
export interface DevelopedTimeline {
	resolved: Array<TimelineResolvedObject>
	unresolved: Array<TimelineObject>
	groups: Array<TimelineGroup>
}
export interface TimelineState {
	time: SomeTime
	GLayers: {
		[GLayer: string]: TimelineResolvedObject
	}
	LLayers: {
		[LLayer: string]: TimelineResolvedObject
	}
}
export interface ExternalFunctions {
	[fcnName: string]: (obj: TimelineResolvedObject, state: TimelineState, tld: DevelopedTimeline) => boolean
}
export interface UnresolvedTimeline extends Array<TimelineObject> {
}
export interface ResolvedObjectsStore {
	[id: string]: TimelineResolvedObject | TimelineResolvedKeyframe
}
export interface ResolvedObjectTouches {
	[key: string]: number
}
export declare type Expression = number | string | ExpressionObj
export interface ExpressionObj {
	l: Expression
	o: string
	r: Expression
}
export interface Filter {
	startTime?: StartTime
	endTime?: EndTime
}
export class Resolver {
}
