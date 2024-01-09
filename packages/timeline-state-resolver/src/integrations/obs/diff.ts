import _ = require('underscore')
import { OBSCommandWithContext, OBSCommandWithContextTyped } from '.'
import { OBSDeviceState, OBSScene, OBSSceneItem, OBSInputState } from './state'
import { literal } from '../../lib'

export function diffStates(
	oldState: OBSDeviceState,
	newState: OBSDeviceState,
	getSceneItemId: (scene: string, source: string) => number | undefined
): Array<OBSCommandWithContext> {
	const commands: Array<OBSCommandWithContext> = [
		...resolveCurrentSceneState(oldState, newState),
		...resolveCurrentTransitionState(oldState, newState),
		...resolveRecordingStreaming(oldState, newState),
		...resolveScenes(oldState, newState, getSceneItemId),
		...resolveInputSettings(oldState, newState),
	]

	return commands
}

function resolveCurrentSceneState(oldState: OBSDeviceState, newState: OBSDeviceState): Array<OBSCommandWithContext> {
	const commands: Array<OBSCommandWithContext> = []

	const oldCurrentScene = oldState.currentScene
	const newCurrentScene = newState.currentScene
	if (newCurrentScene !== undefined) {
		if (oldCurrentScene !== newCurrentScene) {
			commands.push(
				literal<OBSCommandWithContextTyped<OBSRequestName.SET_CURRENT_SCENE>>({
					command: {
						requestName: OBSRequestName.SET_CURRENT_SCENE,
						args: {
							sceneName: newCurrentScene,
						},
					},
					context: `currentScene changed from "${oldCurrentScene}" to "${newCurrentScene}"`,
					timelineObjId: '',
				})
			)
		}
	}

	const oldPreviewScene = oldState.previewScene
	const newPreviewScene = newState.previewScene
	if (newPreviewScene !== undefined) {
		if (oldPreviewScene !== newPreviewScene) {
			commands.push(
				literal<OBSCommandWithContextTyped<OBSRequestName.SET_PREVIEW_SCENE>>({
					command: {
						requestName: OBSRequestName.SET_PREVIEW_SCENE,
						args: {
							sceneName: newPreviewScene,
						},
					},
					context: `previewScene changed from "${oldPreviewScene}" to "${newPreviewScene}"`,
					timelineObjId: '',
				})
			)
		}
	}

	return commands
}

function resolveCurrentTransitionState(
	oldState: OBSDeviceState,
	newState: OBSDeviceState
): Array<OBSCommandWithContext> {
	const commands: Array<OBSCommandWithContext> = []

	const oldCurrentTransition = oldState.currentTransition
	const newCurrentTransition = newState.currentTransition
	if (newCurrentTransition !== undefined) {
		if (oldCurrentTransition !== newCurrentTransition) {
			commands.push(
				literal<OBSCommandWithContextTyped<OBSRequestName.SET_CURRENT_TRANSITION>>({
					command: {
						requestName: OBSRequestName.SET_CURRENT_TRANSITION,
						args: {
							transitionName: newCurrentTransition,
						},
					},
					context: 'currentTransition changed',
					timelineObjId: '',
				})
			)
		}
	}

	return commands
}

function resolveRecordingStreaming(oldState: OBSDeviceState, newState: OBSDeviceState): Array<OBSCommandWithContext> {
	const commands: Array<OBSCommandWithContext> = []

	const oldRecording = oldState.recording
	const newRecording = newState.recording
	if (newRecording !== undefined) {
		if (oldRecording !== newRecording) {
			commands.push(
				literal<OBSCommandWithContextTyped<OBSRequestName.START_RECORDING | OBSRequestName.STOP_RECORDING>>({
					command: {
						requestName: newRecording ? OBSRequestName.START_RECORDING : OBSRequestName.STOP_RECORDING,
						args: undefined,
					},
					context: 'recording changed',
					timelineObjId: '',
				})
			)
		}
	}

	const oldStreaming = oldState.streaming
	const newStreaming = newState.streaming
	if (newStreaming !== undefined) {
		if (oldStreaming !== newStreaming) {
			commands.push(
				literal<OBSCommandWithContextTyped<OBSRequestName.START_STREAMING | OBSRequestName.STOP_STREAMING>>({
					command: {
						requestName: newStreaming ? OBSRequestName.START_STREAMING : OBSRequestName.STOP_STREAMING,
						args: undefined,
					},
					context: 'streaming changed',
					timelineObjId: '',
				})
			)
		}
	}

	return commands
}

