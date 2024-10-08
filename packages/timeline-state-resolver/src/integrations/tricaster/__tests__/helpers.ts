import { TimelineContentTriCasterAny, TSRTimelineObj, Timeline } from 'timeline-state-resolver-types'

export const wrapIntoResolvedInstance = <Content extends TimelineContentTriCasterAny>(
	timelineObject: TSRTimelineObj<Content>
): Timeline.ResolvedTimelineObjectInstance<Content> => ({
	...timelineObject,
	resolved: {
		resolvedReferences: true,
		resolvedConflicts: true,
		resolving: false,
		instances: [{ start: 0, end: Infinity, id: `@${timelineObject.id}`, references: [] }],
		directReferences: [],
		levelDeep: 0,
		parentId: undefined,
		isKeyframe: false,
		firstResolved: false,
		isSelfReferencing: false,
	},
	instance: { start: 0, end: Infinity, id: `@${timelineObject.id}`, references: [] },
})
