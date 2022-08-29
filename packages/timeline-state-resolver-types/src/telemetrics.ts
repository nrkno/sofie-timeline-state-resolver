import { DeviceType, TSRTimelineObjBase } from './index'

export interface TelemetricsOptions {
	host: string
}

export type TimelineObjTelemetricsAny = TimelineObjTelemetrics

export interface TimelineObjTelemetrics extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.TELEMETRICS
		presetNumber: number
	}
}
