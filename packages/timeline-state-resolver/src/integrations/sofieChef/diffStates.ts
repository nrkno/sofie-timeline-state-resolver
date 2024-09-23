import type { Mappings } from 'timeline-state-resolver-types'
import type { SofieChefState, SofieChefCommandWithContext } from '.'
import { ReceiveWSMessageType } from './api'

export function diffStates(
	oldSofieChefState: SofieChefState | undefined,
	newSofieChefState: SofieChefState,
	_mappings: Mappings
): Array<SofieChefCommandWithContext> {
	const commands: SofieChefCommandWithContext[] = []

	// Added / Changed things:
	for (const [windowId, window] of Object.entries<SofieChefState['windows'][0]>(newSofieChefState.windows)) {
		const oldWindow = oldSofieChefState?.windows?.[windowId]
		if (!oldWindow) {
			// Added
			commands.push({
				context: 'added',
				timelineObjId: window.urlTimelineObjId,
				command: {
					msgId: 0, // set later
					type: ReceiveWSMessageType.PLAYURL,
					windowId: windowId,
					url: window.url,
				},
			})
		} else {
			// item is not new, but maybe it has changed:
			if (oldWindow.url !== window.url) {
				commands.push({
					context: 'changed',
					timelineObjId: window.urlTimelineObjId,
					command: {
						msgId: 0, // set later
						type: ReceiveWSMessageType.PLAYURL,
						windowId: windowId,
						url: window.url,
					},
				})
			}
		}
	}

	// Removed things
	if (oldSofieChefState) {
		for (const [windowId, oldWindow] of Object.entries<SofieChefState['windows'][0]>(oldSofieChefState.windows)) {
			const newWindow = newSofieChefState.windows[windowId]
			if (!newWindow) {
				// Removed
				commands.push({
					context: 'removed',
					timelineObjId: oldWindow.urlTimelineObjId,
					command: {
						msgId: 0, // set later
						type: ReceiveWSMessageType.STOP,
						windowId: windowId,
					},
				})
			}
		}
	}

	return commands
}
