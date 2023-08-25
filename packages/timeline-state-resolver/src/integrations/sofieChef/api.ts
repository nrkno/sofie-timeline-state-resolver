// Note: The contents of this file is copied from Sofie Chef
// here: https://github.com/nrkno/sofie-chef/blob/main/src/lib/api.ts
//
// Also note that "Receive" and "Send" here refers to the SofieChef side (so "Receive" means "send" to us).

export interface APIResponse {
	code: number
	body: string
}

export type ReceiveWSMessageAny =
	| ReceiveWSMessagePlayURL
	| ReceiveWSMessageRestart
	| ReceiveWSMessageStop
	| ReceiveWSMessageExecute
	| ReceiveWSMessageList

export interface ReceiveWSMessageBase {
	type: ReceiveWSMessageType
	msgId: number
	apiKey?: string
}

export enum ReceiveWSMessageType {
	PLAYURL = 'playurl',
	RESTART = 'restart',
	STOP = 'stop',
	EXECUTE = 'execute',
	LIST = 'list',
}

export interface ReceiveWSMessagePlayURL extends ReceiveWSMessageBase {
	type: ReceiveWSMessageType.PLAYURL
	windowId: string
	/** The URL to load in the window */
	url: string
	/** [optional] Execute javascript code after loading URL */
	jsCode?: string
}
export interface ReceiveWSMessageRestart extends ReceiveWSMessageBase {
	type: ReceiveWSMessageType.RESTART
	windowId: string
}
export interface ReceiveWSMessageStop extends ReceiveWSMessageBase {
	type: ReceiveWSMessageType.STOP
	windowId: string
}
export interface ReceiveWSMessageExecute extends ReceiveWSMessageBase {
	type: ReceiveWSMessageType.EXECUTE
	windowId: string
	jsCode: string
}
export interface ReceiveWSMessageList extends ReceiveWSMessageBase {
	type: ReceiveWSMessageType.LIST
}
export interface APIResponseList extends APIResponse {
	list: {
		id: string
		url: string | null
		statusCode: string
		statusMessage: string
	}[]
}

export type SendWSMessageAny = SendWSMessageReply | SendWSMessageStatus
export enum SendWSMessageType {
	REPLY = 'reply',
	STATUS = 'status',
}
export interface SendWSMessageBase {
	type: SendWSMessageType
}

export interface SendWSMessageReply extends SendWSMessageBase {
	type: SendWSMessageType.REPLY
	replyTo: number
	error: string | undefined
	result: APIResponse | undefined
}
export interface SendWSMessageStatus extends SendWSMessageBase {
	type: SendWSMessageType.STATUS

	status: {
		app: StatusObject
		windows: {
			[index: string]: StatusObject
		}
	}
}
export enum StatusCode {
	GOOD = 'good',
	WARNING = 'warning',
	ERROR = 'error',
}

export interface StatusObject {
	statusCode: StatusCode
	message: string
}

export enum IpcMethods {
	// Note: update this enum in lib/preload.ts when changed
	ReportStatus = 'ReportStatus',
}

export interface ReportStatusIpcPayload {
	status: StatusCode
	message?: string
}
