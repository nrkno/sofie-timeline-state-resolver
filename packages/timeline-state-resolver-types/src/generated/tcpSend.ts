/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run "yarn generate-schema-types" to regenerate this file.
 */
import { ActionExecutionResult } from ".."

export interface TCPSendOptions {
	host: string
	port: number
	bufferEncoding?:
		| 'ascii'
		| 'utf8'
		| 'utf-8'
		| 'utf16le'
		| 'ucs2'
		| 'ucs-2'
		| 'base64'
		| 'base64url'
		| 'latin1'
		| 'binary'
		| 'hex'
	/**
	 * Whether a makeReady should be treated as a reset of the device. It should be assumed clean, with the queue discarded, and state reapplied from empty
	 */
	makeReadyDoesReset?: boolean
	makeReadyCommands?: TcpSendCommandContent[]
}
export interface TcpSendCommandContent {
	message: string
	temporalPriority?: number
	/**
	 * Commands in the same queue will be sent in order (will wait for the previous to finish before sending next
	 */
	queueId?: string
}

export type SomeMappingTcpSend = Record<string, never>

export interface SendTcpCommandPayload {
	message: string
	temporalPriority?: number
	queueId?: string
	[k: string]: unknown
}

export enum TcpSendActions {
	Reconnect = 'reconnect',
	ResetState = 'resetState',
	SendTcpCommand = 'sendTcpCommand'
}
export interface TcpSendActionExecutionResults {
	reconnect: () => void,
	resetState: () => void,
	sendTcpCommand: (payload: SendTcpCommandPayload) => void
}
export type TcpSendActionExecutionPayload<A extends keyof TcpSendActionExecutionResults> = Parameters<
	TcpSendActionExecutionResults[A]
>[0]

export type TcpSendActionExecutionResult<A extends keyof TcpSendActionExecutionResults> =
	ActionExecutionResult<ReturnType<TcpSendActionExecutionResults[A]>>
