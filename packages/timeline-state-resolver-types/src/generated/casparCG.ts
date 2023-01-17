/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run "yarn generate-schema-types" to regenerate this file.
 */

export interface CasparCGOptions {
	/**
	 * Host of CasparCG server
	 */
	host: string
	/**
	 * Port of CasparCG server
	 */
	port?: number
	launcherHost?: string
	launcherPort?: number
	/**
	 * fps used for all channels
	 */
	fps?: number
	/**
	 * Interval (ms) for retrying to load media that previously failed. (-1 disables, 0 uses the default interval)
	 */
	retryInterval?: number
	/**
	 * whether to use the CasparCG-SCHEDULE command to run future commands, or the internal (backwards-compatible) command queue
	 */
	useScheduling?: boolean
}

export interface MappingCasparCGLayer {
	channel: number
	layer: number
	previewWhenNotOnAir?: boolean
	mappingType: MappingCasparCGType.Layer
}

export enum MappingCasparCGType {
	Layer = 'layer',
}

export type SomeMappingCasparCG = MappingCasparCGLayer

export enum CasparCGActions {
	ClearAllChannels = 'clearAllChannels',
	RestartServer = 'restartServer',
}
