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
	profileName
}
export enum TimelineContentTypeVizMSE {
	ELEMENT_INTERNAL = 'element_internal',
	ELEMENT_PILOT = 'element_pilot'
}

export type TimelineObjVIZMSEAny = TimelineObjVIZMSEElementInternal | TimelineObjVIZMSEElementPilot

export interface TimelineObjVIZMSEBase extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.VIZMSE
		type: TimelineContentTypeVizMSE

		/** When this changes, a continue-function will be triggered */
		continueStep?: number
	}
}
export interface TimelineObjVIZMSEElementInternal extends TimelineObjVIZMSEBase {
	content: {
		deviceType: DeviceType.VIZMSE
		type: TimelineContentTypeVizMSE.ELEMENT_INTERNAL

		/** When this changes, a continue-function will be triggered */
		continueStep?: number

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

		/** Viz-Pilot id of the template to be played */
		templateVcpId: number
	}
}
