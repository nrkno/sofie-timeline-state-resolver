import { DeviceType, HTTPSendCommandContent } from '..'

export type TimelineContentHTTPSendAny = TimelineContentHTTPRequest
export interface TimelineContentHTTPSendBase {
	deviceType: DeviceType.HTTPSEND
}

export interface HTTPSendCommandContentExt extends Omit<HTTPSendCommandContent, 'url'> {
	url: string | { key: string; args?: { [k: string]: any } }
}

export type TimelineContentHTTPRequest = TimelineContentHTTPSendBase & HTTPSendCommandContentExt
