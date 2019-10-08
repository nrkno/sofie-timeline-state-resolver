import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'

export interface MappingVizMSE extends Mapping {
	device: DeviceType.VIZMSE
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

		// continueStep?: number // should this be added?
	}
}
export interface TimelineObjVIZMSEElementInternal extends TimelineObjVIZMSEBase {
	content: {
		deviceType: DeviceType.VIZMSE
		type: TimelineContentTypeVizMSE.ELEMENT_INTERNAL

		templateName: string
		templateData: Array<string>
	}
}
export interface TimelineObjVIZMSEElementPilot extends TimelineObjVIZMSEBase {
	content: {
		deviceType: DeviceType.VIZMSE
		type: TimelineContentTypeVizMSE.ELEMENT_PILOT

		templateVcpId: number
	}
}
