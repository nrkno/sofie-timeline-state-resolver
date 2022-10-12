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

export interface ReceiveWSMessageBase {
	type: ReceiveWSMessageType
	msgId: number
}

export enum ReceiveWSMessageType {
	PLAYURL = 'playurl',
	RESTART = 'restart',
	STOP = 'stop',
	EXECUTE = 'execute',
}

export interface ReceiveWSMessagePlayURL extends ReceiveWSMessageBase {
	type: ReceiveWSMessageType.PLAYURL
	windowIndex: number
	url: string
}
export interface ReceiveWSMessageRestart extends ReceiveWSMessageBase {
	type: ReceiveWSMessageType.RESTART
	windowIndex: number
}
export interface ReceiveWSMessageStop extends ReceiveWSMessageBase {
	type: ReceiveWSMessageType.STOP
	windowIndex: number
}
export interface ReceiveWSMessageExecute extends ReceiveWSMessageBase {
	type: ReceiveWSMessageType.EXECUTE
	windowIndex: number
	jsCode: string
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
	UNKNOWN = 0, // Status unknown
	GOOD = 1, // All good and green
	WARNING_MINOR = 2, // Everything is not OK, operation is not affected
	WARNING_MAJOR = 3, // Everything is not OK, operation might be affected
	BAD = 4, // Operation affected, possible to recover
	FATAL = 5, // Operation affected, not possible to recover without manual interference
}

export interface StatusObject {
	statusCode: StatusCode
	message: string
}
