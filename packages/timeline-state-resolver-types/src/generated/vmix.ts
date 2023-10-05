/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run "yarn generate-schema-types" to regenerate this file.
 */
export interface OpenPresetPayload {
	/**
	 * The filename of the preset to load
	 */
	filename: string
}

export interface SavePresetPayload {
	/**
	 * The filename of the preset to save
	 */
	filename: string
}

export enum VmixActions {
	LastPreset = 'lastPreset',
	OpenPreset = 'openPreset',
	SavePreset = 'savePreset',
}
