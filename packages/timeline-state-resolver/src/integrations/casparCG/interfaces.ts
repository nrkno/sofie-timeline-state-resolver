/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run "yarn generate-schema-types" to regenerate this file.
 */
export interface CasparCGOptions {
	host?: string
	port?: number
	retryInterval?: boolean
	fps?: number
	launcherHost?: string
	launcherPort?: number
}

export interface CasparCGMapping {
	channel: number
	layer: number
	previewWhenNotOnAir?: boolean
}

export enum Actions {
	ClearAllChannels = 'clearAllChannels',
	RestartServer = 'restartServer',
}