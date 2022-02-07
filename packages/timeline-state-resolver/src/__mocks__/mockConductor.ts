import { AsyncResolver } from '../AsyncResolver'
import { Mappings, TSRTimeline } from 'timeline-state-resolver-types'
import { Device } from '../devices/device'
import { EventEmitter } from 'eventemitter3'
import { LOOKAHEADTIME, TimelineTriggerTimeResult } from '../conductor'
import { ResolvedStates, Resolver, TimelineObject, TimelineState } from 'superfly-timeline'
import _ = require('underscore')
import { filterLayersPerDevice, removeParentFromState } from '../lib'
import { MockTime } from '../__tests__/mockTime'

export type MockConductorEvents = {
	setTimelineTriggerTime: [res: TimelineTriggerTimeResult]
	error: [message: string]
}

/** When resolving and the timeline has repeating objects, only resolve this far into the future */
const RESOLVE_LIMIT_TIME = 10000

export class MockConductor extends EventEmitter<MockConductorEvents> {
	readonly #devices: Map<string, Device<any>>
	readonly #resolver: AsyncResolver
	readonly #mockTime: MockTime

	private _timeline: TSRTimeline = []
	private _mappings: Mappings = {}

	private _nextResolveTime: number | null = null

	constructor(mockTime: MockTime) {
		super()

		this.#devices = new Map()
		this.#mockTime = mockTime

		this.#resolver = new AsyncResolver((r) => {
			this.emit('setTimelineTriggerTime', r)
		})

		this.resetResolver()
	}

	addDevice(device: Device<any>): void {
		if (this.#devices.has(device.deviceId)) {
			throw new Error('Device has already been added')
		}

		this.#devices.set(device.deviceId, device)
	}

	/**
	 * Sets a new timeline and resets the resolver.
	 */
	setTimelineAndMappings(timeline: TSRTimeline, mappings?: Mappings): void {
		this._timeline = timeline
		if (mappings) this._mappings = mappings

		// We've got a new timeline, anything could've happened at this point
		// Highest priority right now is to determine if any commands have to be sent RIGHT NOW
		// After that, we'll move further ahead in time, creating commands ready for scheduling

		this.resetResolver()
	}

	/**
	 * Resets the resolve-time, so that the resolving will happen for the point-in time NOW
	 * next time
	 */
	public resetResolver(): void {
		this._nextResolveTime = null // This will cause _resolveTimeline() to generate the state for NOW

		// this._triggerResolveTimeline()
	}

	public async runTo(time: number): Promise<void> {
		this.resolveUntil(time)

		await this.#mockTime.advanceTimeToTicks(time)
	}

	public resolveUntil(time: number): void {
		while (!this._nextResolveTime || this._nextResolveTime < time) {
			const nextTime = this._resolveTimelineInner()
			this._nextResolveTime = nextTime
			if (!nextTime) {
				// Don't get stuck in an infinite loop
				break
			}
		}
	}

	private _resolveTimelineInner(): number | null {
		/** The point in time this function is run. ( ie "right now") */
		const now = this.#mockTime.getCurrentTime()
		/** The point in time we're targeting. (This can be in the future) */
		let resolveTime: number = this._nextResolveTime ?? 0

		const estimatedResolveTime = 0 // we have mocked time, so its 'instant'

		if (
			!resolveTime || // About to be resolved ASAP
			resolveTime < now + estimatedResolveTime // We're late
		) {
			resolveTime = now + estimatedResolveTime
		} else {
			if (resolveTime > now + LOOKAHEADTIME) {
				// If the resolveTime is too far ahead, we'd rather wait and resolve it later.
				return now + LOOKAHEADTIME
			}
		}

		for (const device of this.#devices.values()) {
			device.prepareForHandleState(resolveTime)
		}

		const applyRecursively = (o: TimelineObject, func: (o: TimelineObject) => void) => {
			func(o)

			if (o.isGroup) {
				_.each(o.children || [], (child: TimelineObject) => {
					applyRecursively(child, func)
				})
			}
		}

		const timeline: TSRTimeline = this._timeline

		// To prevent trying to transfer circular references over IPC we remove
		// any references to the parent property:
		const deleteParent = (o: TimelineObject) => {
			if ('parent' in o) {
				delete o['parent']
			}
		}
		_.each(timeline, (o) => applyRecursively(o, deleteParent))

		// Determine if we can use the pre-resolved timeline:
		let resolvedStates: ResolvedStates
		// No, we need to resolve the timeline again:
		const o = this.#resolver.resolveTimeline(resolveTime, timeline, resolveTime + RESOLVE_LIMIT_TIME, false)
		resolvedStates = o.resolvedStates

		// Apply changes to fixed objects (set "now" triggers to an actual time):
		// This gets persisted on this.timeline, so we only have to do this once
		const nowIdsTime: { [id: string]: number } = {}
		_.each(o.objectsFixed, (o) => (nowIdsTime[o.id] = o.time))
		const fixNow = (o: TimelineObject) => {
			if (nowIdsTime[o.id]) {
				if (!_.isArray(o.enable)) {
					o.enable.start = nowIdsTime[o.id]
				}
			}
		}
		_.each(timeline, (o) => applyRecursively(o, fixNow))

		const tlState = Resolver.getState(resolvedStates, resolveTime)

		const layersPerDevice = filterLayersPerDevice(tlState.layers, this._mappings, Array.from(this.#devices.values()))

		for (const device of this.#devices.values()) {
			// The subState contains only the parts of the state relevant to that device:
			const subState: TimelineState = {
				time: tlState.time,
				layers: layersPerDevice[device.deviceId] || {},
				nextEvents: [],
			}

			// Pass along the state to the device, it will generate its commands and execute them:
			// Intentionally let the error throw
			device.handleState(removeParentFromState(subState), this._mappings)
		}

		// Now that we've handled this point in time, it's time to determine what the next point in time is:
		let nextEventTime: number | null = null
		for (const event of tlState.nextEvents) {
			if (event.time && event.time > now && (!nextEventTime || event.time < nextEventTime)) {
				nextEventTime = event.time
			}
		}

		// const nowPostExec = this.getCurrentTime()
		if (nextEventTime) {
			// timeUntilNextResolve = Math.max(
			// 	MINTRIGGERTIME, // At minimum, we should wait this time
			// 	Math.min(
			// 		LOOKAHEADTIME, // We should wait maximum this time, because we might have deferred a resolving this far ahead
			// 		RESOLVE_LIMIT_TIME, // We should wait maximum this time, because we've only resolved repeating objects this far
			// 		nextEventTime - nowPostExec - PREPARETIME
			// 	)
			// )
			// resolve at nextEventTime next time:
			return Math.min(tlState.time + LOOKAHEADTIME, nextEventTime)
		} else {
			// there's nothing ahead in the timeline,
			// Tell the devices that the future is clear:
			for (const device of this.#devices.values()) {
				// Intentionally let the error throw
				device.clearFuture(tlState.time)
			}

			// // resolve at this time then next time (or later):
			// nextResolveTime = Math.min(tlState.time)
			return null
		}
	}
}
