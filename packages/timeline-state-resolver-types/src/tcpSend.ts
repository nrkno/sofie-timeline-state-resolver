import { Mapping } from './mapping'
import { DeviceType, TcpSendCommandContent } from '.'

export interface MappingTCPSend extends Mapping {
	device: DeviceType.TCPSEND
}

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
