import {
	Resolver,
	TimelineObject,
	ResolvedTimeline,
	ResolvedTimelineObject,
	ResolverCache,
	Time,
	EventType,
	Cap,
	TimelineState,
	ResolvedTimelineObjectInstance,
	TimelineObjectInstance,
	Content,
} from 'superfly-timeline'
import _ = require('underscore')
import { TimelineTriggerTimeResult } from './conductor'
import { TSRTimeline, TSRTimelineObj } from 'timeline-state-resolver-types'
import { literal } from './devices/device'

/**
 * Make all optional properties be required and `| undefined`
 * This is useful to ensure that no property is missed, when manually converting between types, but allowing fields to be undefined
 */
export type Complete<T> = {
	[P in keyof Required<T>]: Pick<T, P> extends Required<Pick<T, P>> ? T[P] : T[P] | undefined
}

export interface RustNextEvent {
	event_type: EventType
	time: Time
	object_id: string
}

export interface RustTimelineLayerState2 {
	object_id: string
	instance_id: string | undefined
	instance: RustTimelineObjectInstance | undefined // TODO - this is a bit heavy now?
	keyframes: RustTimelineLayerState2Keyframe[]
}

export interface RustTimelineObjectInstance {
	/** id of the instance (unique)  */
	id: string
	/** if true, the instance starts from the beginning of time */
	is_first?: boolean
	/** The start time of the instance */
	start: Time
	/** The end time of the instance (null = infinite) */
	end: Time | null
	/** The original start time of the instance (if an instance is split or capped, the original start time is retained in here).
	 * If undefined, fallback to .start
	 */
	original_start?: Time
	/** The original end time of the instance (if an instance is split or capped, the original end time is retained in here)
	 * If undefined, fallback to .end
	 */
	original_end?: Time | null
	/** array of the id of the referenced objects */
	references: Array<string>
	/** If set, tells the cap of the parent. The instance will always be capped inside this. */
	caps?: Array<Cap>
	/** If the instance was generated from another instance, reference to the original */
	from_instance_id?: string
}

export interface RustTimelineLayerState2Keyframe {
	keyframe_id: string
	keyframe_end_time: Time | undefined
}

type AllStates2 = Record<string, Record<Time, RustTimelineLayerState2 | undefined>>

export interface RustResult {
	state: AllStates2
	layers: Record<string, string[]>
	next_events: RustNextEvent[]
}

export class HttpResolver {
	private readonly onSetTimelineTriggerTime: (res: TimelineTriggerTimeResult) => void

	private cache: ResolverCache = {}

	public constructor(onSetTimelineTriggerTime: (res: TimelineTriggerTimeResult) => void) {
		this.onSetTimelineTriggerTime = onSetTimelineTriggerTime
	}

	public async resolveTimeline(resolveTime: number, timeline: TSRTimeline, limitTime: number, useCache: boolean) {
		const objectsFixed = this._fixNowObjects(timeline, resolveTime)

		const resolvedTimeline = Resolver.resolveTimeline(timeline, {
			limitCount: 999,
			limitTime: limitTime,
			time: resolveTime,
			cache: useCache ? this.cache : undefined,
		})

		const resolvedStates = Resolver.resolveAllStates(resolvedTimeline) as any as RustResult

		return {
			resolvedStates,
			objectsFixed,
		}
	}

	private _fixNowObjects(timeline: TSRTimeline, now: number): TimelineTriggerTimeResult {
		const objectsFixed: Array<{
			id: string
			time: number
		}> = []
		const timeLineMap: { [id: string]: TSRTimelineObj } = {}

		const setObjectTime = (o: TSRTimelineObj, time: number) => {
			if (!_.isArray(o.enable)) {
				o.enable.start = time // set the objects to "now" so that they are resolved correctly temporarily
				const o2 = timeLineMap[o.id]
				if (o2 && !_.isArray(o2.enable)) {
					o2.enable.start = time
				}

				objectsFixed.push({
					id: o.id,
					time: time,
				})
			}
		}

		_.each(timeline, (obj) => {
			timeLineMap[obj.id] = obj
		})

		// First: fix the ones on the first level (i e not in groups), because they are easy (this also saves us one iteration time later):
		_.each(timeLineMap, (o: TSRTimelineObj) => {
			if (!_.isArray(o.enable)) {
				if (o.enable.start === 'now') {
					setObjectTime(o, now)
				}
			}
		})

		// Then, resolve the timeline to be able to set "now" inside groups, relative to parents:
		let dontIterateAgain = false
		let wouldLikeToIterateAgain = false

		let resolvedTimeline: ResolvedTimeline
		const fixObjects = (objs: TimelineObject[], parentObject?: TimelineObject) => {
			_.each(objs, (o: TSRTimelineObj) => {
				if (!_.isArray(o.enable) && o.enable.start === 'now') {
					// find parent, and set relative to that
					if (parentObject) {
						const resolvedParent: ResolvedTimelineObject = resolvedTimeline.objects[parentObject.id]

						const parentInstance = resolvedParent.resolved.instances[0]
						if (resolvedParent.resolved.resolved && parentInstance) {
							dontIterateAgain = false
							setObjectTime(o, now - (parentInstance.originalStart || parentInstance.start))
						} else {
							// the parent isn't found, it's probably not resolved (yet), try iterating once more:
							wouldLikeToIterateAgain = true
						}
					} else {
						// no parent object
						dontIterateAgain = false
						setObjectTime(o, now)
					}
				}
				if (o.isGroup && o.children) {
					fixObjects(o.children, o)
				}
			})
		}

		for (let i = 0; i < 10; i++) {
			wouldLikeToIterateAgain = false
			dontIterateAgain = true

			resolvedTimeline = Resolver.resolveTimeline(_.values(timeLineMap), {
				time: now,
			})

			fixObjects(_.values(resolvedTimeline.objects))
			if (!wouldLikeToIterateAgain && dontIterateAgain) break
		}

		if (objectsFixed.length) {
			this.onSetTimelineTriggerTime(objectsFixed)
		}
		return objectsFixed
	}
}

