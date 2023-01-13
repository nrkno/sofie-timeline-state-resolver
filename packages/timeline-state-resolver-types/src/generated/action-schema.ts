/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run "yarn generate-schema-types" to regenerate this file.
 */

export interface TSRActionSchema {
	/**
	 * Device-unique id of the action
	 */
	id: string
	/**
	 * User readable name of the action
	 */
	name: string
	/**
	 * A destructive action affects playout, users might get a confirmation dialog before executing it.
	 */
	destructive: boolean
	/**
	 * Time in ms after which the action should be considered to have failed if it hasn't returned yet.
	 */
	timeout?: number
	/**
	 * The payload object is the first argument of the function
	 */
	payload?: string
	[k: string]: unknown
}
