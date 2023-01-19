import { DeviceType, HTTPSendCommandContent } from '.'

export type TimelineContentHTTPSendAny = TimelineContentHTTPRequest
export interface TimelineContentHTTPSendBase {
	deviceType: DeviceType.HTTPSEND
}

export type TimelineContentHTTPRequest = TimelineContentHTTPSendBase & HTTPSendCommandContent
