import { TimelineContentTypePanasonicPtz } from 'timeline-state-resolver-types'
import _ = require('underscore')
import { CommandWithContext } from '../..'
import { PanasonicPtzState } from './state'

const COMMAND_PRIORITY: Record<PanasonicPtzCommand['type'], number> = {
	presetSpeed: 0,
	zoomSpeed: 1,
	zoom: 2,
	presetMem: 3,
}

export interface PanasonicPtzCommand {
	type: TimelineContentTypePanasonicPtz
	speed?: number
	preset?: number
	zoomSpeed?: number // -1 is full speed WIDE, +1 is full speed TELE, 0 is stationary
	zoom?: number // 0 is WIDE, 1 is TELE
}
export type PanasonicPtzCommandWithContext = CommandWithContext<PanasonicPtzCommand, string>

export function diffStates(
	oldPtzState: PanasonicPtzState,
	newPtzState: PanasonicPtzState
): Array<PanasonicPtzCommandWithContext> {
	const commands: Array<PanasonicPtzCommandWithContext> = []

	const addCommands = (newNode: PanasonicPtzState, oldValue: PanasonicPtzState) => {
		if (
			newNode.preset &&
			getValue(newNode.preset) !== getValue(oldValue.preset) &&
			getValue(newNode.preset) !== undefined
		) {
			commands.push({
				command: {
					type: TimelineContentTypePanasonicPtz.PRESET,
					preset: getValue(newNode.preset),
				},
				context: `preset differ (${getValue(newNode.preset)}, ${getValue(oldValue.preset)})`,
				timelineObjId: newNode.preset.timelineObjId,
			})
		}
		if (
			newNode.speed &&
			getValue(newNode.speed) !== getValue(oldValue.speed) &&
			getValue(newNode.speed) !== undefined
		) {
			commands.push({
				command: {
					type: TimelineContentTypePanasonicPtz.SPEED,
					speed: getValue(newNode.speed),
				},
				context: `speed differ (${getValue(newNode.speed)}, ${getValue(oldValue.speed)})`,
				timelineObjId: newNode.speed.timelineObjId,
			})
		}
		if (
			newNode.zoomSpeed &&
			getValue(newNode.zoomSpeed) !== getValue(oldValue.zoomSpeed) &&
			getValue(newNode.zoomSpeed) !== undefined
		) {
			commands.push({
				command: {
					type: TimelineContentTypePanasonicPtz.ZOOM_SPEED,
					speed: getValue(newNode.zoomSpeed),
				},
				context: `zoom speed differ (${getValue(newNode.zoomSpeed)}, ${getValue(oldValue.zoomSpeed)})`,
				timelineObjId: newNode.zoomSpeed.timelineObjId,
			})
		}
		if (newNode.zoom && getValue(newNode.zoom) !== getValue(oldValue.zoom) && getValue(newNode.zoom) !== undefined) {
			commands.push({
				command: {
					type: TimelineContentTypePanasonicPtz.ZOOM,
					zoom: getValue(newNode.zoom),
				},
				context: `zoom differ (${getValue(newNode.zoom)}, ${getValue(oldValue.zoom)})`,
				timelineObjId: newNode.zoom.timelineObjId,
			})
		}
	}

	if (!_.isEqual(newPtzState, oldPtzState)) {
		addCommands(newPtzState, oldPtzState)
	}

	const sortedCommandsToAchieveState = commands.sort(
		(a, b) => COMMAND_PRIORITY[a.command.type] - COMMAND_PRIORITY[b.command.type]
	)

	return sortedCommandsToAchieveState
}

function getValue<A extends { value: B }, B>(a?: A): B | undefined {
	if (a) return a.value
	return undefined
}
