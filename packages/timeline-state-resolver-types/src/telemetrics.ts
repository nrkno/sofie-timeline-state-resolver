import { DeviceType } from './index'

export interface TelemetricsOptions {
	host: string
	port?: number
}

export type TimelineContentTelemetricsAny = TimelineContentTelemetrics

export interface TimelineContentTelemetrics {
	deviceType: DeviceType.TELEMETRICS
	presetShotIdentifiers: number[]
}
