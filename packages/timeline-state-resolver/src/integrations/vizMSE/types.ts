import {
	TimelineContentTypeVizMSE,
	VIZMSEOutTransition,
	VIZMSEPlayoutItemContent,
	VIZMSEPlayoutItemContentExternal,
	VIZMSEPlayoutItemContentInternal,
} from 'timeline-state-resolver-types'
import { VElement } from '@tv2media/v-connection'
import type { CommandWithContext } from '../../service/device'

export interface VizMSECommandWithContext extends CommandWithContext<VizMSECommand, string> {
	queueId: string | undefined
}

export interface VizMSEState {
	time: number
	layer: {
		[layerId: string]: VizMSEStateLayer
	}
	/** Special: If this is set, all other state will be disregarded and all graphics will be cleared */
	isClearAll?: {
		timelineObjId: string
		showId: string
		channelsToSendCommands?: string[]
	}
}
export type VizMSEStateLayer =
	| VizMSEStateLayerInternal
	| VizMSEStateLayerPilot
	| VizMSEStateLayerContinue
	| VizMSEStateLayerLoadAllElements
	| VizMSEStateLayerInitializeShows
	| VizMSEStateLayerCleanupShows
	| VizMSEStateLayerConcept
interface VizMSEStateLayerBase {
	timelineObjId: string
	lookahead?: boolean
	/** Whether this element should have its take delayed until after an out transition has finished */
	delayTakeAfterOutTransition?: boolean
}
interface VizMSEStateLayerElementBase extends VizMSEStateLayerBase {
	contentType: TimelineContentTypeVizMSE
	continueStep?: number
	cue?: boolean

	outTransition?: VIZMSEOutTransition
}
export interface VizMSEStateLayerInternal extends VizMSEStateLayerElementBase {
	contentType: TimelineContentTypeVizMSE.ELEMENT_INTERNAL

	templateName: string
	templateData: Array<string>
	showId: string
	channelName?: string
}
export interface VizMSEStateLayerPilot extends VizMSEStateLayerElementBase {
	contentType: TimelineContentTypeVizMSE.ELEMENT_PILOT

	templateVcpId: number
	channelName?: string
}
export interface VizMSEStateLayerContinue extends VizMSEStateLayerBase {
	contentType: TimelineContentTypeVizMSE.CONTINUE

	direction?: 1 | -1

	reference: string
	referenceContent?: VizMSEStateLayerInternal | VizMSEStateLayerPilot
}
export interface VizMSEStateLayerInitializeShows extends VizMSEStateLayerBase {
	contentType: TimelineContentTypeVizMSE.INITIALIZE_SHOWS

	showIds: string[]
}
export interface VizMSEStateLayerCleanupShows extends VizMSEStateLayerBase {
	contentType: TimelineContentTypeVizMSE.CLEANUP_SHOWS
	/** IDs of the Shows to cleanup */
	showIds: string[]
}
export interface VizMSEStateLayerLoadAllElements extends VizMSEStateLayerBase {
	contentType: TimelineContentTypeVizMSE.LOAD_ALL_ELEMENTS
}
export interface VizMSEStateLayerConcept extends VizMSEStateLayerBase {
	contentType: TimelineContentTypeVizMSE.CONCEPT
	concept: string
}
interface VizMSECommandBase {
	time: number
	type: VizMSECommandType
	timelineObjId: string
	fromLookahead?: boolean
	layerId?: string
}
export enum VizMSECommandType {
	PREPARE_ELEMENT = 'prepare',
	CUE_ELEMENT = 'cue',
	TAKE_ELEMENT = 'take',
	TAKEOUT_ELEMENT = 'out',
	CONTINUE_ELEMENT = 'continue',
	CONTINUE_ELEMENT_REVERSE = 'continuereverse',
	LOAD_ALL_ELEMENTS = 'load_all_elements',
	CLEAR_ALL_ELEMENTS = 'clear_all_elements',
	CLEAR_ALL_ENGINES = 'clear_all_engines',
	INITIALIZE_SHOWS = 'initialize_shows',
	CLEANUP_SHOWS = 'cleanup_shows',
	SET_CONCEPT = 'set_concept',
}

