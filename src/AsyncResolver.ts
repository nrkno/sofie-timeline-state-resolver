import {
	Resolver,
	TimelineObject,
	TimelineState,
	TimelineResolvedObject,
	UnresolvedTimeline,
	StartTime,
	EndTime,
	ResolvedTimeline,
	TimelineEvent,
	SomeTime,
	TraceLevel,
	ExternalFunctions,
	DevelopedTimeline,
	ExpressionObj,
	Expression,
	objAttributeFunction,
	TimelineKeyframe,
	TriggerType
} from 'superfly-timeline'
import _ = require('underscore')
import {
	TimelineContentObject,
	TimelineTriggerTimeResult,
	LOOKAHEADTIME,
	MINTIMEUNIT
} from './conductor'
import {
	TimelineResolvedObjectExtended
} from './types/src/mapping'
import { EventEmitter } from 'events'
let clone = require('fast-clone')

type Timeline = (TimelineContentObject | TimelineResolvedObjectExtended)[]
export class AsyncResolver extends EventEmitter {

	public setTraceLevel (levelName: string | TraceLevel): void {
		return Resolver.setTraceLevel(levelName)
	}
	public getTraceLevel (): TraceLevel {
		return Resolver.getTraceLevel()
	}
	public getState (data: UnresolvedTimeline | ResolvedTimeline, time: SomeTime, externalFunctions?: ExternalFunctions): TimelineState {
		const tlState = Resolver.getState(data, time, externalFunctions)

		_.each(tlState.LLayers, (obj) => {
			delete obj['parent']
		})
		_.each(tlState.GLayers, (obj) => {
			delete obj['parent']
		})

		return tlState
	}
	public getNextEvents (data: ResolvedTimeline, time: SomeTime, count?: number): TimelineEvent[] {
		return Resolver.getNextEvents(data, time, count)
	}
	public getTimelineInWindow (data: UnresolvedTimeline, startTime?: StartTime, endTime?: EndTime): ResolvedTimeline {
		let tl = Resolver.getTimelineInWindow(data, startTime, endTime)

		return tl
	}

	public getObjectsInWindow (data: UnresolvedTimeline, startTime: SomeTime, endTime?: SomeTime): DevelopedTimeline {
		return Resolver.getObjectsInWindow(data, startTime, endTime)
	}
	public interpretExpression (strOrExpr: string | number | Expression, isLogical?: boolean): string | number | ExpressionObj | null {
		return Resolver.interpretExpression(strOrExpr, isLogical)
	}
	public resolveExpression (strOrExpr: string | number | Expression, getObjectAttribute?: objAttributeFunction): StartTime {
		return Resolver.resolveExpression(strOrExpr, getObjectAttribute)
	}
	public resolveLogicalExpression (expressionOrString: Expression | null, obj?: TimelineResolvedObject, returnExpl?: boolean, currentState?: TimelineState): boolean {
		return Resolver.resolveLogicalExpression(expressionOrString, obj, returnExpl, currentState)
	}
	public developTimelineAroundTime (tl: ResolvedTimeline, time: SomeTime): DevelopedTimeline {
		return Resolver.developTimelineAroundTime(tl, time)
	}
	public decipherLogicalValue (str: string | number, obj: TimelineObject | TimelineKeyframe, currentState: TimelineState, returnExpl?: boolean): boolean | string {
		return Resolver.decipherLogicalValue(str, obj, currentState, returnExpl)
	}

	public async resolveTimeline (
		resolveTime: number,
		timeline: Timeline
	) {

		let objectsFixed = this._fixNowObjects(timeline, resolveTime)

		_.each(timeline, (o) => {
			delete o['parent']
			if (o.isGroup) {
				if (o.content.objects) {
					_.each(o.content.objects, (o2) => {
						delete o2['parent']
					})
				}
			}
		})

		// Generate the state for that time:
		let tlState = Resolver.getState(clone(timeline), resolveTime)

		_.each(tlState.LLayers, (obj) => {
			delete obj['parent']
		})
		_.each(tlState.GLayers, (obj) => {
			delete obj['parent']
		})

		return {
			tlState,
			objectsFixed
		}
	}
	public getNextTimelineEvent (
		timeline: Timeline,
		time: number
	): number | null {
		const timelineWindow = Resolver.getTimelineInWindow(timeline, time, time + LOOKAHEADTIME)
		const nextEvents: TimelineEvent[] = Resolver.getNextEvents(timelineWindow, time + MINTIMEUNIT, 1)

		let nextEvent = nextEvents[0]

		if (nextEvent) {
			return nextEvent.time
		}
		return null
	}

	private _fixNowObjects (timeline: Timeline, now: number): TimelineTriggerTimeResult {
		let objectsFixed: Array<{
			id: string,
			time: number
		}> = []

		let setObjectTime = (o: TimelineContentObject, time: number) => {
			o.trigger.value = time // set the objects to "now" so that they are resolved correctly temporarily
			objectsFixed.push({
				id: o.id,
				time: time
			})
		}

		// First: fix the ones on the first level (i e not in groups), because they are easy:
		_.each(timeline, (o: TimelineContentObject) => {
			if (
				(o.trigger || {}).type === TriggerType.TIME_ABSOLUTE &&
				o.trigger.value === 'now'
			) {
				setObjectTime(o, now)
			}
		})

		// Then, resolve the timeline to be able to set "now" inside groups, relative to parents:
		let dontIterateAgain
		let wouldLikeToIterateAgain
		let tl
		let tld
		let fixObjects = (objs, parentObject?: TimelineContentObject) => {

			_.each(objs, (o: TimelineContentObject) => {
				if (
					(o.trigger || {}).type === TriggerType.TIME_ABSOLUTE &&
					o.trigger.value === 'now'
				) {
					// find parent, and set relative to that
					if (parentObject) {
						let developedParent = _.findWhere(tld.groups, { id: parentObject.id })
						if (developedParent && developedParent['resolved'].startTime) {
							dontIterateAgain = false
							setObjectTime(o, now - developedParent['resolved'].startTime)
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
				if (o.isGroup && o.content.objects) {
					fixObjects(o.content.objects, o)
				}
			})

		}

		for (let i = 0; i < 10; i++) {
			wouldLikeToIterateAgain = false
			dontIterateAgain = true

			tl = Resolver.getTimelineInWindow(timeline)
			tld = Resolver.developTimelineAroundTime(tl, now)

			fixObjects(timeline)
			if (!wouldLikeToIterateAgain && dontIterateAgain) break
		}

		if (objectsFixed.length) {
			let r: TimelineTriggerTimeResult = objectsFixed
			this.emit('setTimelineTriggerTime', r)
		}
		return objectsFixed
	}
}
