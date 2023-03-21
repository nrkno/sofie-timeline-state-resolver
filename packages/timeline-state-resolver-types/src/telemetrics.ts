import { DeviceType } from './index'

export type TimelineContentTelemetricsAny = TimelineContentTelemetrics

export interface TimelineContentTelemetrics {
	deviceType: DeviceType.TELEMETRICS
	presetShotIdentifiers: number[]
}
