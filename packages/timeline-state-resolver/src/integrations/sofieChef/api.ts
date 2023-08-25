// Note: The contents of this file is copied from Sofie Chef
// here: https://github.com/nrkno/sofie-chef/blob/main/src/lib/api.ts
//
// Also note that "Receive" and "Send" here refers to the SofieChef side (so "Receive" means "send" to us).

export interface APIResponseBase {
	code: number
	body: any
}

export type ReceiveWSMessageAny =
	| ReceiveWSMessagePlayURL
	| ReceiveWSMessageRestart
	| ReceiveWSMessageStop
	| ReceiveWSMessageExecute
	| ReceiveWSMessageList

export interface ReceiveWSMessages {
	[ReceiveWSMessageType.PLAYURL]: [ReceiveWSMessagePlayURL, APIResponseDefault]
	[ReceiveWSMessageType.RESTART]: [ReceiveWSMessageRestart, APIResponseDefault]
	[ReceiveWSMessageType.STOP]: [ReceiveWSMessageStop, APIResponseDefault]
	[ReceiveWSMessageType.EXECUTE]: [ReceiveWSMessageExecute, APIResponseDefault]
	[ReceiveWSMessageType.LIST]: [ReceiveWSMessageList, APIResponseList]
}
export type ReceiveWSMessage<T extends ReceiveWSMessageType> = ReceiveWSMessages[T][0]
export type ReceiveWSMessageResponse<T extends ReceiveWSMessageType> = ReceiveWSMessages[T][1]

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

export interface APIResponseDefault extends APIResponseBase {
	code: number
	body: string
}
/** Command: Make a window play an URL. Responds with @APIResponseDefault */
export interface ReceiveWSMessagePlayURL extends ReceiveWSMessageBase {
	type: ReceiveWSMessageType.PLAYURL
	windowId: string
	/** The URL to load in the window */
	url: string
	/** [optional] Execute javascript code after loading URL */
	jsCode?: string
}
/** Command: Make a window restart (reload). Responds with @APIResponseDefault */
export interface ReceiveWSMessageRestart extends ReceiveWSMessageBase {
	type: ReceiveWSMessageType.RESTART
	windowId: string
}
/** Command: Make a window stop (unload). Responds with @APIResponseDefault */
export interface ReceiveWSMessageStop extends ReceiveWSMessageBase {
	type: ReceiveWSMessageType.STOP
	windowId: string
}
/** Command: Make a window execute javascript. Responds with @APIResponseDefault */
export interface ReceiveWSMessageExecute extends ReceiveWSMessageBase {
	type: ReceiveWSMessageType.EXECUTE
	windowId: string
	jsCode: string
}
/** Command: List windows and their contents. Responds with @APIResponseList */
export interface ReceiveWSMessageList extends ReceiveWSMessageBase {
	type: ReceiveWSMessageType.LIST
}
export interface APIResponseList extends APIResponseBase {
	body: {
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
	result: APIResponseReply | undefined
}
export interface APIResponseReply extends APIResponseBase {
	code: number
	body: any
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
