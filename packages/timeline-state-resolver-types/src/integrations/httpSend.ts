import { DeviceType, HTTPSendCommandContent, TemplateString } from '..'

export type TimelineContentHTTPSendAny = TimelineContentHTTPRequest
export interface TimelineContentHTTPSendBase {
	deviceType: DeviceType.HTTPSEND
}

export interface HTTPSendCommandContentExt extends Omit<HTTPSendCommandContent, 'url'> {
	url: string | TemplateString
}

export type TimelineContentHTTPRequest = TimelineContentHTTPSendBase & HTTPSendCommandContentExt
