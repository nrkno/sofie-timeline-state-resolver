import { Conductor } from '../../conductor'
import {
	MappingOBSCurrentScene,
	Mappings,
	DeviceType,
	MappingOBSType,
	MappingOBSCurrentTransition,
	MappingOBSRecording,
	MappingOBSSceneItemRender,
	MappingOBSSourceSettings,
	MappingOBSStreaming,
	TimelineContentTypeOBS,
	TimelineObjOBSCurrentScene,
	TimelineObjOBSRecording,
	TimelineObjOBSStreaming,
	TimelineObjOBSCurrentTransition,
	TimelineObjOBSSourceSettings,
	TimelineObjOBSSceneItemRender
} from '../../types/src'
import { MockTime } from '../../__tests__/mockTime'
import { literal } from '../device'
import { ThreadedClass } from 'threadedclass'
import { getMockCall } from '../../__tests__/lib'
import { OBSDevice } from '../obs'
import * as WebSocket from '../../__mocks__/ws'

describe('OBS', () => {
	let mockTime = new MockTime()
	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
		WebSocket.clearMockInstances()

		jest.useRealTimers()
		setTimeout(() => {
			let wsInstances = WebSocket.getMockInstances()
			expect(wsInstances).toHaveLength(1)
			WebSocket.getMockInstances()[0].mockSetConnected(true)
		}, 200)
		jest.useFakeTimers()
	})

	async function setUpOBS () {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		let currentSceneMapping: MappingOBSCurrentScene = {
			device: DeviceType.OBS,
			mappingType: MappingOBSType.CurrentScene,
			deviceId: 'obs0'
		}
		let currentTransitionMapping: MappingOBSCurrentTransition = {
			device: DeviceType.OBS,
			mappingType: MappingOBSType.CurrentTransition,
			deviceId: 'obs0'
		}
		let recordingMapping: MappingOBSRecording = {
			device: DeviceType.OBS,
			mappingType: MappingOBSType.Recording,
			deviceId: 'obs0'
		}
		let streamingMapping: MappingOBSStreaming = {
			device: DeviceType.OBS,
			mappingType: MappingOBSType.Streaming,
			deviceId: 'obs0'
		}
		let sourceSettingsMapping: MappingOBSSourceSettings = {
			device: DeviceType.OBS,
			mappingType: MappingOBSType.SourceSettings,
			deviceId: 'obs0',
			source: 'source0'
		}
		let sceneItemRenderMapping: MappingOBSSceneItemRender = {
			device: DeviceType.OBS,
			mappingType: MappingOBSType.SceneItemRender,
			deviceId: 'obs0',
			sceneName: 'scene0',
			source: 'source0'
		}
		let myLayerMapping: Mappings = {
			'obs0_currentScene': currentSceneMapping,
			'obs0_currentTransition': currentTransitionMapping,
			'obs0_recording': recordingMapping,
			'obs0_streaming': streamingMapping,
			'obs0_source': sourceSettingsMapping,
			'obs0_scene0source0': sceneItemRenderMapping
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})
		myConductor.on('error', (e0, e1, e2) => console.error(e0, e1, e2))

		let mockReply = jest.fn((_ws: WebSocket, message: string) => {
			try {
				let data = JSON.parse(message)

				if (data['request-type'] === 'GetAuthRequired') {
					return {
						data: JSON.stringify({
							'message-id': data['message-id'],
							'authRequired': false
						})
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
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				port: 4444
			}
		})

		return {
			myConductor,
			myLayerMapping,
			commandReceiver0
		}
	}

	test('CurrentScene', async () => {
		const {
			myConductor,
			myLayerMapping,
			commandReceiver0
		} = await setUpOBS()

		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		let deviceContainer = myConductor.getDevice('obs0')
		let device: ThreadedClass<OBSDevice> = deviceContainer.device as ThreadedClass<OBSDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			literal<TimelineObjOBSCurrentScene>({
				id: 'obj0',
				enable: {
					start: mockTime.now + 1000, // in 1 second
					duration: 2000
				},
				layer: 'obs0_currentScene',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.CURRENT_SCENE,

					sceneName: 'scene0'
				}
			})
		])

		await mockTime.advanceTimeToTicks(10990)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		await mockTime.advanceTimeToTicks(11100)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject(
			{
				command: {
					requestName: 'SetCurrentScene',
					args: {
						'scene-name': 'scene0'
					}
				}
			}
		)
		expect(getMockCall(commandReceiver0, 0, 2)).toMatch(/changed/) // context
		await mockTime.advanceTimeToTicks(16000)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
	})

	test('CurrentScene lookaheads to PreviewScene', async () => {
		const {
			myConductor,
			myLayerMapping,
			commandReceiver0
		} = await setUpOBS()

		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		let deviceContainer = myConductor.getDevice('obs0')
		let device = deviceContainer.device as ThreadedClass<OBSDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			literal<TimelineObjOBSCurrentScene>({
				id: 'obj0',
				enable: {
					start: mockTime.now + 1000, // in 1 second
					duration: 2000
				},
				layer: 'obs0_currentScene',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.CURRENT_SCENE,

					sceneName: 'scene0'
				}
			})
		])

		await mockTime.advanceTimeToTicks(10990)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		await mockTime.advanceTimeToTicks(11100)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)

		myConductor.setTimelineAndMappings([
			literal<TimelineObjOBSCurrentScene>({
				id: 'obj0',
				enable: {
					while: 1
				},
				layer: 'obs0_currentScene',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.CURRENT_SCENE,

					sceneName: 'scene0'
				}
			}),
			literal<TimelineObjOBSCurrentScene>({
				id: 'lookahead_obj0',
				enable: {
					while: 1
				},
				layer: 'lookahead_obs0_currentScene',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.CURRENT_SCENE,

					sceneName: 'scene1'
				},
				isLookahead: true,
				lookaheadForLayer: 'obs0_currentScene'
			})
		])

		await mockTime.advanceTimeToTicks(12100)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject(
			{
				command: {
					requestName: 'SetPreviewScene',
					args: {
						'scene-name': 'scene1'
					}
				}
			}
		)
	})

	test('Record and Streaming', async () => {
		const {
			myConductor,
			myLayerMapping,
			commandReceiver0
		} = await setUpOBS()

		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		let deviceContainer = myConductor.getDevice('obs0')
		let device = deviceContainer.device as ThreadedClass<OBSDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			literal<TimelineObjOBSRecording>({
				id: 'obj0',
				enable: {
					while: 1
				},
				layer: 'obs0_recording',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.RECORDING,

					on: true
				}
			}),
			literal<TimelineObjOBSStreaming>({
				id: 'obj1',
				enable: {
					while: 1
				},
				layer: 'obs0_streaming',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.STREAMING,

					on: true
				}
			})
		])

		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject(
			{
				command: {
					requestName: 'StartRecording'
				}
			}
		)
		expect(getMockCall(commandReceiver0, 0, 2)).toMatch(/changed/) // context

		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject(
			{
				command: {
					requestName: 'StartStreaming'
				}
			}
		)
		expect(getMockCall(commandReceiver0, 1, 2)).toMatch(/changed/) // context

		await mockTime.advanceTimeToTicks(16000)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
	})

	test('Current Transition', async () => {
		const {
			myConductor,
			myLayerMapping,
			commandReceiver0
		} = await setUpOBS()

		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		let deviceContainer = myConductor.getDevice('obs0')
		let device = deviceContainer.device as ThreadedClass<OBSDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			literal<TimelineObjOBSCurrentTransition>({
				id: 'obj0',
				enable: {
					while: 1
				},
				layer: 'obs0_currentTransition',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.CURRENT_TRANSITION,

					transitionName: 'transition0'
				}
			})
		])

		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject(
			{
				command: {
					requestName: 'SetCurrentTransition',
					args: {
						'transition-name': 'transition0'
					}
				}
			}
		)
		expect(getMockCall(commandReceiver0, 0, 2)).toMatch(/changed/) // context

		await mockTime.advanceTimeToTicks(16000)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
	})

	test('Scene Item Render', async () => {
		const {
			myConductor,
			myLayerMapping,
			commandReceiver0
		} = await setUpOBS()

		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		let deviceContainer = myConductor.getDevice('obs0')
		let device = deviceContainer.device as ThreadedClass<OBSDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			literal<TimelineObjOBSSceneItemRender>({
				id: 'obj0',
				enable: {
					while: 1
				},
				layer: 'obs0_scene0source0',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.SCENE_ITEM_RENDER,

					on: false
				}
			})
		])

		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject(
			{
				command: {
					requestName: 'SetSceneItemRender',
					args: {
						'scene-name': 'scene0',
						'source': 'source0',
						'render': false
					}
				}
			}
		)
		expect(getMockCall(commandReceiver0, 0, 2)).toMatch(/changed/) // context

		myConductor.setTimelineAndMappings([
			literal<TimelineObjOBSSceneItemRender>({
				id: 'obj0',
				enable: {
					while: 1
				},
				layer: 'obs0_scene0source0',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.SCENE_ITEM_RENDER,

					on: true
				}
			})
		])

		await mockTime.advanceTimeToTicks(13000)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject(
			{
				command: {
					requestName: 'SetSceneItemRender',
					args: {
						'scene-name': 'scene0',
						'source': 'source0',
						'render': true
					}
				}
			}
		)
		expect(getMockCall(commandReceiver0, 1, 2)).toMatch(/changed/) // context

		await mockTime.advanceTimeToTicks(16000)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
	})

	test('Source Settings', async () => {
		const {
			myConductor,
			myLayerMapping,
			commandReceiver0
		} = await setUpOBS()

		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		let deviceContainer = myConductor.getDevice('obs0')
		let device = deviceContainer.device as ThreadedClass<OBSDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			literal<TimelineObjOBSSourceSettings>({
				id: 'obj0',
				enable: {
					while: 1
				},
				layer: 'obs0_source',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.SOURCE_SETTINGS,

					sourceType: 'ffmpeg_source',
					sourceSettings: {
						is_local_file: true,
						local_file: 'd:/temp/file0.mp4'
					}
				}
			})
		])

		await mockTime.advanceTimeToTicks(11000)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject(
			{
				command: {
					requestName: 'SetSourceSettings',
					args: {
						sourceName: 'source0',
						sourceSettings: {
							is_local_file: true,
							local_file: 'd:/temp/file0.mp4'
						}
					}
				}
			}
		)
		expect(getMockCall(commandReceiver0, 0, 2)).toMatch(/changed/) // context

		myConductor.setTimelineAndMappings([
			literal<TimelineObjOBSSourceSettings>({
				id: 'obj0',
				enable: {
					while: 1
				},
				layer: 'obs0_source',
				content: {
					deviceType: DeviceType.OBS,
					type: TimelineContentTypeOBS.SOURCE_SETTINGS,

					sourceType: 'ffmpeg_source',
					sourceSettings: {
						is_local_file: true,
						local_file: 'd:/temp/file1.mp4'
					}
				}
			})
		])

		await mockTime.advanceTimeToTicks(12000)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject(
			{
				command: {
					requestName: 'SetSourceSettings',
					args: {
						sourceName: 'source0',
						sourceSettings: {
							is_local_file: true,
							local_file: 'd:/temp/file1.mp4'
						}
					}
				}
			}
		)
		expect(getMockCall(commandReceiver0, 1, 2)).toMatch(/changed/) // context
	})
})