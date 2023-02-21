import { TimelineContentTriCasterAny, TSRTimelineObj, Timeline } from 'timeline-state-resolver-types'

export const wrapIntoResolvedInstance = <Content extends TimelineContentTriCasterAny>(
	timelineObject: TSRTimelineObj<Content>
): Timeline.ResolvedTimelineObjectInstance<Content> => ({
	...timelineObject,
	resolved: {
		resolved: true,
		resolving: false,
		instances: [{ start: 0, end: Infinity, id: timelineObject.id, references: [] }],
		directReferences: [],
	},
	instance: { start: 0, end: Infinity, id: timelineObject.id, references: [] },
})
