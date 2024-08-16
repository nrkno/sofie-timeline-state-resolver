import { DeviceType, HTTPSendCommandContent, StringInterpolation } from '..'

export type TimelineContentHTTPSendAny = TimelineContentHTTPRequest
export interface TimelineContentHTTPSendBase {
	deviceType: DeviceType.HTTPSEND
}

export interface HTTPSendCommandContentExt extends Omit<HTTPSendCommandContent, 'url'> {
	url: string | StringInterpolation
}

export type TimelineContentHTTPRequest = TimelineContentHTTPSendBase & HTTPSendCommandContentExt
