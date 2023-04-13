/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run "yarn generate-schema-types" to regenerate this file.
 */

export interface HTTPSendOptions {
	/**
	 * Whether a makeReady should be treated as a reset of the device. It should be assumed clean, with the queue discarded, and state reapplied from empty
	 */
	makeReadyDoesReset?: boolean
	/**
	 * Minimum time in ms before a command is resent, set to <= 0 or undefined to disable
	 */
	resendTime?: number
	makeReadyCommands?: HTTPSendCommandContent[]
}
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
	DELETE = 'delete'
}
export enum TimelineContentTypeHTTPParamType {
	JSON = 'json',
	FORM = 'form'
}

export type SomeMappingHttpSend = Record<string, never>

export interface SendCommandPayload {
	type: string
	url: string
	params: {
		[k: string]: unknown
	}
	paramsType?: string
	temporalPriority?: number
	queueId?: string
}

export enum HttpSendActions {
	Resync = 'resync',
	SendCommand = 'sendCommand',
}
