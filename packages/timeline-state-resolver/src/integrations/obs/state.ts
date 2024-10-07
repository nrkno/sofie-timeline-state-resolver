import {
	DeviceType,
	Mapping,
	MappingObsType,
	Mappings,
	OBSSceneItemTransform,
	ResolvedTimelineObjectInstanceExtended,
	SomeMappingObs,
	TSRTimelineContent,
	Timeline,
	TimelineContentTypeOBS,
} from 'timeline-state-resolver-types'
import { JsonObject } from 'type-fest'
import _ = require('underscore')

export function convertStateToOBS(
	state: Timeline.TimelineState<TSRTimelineContent>,
	mappings: Mappings
): OBSDeviceState {
	const deviceState = getDefaultState(state.time)

	// Sort layer based on Mapping type (to make sure audio is after inputs) and Layer name
	const sortedLayers = _.sortBy(
		_.map(state.layers, (tlObject, layerName) => {
			const tlObjectExt = tlObject as ResolvedTimelineObjectInstanceExtended
			let mapping = mappings[layerName] as Mapping<SomeMappingObs> | undefined
			if (!mapping && tlObjectExt.isLookahead && tlObjectExt.lookaheadForLayer) {
				mapping = mappings[tlObjectExt.lookaheadForLayer] as Mapping<SomeMappingObs> | undefined
			}
			return {
				layerName,
				tlObject,
				mapping,
			}
		}).sort((a, b) => a.layerName.localeCompare(b.layerName)),
		(o) => o.mapping?.options?.mappingType
	)

	_.each(sortedLayers, ({ tlObject, mapping }) => {
		if (mapping && tlObject.content.deviceType === DeviceType.OBS) {
			switch (mapping.options.mappingType) {
				case MappingObsType.CurrentScene:
					if (tlObject.content.type === TimelineContentTypeOBS.CURRENT_SCENE) {
						if ((tlObject as ResolvedTimelineObjectInstanceExtended).isLookahead) {
							deviceState.previewScene = tlObject.content.sceneName
						} else {
							deviceState.currentScene = tlObject.content.sceneName
						}
					}
					break
				case MappingObsType.CurrentTransition:
					if (tlObject.content.type === TimelineContentTypeOBS.CURRENT_TRANSITION) {
						if ((tlObject as ResolvedTimelineObjectInstanceExtended).isLookahead) {
							// CurrentTransiton can't be looked ahead, same below
							break
						}

						deviceState.currentTransition = tlObject.content.transitionName
					}
					break
				case MappingObsType.Recording:
					if (tlObject.content.type === TimelineContentTypeOBS.RECORDING) {
						if ((tlObject as ResolvedTimelineObjectInstanceExtended).isLookahead) {
							// CurrentTransiton can't be looked ahead, same below
							break
						}

						deviceState.recording = tlObject.content.on
					}
					break
				case MappingObsType.Streaming:
					if (tlObject.content.type === TimelineContentTypeOBS.STREAMING) {
						if ((tlObject as ResolvedTimelineObjectInstanceExtended).isLookahead) {
							// CurrentTransiton can't be looked ahead, same below
							break
						}

						deviceState.streaming = tlObject.content.on
					}
					break
				case MappingObsType.InputAudio:
					if (tlObject.content.type === TimelineContentTypeOBS.INPUT_AUDIO) {
						if ((tlObject as ResolvedTimelineObjectInstanceExtended).isLookahead) {
							// InputAudio can't be looked ahead, same below
							break
						}

						const input = mapping.options.input
						const audioProps = deviceState.inputs[input]?.audio

						if (!deviceState.inputs[input]) deviceState.inputs[input] = {}
						deviceState.inputs[input].audio = {
							muted: tlObject.content.mute ?? audioProps?.muted,
							volume: tlObject.content.volume ?? audioProps?.volume,
						}
					}
					break
				case MappingObsType.InputSettings:
					if (tlObject.content.type === TimelineContentTypeOBS.INPUT_SETTINGS) {
						if ((tlObject as ResolvedTimelineObjectInstanceExtended).isLookahead) {
							// InputSettings can't be looked ahead, same below
							break
						}

						const input = mapping.options.input
						if (!deviceState.inputs[input]) {
							deviceState.inputs[input] = {}
						}

						deviceState.inputs[input].inputSettings = {
							sourceType: tlObject.content.sourceType,
							settings: tlObject.content.sourceSettings,
						}
					}
					break
				case MappingObsType.InputMedia:
					if (tlObject.content.type === TimelineContentTypeOBS.INPUT_MEDIA) {
						if ((tlObject as ResolvedTimelineObjectInstanceExtended).isLookahead) {
							// InputMedia can't be looked ahead, same below
							break
						}

						const input = mapping.options.input

						if (!deviceState.inputs[input]) deviceState.inputs[input] = {}
						deviceState.inputs[input].mediaSettings = {
							playTime: tlObject.instance.originalStart ?? tlObject.instance.start, // todo - ignore when looping?
							seek: tlObject.content.seek,
							state: tlObject.content.state,
						}
					}
					break
				case MappingObsType.SceneItem:
					if (tlObject.content.type === TimelineContentTypeOBS.SCENE_ITEM) {
						if ((tlObject as ResolvedTimelineObjectInstanceExtended).isLookahead) {
							// SceneItem can't be looked ahead, same below
							break
						}

						const source = mapping.options.source
						const sceneName = mapping.options.sceneName

						if (!deviceState.scenes[sceneName]) deviceState.scenes[sceneName] = { sceneItems: {} }
						deviceState.scenes[sceneName].sceneItems[source] = {
							render: tlObject.content.on,
							transform: tlObject.content.transform,
						}
					}
					break
			}
		}
	})
	return deviceState
}
export function getDefaultState(t: number): OBSDeviceState {
	return {
		time: t,
		currentScene: undefined,
		previewScene: undefined,
		currentTransition: undefined,
		recording: undefined,
		streaming: undefined,
		scenes: {},
		inputs: {},
	}
}

export interface OBSDeviceState {
	time: number
	currentScene: string | undefined
	previewScene: string | undefined
	currentTransition: string | undefined
	recording: boolean | undefined
	streaming: boolean | undefined
	scenes: {
		[key: string]: OBSScene
	}
	inputs: {
		[key: string]: OBSInputState
	}
}

export interface OBSScene {
	sceneItems: {
		[key: string]: OBSSceneItem
	}
}
export interface OBSSceneItem {
	render?: boolean
	transform?: OBSSceneItemTransform
}

export interface OBSInputState {
	inputSettings?: {
		sourceType: string
		settings?: JsonObject
	}
	mediaSettings?: {
		playTime?: number
		seek?: number
		state?: 'playing' | 'paused' | 'stopped'
	}
	audio?: {
		muted?: boolean
		volume?: number
	}
}
