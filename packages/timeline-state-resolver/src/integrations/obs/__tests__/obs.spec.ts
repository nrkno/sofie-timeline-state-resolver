/* eslint-disable jest/expect-expect */
import {
	DeviceType,
	MappingObsType,
	Mappings,
	SomeMappingObs,
	Timeline,
	TimelineContentOBSAny,
	TimelineContentTypeOBS,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { OBSCommandWithContext, OBSDevice } from '..'
import { getDeviceContext } from '../../__tests__/testlib'
import { getDefaultState, OBSDeviceState } from '../state'
import { OBSRequestName } from '../diff'
import '../../../__mocks__/ws'

async function getInitialisedObsDevice() {
	const dev = new OBSDevice(getDeviceContext())
	await dev.init({ host: 'localhost', port: 8082 })
	return dev
}

describe('OBS Device', () => {
	describe('convertTimelineStateToDeviceState', () => {
		async function convertState(tlState: Timeline.TimelineState<TSRTimelineContent>, expDevState: OBSDeviceState) {
			const device = await getInitialisedObsDevice()

			const actualState = device.convertTimelineStateToDeviceState(tlState, DEFAULT_MAPPINGS)

			expect(actualState).toEqual(expDevState)
		}

		test('convert empty state', async () => {
			await convertState(createTimelineState({}), getDefaultState(10))
		})

		test('convert full state', async () => {
			await convertState(
				createTimelineState({
					currentScene: {
						id: 'currentScene0',
						content: {
							deviceType: DeviceType.OBS,
							type: TimelineContentTypeOBS.CURRENT_SCENE,

							sceneName: 'scene1',
						},
					},
					currentTransition: {
						id: 'currentTransition0',
						content: {
							deviceType: DeviceType.OBS,
							type: TimelineContentTypeOBS.CURRENT_TRANSITION,

							transitionName: 'transition1',
						},
					},
					recording: {
						id: 'recording0',
						content: {
							deviceType: DeviceType.OBS,
							type: TimelineContentTypeOBS.RECORDING,

							on: true,
						},
					},
					streaming: {
						id: 'streaming0',
						content: {
							deviceType: DeviceType.OBS,
							type: TimelineContentTypeOBS.STREAMING,

							on: true,
						},
					},
					sceneItem: {
						id: 'sceneItem0',
						content: {
							deviceType: DeviceType.OBS,
							type: TimelineContentTypeOBS.SCENE_ITEM,

							transform: {
								width: 100,
							},
						},
					},
					inputAudio: {
						id: 'inputAudio0',
						content: {
							deviceType: DeviceType.OBS,
							type: TimelineContentTypeOBS.INPUT_AUDIO,

							volume: 5,
						},
					},
					inputSettings: {
						id: 'inputSettings0',
						content: {
							deviceType: DeviceType.OBS,
							type: TimelineContentTypeOBS.INPUT_SETTINGS,

							sourceType: 'ffmpeg_source',
							sourceSettings: {
								is_local_file: true,
							},
						},
					},
					inputMedia: {
						id: 'inputMedia0',
						content: {
							deviceType: DeviceType.OBS,
							type: TimelineContentTypeOBS.INPUT_MEDIA,

							state: 'playing',
						},
						instance: {
							originalStart: 10,
						},
					} as any,
				}),
				{
					time: 10,
					currentScene: 'scene1',
					previewScene: undefined,
					currentTransition: 'transition1',
					recording: true,
					streaming: true,
					scenes: {
						scene0: {
							sceneItems: {
								source0: {
									transform: {
										width: 100,
									},
								},
							},
						},
					},
					inputs: {
						source0: {
							audio: {
								volume: 5,
							},
							inputSettings: {
								sourceType: 'ffmpeg_source',
								settings: {
									is_local_file: true,
								},
							},
							mediaSettings: {
								playTime: 10,
								state: 'playing',
							},
						},
					},
				}
			)
		})
	})

	describe('diffState', () => {
		async function compareStates(
			oldDevState: OBSDeviceState | undefined,
			newDevState: OBSDeviceState,
			expCommands: OBSCommandWithContext[]
		) {
			const device = await getInitialisedObsDevice()

			const commands = device.diffStates(oldDevState, newDevState, {}, 0, 'test')

			expect(commands).toEqual(expCommands)
		}

		test('From undefined', async () => {
			await compareStates(undefined, getDefaultState(10), [])
		})

		test('Current scene', async () => {
			await compareStates(
				getDefaultState(10),
				{
					...getDefaultState(20),
					currentScene: 'scene1',
				},
				[
					{
						command: {
							requestName: OBSRequestName.SET_CURRENT_SCENE,
							args: {
								sceneName: 'scene1',
							},
						},
						timelineObjId: '',
						context: 'currentScene changed from "undefined" to "scene1" (test)',
					},
				]
			)
		})

		test('Current transition', async () => {
			await compareStates(
				getDefaultState(10),
				{
					...getDefaultState(20),
					currentTransition: 'transition1',
				},
				[
					{
						command: {
							requestName: OBSRequestName.SET_CURRENT_TRANSITION,
							args: {
								transitionName: 'transition1',
							},
						},
						timelineObjId: '',
						context: 'currentTransition changed (test)',
					},
				]
			)
		})

		test('Scene Item Settings', async () => {
			await compareStates(
				getDefaultState(10),
				{
					...getDefaultState(20),
					scenes: {
						scene1: {
							sceneItems: {
								item1: {
									transform: {
										cropBottom: 100,
									},
								},
							},
						},
					},
				},
				[
					// {
					// 	command: {
					// 		requestName: OBSRequestName.SET_SCENE_ITEM_TRANSFORM,
					// 		args: {
					// 			sceneName: 'scene1',
					// 			sceneItemId: 1,
					// 			sceneItemTransform: {
					// 				cropBottom: 100,
					// 			},
					// 		},
					// 	},
					// 	timelineObjId: '',
					// 	context: 'currentTransition changed (test)',
					// },
				]
			)
		})

		test('Input Settings', async () => {
			await compareStates(
				getDefaultState(10),
				{
					...getDefaultState(20),
					inputs: {
						input1: {
							inputSettings: {
								sourceType: 'ffmpeg_source',
								settings: {
									is_local_file: true,
								},
							},
						},
					},
				},
				[
					{
						command: {
							requestName: OBSRequestName.SET_SOURCE_SETTINGS,
							args: {
								inputName: 'input1',
								inputSettings: {
									is_local_file: true,
								},
							},
						},
						timelineObjId: '',
						context: 'source input1 changed settings (test)',
					},
				]
			)
		})

		test('Input Volume', async () => {
			await compareStates(
				getDefaultState(10),
				{
					...getDefaultState(20),
					inputs: {
						input1: {
							audio: {
								volume: 3,
							},
						},
					},
				},
				[
					{
						command: {
							requestName: OBSRequestName.SET_INPUT_VOLUME,
							args: {
								inputName: 'input1',
								inputVolumeDb: 3,
							},
						},
						timelineObjId: '',
						context: 'source input1 changed settings (test)',
					},
				]
			)
		})

		test('Input Media', async () => {
			await compareStates(
				getDefaultState(10),
				{
					...getDefaultState(20),
					time: 1000,
					inputs: {
						input1: {
							mediaSettings: {
								playTime: 200,
								seek: 80,
								state: 'playing',
							},
						},
					},
				},
				[
					{
						command: {
							requestName: OBSRequestName.TRIGGER_MEDIA_INPUT_ACTION,
							args: {
								inputName: 'input1',
								mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY',
							},
						},
						timelineObjId: '',
						context: 'source input1 playing (test)',
					},
					{
						command: {
							requestName: OBSRequestName.SET_MEDIA_INPUT_CURSOR,
							args: {
								inputName: 'input1',
								mediaCursor: 1000 - 200 + 80,
							},
						},
						timelineObjId: '',
						context: 'source input1 changed seek position or startTime (test)',
					},
				]
			)
		})
	})
})

function createTimelineState(
	objs: Record<string, { id: string; content: TimelineContentOBSAny }>
): Timeline.TimelineState<TSRTimelineContent> {
	return {
		time: 10,
		layers: objs as any,
		nextEvents: [],
	}
}
const DEFAULT_MAPPINGS: Mappings<SomeMappingObs> = {
	currentScene: {
		device: DeviceType.OBS,
		deviceId: 'obs0',

		options: {
			mappingType: MappingObsType.CurrentScene,
		},
	},
	currentTransition: {
		device: DeviceType.OBS,
		deviceId: 'obs0',

		options: {
			mappingType: MappingObsType.CurrentTransition,
		},
	},
	recording: {
		device: DeviceType.OBS,
		deviceId: 'obs0',

		options: {
			mappingType: MappingObsType.Recording,
		},
	},
	streaming: {
		device: DeviceType.OBS,
		deviceId: 'obs0',

		options: {
			mappingType: MappingObsType.Streaming,
		},
	},
	sceneItem: {
		device: DeviceType.OBS,
		deviceId: 'obs0',

		options: {
			mappingType: MappingObsType.SceneItem,
			sceneName: 'scene0',
			source: 'source0',
		},
	},
	inputAudio: {
		device: DeviceType.OBS,
		deviceId: 'obs0',

		options: {
			mappingType: MappingObsType.InputAudio,
			input: 'source0',
		},
	},
	inputSettings: {
		device: DeviceType.OBS,
		deviceId: 'obs0',

		options: {
			mappingType: MappingObsType.InputSettings,
			input: 'source0',
		},
	},
	inputMedia: {
		device: DeviceType.OBS,
		deviceId: 'obs0',

		options: {
			mappingType: MappingObsType.InputMedia,
			input: 'source0',
		},
	},
}
