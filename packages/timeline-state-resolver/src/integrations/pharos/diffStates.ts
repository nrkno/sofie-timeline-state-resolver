import {
	DeviceType,
	TSRTimelineContent,
	Timeline,
	TimelineContentPharosAny,
	TimelineContentPharosScene,
	TimelineContentPharosTimeline,
	TimelineContentTypePharos,
	type Mappings,
} from 'timeline-state-resolver-types'
import type { PharosState, PharosCommandWithContext } from '.'

type TimelineObjAny = Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>
type TimelineObjPharos = Timeline.ResolvedTimelineObjectInstance<TimelineContentPharosAny>

const isPharosObject = (obj: TimelineObjAny | undefined): obj is TimelineObjPharos => {
	return !!obj && obj.content.deviceType === DeviceType.PHAROS
}

export function diffStates(
	oldPharosState: PharosState | undefined,
	newPharosState: PharosState,
	_mappings: Mappings,
	context: string
): Array<PharosCommandWithContext> {
	const commands: PharosCommandWithContext[] = []

	const stoppedLayers = new Set<string>()
	const stopLayer = (oldLayer: TimelineObjPharos, reason?: string) => {
		if (stoppedLayers.has(oldLayer.id)) return // don't send several remove commands for the same object

		if (oldLayer.content.noRelease) return // override: don't stop / release

		stoppedLayers.add(oldLayer.id)

		if (oldLayer.content.type === TimelineContentTypePharos.SCENE) {
			if (!reason) reason = 'removed scene'

			const scene = oldLayer.content.scene
			const fade = oldLayer.content.fade

			commands.push({
				command: {
					fcn: async (pharos) => pharos.releaseScene(scene, fade),
				},
				context: `${reason}: ${oldLayer.id} ${scene} (${context})`,
				timelineObjId: oldLayer.id,
			})
		} else if (oldLayer.content.type === TimelineContentTypePharos.TIMELINE) {
			if (!reason) reason = 'removed timeline'

			const timeline = oldLayer.content.timeline
			const fade = oldLayer.content.fade

			commands.push({
				command: {
					fcn: async (pharos) => pharos.releaseTimeline(timeline, fade),
				},
				context: `${reason}: ${oldLayer.id} ${timeline} (${context})`,
				timelineObjId: oldLayer.id,
			})
		}
	}

	const modifyTimelinePlay = (newLayer: TimelineObjPharos, oldLayer?: TimelineObjPharos) => {
		if (newLayer.content.type === TimelineContentTypePharos.TIMELINE) {
			if (
				(newLayer.content.pause || false) !==
				((oldLayer?.content as TimelineContentPharosTimeline | undefined)?.pause || false)
			) {
				const timeline = newLayer.content.timeline

				if (newLayer.content.pause) {
					commands.push({
						command: {
							fcn: async (pharos) => pharos.pauseTimeline(timeline),
						},
						context: `pause timeline: ${newLayer.id} ${timeline} (${context})`,
						timelineObjId: newLayer.id,
					})
				} else {
					commands.push({
						command: {
							fcn: async (pharos) => pharos.resumeTimeline(timeline),
						},
						context: `resume timeline: ${newLayer.id} ${timeline} (${context})`,
						timelineObjId: newLayer.id,
					})
				}
			}
			if (
				(newLayer.content.rate || null) !==
				((oldLayer?.content as TimelineContentPharosTimeline | undefined)?.rate || null)
			) {
				const timeline = newLayer.content.timeline
				const rate = newLayer.content.rate

				commands.push({
					command: {
						fcn: async (pharos) => pharos.setTimelineRate(timeline, rate ?? 0),
					},
					context: `pause timeline: ${newLayer.id} ${timeline}: ${rate} (${context})`,
					timelineObjId: newLayer.id,
				})
			}
			// @todo: support pause / setTimelinePosition
		}
	}

	const startLayer = (newLayer: TimelineObjPharos, reason?: string) => {
		if (newLayer.content.stopped) {
			// Item is set to "stopped"
			stopLayer(newLayer)
		} else if (newLayer.content.type === TimelineContentTypePharos.SCENE) {
			if (!reason) reason = 'added scene'

			const scene = newLayer.content.scene

			commands.push({
				command: {
					fcn: async (pharos) => pharos.startScene(scene),
				},
				context: `${reason}: ${newLayer.id} ${scene} (${context})`,
				timelineObjId: newLayer.id,
			})
		} else if (newLayer.content.type === TimelineContentTypePharos.TIMELINE) {
			if (!reason) reason = 'added timeline'

			const timeline = newLayer.content.timeline

			commands.push({
				command: {
					fcn: async (pharos) => pharos.startTimeline(timeline),
				},
				context: `${reason}: ${newLayer.id} ${timeline} (${context})`,
				timelineObjId: newLayer.id,
			})
			modifyTimelinePlay(newLayer)
		}
	}

	// Added / Changed things:
	for (const [layerKey, newLayer] of Object.entries<TimelineObjAny>(newPharosState)) {
		const oldPharosObj0 = oldPharosState?.[layerKey]
		const oldPharosObj = isPharosObject(oldPharosObj0) ? oldPharosObj0 : undefined

		const pharosObj = isPharosObject(newLayer) ? newLayer : undefined

		if (!pharosObj) {
			if (oldPharosObj) {
				stopLayer(oldPharosObj)
			}
		} else if (!oldPharosObj || !isPharosObject(oldPharosObj)) {
			// item is new
			startLayer(pharosObj)
		}
		// item is not new, but maybe it has changed:
		else if (
			pharosObj.content.type !== oldPharosObj.content.type || // item has changed type!
			(pharosObj.content.stopped || false) !== (oldPharosObj.content.stopped || false) // item has stopped / unstopped
		) {
			if (!oldPharosObj.content.stopped) {
				// If it was stopped before, we don't have to stop it now:
				stopLayer(oldPharosObj)
			}
			startLayer(pharosObj)
		} else if (pharosObj.content.type === TimelineContentTypePharos.SCENE) {
			if (pharosObj.content.scene !== (oldPharosObj.content as TimelineContentPharosScene).scene) {
				// scene has changed
				stopLayer(oldPharosObj, 'scene changed from')
				startLayer(pharosObj, 'scene changed to')
			}
		} else if (pharosObj.content.type === TimelineContentTypePharos.TIMELINE) {
			if (pharosObj.content.timeline !== (oldPharosObj.content as TimelineContentPharosTimeline).timeline) {
				// timeline has changed
				stopLayer(oldPharosObj, 'timeline changed from')
				startLayer(pharosObj, 'timeline changed to')
			} else {
				modifyTimelinePlay(pharosObj, oldPharosObj)
			}
		}
	}

	// Removed things
	if (oldPharosState) {
		for (const [layerKey, oldLayer] of Object.entries<TimelineObjAny>(oldPharosState)) {
			const newLayer = newPharosState[layerKey]
			if (!newLayer && isPharosObject(oldLayer)) {
				// removed item
				stopLayer(oldLayer)
			}
		}
	}

	return commands
}
