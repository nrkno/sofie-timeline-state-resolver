import { literal } from '../../lib'
import { TimelineContentTypeVizMSE, VizMSEOptions, VIZMSETransitionType } from 'timeline-state-resolver-types'
import _ = require('underscore')
import {
	VizMSECommand,
	VizMSECommandCleanupShows,
	VizMSECommandClearAllElements,
	VizMSECommandClearAllEngines,
	VizMSECommandContinue,
	VizMSECommandContinueReverse,
	VizMSECommandCue,
	VizMSECommandElementBase,
	VizMSECommandInitializeShows,
	VizMSECommandLoadAllElements,
	VizMSECommandPrepare,
	VizMSECommandSetConcept,
	VizMSECommandTake,
	VizMSECommandTakeOut,
	VizMSECommandType,
	VizMSEState,
	VizMSEStateLayer,
} from './types'
import { VizMSEManager } from './vizMSEManager'
import type { DeviceContextAPI } from '../../service/device'

/** The ideal time to prepare elements before going on air */
const IDEAL_PREPARE_TIME = 1000
/** Minimum time to wait after preparing elements */
const PREPARE_TIME_WAIT = 50

export function diffVizMSEStates(
	oldState: VizMSEState | undefined,
	newState: VizMSEState,
	stateTime: number,
	currentTime: number,
	options: VizMSEOptions | undefined,
	logger: DeviceContextAPI<unknown>['logger']
): Array<VizMSECommand> {
	const highPrioCommands: VizMSECommand[] = []
	const lowPrioCommands: VizMSECommand[] = []

	const addCommand = (command: VizMSECommand, lowPriority?: boolean) => {
		;(lowPriority ? lowPrioCommands : highPrioCommands).push(command)
	}

	/** The time of when to run "preparation" commands */
	let prepareTime = Math.min(
		stateTime,
		Math.max(
			stateTime - IDEAL_PREPARE_TIME,
			(oldState?.time ?? 0) + PREPARE_TIME_WAIT // earliset possible prepareTime
		)
	)
	if (prepareTime < currentTime) {
		// Only to not emit an unnessesary slowCommand event
		prepareTime = currentTime
	}
	if (stateTime < prepareTime) {
		prepareTime = stateTime - 10
	}

	_.each(newState.layer, (newLayer: VizMSEStateLayer, layerId: string) => {
		const oldLayer: VizMSEStateLayer | undefined = oldState?.layer?.[layerId]

		if (newLayer.contentType === TimelineContentTypeVizMSE.LOAD_ALL_ELEMENTS) {
			if (!oldLayer || !_.isEqual(newLayer, oldLayer)) {
				addCommand(
					literal<VizMSECommandLoadAllElements>({
						timelineObjId: newLayer.timelineObjId,
						fromLookahead: newLayer.lookahead,
						layerId: layerId,

						type: VizMSECommandType.LOAD_ALL_ELEMENTS,
						time: stateTime,
					}),
					newLayer.lookahead
				)
			}
		} else if (newLayer.contentType === TimelineContentTypeVizMSE.CONTINUE) {
			if ((!oldLayer || !_.isEqual(newLayer, oldLayer)) && newLayer.referenceContent) {
				const props: Omit<VizMSECommandElementBase, 'time' | 'type'> = {
					timelineObjId: newLayer.timelineObjId,
					fromLookahead: newLayer.lookahead,
					layerId: layerId,

					content: VizMSEManager.getPlayoutItemContentFromLayer(newLayer.referenceContent),
				}
				if ((newLayer.direction || 1) === 1) {
					addCommand(
						literal<VizMSECommandContinue>({
							...props,
							type: VizMSECommandType.CONTINUE_ELEMENT,
							time: stateTime,
						}),
						newLayer.lookahead
					)
				} else {
					addCommand(
						literal<VizMSECommandContinueReverse>({
							...props,
							type: VizMSECommandType.CONTINUE_ELEMENT_REVERSE,
							time: stateTime,
						}),
						newLayer.lookahead
					)
				}
			}
		} else if (newLayer.contentType === TimelineContentTypeVizMSE.INITIALIZE_SHOWS) {
			if (!oldLayer || !_.isEqual(newLayer, oldLayer)) {
				addCommand(
					literal<VizMSECommandInitializeShows>({
						type: VizMSECommandType.INITIALIZE_SHOWS,
						timelineObjId: newLayer.timelineObjId,
						showIds: newLayer.showIds,
						time: stateTime,
					}),
					newLayer.lookahead
				)
			}
		} else if (newLayer.contentType === TimelineContentTypeVizMSE.CLEANUP_SHOWS) {
			if (!oldLayer || !_.isEqual(newLayer, oldLayer)) {
				const command: VizMSECommandCleanupShows = literal<VizMSECommandCleanupShows>({
					type: VizMSECommandType.CLEANUP_SHOWS,
					timelineObjId: newLayer.timelineObjId,
					showIds: newLayer.showIds,
					time: stateTime,
				})
				addCommand(command, newLayer.lookahead)
			}
		} else if (newLayer.contentType === TimelineContentTypeVizMSE.CONCEPT) {
			if (!oldLayer || !_.isEqual(newLayer, oldLayer)) {
				addCommand(
					literal<VizMSECommandSetConcept>({
						concept: newLayer.concept,
						type: VizMSECommandType.SET_CONCEPT,
						time: stateTime,
						timelineObjId: newLayer.timelineObjId,
					})
				)
			}
		} else {
			const props: Omit<VizMSECommandElementBase, 'time' | 'type'> = {
				timelineObjId: newLayer.timelineObjId,
				fromLookahead: newLayer.lookahead,
				layerId: layerId,

				content: VizMSEManager.getPlayoutItemContentFromLayer(newLayer),
			}
			if (
				!oldLayer ||
				!_.isEqual(
					_.omit(newLayer, ['continueStep', 'timelineObjId', 'outTransition']),
					_.omit(oldLayer, ['continueStep', 'timelineObjId', 'outTransition'])
				)
			) {
				if (
					newLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL ||
					newLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT
				) {
					// Maybe prepare the element first:
					addCommand(
						literal<VizMSECommandPrepare>({
							...props,
							type: VizMSECommandType.PREPARE_ELEMENT,
							time: prepareTime,
						}),
						newLayer.lookahead
					)

					if (newLayer.cue) {
						// Cue the element
						addCommand(
							literal<VizMSECommandCue>({
								...props,
								type: VizMSECommandType.CUE_ELEMENT,
								time: stateTime,
							}),
							newLayer.lookahead
						)
					} else {
						// Start playing element
						addCommand(
							literal<VizMSECommandTake>({
								...props,
								type: VizMSECommandType.TAKE_ELEMENT,
								time: stateTime,
							}),
							newLayer.lookahead
						)
					}
				}
			} else if (
				(oldLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL ||
					oldLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT) &&
				(newLayer.continueStep || 0) > (oldLayer.continueStep || 0)
			) {
				// An increase in continueStep should result in triggering a continue:
				addCommand(
					literal<VizMSECommandContinue>({
						...props,
						type: VizMSECommandType.CONTINUE_ELEMENT,
						time: stateTime,
					}),
					newLayer.lookahead
				)
			} else if (
				(oldLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL ||
					oldLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT) &&
				(newLayer.continueStep || 0) < (oldLayer.continueStep || 0)
			) {
				// A decrease in continueStep should result in triggering a continue:
				addCommand(
					literal<VizMSECommandContinueReverse>({
						...props,
						type: VizMSECommandType.CONTINUE_ELEMENT_REVERSE,
						time: stateTime,
					}),
					newLayer.lookahead
				)
			}
		}
	})

	_.each(oldState?.layer ?? {}, (oldLayer: VizMSEStateLayer, layerId: string) => {
		const newLayer = newState.layer[layerId]
		if (!newLayer) {
			if (
				oldLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL ||
				oldLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT
			) {
				// Stopped playing
				addCommand(
					literal<VizMSECommandTakeOut>({
						type: VizMSECommandType.TAKEOUT_ELEMENT,
						time: stateTime,
						timelineObjId: oldLayer.timelineObjId,
						fromLookahead: oldLayer.lookahead,
						layerId: layerId,
						transition: oldLayer && oldLayer.outTransition,
						content: VizMSEManager.getPlayoutItemContentFromLayer(oldLayer),
					}),
					oldLayer.lookahead
				)
			} else if (oldLayer.contentType === TimelineContentTypeVizMSE.INITIALIZE_SHOWS) {
				addCommand(
					literal<VizMSECommandInitializeShows>({
						type: VizMSECommandType.INITIALIZE_SHOWS,
						timelineObjId: oldLayer.timelineObjId,
						showIds: [],
						time: stateTime,
					}),
					oldLayer.lookahead
				)
			}
		}
	})

	if (newState.isClearAll && !oldState?.isClearAll) {
		// Special: clear all graphics

		const clearingCommands: VizMSECommand[] = []

		const templateName = options && options.clearAllTemplateName
		if (!templateName) {
			logger.warning(`vizMSE: initOptions.clearAllTemplateName is not set!`)
		} else {
			// Start playing special element:
			clearingCommands.push(
				literal<VizMSECommandClearAllElements>({
					timelineObjId: newState.isClearAll.timelineObjId,
					time: stateTime,
					type: VizMSECommandType.CLEAR_ALL_ELEMENTS,
					templateName: templateName,
					showId: newState.isClearAll.showId,
				})
			)
		}
		if (
			newState.isClearAll.channelsToSendCommands &&
			options &&
			options.clearAllCommands &&
			options.clearAllCommands.length
		) {
			// Send special commands to the engines:
			clearingCommands.push(
				literal<VizMSECommandClearAllEngines>({
					timelineObjId: newState.isClearAll.timelineObjId,
					time: stateTime,
					type: VizMSECommandType.CLEAR_ALL_ENGINES,
					channels: newState.isClearAll.channelsToSendCommands,
					commands: options.clearAllCommands,
				})
			)
		}
		return clearingCommands
	}
	const sortCommands = (commands: VizMSECommand[]): VizMSECommand[] => {
		// Sort the commands so that take out:s are run first
		return commands.sort((a, b) => {
			if (a.type === VizMSECommandType.TAKEOUT_ELEMENT && b.type !== VizMSECommandType.TAKEOUT_ELEMENT) return -1
			if (a.type !== VizMSECommandType.TAKEOUT_ELEMENT && b.type === VizMSECommandType.TAKEOUT_ELEMENT) return 1
			return 0
		})
	}
	sortCommands(highPrioCommands)
	sortCommands(lowPrioCommands)

	const concatCommands = sortCommands(highPrioCommands.concat(lowPrioCommands))

	let highestDelay = 0
	concatCommands.forEach((command) => {
		if (command.type === VizMSECommandType.TAKEOUT_ELEMENT) {
			if (command.transition && command.transition.delay) {
				if (command.transition.delay > highestDelay) {
					highestDelay = command.transition.delay
				}
			}
		}
	})

	if (highestDelay > 0) {
		concatCommands.forEach((command, index) => {
			if (
				command.type === VizMSECommandType.TAKE_ELEMENT &&
				command.layerId &&
				(newState.layer[command.layerId].contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL ||
					!!newState.layer[command.layerId].delayTakeAfterOutTransition)
			) {
				;(concatCommands[index] as VizMSECommandTake).transition = {
					type: VIZMSETransitionType.DELAY,
					delay: highestDelay + 20,
				}
			}
		})
	}

	if (concatCommands.length) {
		logger.debug(`VIZMSE: COMMANDS: ${JSON.stringify(sortCommands(concatCommands))}`)
	}

	return sortCommands(concatCommands)
}
