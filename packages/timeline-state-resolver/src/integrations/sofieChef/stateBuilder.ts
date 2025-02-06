import {
	Timeline,
	TSRTimelineContent,
	Mappings,
	Mapping,
	SomeMappingSofieChef,
	DeviceType,
	interpolateTemplateStringIfNeeded,
} from 'timeline-state-resolver-types'
import type { SofieChefState } from '.'

export function buildSofieChefState(
	timelineState: Timeline.TimelineState<TSRTimelineContent>,
	mappings: Mappings
): SofieChefState {
	const sofieChefState: SofieChefState = {
		windows: {},
	}
	for (const [layer, layerState] of Object.entries<Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>>(
		timelineState.layers
	)) {
		const mapping = mappings[layer] as Mapping<SomeMappingSofieChef> | undefined
		const content = layerState.content

		if (mapping && content.deviceType === DeviceType.SOFIE_CHEF) {
			sofieChefState.windows[mapping.options.windowId] = {
				url: interpolateTemplateStringIfNeeded(content.url),
				urlTimelineObjId: layerState.id,
			}
		}
	}
	return sofieChefState
}
