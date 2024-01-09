/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run "yarn generate-schema-types" to regenerate this file.
 */

export interface OBSOptions {
	host: string
	port: number
	password?: string
}

export interface MappingObsCurrentScene {
	mappingType: MappingObsType.CurrentScene
}

export interface MappingObsCurrentTransition {
	mappingType: MappingObsType.CurrentTransition
}

export interface MappingObsRecording {
	mappingType: MappingObsType.Recording
}

export interface MappingObsStreaming {
	mappingType: MappingObsType.Streaming
}

export interface MappingObsSceneItem {
	/**
	 * Name of the scene item to be modified
	 */
	sceneName: string
	/**
	 * Scene item source name
	 */
	source: string
	mappingType: MappingObsType.SceneItem
}

export interface MappingObsInputAudio {
	/**
	 * Input name
	 */
	input: string
	mappingType: MappingObsType.InputAudio
}

export interface MappingObsInputSettings {
	/**
	 * Input name
	 */
	input: string
	mappingType: MappingObsType.InputSettings
}

export interface MappingObsInputMedia {
	/**
	 * Input name
	 */
	input: string
	mappingType: MappingObsType.InputMedia
}

export enum MappingObsType {
	CurrentScene = 'currentScene',
	CurrentTransition = 'currentTransition',
	Recording = 'recording',
	Streaming = 'streaming',
	SceneItem = 'sceneItem',
	InputAudio = 'inputAudio',
	InputSettings = 'inputSettings',
	InputMedia = 'inputMedia',
}

export type SomeMappingObs = MappingObsCurrentScene | MappingObsCurrentTransition | MappingObsRecording | MappingObsStreaming | MappingObsSceneItem | MappingObsInputAudio | MappingObsInputSettings | MappingObsInputMedia