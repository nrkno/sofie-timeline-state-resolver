import { DeviceType } from '.'

export type TimelineContentHTTPSendAny = TimelineContentHTTPRequest
export interface TimelineContentHTTPSendBase {
	deviceType: DeviceType.HTTPSEND
}

export type TimelineContentHTTPRequest = TimelineContentHTTPSendBase & HTTPSendCommandContent

export interface HTTPSendCommandContent {
	type: TimelineContentTypeHTTP
	url: string
	params: {
		[k: string]: unknown
	}
	paramsType?: TimelineContentTypeHTTPParamType
	headers?: {
		[k: string]: string
	}
	temporalPriority?: number
	/**
	 * Commands in the same queue will be sent in order (will wait for the previous to finish before sending next
	 */
	queueId?: string
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
