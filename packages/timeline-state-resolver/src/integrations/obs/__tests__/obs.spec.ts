import { Conductor } from '../../../conductor'
import {
	Mappings,
	DeviceType,
	TimelineContentTypeOBS,
	TimelineContentOBSCurrentScene,
	TimelineContentOBSRecording,
	TimelineContentOBSStreaming,
	TimelineContentOBSCurrentTransition,
	TimelineContentOBSSourceSettings,
	TimelineContentOBSSceneItemRender,
	TSRTimelineObj,
	MappingObsCurrentScene,
	Mapping,
	MappingObsCurrentTransition,
	MappingObsRecording,
	MappingObsStreaming,
	MappingObsSourceSettings,
	MappingObsSceneItemRender,
	MappingObsType,
} from 'timeline-state-resolver-types'
import { MockTime } from '../../../__tests__/mockTime'
import { ThreadedClass } from 'threadedclass'
import { getMockCall } from '../../../__tests__/lib'
import { OBSDevice } from '..'
import * as WebSocket from '../../../__mocks__/ws'
import { literal } from '../../../lib'

describe('OBS', () => {
	const mockTime = new MockTime()
	beforeEach(() => {
		mockTime.init()
		WebSocket.clearMockInstances()

		jest.useRealTimers()
		setTimeout(() => {
			const wsInstances = WebSocket.getMockInstances()
			if (wsInstances.length !== 1) throw new Error('WebSocket Mock instance not created')
			WebSocket.getMockInstances()[0].mockSetConnected(true)
		}, 200)
		jest.useFakeTimers()
	})

	async function setUpOBS() {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const currentSceneMapping: Mapping<MappingObsCurrentScene> = {
			device: DeviceType.OBS,
			deviceId: 'obs0',
			options: {
				mappingType: MappingObsType.CurrentScene,
			},
		}
		const currentTransitionMapping: Mapping<MappingObsCurrentTransition> = {
			device: DeviceType.OBS,
			deviceId: 'obs0',
			options: {
				mappingType: MappingObsType.CurrentTransition,
			},
		}
		const recordingMapping: Mapping<MappingObsRecording> = {
			device: DeviceType.OBS,
			deviceId: 'obs0',
			options: {
				mappingType: MappingObsType.Recording,
			},
		}
		const streamingMapping: Mapping<MappingObsStreaming> = {
			device: DeviceType.OBS,
			deviceId: 'obs0',
			options: {
				mappingType: MappingObsType.Streaming,
			},
		}
		const sourceSettingsMapping: Mapping<MappingObsSourceSettings> = {
			device: DeviceType.OBS,
			deviceId: 'obs0',
			options: {
				mappingType: MappingObsType.SourceSettings,
				source: 'source0',
			},
		}
		const sceneItemRenderMapping: Mapping<MappingObsSceneItemRender> = {
			device: DeviceType.OBS,
			deviceId: 'obs0',
			options: {
				mappingType: MappingObsType.SceneItemRender,
				sceneName: 'scene0',
				source: 'source0',
			},
		}
		const myLayerMapping: Mappings = {
			obs0_currentScene: currentSceneMapping,
			obs0_currentTransition: currentTransitionMapping,
			obs0_recording: recordingMapping,
			obs0_streaming: streamingMapping,
			obs0_source: sourceSettingsMapping,
			obs0_scene0source0: sceneItemRenderMapping,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		myConductor.on('error', (e0, e1, e2) => console.error(e0, e1, e2))

		const mockReply = jest.fn((_ws: WebSocket, message: string) => {
			try {
				const data = JSON.parse(message)

				if (data['request-type'] === 'GetAuthRequired') {
					return {
						data: JSON.stringify({
							'message-id': data['message-id'],
							authRequired: false,
						}),
					}
				} else {
					console.log(data)
				}
			} catch (e) {
				console.error(e)
			}

			return ''
		})
		WebSocket.mockConstructor((ws) => {
			ws._mockHost = 'ws://127.0.0.1:4444'

			// @ts-ignore mock
			ws.mockReplyFunction((message) => {
				if (message === '') return '' // ping message

				return mockReply(ws, message)
			})
		})

		await myConductor.init()

		await myConductor.addDevice('obs0', {
			type: DeviceType.OBS,
			commandReceiver: commandReceiver0,
			options: {
				host: '127.0.0.1',
				port: 4444,
			},
		})

		return {
			myConductor,
			myLayerMapping,
			commandReceiver0,
		}
	}

	test('CurrentScene', async () => {
		const { myConductor, myLayerMapping, commandReceiver0 } = await setUpOBS()

		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('obs0')
		if (deviceContainer === undefined) throw new Error('Device undefined')
		const device: ThreadedClass<OBSDevice> = deviceContainer.device as ThreadedClass<OBSDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			literal<TSRTimelineObj<TimelineContentOBSCurrentScene>>({
				id: 'obj0',
				enable: {
					start: mockTime.now + 1000, // in 1 second
					duration: 2000,
				},
				layer: 'obs0_currentScene',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.CURRENT_SCENE,

					sceneName: 'scene0',
				},
			}),
		])

		await mockTime.advanceTimeToTicks(10990)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		await mockTime.advanceTimeToTicks(11100)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			command: {
				requestName: 'SetCurrentScene',
				args: {
					'scene-name': 'scene0',
				},
			},
		})
		expect(getMockCall(commandReceiver0, 0, 2)).toMatch(/changed/) // context
		await mockTime.advanceTimeToTicks(16000)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
	})

	test('CurrentScene lookaheads to PreviewScene', async () => {
		const { myConductor, myLayerMapping, commandReceiver0 } = await setUpOBS()

		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('obs0')
		if (deviceContainer === undefined) throw new Error('Device undefined')
		const device = deviceContainer.device as ThreadedClass<OBSDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			literal<TSRTimelineObj<TimelineContentOBSCurrentScene>>({
				id: 'obj0',
				enable: {
					start: mockTime.now + 1000, // in 1 second
					duration: 2000,
				},
				layer: 'obs0_currentScene',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.CURRENT_SCENE,

					sceneName: 'scene0',
				},
			}),
		])

		await mockTime.advanceTimeToTicks(10990)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		await mockTime.advanceTimeToTicks(11100)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)

		myConductor.setTimelineAndMappings([
			literal<TSRTimelineObj<TimelineContentOBSCurrentScene>>({
				id: 'obj0',
				enable: {
					while: 1,
				},
				layer: 'obs0_currentScene',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.CURRENT_SCENE,

					sceneName: 'scene0',
				},
			}),
			literal<TSRTimelineObj<TimelineContentOBSCurrentScene>>({
				id: 'lookahead_obj0',
				enable: {
					while: 1,
				},
				layer: 'lookahead_obs0_currentScene',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.CURRENT_SCENE,

					sceneName: 'scene1',
				},
				isLookahead: true,
				lookaheadForLayer: 'obs0_currentScene',
			}),
		])

		await mockTime.advanceTimeToTicks(12100)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			command: {
				requestName: 'SetPreviewScene',
				args: {
					'scene-name': 'scene1',
				},
			},
		})
	})

	test('Record and Streaming', async () => {
		const { myConductor, myLayerMapping, commandReceiver0 } = await setUpOBS()

		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('obs0')
		if (deviceContainer === undefined) throw new Error('Device undefined')
		const device = deviceContainer.device as ThreadedClass<OBSDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			literal<TSRTimelineObj<TimelineContentOBSRecording>>({
				id: 'obj0',
				enable: {
					while: 1,
				},
				layer: 'obs0_recording',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.RECORDING,

					on: true,
				},
			}),
			literal<TSRTimelineObj<TimelineContentOBSStreaming>>({
				id: 'obj1',
				enable: {
					while: 1,
				},
				layer: 'obs0_streaming',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.STREAMING,

					on: true,
				},
			}),
		])

		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			command: {
				requestName: 'StartRecording',
			},
		})
		expect(getMockCall(commandReceiver0, 0, 2)).toMatch(/changed/) // context

		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			command: {
				requestName: 'StartStreaming',
			},
		})
		expect(getMockCall(commandReceiver0, 1, 2)).toMatch(/changed/) // context

		await mockTime.advanceTimeToTicks(16000)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
	})

	test('Current Transition', async () => {
		const { myConductor, myLayerMapping, commandReceiver0 } = await setUpOBS()

		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('obs0')
		if (deviceContainer === undefined) throw new Error('Device undefined')
		const device = deviceContainer.device as ThreadedClass<OBSDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			literal<TSRTimelineObj<TimelineContentOBSCurrentTransition>>({
				id: 'obj0',
				enable: {
					while: 1,
				},
				layer: 'obs0_currentTransition',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.CURRENT_TRANSITION,

					transitionName: 'transition0',
				},
			}),
		])

		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			command: {
				requestName: 'SetCurrentTransition',
				args: {
					'transition-name': 'transition0',
				},
			},
		})
		expect(getMockCall(commandReceiver0, 0, 2)).toMatch(/changed/) // context

		await mockTime.advanceTimeToTicks(16000)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
	})

	test('Scene Item Render', async () => {
		const { myConductor, myLayerMapping, commandReceiver0 } = await setUpOBS()

		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('obs0')
		if (deviceContainer === undefined) throw new Error('Device undefined')
		const device = deviceContainer.device as ThreadedClass<OBSDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			literal<TSRTimelineObj<TimelineContentOBSSceneItemRender>>({
				id: 'obj0',
				enable: {
					while: 1,
				},
				layer: 'obs0_scene0source0',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.SCENE_ITEM_RENDER,

					on: false,
				},
			}),
		])

		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			command: {
				requestName: 'SetSceneItemRender',
				args: {
					'scene-name': 'scene0',
					source: 'source0',
					render: false,
				},
			},
		})
		expect(getMockCall(commandReceiver0, 0, 2)).toMatch(/changed/) // context

		myConductor.setTimelineAndMappings([
			literal<TSRTimelineObj<TimelineContentOBSSceneItemRender>>({
				id: 'obj0',
				enable: {
					while: 1,
				},
				layer: 'obs0_scene0source0',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.SCENE_ITEM_RENDER,

					on: true,
				},
			}),
		])

		await mockTime.advanceTimeToTicks(13000)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			command: {
				requestName: 'SetSceneItemRender',
				args: {
					'scene-name': 'scene0',
					source: 'source0',
					render: true,
				},
			},
		})
		expect(getMockCall(commandReceiver0, 1, 2)).toMatch(/changed/) // context

		await mockTime.advanceTimeToTicks(16000)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
	})

	test('Source Settings', async () => {
		const { myConductor, myLayerMapping, commandReceiver0 } = await setUpOBS()

		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('obs0')
		if (deviceContainer === undefined) throw new Error('Device undefined')
		const device = deviceContainer.device as ThreadedClass<OBSDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			literal<TSRTimelineObj<TimelineContentOBSSourceSettings>>({
				id: 'obj0',
				enable: {
					while: 1,
				},
				layer: 'obs0_source',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.SOURCE_SETTINGS,

					sourceType: 'ffmpeg_source',
					sourceSettings: {
						is_local_file: true,
						local_file: 'd:/temp/file0.mp4',
					},
				},
			}),
		])

		await mockTime.advanceTimeToTicks(11000)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			command: {
				requestName: 'SetSourceSettings',
				args: {
					sourceName: 'source0',
					sourceSettings: {
						is_local_file: true,
						local_file: 'd:/temp/file0.mp4',
					},
				},
			},
		})
		expect(getMockCall(commandReceiver0, 0, 2)).toMatch(/changed/) // context

		myConductor.setTimelineAndMappings([
			literal<TSRTimelineObj<TimelineContentOBSSourceSettings>>({
				id: 'obj0',
				enable: {
					while: 1,
				},
				layer: 'obs0_source',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.SOURCE_SETTINGS,

					sourceType: 'ffmpeg_source',
					sourceSettings: {
						is_local_file: true,
						local_file: 'd:/temp/file1.mp4',
					},
				},
			}),
		])

		await mockTime.advanceTimeToTicks(12000)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			command: {
				requestName: 'SetSourceSettings',
				args: {
					sourceName: 'source0',
					sourceSettings: {
						is_local_file: true,
						local_file: 'd:/temp/file1.mp4',
					},
				},
			},
		})
		expect(getMockCall(commandReceiver0, 1, 2)).toMatch(/changed/) // context
	})
})
