import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'

export interface MappingHTTPSend extends Mapping {
	device: DeviceType.HTTPSEND
}
export interface MappingHTTPWatcher extends Mapping {
	device: DeviceType.HTTPWATCHER
}

export interface HttpSendCommandContent {
	type: TimelineContentTypeHttp
	url: string
	params: {[key: string]: number | string | any}
	temporalPriority?: number // default: 0
}
export interface HttpSendOptions {
	makeReadyCommands?: HttpSendCommandContent[]
}

export enum TimelineContentTypeHttp {
	GET = 'get',
	POST = 'post',
	PUT = 'put',
	DELETE = 'delete'
}

export type TimelineObjHTTPSendAny = TimelineObjHTTPRequest
export interface TimelineObjHTTPSendBase extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.HTTPSEND
		// type: TimelineContentTypeCasparCg
	}
}
export interface TimelineObjHTTPRequest extends TimelineObjHTTPSendBase {
	content: {
		deviceType: DeviceType.HTTPSEND
	} & HttpSendCommandContent
}