export function getState2(rawTl: TSRTimeline, resolvedStates: RustResult, time: Time, eventLimit = 0): TimelineState {
	const state: TimelineState = {
		time: time,
		layers: {},
		nextEvents: _.filter(resolvedStates.next_events, (e) => e.time > time).map((e) => ({
			type: e.event_type,
			time: e.time,
			objId: e.object_id,
		})),
	}
	if (eventLimit) state.nextEvents = state.nextEvents.slice(0, eventLimit)

	const allObjects = new Map<string, TimelineObject>()
	const doObj = (obj: TimelineObject) => {
		allObjects.set(obj.id, obj)
		if (obj.children) {
			for (const obj2 of obj.children) {
				doObj(obj2)
			}
		}
	}
	for (const obj of rawTl) {
		doObj(obj)
	}

	_.each(_.keys(resolvedStates.layers), (layer: string) => {
		const o = getStateAtTime(allObjects, resolvedStates.state, layer, time)
		if (o) state.layers[layer] = o
	})

	return state
}

function applyKeyframeContent(parentContent: Content, keyframeContent: Content) {
	_.each(keyframeContent, (value: any, attr: string) => {
		if (_.isArray(value)) {
			if (!_.isArray(parentContent[attr])) parentContent[attr] = []
			applyKeyframeContent(parentContent[attr], value)
			parentContent[attr].splice(value.length, 99999)
		} else if (_.isObject(value)) {
			if (!_.isObject(parentContent[attr]) || _.isArray(parentContent[attr])) parentContent[attr] = {}
			applyKeyframeContent(parentContent[attr], value)
		} else {
			parentContent[attr] = value
		}
	})
}
function getStateAtTime(allObjs: Map<string, TimelineObject>, states: AllStates2, layer: string, requestTime: number) {
	const layerStates = states[layer] || {}

	const times: number[] = _.map(_.keys(layerStates), (time) => parseFloat(time))
	times.sort((a, b) => {
		return a - b
	})
	let state: ResolvedTimelineObjectInstance | null = null
	let isCloned = false
	_.find(times, (time) => {
		if (time <= requestTime) {
			const currentStateInstances = layerStates[time]
			if (currentStateInstances && currentStateInstances.instance) {
				const objId = currentStateInstances.object_id
				const rawObj = allObjs.get(objId)
				if (!rawObj) throw new Error(`Missing obj ${objId}`)

				isCloned = false
				state = literal<ResolvedTimelineObjectInstance>({
					...rawObj,
					instance: literal<Complete<TimelineObjectInstance>>({
						id: currentStateInstances.instance.id,
						isFirst: currentStateInstances.instance.is_first,
						start: currentStateInstances.instance.start,
						end: currentStateInstances.instance.end,
						originalStart: currentStateInstances.instance.original_start,
						originalEnd: currentStateInstances.instance.original_end,
						references: currentStateInstances.instance.references,
						caps: currentStateInstances.instance.caps,
						fromInstanceId: currentStateInstances.instance.from_instance_id,
					}),
					resolved: {} as any, // TODO - we dont use this
				})

				for (const keyframe of currentStateInstances.keyframes) {
					const keyframeObj = rawObj.keyframes?.find((kf) => kf.id === keyframe.keyframe_id)
					if (keyframeObj && (keyframe.keyframe_end_time || Infinity) > requestTime) {
						if (!isCloned) {
							isCloned = true
							state.content = JSON.parse(JSON.stringify(state.content))
						}
						// Apply the keyframe on the state:
						applyKeyframeContent(state.content, keyframeObj.content)
					}
				}
			} else {
				state = null
				isCloned = false
			}

			return false
		} else {
			return true
		}
	})
	return state
}
