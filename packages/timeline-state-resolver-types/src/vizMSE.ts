import { DeviceType } from '.'

export enum TimelineContentTypeVizMSE {
	ELEMENT_INTERNAL = 'element_internal',
	ELEMENT_PILOT = 'element_pilot',
	CONTINUE = 'continue',
	LOAD_ALL_ELEMENTS = 'load_all_elements',
	CLEAR_ALL_ELEMENTS = 'clear_all_elements',
	CLEANUP_SHOWS = 'cleanup_shows',
	INITIALIZE_SHOWS = 'initialize_shows',
	CONCEPT = 'concept',
}

export type TimelineContentVIZMSEAny =
	| TimelineContentVIZMSEElementInternal
	| TimelineContentVIZMSEElementPilot
	| TimelineContentVIZMSEElementContinue
	| TimelineContentVIZMSELoadAllElements
	| TimelineContentVIZMSEClearAllElements
	| TimelineContentVIZMSEInitializeShows
	| TimelineContentVIZMSECleanupShows
	| TimelineContentVIZMSEConcept

export interface TimelineContentVIZMSEBase {
	deviceType: DeviceType.VIZMSE
	type: TimelineContentTypeVizMSE

	/** When this changes, a continue-function will be triggered */
	continueStep?: number

	/** What channel to output to */
	channelName?: string

	/** Don't play, only cue the element  */
	cue?: boolean

	/** If true, won't be preloaded automatically */
	noAutoPreloading?: boolean

	// inTransition?: VIZMSEOutTransition
	outTransition?: VIZMSEOutTransition
}
export interface TimelineContentVIZMSEElementInternal extends TimelineContentVIZMSEBase {
	deviceType: DeviceType.VIZMSE
	type: TimelineContentTypeVizMSE.ELEMENT_INTERNAL

	/** When this changes, a continue-function will be triggered */
	continueStep?: number

	/** What channel to output to */
	channelName?: string

	/** Don't play, only cue the element  */
	cue?: boolean

	/** If true, won't be preloaded (cued) automatically */
	noAutoPreloading?: boolean

	// inTransition?: VIZMSEOutTransition
	outTransition?: VIZMSEOutTransition

	/** Name of the template to be played */
	templateName: string
	/** Data to be fed into the template */
	templateData: Array<string>
	/** Name of the Show to place this element in */
	showName: string
	/** Whether this element should have its take delayed until after an out transition has finished */
	delayTakeAfterOutTransition?: boolean
}
export interface TimelineContentVIZMSEElementPilot extends TimelineContentVIZMSEBase {
	deviceType: DeviceType.VIZMSE
	type: TimelineContentTypeVizMSE.ELEMENT_PILOT

	/** When this changes, a continue-function will be triggered */
	continueStep?: number

	/** What channel to output to */
	channelName?: string

	/** Don't play, only cue the element  */
	cue?: boolean

	/** If true, won't be preloaded (cued) automatically */
	noAutoPreloading?: boolean

	// inTransition?: VIZMSEOutTransition
	outTransition?: VIZMSEOutTransition

	/** Viz-Pilot id of the template to be played */
	templateVcpId: number
	/** Whether this element should have its take delayed until after an out transition has finished */
	delayTakeAfterOutTransition?: boolean
}
export interface TimelineContentVIZMSEElementContinue extends TimelineContentVIZMSEBase {
	deviceType: DeviceType.VIZMSE
	type: TimelineContentTypeVizMSE.CONTINUE

	/** Whether to continue or reverse (defaults to 1) */
	direction?: 1 | -1

	/** What other layer to continue */
	reference: string
}
export interface TimelineContentVIZMSELoadAllElements extends TimelineContentVIZMSEBase {
	deviceType: DeviceType.VIZMSE
	type: TimelineContentTypeVizMSE.LOAD_ALL_ELEMENTS
}
export interface TimelineContentVIZMSEClearAllElements extends TimelineContentVIZMSEBase {
	deviceType: DeviceType.VIZMSE
	type: TimelineContentTypeVizMSE.CLEAR_ALL_ELEMENTS

	/** Names of the channels to send the special clear commands to */
	channelsToSendCommands?: string[]

	/** Name of the Show to use for taking the special template */
	showName: string
}
export interface TimelineContentVIZMSEInitializeShows extends TimelineContentVIZMSEBase {
	deviceType: DeviceType.VIZMSE
	type: TimelineContentTypeVizMSE.INITIALIZE_SHOWS

	/** Names of the Shows to initialize */
	showNames: string[]
}
export interface TimelineContentVIZMSECleanupShows extends TimelineContentVIZMSEBase {
	deviceType: DeviceType.VIZMSE
	type: TimelineContentTypeVizMSE.CLEANUP_SHOWS

	/** Names of the Shows to cleanup */
	showNames: string[]
}

export interface TimelineContentVIZMSEConcept extends TimelineContentVIZMSEBase {
	deviceType: DeviceType.VIZMSE
	type: TimelineContentTypeVizMSE.CONCEPT
	concept: string
}

export type VIZMSEOutTransition = VIZMSETransitionDelay
export interface VIZMSETransitionBase {
	type: VIZMSETransitionType
}
export enum VIZMSETransitionType {
	DELAY = 0,
}
export interface VIZMSETransitionDelay {
	type: VIZMSETransitionType.DELAY

	// For how long to delay the take out (ms)
	delay: number
}
export interface VIZMSEPlayoutItemContentBase {
	/** What channel to use for the element */
	channel?: string

	/** If true, won't be preloaded (cued) automatically */
	noAutoPreloading?: boolean
}

export interface VIZMSEPlayoutItemContentInternal extends VIZMSEPlayoutItemContentBase {
	/** Name of the template that this element uses */
	templateName: string
	/** Data fields of the element */
	templateData?: string[]
	/** Which Show to place this element in */
	showName: string
}

export interface VIZMSEPlayoutItemContentExternal extends VIZMSEPlayoutItemContentBase {
	/** Id of the Pilot Element */
	vcpid: number
}

export type VIZMSEPlayoutItemContent = VIZMSEPlayoutItemContentExternal | VIZMSEPlayoutItemContentInternal
