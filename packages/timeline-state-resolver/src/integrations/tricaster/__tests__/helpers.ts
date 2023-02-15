import { TimelineObject, ResolvedTimelineObjectInstance } from 'superfly-timeline'

export const wrapIntoResolvedInstance = <T extends TimelineObject>(
	timelineObject: T
): ResolvedTimelineObjectInstance => ({
	...timelineObject,
	resolved: {
		resolved: true,
		resolving: false,
		instances: [{ start: 0, end: Infinity, id: timelineObject.id, references: [] }],
		directReferences: [],
	},
	instance: { start: 0, end: Infinity, id: timelineObject.id, references: [] },
})
