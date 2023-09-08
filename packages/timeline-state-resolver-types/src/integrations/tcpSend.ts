import { DeviceType, TcpSendCommandContent } from '..'

export enum TimelineContentTypeTcp {
	GET = 'get',
	POST = 'post',
	PUT = 'put',
	DELETE = 'delete',
}

export type TimelineContentTCPSendAny = TimelineContentTCPRequest
export interface TimelineContentTCPSendBase {
	deviceType: DeviceType.TCPSEND
}
export type TimelineContentTCPRequest = TimelineContentTCPSendBase & TcpSendCommandContent
