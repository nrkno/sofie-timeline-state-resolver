import {
	Content,
	ResolvedTimelineObjectInstance,
	TimelineObject,
} from 'timeline-state-resolver-types/dist/superfly-timeline'

export function makeTimelineObjectResolved<TContent extends Content>(
	object: TimelineObject<TContent>
): ResolvedTimelineObjectInstance<TContent> {
	if (Array.isArray(object.enable)) throw new Error('Enable cannot be an array')
	if (typeof object.enable.start !== 'number') throw new Error('Enable must have numeric start')
	if (object.enable.end !== undefined && typeof object.enable.end !== 'number')
		throw new Error('Enable must have numeric end (if any)')
	if (object.enable.duration !== undefined && typeof object.enable.duration !== 'number')
		throw new Error('Enable must have numeric duration (if any)')

	return {
		...object,
		resolved: {
			resolvedReferences: true,
			resolvedConflicts: true,
			resolving: false,
			instances: [],
			directReferences: [],
			levelDeep: 0,
			parentId: undefined,
			isKeyframe: false,
			firstResolved: true,
			isSelfReferencing: false,
		},
		instance: {
			id: `@${object.id}:0`,
			start: object.enable.start,
			end:
				object.enable.end ??
				(object.enable.duration !== undefined ? object.enable.start + object.enable.duration : null),
			references: [],
		},
	}
}
