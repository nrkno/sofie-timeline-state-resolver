import {
	TimelineObject,
	ResolvedTimeline,
	ResolvedTimelineObject,
	ResolverCache,
	resolveTimeline,
	ResolveError,
	ResolveOptions,
} from 'superfly-timeline'
import { TimelineTriggerTimeResult } from './conductor'
import { TSRTimeline, TSRTimelineContent, TSRTimelineObj } from 'timeline-state-resolver-types'
import { EventEmitter } from 'eventemitter3'

export type AsyncResolverEvents = {
	error: [string]
}

// This is a debug flag, to trace some helpful information when resolving fails.
// If should be set to false in production.
const TRACE_RESOLVING = false

export class AsyncResolver extends EventEmitter<AsyncResolverEvents> {
	private readonly onSetTimelineTriggerTime: (res: TimelineTriggerTimeResult) => void

	private cache: Partial<ResolverCache> = {}

	public constructor(onSetTimelineTriggerTime: (res: TimelineTriggerTimeResult) => void) {
		super()
		this.onSetTimelineTriggerTime = onSetTimelineTriggerTime
	}

	public resolveTimeline(resolveTime: number, timeline: TSRTimeline, limitTime: number, useCache: boolean) {
		try {
			const objectsFixed = this._fixNowObjects(timeline, resolveTime)

			const resolvedTimeline = this._resolveTimeline(timeline, {
				limitCount: 999,
				limitTime: limitTime,
				time: resolveTime,
				cache: useCache ? this.cache : undefined,
				traceResolving: TRACE_RESOLVING,
			})

			return {
				resolvedTimeline,
				objectsFixed,
			}
		} catch (e) {
			if (e instanceof ResolveError) {
				// Trace some helpful information related to the error:
				this.emit('error', 'Error resolveTrace: ' + JSON.stringify(e.resolvedTimeline.statistics.resolveTrace))
			}
			throw e
		}
	}

	private _resolveTimeline(timeline: TSRTimeline, options: ResolveOptions) {
		try {
			return resolveTimeline(timeline, options)
		} catch (e) {
			if (!options.traceResolving) {
				// Try again, but now with tracing:
				options.traceResolving = true

				// Note, we expect this to throw again:
				const try2 = resolveTimeline(timeline, options)

				// Oh, this is weird, it worked on second try! Log the error:
				this.emit(
					'error',
					'Error when resolving timeline, but on second try with tracing, it worked! Original error:' + e
				)
				return try2
			}
			throw e
		}
	}

	private _fixNowObjects(timeline: TSRTimeline, now: number): TimelineTriggerTimeResult {
		const objectsFixed: Array<{
			id: string
			time: number
		}> = []
		const timeLineMap = new Map<string, TSRTimelineObj<TSRTimelineContent>>()

		const setObjectTime = (o: TSRTimelineObj<TSRTimelineContent>, time: number) => {
			if (!Array.isArray(o.enable)) {
				o.enable.start = time // set the objects to "now" so that they are resolved correctly temporarily
				const o2 = timeLineMap.get(o.id)
				if (o2 && !Array.isArray(o2.enable)) {
					o2.enable.start = time
				}

				objectsFixed.push({
					id: o.id,
					time: time,
				})
			}
		}

		for (const obj of timeline) {
			timeLineMap.set(obj.id, obj)
		}

		// First: fix the ones on the first level (i e not in groups), because they are easy (this also saves us one iteration time later):
		for (const o of timeLineMap.values()) {
			if (!Array.isArray(o.enable)) {
				if (o.enable.start === 'now') {
					setObjectTime(o, now)
				}
			}
		}

		// Then, resolve the timeline to be able to set "now" inside groups, relative to parents:
		let dontIterateAgain = false
		let wouldLikeToIterateAgain = false

		let resolvedTimeline: ResolvedTimeline
		const fixObjects = (objs: TSRTimelineObj<TSRTimelineContent>[], parentObject?: TimelineObject) => {
			for (const o of objs) {
				if (!Array.isArray(o.enable) && o.enable.start === 'now') {
					// find parent, and set relative to that
					if (parentObject) {
						const resolvedParent: ResolvedTimelineObject = resolvedTimeline.objects[parentObject.id]

						const parentInstance = resolvedParent.resolved.instances[0]
						if (resolvedParent.resolved.resolvedReferences && parentInstance) {
							dontIterateAgain = false
							setObjectTime(o, now - (parentInstance.originalStart ?? parentInstance.start))
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
			}
		}

		for (let i = 0; i < 10; i++) {
			wouldLikeToIterateAgain = false
			dontIterateAgain = true

			resolvedTimeline = this._resolveTimeline(Array.from(timeLineMap.values()), {
				time: now,
			})

			fixObjects(
				Object.values<ResolvedTimelineObject>(resolvedTimeline.objects) as any[] as TSRTimelineObj<TSRTimelineContent>[]
			)
			if (!wouldLikeToIterateAgain && dontIterateAgain) break
		}

		if (objectsFixed.length) {
			this.onSetTimelineTriggerTime(objectsFixed)
		}
		return objectsFixed
	}
}
