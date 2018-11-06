import { Mapping, DeviceType } from './mapping'

export interface MappingHTTPSend extends Mapping {
	device: DeviceType.HTTPSEND
}

export enum TimelineContentTypeHttp {
	GET = 'get',
	POST = 'post',
	PUT = 'put',
	DELETE = 'delete'
}
