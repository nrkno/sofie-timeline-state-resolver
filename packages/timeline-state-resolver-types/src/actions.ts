import type { ITranslatableMessage } from './translations'

export interface ActionExecutionResult<ResultData = void> {
	result: ActionExecutionResultCode
	/** Response message, intended to be displayed to a user */
	response?: ITranslatableMessage
	/** Response data */
	resultData?: ResultData
}

export enum ActionExecutionResultCode {
	Error = 'ERROR',
	IgnoredNotRelevant = 'IGNORED',
	Ok = 'OK',
}

export type ActionPayloadType<AMethod extends (id: string, payload: any) => Promise<ActionExecutionResult<any>>> =
	Parameters<AMethod>[0]

export type ActionResultType<AMethod extends (id: string, payload: any) => Promise<ActionExecutionResult<any>>> =
	ReturnType<AMethod> extends Promise<ActionExecutionResult<infer R>> ? R : never
