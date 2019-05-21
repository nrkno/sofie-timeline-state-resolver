import {
	Resolver,
	TimelineObject,
	ResolvedTimeline,
	ResolvedTimelineObject,
	ResolvedStates
} from 'superfly-timeline'
import _ = require('underscore')
import {
	TimelineTriggerTimeResult
} from './conductor'
import { EventEmitter } from 'events'
import { TSRTimeline, TSRTimelineObj } from './types/src'

export class AsyncResolver extends EventEmitter {

	public async resolveTimeline (
		resolveTime: number,
		timeline: TSRTimeline,
		limitTime: number
	) {

		let objectsFixed = this._fixNowObjects(timeline, resolveTime)

		const resolvedTimeline = Resolver.resolveTimeline(timeline, {
			limitCount: 999,
			limitTime: limitTime,
			time: resolveTime
		})

		const resolvedStates = Resolver.resolveAllStates(resolvedTimeline)

		return {
			resolvedStates,
			objectsFixed
		}
	}
	public async getState (
		resolved: ResolvedStates,
		resolveTime: number
	) {
		return Resolver.getState(resolved, resolveTime)
	}

	private _fixNowObjects (timeline: TSRTimeline, now: number): TimelineTriggerTimeResult {
		let objectsFixed: Array<{
			id: string,
			time: number
		}> = []
		const timeLineMap: {[id: string]: TSRTimelineObj} = {}

		let setObjectTime = (o: TSRTimelineObj, time: number) => {
			o.enable.start = time // set the objects to "now" so that they are resolved correctly temporarily
			const o2 = timeLineMap[o.id]
			if (o2) {
				o2.enable.start = time
			}

			objectsFixed.push({
				id: o.id,
				time: time
			})
		}

		_.each(timeline, (obj) => {
			timeLineMap[obj.id] = obj
		})

		// First: fix the ones on the first level (i e not in groups), because they are easy (this also saves us one iteration time later):
		_.each(timeLineMap, (o: TSRTimelineObj) => {
			if (o.enable.start === 'now') {
				setObjectTime(o, now)
			}
		})

		// Then, resolve the timeline to be able to set "now" inside groups, relative to parents:
		let dontIterateAgain: boolean = false
		let wouldLikeToIterateAgain: boolean = false

		let resolvedTimeline: ResolvedTimeline
		let fixObjects = (objs: TimelineObject[], parentObject?: TimelineObject) => {

			_.each(objs, (o: TSRTimelineObj) => {
				if (
					o.enable.start === 'now'
				) {
					// find parent, and set relative to that
					if (parentObject) {

						let resolvedParent: ResolvedTimelineObject = resolvedTimeline.objects[parentObject.id]

						let parentInstance = resolvedParent.resolved.instances[0]
						if (resolvedParent.resolved.resolved && parentInstance) {
							dontIterateAgain = false
							setObjectTime(o, now - parentInstance.start)
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
				time: now
			})

			fixObjects(_.values(resolvedTimeline.objects))
			if (!wouldLikeToIterateAgain && dontIterateAgain) break
		}

		if (objectsFixed.length) {
			let r: TimelineTriggerTimeResult = objectsFixed
			this.emit('setTimelineTriggerTime', r)
		}
		return objectsFixed
	}
}
