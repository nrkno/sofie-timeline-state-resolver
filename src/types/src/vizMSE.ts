import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'

export interface MappingVizMSE extends Mapping {
	device: DeviceType.VIZMSE
}
export interface VizMSEOptions {
	/** Host name or IP adress to the MSE machine */
	host: string
	/** Port number to the REST interface (optional) */
	restPort?: number
	/** Port number to the web-sockets interface (optional) */
	wsPort?: number

	/** Identifier of the "show" to use */
	showID: string
	/** Identifier of the "profile" to send commands to */
	profile: string
	/** Identifier of the "playlist" to send commands to */
	playlistID?: string

	/** Whether all elements should be preloaded or not */
	preloadAllElements?: boolean
	// profileName
}
export enum TimelineContentTypeVizMSE {
	ELEMENT_INTERNAL = 'element_internal',
	ELEMENT_PILOT = 'element_pilot',
	CONTINUE = 'continue',
	LOAD_ALL_ELEMENTS = 'load_all_elements'
}

export type TimelineObjVIZMSEAny = TimelineObjVIZMSEElementInternal | TimelineObjVIZMSEElementPilot | TimelineObjVIZMSEElementContinue | TimelineObjVIZMSELoadAllElements

export interface TimelineObjVIZMSEBase extends TSRTimelineObjBase {
	content: {
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
	}
}
export interface TimelineObjVIZMSEElementInternal extends TimelineObjVIZMSEBase {
	content: {
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

		/** Name of the template to be played */
		templateName: string
		/** Data to be fed into the template */
		templateData: Array<string>
	}
}
export interface TimelineObjVIZMSEElementPilot extends TimelineObjVIZMSEBase {
	content: {
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

		/** Viz-Pilot id of the template to be played */
		templateVcpId: number
	}
}
export interface TimelineObjVIZMSEElementContinue extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.VIZMSE
		type: TimelineContentTypeVizMSE.CONTINUE

		/** Whether to continue or reverse (defaults to 1) */
		direction?: 1 | -1

		/** What other layer to continue */
		reference: string
	}
}
export interface TimelineObjVIZMSELoadAllElements extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.VIZMSE
		type: TimelineContentTypeVizMSE.LOAD_ALL_ELEMENTS
	}
}
