import { Mapping } from './mapping'
import { DeviceType, HTTPSendCommandContent } from '.'

export interface MappingHTTPSend extends Mapping {
	device: DeviceType.HTTPSEND
}

export enum TimelineContentTypeHTTP {
	GET = 'get',
	POST = 'post',
	PUT = 'put',
	DELETE = 'delete',
}
export enum TimelineContentTypeHTTPParamType {
	JSON = 'json',
	FORM = 'form',
}

export type TimelineContentHTTPSendAny = TimelineContentHTTPRequest
export interface TimelineContentHTTPSendBase {
	deviceType: DeviceType.HTTPSEND
	// type: TimelineContentTypeCasparCg
}

// TODO - is this safe?
export type TimelineContentHTTPRequest = TimelineContentHTTPSendBase & HTTPSendCommandContent
