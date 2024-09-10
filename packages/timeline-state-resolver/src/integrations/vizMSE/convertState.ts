import { literal } from '../../lib'
import {
	Timeline,
	TSRTimelineContent,
	Mappings,
	ResolvedTimelineObjectInstanceExtended,
	Mapping,
	SomeMappingVizMSE,
	DeviceType,
	TimelineContentVIZMSEAny,
	TimelineContentTypeVizMSE,
	TimelineContentVIZMSEElementInternal,
	TimelineContentVIZMSEElementPilot,
} from 'timeline-state-resolver-types'
import _ = require('underscore')
import type {
	VizMSEState,
	VizMSEStateLayerLoadAllElements,
	VizMSEStateLayerContinue,
	VizMSEStateLayerInitializeShows,
	VizMSEStateLayerCleanupShows,
	VizMSEStateLayerConcept,
	VizMSEStateLayer,
	VizMSEStateLayerInternal,
	VizMSEStateLayerPilot,
} from './types'
import type { DeviceContextAPI } from '../../service/device'
import type { VizMSEManager } from './vizMSEManager'

export function convertStateToVizMSE(
	logger: DeviceContextAPI<unknown>['logger'],
	vizmseManager: VizMSEManager | undefined,
	timelineState: Timeline.TimelineState<TSRTimelineContent>,
	mappings: Mappings
): VizMSEState {
	const state: VizMSEState = {
		time: timelineState.time,
		layer: {},
	}

	_.each(timelineState.layers, (layer, layerName: string) => {
		const layerExt: ResolvedTimelineObjectInstanceExtended = layer
		let foundMapping = mappings[layerName] as Mapping<SomeMappingVizMSE>

		let isLookahead = false
		if (!foundMapping && layerExt.isLookahead && layerExt.lookaheadForLayer) {
			foundMapping = mappings[layerExt.lookaheadForLayer] as Mapping<SomeMappingVizMSE>
			isLookahead = true
		}
		if (foundMapping && foundMapping.device === DeviceType.VIZMSE) {
			if (layer.content) {
				const content = layer.content as TimelineContentVIZMSEAny

				switch (content.type) {
					case TimelineContentTypeVizMSE.LOAD_ALL_ELEMENTS:
						state.layer[layerName] = literal<VizMSEStateLayerLoadAllElements>({
							timelineObjId: layer.id,
							contentType: TimelineContentTypeVizMSE.LOAD_ALL_ELEMENTS,
						})
						break
					case TimelineContentTypeVizMSE.CLEAR_ALL_ELEMENTS: {
						// Special case: clear all graphics:
						const showId = vizmseManager?.resolveShowNameToId(content.showName)
						if (!showId) {
							logger.warning(
								`convertStateToVizMSE: Unable to find Show Id for Clear-All template and Show Name "${content.showName}"`
							)
							break
						}
						state.isClearAll = {
							timelineObjId: layer.id,
							showId,
							channelsToSendCommands: content.channelsToSendCommands,
						}
						break
					}
					case TimelineContentTypeVizMSE.CONTINUE:
						state.layer[layerName] = literal<VizMSEStateLayerContinue>({
							timelineObjId: layer.id,
							contentType: TimelineContentTypeVizMSE.CONTINUE,
							direction: content.direction,
							reference: content.reference,
						})
						break
					case TimelineContentTypeVizMSE.INITIALIZE_SHOWS:
						state.layer[layerName] = literal<VizMSEStateLayerInitializeShows>({
							timelineObjId: layer.id,
							contentType: TimelineContentTypeVizMSE.INITIALIZE_SHOWS,
							showIds: _.compact(content.showNames.map((showName) => vizmseManager?.resolveShowNameToId(showName))),
						})
						break
					case TimelineContentTypeVizMSE.CLEANUP_SHOWS:
						state.layer[layerName] = literal<VizMSEStateLayerCleanupShows>({
							timelineObjId: layer.id,
							contentType: TimelineContentTypeVizMSE.CLEANUP_SHOWS,
							showIds: _.compact(content.showNames.map((showName) => vizmseManager?.resolveShowNameToId(showName))),
						})
						break
					case TimelineContentTypeVizMSE.CONCEPT:
						state.layer[layerName] = literal<VizMSEStateLayerConcept>({
							timelineObjId: layer.id,
							contentType: TimelineContentTypeVizMSE.CONCEPT,
							concept: content.concept,
						})
						break
					default: {
						const stateLayer = contentToStateLayer(logger, vizmseManager, layer.id, content)
						if (stateLayer) {
							if (isLookahead) stateLayer.lookahead = true

							state.layer[layerName] = stateLayer
						}
						break
					}
				}
			}
		}
	})

	if (state.isClearAll) {
		// clear rest of state:
		state.layer = {}
	}

	// Fix references:
	_.each(state.layer, (layer) => {
		if (layer.contentType === TimelineContentTypeVizMSE.CONTINUE) {
			const otherLayer = state.layer[layer.reference]
			if (otherLayer) {
				if (
					otherLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL ||
					otherLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT
				) {
					layer.referenceContent = otherLayer
				} else {
					// it's not possible to reference that kind of object
					logger.warning(
						`object "${layer.timelineObjId}" of contentType="${layer.contentType}", cannot reference object "${otherLayer.timelineObjId}" on layer "${layer.reference}" of contentType="${otherLayer.contentType}" `
					)
				}
			}
		}
	})

	return state
}
function contentToStateLayer(
	logger: DeviceContextAPI<unknown>['logger'],
	vizmseManager: VizMSEManager | undefined,
	timelineObjId: string,
	content: TimelineContentVIZMSEElementInternal | TimelineContentVIZMSEElementPilot
): VizMSEStateLayer | undefined {
	if (content.type === TimelineContentTypeVizMSE.ELEMENT_INTERNAL) {
		const showId = vizmseManager?.resolveShowNameToId(content.showName)
		if (!showId) {
			logger.warning(
				`contentToStateLayer: Unable to find Show Id for template "${content.templateName}" and Show Name "${content.showName}"`
			)
			return undefined
		}
		const o: VizMSEStateLayerInternal = {
			timelineObjId: timelineObjId,
			contentType: TimelineContentTypeVizMSE.ELEMENT_INTERNAL,
			continueStep: content.continueStep,
			cue: content.cue,
			outTransition: content.outTransition,

			templateName: content.templateName,
			templateData: content.templateData,
			channelName: content.channelName,
			delayTakeAfterOutTransition: content.delayTakeAfterOutTransition,
			showId,
		}
		return o
	} else if (content.type === TimelineContentTypeVizMSE.ELEMENT_PILOT) {
		const o: VizMSEStateLayerPilot = {
			timelineObjId: timelineObjId,
			contentType: TimelineContentTypeVizMSE.ELEMENT_PILOT,
			continueStep: content.continueStep,
			cue: content.cue,
			outTransition: content.outTransition,

			templateVcpId: content.templateVcpId,
			channelName: content.channelName,
			delayTakeAfterOutTransition: content.delayTakeAfterOutTransition,
		}
		return o
	}
	return undefined
}
