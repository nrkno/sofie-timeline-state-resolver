import { TSRTimelineObjBase, DeviceType } from '.'

export type TimelineObjAbstractAny = TSRTimelineObjAbstract
export interface TSRTimelineObjAbstract extends TSRTimelineObjBase {

	content: {
		deviceType: DeviceType.ABSTRACT
		[key: string]: any
	}
}
