/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run "yarn generate-schema-types" to regenerate this file.
 */
import { ActionExecutionResult } from ".."

export interface VizMSEOptions {
	/**
	 * Host name or IP adress to the MSE machine
	 */
	host: string
	/**
	 * Port number to the REST interface (optional)
	 */
	restPort?: number
	/**
	 * Port number to the web-sockets interface (optional)
	 */
	wsPort?: number
	/**
	 * Port number to the REST interfaces of Viz Engines (optional)
	 */
	engineRestPort?: number
	/**
	 * Identifier of the "profile" to send commands to
	 */
	profile: string
	/**
	 * Identifier of the "playlist" to send commands to
	 */
	playlistID?: string
	/**
	 * Path relative to "/directory/shows", where Shows managed by Sofie are listed e.g. "SOFIE"
	 */
	showDirectoryPath?: string
	/**
	 * Whether all elements should be preloaded or not
	 */
	preloadAllElements?: boolean
	/**
	 * Whether unknown elements should be purged from the rundown upon activation
	 */
	purgeUnknownElements?: boolean
	/**
	 * Whether internal elements should automatically be loaded when added to expectedPlayoutItems
	 */
	autoLoadInternalElements?: boolean
	/**
	 * It is a common practice to have an element which only purpose is to "clear all graphics" on the vizEngine.
	 * To use this in TSR, set a reference to that here
	 */
	clearAllTemplateName?: string
	/**
	 * Whether to trigger a clear all templates upon makeReady
	 */
	clearAllOnMakeReady?: boolean
	/**
	 * If true, the rundown won't be deactivated on standdown
	 */
	dontDeactivateOnStandDown?: boolean
	/**
	 * If true, only elements in the currently active rundown will be loaded
	 */
	onlyPreloadActivePlaylist?: boolean
	/**
	 * List of commands to be sent to Viz Engines in order to fully clear them
	 */
	clearAllCommands?: string[]
}

export type SomeMappingVizMSE = Record<string, never>

export interface VizResetPayload {
	/**
	 * Optional property that helps track what rundown is active for optimisation reasons
	 */
	activeRundownPlaylistId?: string
}

export interface ActivatePayload {
	activeRundownPlaylistId: string
	clearAll?: boolean
}

export enum VizMSEActions {
	VizReset = 'vizReset',
	PurgeRundown = 'purgeRundown',
	Activate = 'activate',
	StandDown = 'standDown',
	ClearAllEngines = 'clearAllEngines'
}
export interface VizMSEActionExecutionResults {
	vizReset: (payload: VizResetPayload) => void,
	purgeRundown: () => void,
	activate: (payload: ActivatePayload) => void,
	standDown: () => void,
	clearAllEngines: () => void
}
export type VizMSEActionExecutionPayload<A extends keyof VizMSEActionExecutionResults> = Parameters<
	VizMSEActionExecutionResults[A]
>[0]

export type VizMSEActionExecutionResult<A extends keyof VizMSEActionExecutionResults> =
	ActionExecutionResult<ReturnType<VizMSEActionExecutionResults[A]>>
