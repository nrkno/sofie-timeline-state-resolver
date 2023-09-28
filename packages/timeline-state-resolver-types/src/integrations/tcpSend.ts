import { DeviceType, TcpSendCommandContent } from '..'

export type TimelineContentTCPSendAny = TimelineContentTCPRequest
export interface TimelineContentTCPSendBase {
	deviceType: DeviceType.TCPSEND
}
export type TimelineContentTCPRequest = TimelineContentTCPSendBase & TcpSendCommandContent