function resolveScenes(
	oldState: OBSDeviceState,
	newState: OBSDeviceState,
	getSceneItemId: (scene: string, source: string) => number | undefined
): Array<OBSCommandWithContext> {
	const commands: Array<OBSCommandWithContext> = []

	const oldScenes = oldState.scenes
	const newScenes = newState.scenes
	Object.entries<OBSScene>(newScenes).forEach(([sceneName, scene]) => {
		Object.entries<OBSSceneItem>(scene.sceneItems).forEach(([source, newSceneItemProperties]) => {
			const oldSceneItemProperties = oldScenes[sceneName]?.sceneItems[source]
			const itemId = getSceneItemId(sceneName, source)
			if (!itemId) return // can't do anything without it

			if (
				newSceneItemProperties.render !== undefined &&
				newSceneItemProperties.render !== oldSceneItemProperties?.render
			) {
				commands.push(
					literal<OBSCommandWithContextTyped<OBSRequestName.SET_SCENE_ITEM_ENABLED>>({
						command: {
							requestName: OBSRequestName.SET_SCENE_ITEM_ENABLED,
							args: {
								sceneName: sceneName,
								sceneItemId: itemId,
								sceneItemEnabled: newSceneItemProperties.render,
							},
						},
						context: `scene ${sceneName} item ${source} changed render`,
						timelineObjId: '',
					})
				)
			}

			if (
				newSceneItemProperties.transform !== undefined &&
				newSceneItemProperties.transform !== oldSceneItemProperties?.transform
			) {
				commands.push(
					literal<OBSCommandWithContextTyped<OBSRequestName.SET_SCENE_ITEM_TRANSFORM>>({
						command: {
							requestName: OBSRequestName.SET_SCENE_ITEM_TRANSFORM,
							args: {
								sceneName: sceneName,
								sceneItemId: itemId,
								sceneItemTransform: newSceneItemProperties.transform as any, // type assertion kind of mid - is there something typefest can fix?
							},
						},
						context: `scene ${sceneName} item ${source} changed transform`,
						timelineObjId: '',
					})
				)
			}
		})
	})

	return commands
}