export interface VizMSECommandElementBase extends VizMSECommandBase {
	content: VizMSEPlayoutItemContentInstance
}
export interface VizMSECommandPrepare extends VizMSECommandElementBase {
	type: VizMSECommandType.PREPARE_ELEMENT
}
export interface VizMSECommandCue extends VizMSECommandElementBase {
	type: VizMSECommandType.CUE_ELEMENT
}
export interface VizMSECommandTake extends VizMSECommandElementBase {
	type: VizMSECommandType.TAKE_ELEMENT
	transition?: VIZMSEOutTransition
}
export interface VizMSECommandTakeOut extends VizMSECommandElementBase {
	type: VizMSECommandType.TAKEOUT_ELEMENT
	transition?: VIZMSEOutTransition
}
export interface VizMSECommandContinue extends VizMSECommandElementBase {
	type: VizMSECommandType.CONTINUE_ELEMENT
}
export interface VizMSECommandContinueReverse extends VizMSECommandElementBase {
	type: VizMSECommandType.CONTINUE_ELEMENT_REVERSE
}
export interface VizMSECommandLoadAllElements extends VizMSECommandBase {
	type: VizMSECommandType.LOAD_ALL_ELEMENTS
}
export interface VizMSECommandClearAllElements extends VizMSECommandBase {
	type: VizMSECommandType.CLEAR_ALL_ELEMENTS

	templateName: string
	showId: string
}
export interface VizMSECommandClearAllEngines extends VizMSECommandBase {
	type: VizMSECommandType.CLEAR_ALL_ENGINES

	channels: string[] | 'all'
	commands: string[]
}
export interface VizMSECommandInitializeShows extends VizMSECommandBase {
	type: VizMSECommandType.INITIALIZE_SHOWS
	showIds: string[]
}
export interface VizMSECommandCleanupShows extends VizMSECommandBase {
	type: VizMSECommandType.CLEANUP_SHOWS
	showIds: string[]
}

export interface VizMSECommandSetConcept extends VizMSECommandBase {
	type: VizMSECommandType.SET_CONCEPT
	concept: string
}
export type VizMSECommand =
	| VizMSECommandPrepare
	| VizMSECommandCue
	| VizMSECommandTake
	| VizMSECommandTakeOut
	| VizMSECommandContinue
	| VizMSECommandContinueReverse
	| VizMSECommandLoadAllElements
	| VizMSECommandClearAllElements
	| VizMSECommandClearAllEngines
	| VizMSECommandInitializeShows
	| VizMSECommandCleanupShows
	| VizMSECommandSetConcept
interface VizMSEPlayoutItemContentInternalInstance extends Omit<VIZMSEPlayoutItemContentInternal, 'showName'> {
	/** Name of the instance of the element in MSE, generated by us */
	instanceName: string
	/** Resolved Id of the Show to place this element in */
	showId: string
}
export type VizMSEPlayoutItemContentExternalInstance = VIZMSEPlayoutItemContentExternal

export type VizMSEPlayoutItemContentInstance =
	| VizMSEPlayoutItemContentInternalInstance
	| VizMSEPlayoutItemContentExternalInstance

export function isVizMSEPlayoutItemContentExternalInstance(
	content: VizMSEPlayoutItemContentInstance | undefined
): content is VizMSEPlayoutItemContentExternalInstance {
	return (content as VizMSEPlayoutItemContentExternalInstance | undefined)?.vcpid !== undefined
}

export function isVizMSEPlayoutItemContentInternalInstance(
	content: VizMSEPlayoutItemContentInstance
): content is VizMSEPlayoutItemContentInternalInstance {
	return (content as VizMSEPlayoutItemContentInternalInstance).templateName !== undefined
}

export function isVIZMSEPlayoutItemContentExternal(
	content: VIZMSEPlayoutItemContent
): content is VIZMSEPlayoutItemContentExternal {
	return (content as VIZMSEPlayoutItemContentExternal).vcpid !== undefined
}

export function isVIZMSEPlayoutItemContentInternal(
	content: VIZMSEPlayoutItemContent
): content is VIZMSEPlayoutItemContentInternal {
	return (content as VIZMSEPlayoutItemContentInternal).templateName !== undefined
}

export interface CachedVElement {
	readonly hash: string
	readonly element: VElement
	readonly content: VizMSEPlayoutItemContentInstance

	isExpected?: boolean
	isLoaded?: boolean
	isLoading?: boolean
	wasLoaded?: boolean
	requestedLoading?: boolean
	toDelete?: boolean
}
