import { Mapping } from './mapping'
import { DeviceType } from '.'

export interface MappingTCPSend extends Mapping {
	device: DeviceType.TCPSEND
}

export interface TcpSendCommandContent {
	message: string
	temporalPriority?: number // default: 0
	/** Commands in the same queue will be sent in order (will wait for the previous to finish before sending next */
	queueId?: string
}

export interface TCPSendOptions {
	makeReadyCommands?: TcpSendCommandContent[]
	/** Whether a makeReady should be treated as a reset of the device. It should be assumed clean, with the queue discarded, and state reapplied from empty */
	makeReadyDoesReset?: boolean

	host: string
	port: number
	bufferEncoding?: BufferEncoding // encoding of messages, ex 'hex', default is 'utf8'
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