function resolveInputSettings(oldState: OBSDeviceState, newState: OBSDeviceState): Array<OBSCommandWithContext> {
	const commands: Array<OBSCommandWithContext> = []

	const oldSources = oldState.inputs
	const newSources = newState.inputs
	Object.entries<OBSInputState>(newSources).forEach(([sourceName, source]) => {
		// settings
		if (
			source.inputSettings?.settings &&
			!_.isEqual(source.inputSettings?.settings, oldSources[sourceName]?.inputSettings?.settings)
		) {
			commands.push(
				literal<OBSCommandWithContextTyped<OBSRequestName.SET_SOURCE_SETTINGS>>({
					command: {
						requestName: OBSRequestName.SET_SOURCE_SETTINGS,
						args: {
							inputName: sourceName,
							inputSettings: source.inputSettings?.settings,
						},
					},
					context: `source ${sourceName} changed settings`,
					timelineObjId: '',
				})
			)
		}

		// audio
		if (!_.isEqual(source.audio, oldSources[sourceName]?.audio)) {
			if (source.audio?.muted !== undefined) {
				commands.push(
					literal<OBSCommandWithContextTyped<OBSRequestName.SET_MUTE>>({
						command: {
							requestName: OBSRequestName.SET_MUTE,
							args: {
								inputName: sourceName,
								inputMuted: source.audio.muted,
							},
						},
						context: `source ${sourceName} changed settings`,
						timelineObjId: '',
					})
				)
			}

			if (source.audio?.volume !== undefined) {
				commands.push(
					literal<OBSCommandWithContextTyped<OBSRequestName.SET_INPUT_VOLUME>>({
						command: {
							requestName: OBSRequestName.SET_INPUT_VOLUME,
							args: {
								inputName: sourceName,
								inputVolumeDb: source.audio.volume,
							},
						},
						context: `source ${sourceName} changed settings`,
						timelineObjId: '',
					})
				)
			}
		}

		// media
		const oldMedia = oldSources[sourceName]?.mediaSettings
		if (!_.isEqual(source.mediaSettings, oldMedia)) {
			// changed playback state
			if (source.mediaSettings?.state !== oldMedia?.state) {
				switch (source.mediaSettings?.state) {
					case 'paused':
						commands.push(
							literal<OBSCommandWithContextTyped<OBSRequestName.TRIGGER_MEDIA_INPUT_ACTION>>({
								command: {
									requestName: OBSRequestName.TRIGGER_MEDIA_INPUT_ACTION,
									args: {
										inputName: sourceName,

										mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE',
									},
								},
								context: `source ${sourceName} started playback`,
								timelineObjId: '',
							})
						)
						break
					case 'playing':
						commands.push(
							literal<OBSCommandWithContextTyped<OBSRequestName.TRIGGER_MEDIA_INPUT_ACTION>>({
								command: {
									requestName: OBSRequestName.TRIGGER_MEDIA_INPUT_ACTION,
									args: {
										inputName: sourceName,

										mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY',
									},
								},
								context: `source ${sourceName} playing`,
								timelineObjId: '',
							})
						)
						break
					case 'stopped':
						commands.push(
							literal<OBSCommandWithContextTyped<OBSRequestName.TRIGGER_MEDIA_INPUT_ACTION>>({
								command: {
									requestName: OBSRequestName.TRIGGER_MEDIA_INPUT_ACTION,
									args: {
										inputName: sourceName,

										mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP',
									},
								},
								context: `source ${sourceName} stopped`,
								timelineObjId: '',
							})
						)
						break
				}
			}

			// changed timing
			if (source.mediaSettings?.playTime !== oldMedia?.playTime || source.mediaSettings?.seek !== oldMedia?.seek) {
				if (
					!source.mediaSettings?.playTime &&
					source.mediaSettings?.seek &&
					source.mediaSettings?.seek !== oldMedia?.seek
				) {
					// we don't know when we started so just use the seek
					commands.push(
						literal<OBSCommandWithContextTyped<OBSRequestName.SET_MEDIA_INPUT_CURSOR>>({
							command: {
								requestName: OBSRequestName.SET_MEDIA_INPUT_CURSOR,
								args: {
									inputName: sourceName,
									mediaCursor: source.mediaSettings.seek,
								},
							},
							context: `source ${sourceName} changed seek position`,
							timelineObjId: '',
						})
					)
				} else if (source.mediaSettings?.playTime) {
					// calculate the offset properly
					const seek = source.mediaSettings?.seek ?? 0
					const offset = newState.time - source.mediaSettings?.playTime
					const cursor = seek + offset // cursor in ms - is this correct???

					commands.push(
						literal<OBSCommandWithContextTyped<OBSRequestName.SET_MEDIA_INPUT_CURSOR>>({
							command: {
								requestName: OBSRequestName.SET_MEDIA_INPUT_CURSOR,
								args: {
									inputName: sourceName,
									mediaCursor: cursor,
								},
							},
							context: `source ${sourceName} changed seek position or startTime`,
							timelineObjId: '',
						})
					)
				}
			}
		}
	})

	return commands
}

/**
 * Enum derived from keyof OBSRequestTypes in obs-websocket-js
 */
export enum OBSRequestName {
	SET_CURRENT_SCENE = 'SetCurrentProgramScene',
	SET_PREVIEW_SCENE = 'SetCurrentPreviewScene',
	SET_CURRENT_TRANSITION = 'SetCurrentSceneTransition',
	START_RECORDING = 'StartRecord',
	STOP_RECORDING = 'StopRecord',
	START_STREAMING = 'StartStream',
	STOP_STREAMING = 'StopStream',
	SET_SCENE_ITEM_ENABLED = 'SetSceneItemEnabled',
	SET_SCENE_ITEM_TRANSFORM = 'SetSceneItemTransform',
	SET_MUTE = 'SetInputMute',
	SET_SOURCE_SETTINGS = 'SetInputSettings',
	SET_INPUT_VOLUME = 'SetInputVolume',
	TRIGGER_MEDIA_INPUT_ACTION = 'TriggerMediaInputAction',
	SET_MEDIA_INPUT_CURSOR = 'SetMediaInputCursor',
}
