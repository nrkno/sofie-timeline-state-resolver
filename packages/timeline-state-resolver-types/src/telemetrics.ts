import { DeviceType, TSRTimelineObjBase } from './index'

export interface TelemetricsOptions {
	host: string
	port?: number
}

export type TimelineObjTelemetricsAny = TimelineObjTelemetrics

export interface TimelineObjTelemetrics extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.TELEMETRICS
		presetShotIdentifiers: number[]
	}
}
