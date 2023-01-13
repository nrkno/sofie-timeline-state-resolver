/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run "yarn generate-schema-types" to regenerate this file.
 */

export interface HyperdeckOptions {
	host: string
	port?: number
	minRecordingTime?: number
	/**
	 * If true, no warnings will be emitted when storage slots are empty.
	 */
	suppressEmptySlotWarnings?: boolean
}

export enum HyperdeckActions {
	FormatDisks = 'formatDisks',
}
