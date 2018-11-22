import { TimelineObject, TimelineKeyframe } from './superfly-timeline'
import { Mapping, DeviceType } from './mapping'

export interface MappingHTTPSend extends Mapping {
	device: DeviceType.HTTPSEND
}

export interface HttpSendCommandContent {
	type: TimelineContentTypeHttp
	url: string
	params: {[key: string]: number | string | any}
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

export interface TimelineObjHTTPRequest extends TimelineObject {
	content: HttpSendCommandContent & {
		keyframes?: Array<TimelineKeyframe>
	}
}
