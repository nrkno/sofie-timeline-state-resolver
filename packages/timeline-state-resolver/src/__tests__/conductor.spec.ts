import {
	Mappings,
	DeviceType,
	TSRTimelineObj,
	TSRTimeline,
	TimelineContentTypeCasparCg,
	TimelineContentCCGMedia,
	SomeMappingAbstract,
	Mapping,
	SomeMappingCasparCG,
	MappingCasparCGType,
} from 'timeline-state-resolver-types'
import { MockTime } from './mockTime'
import { ThreadedClass } from 'threadedclass'
import { addConnections, getMockCall, removeConnections } from './lib'
import { setupAllMocks } from '../__mocks__/_setup-all-mocks'
import { Commands } from 'casparcg-connection'
import { MockDeviceInstanceWrapper, ConstructedMockDevices, DiscardAllMockDevices } from './mockDeviceInstanceWrapper'

// Mock explicitly the 'dist' version, as that is what threadedClass is being told to load
jest.mock('../../dist/service/DeviceInstance', () => ({
	DeviceInstanceWrapper: MockDeviceInstanceWrapper,
}))
jest.mock('../service/DeviceInstance', () => ({
	DeviceInstanceWrapper: MockDeviceInstanceWrapper,
}))

import { Conductor, TimelineTriggerTimeResult } from '../conductor'
import type { DeviceInstanceWrapper } from '../service/DeviceInstance'

describe('Conductor', () => {
	const mockTime = new MockTime()
	beforeAll(() => {
		setupAllMocks()
	})
	beforeEach(() => {
		mockTime.init()
		DiscardAllMockDevices()
	})

	async function getMockDeviceWrapper(conductor: Conductor, connectionId: string): Promise<MockDeviceInstanceWrapper> {
		const deviceContainer = conductor.connectionManager.getConnection(connectionId)
		expect(deviceContainer).toBeTruthy()

		const mockDevice = ConstructedMockDevices[connectionId]
		expect(mockDevice).toBeTruthy()
		return mockDevice
	}

	test('Abstract-device functionality', async () => {
		const myLayerMapping0: Mapping<SomeMappingAbstract> = {
			device: DeviceType.ABSTRACT,
			deviceId: 'device0',
			options: {},
		}
		const myLayerMapping1: Mapping<SomeMappingAbstract> = {
			device: DeviceType.ABSTRACT,
			deviceId: 'device1',
			options: {},
		}
		const device0Mappings: Mappings = {
			myLayer0: myLayerMapping0,
		}
		const device1Mappings: Mappings = {
			myLayer1: myLayerMapping1,
		}
		const myLayerMapping: Mappings = {
			...device0Mappings,
			...device1Mappings,
		}

		const conductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})

		try {
			await conductor.init()
			await addConnections(conductor.connectionManager, {
				device0: {
					type: DeviceType.ABSTRACT,
					options: {},
				},
				device1: {
					type: DeviceType.ABSTRACT,
					options: {},
				},
			})

			// add something that will play in a seconds time
			const abstractThing0: TSRTimelineObj<any> = {
				id: 'a0',
				enable: {
					start: mockTime.now,
					duration: 1000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.ABSTRACT,
					myAttr1: 'one',
					myAttr2: 'two',
				},
			}
			const abstractThing1: TSRTimelineObj<any> = {
				id: 'a1',
				enable: {
					start: mockTime.now + 1000,
					duration: 1000,
				},
				layer: 'myLayer1',
				content: {
					deviceType: DeviceType.ABSTRACT,
					myAttr1: 'three',
					myAttr2: 'four',
				},
			}

			const device0 = await getMockDeviceWrapper(conductor, 'device0')
			const device1 = await getMockDeviceWrapper(conductor, 'device1')

			// The queues should be empty
			// console.log(device0, device0.handleState)
			expect(device0.handleState).toHaveBeenCalledTimes(0)
			expect(device1.handleState).toHaveBeenCalledTimes(0)
			expect(device0.clearFuture).toHaveBeenCalledTimes(0)
			expect(device1.clearFuture).toHaveBeenCalledTimes(0)

			conductor.setTimelineAndMappings([abstractThing0, abstractThing1], myLayerMapping)

			// Move forward in time, so that all states can be queued
			await mockTime.advanceTimeTicks(500) // to time 10500

			// Ensure device0 has been fed sensible states
			expect(device0.clearFuture).toHaveBeenCalledTimes(1)
			expect(device0.handleState).toHaveBeenCalledTimes(3)
			expect(device0.handleState).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					layers: {
						[abstractThing0.layer]: expect.objectContaining({
							...abstractThing0,
							instance: expect.objectContaining({
								start: 10000,
								end: 11000,
							}),
						}),
					},
					time: 10005,
				}),
				device0Mappings
			)
			expect(device0.handleState).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					time: 11000,
				}),
				device0Mappings
			)
			expect(device0.handleState).toHaveBeenNthCalledWith(
				3,
				expect.objectContaining({
					layers: {},
					time: 12000,
				}),
				device0Mappings
			)

			// Ensure device1 has been fed sensible states
			expect(device1.clearFuture).toHaveBeenCalledTimes(1)
			expect(device1.handleState).toHaveBeenCalledTimes(3)
			expect(device1.handleState).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					layers: {},
				}),
				device1Mappings
			)
			expect(device1.handleState).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					layers: {
						[abstractThing1.layer]: expect.objectContaining({
							...abstractThing1,
							instance: expect.objectContaining({
								start: 11000,
								end: 12000,
							}),
						}),
					},
				}),
				device1Mappings
			)
			expect(device1.handleState).toHaveBeenNthCalledWith(
				3,
				expect.objectContaining({
					layers: {},
				}),
				device1Mappings
			)

			// Remove the device
			await removeConnections(
				conductor.connectionManager,
				{
					device0: {
						type: DeviceType.ABSTRACT,
						options: {},
					},
				},
				['device1']
			)
			expect(conductor.connectionManager.getConnection('device1')).toBeFalsy()
			expect(ConstructedMockDevices['device1']).toBeFalsy()
		} finally {
			await conductor.destroy()
		}
	})

	test('the "Now" and "Callback-functionality', async () => {
		const myLayerMapping0: Mapping<SomeMappingAbstract> = {
			device: DeviceType.ABSTRACT,
			deviceId: 'device0',
			options: {},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const conductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})

		try {
			await conductor.init()
			await addConnections(conductor.connectionManager, {
				device0: {
					type: DeviceType.ABSTRACT,
					options: {},
				},
			})

			// add something that will play "now"
			const abstractThing0: TSRTimelineObj<any> = {
				// will be converted from "now" to 10000
				id: 'a0',
				enable: {
					start: 'now', // 10000
					duration: 5000, // 15000
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.ABSTRACT,
					myAttr1: 'one',
					myAttr2: 'two',
				},
			}
			const abstractThing1: TSRTimelineObj<any> = {
				// will cause a callback to be sent
				id: 'a1',
				enable: {
					start: '#a0.start + 300', // 10300
					duration: 5000, // 15300
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.ABSTRACT,
					myAttr1: 'one',
					myAttr2: 'two',
					callBack: 'abc',
					callBackData: {
						hello: 'dude',
					},
					callBackStopped: 'abcStopped',
				},
			}
			const timeline: TSRTimeline = [abstractThing0, abstractThing1]

			// Implement the `setTimelineTriggerTime` callback
			const setTimelineTriggerTime = jest.fn((results: TimelineTriggerTimeResult) => {
				for (const trigger of results) {
					const o = timeline.find((obj) => obj.id === trigger.id)
					if (o) {
						if (Array.isArray(o.enable)) throw new Error('.enable should not be an array')
						o.enable.start = trigger.time
					}
				}
				// update the timeline:
				conductor.setTimelineAndMappings(timeline, myLayerMapping)
			})
			conductor.on('setTimelineTriggerTime', setTimelineTriggerTime)

			const timelineCallback = jest.fn()
			conductor.on('timelineCallback', timelineCallback)

			const device0 = await getMockDeviceWrapper(conductor, 'device0')

			// The queues should be empty
			expect(device0.clearFuture).toHaveBeenCalledTimes(0)
			expect(device0.handleState).toHaveBeenCalledTimes(0)

			expect(setTimelineTriggerTime).toHaveBeenCalledTimes(0)

			conductor.setTimelineAndMappings(timeline, myLayerMapping)

			// there should now be commands queued:
			await mockTime.tick()

			// the setTimelineTriggerTime event should have been emitted:
			expect(setTimelineTriggerTime).toHaveBeenCalledTimes(1)
			expect(setTimelineTriggerTime).toHaveBeenLastCalledWith([{ id: abstractThing0.id, time: 10000 }])

			// the timelineCallback event should have been emitted:
			expect(timelineCallback).toHaveBeenCalledTimes(0)

			// Move forward in time
			await mockTime.advanceTimeToTicks(10100)

			expect(device0.clearFuture).toHaveBeenCalledTimes(0)
			expect(device0.handleState).toHaveBeenCalledTimes(3)
			expect(device0.handleState).toHaveBeenNthCalledWith(
				1, // Initial timeline
				expect.objectContaining({
					layers: {
						[abstractThing0.layer]: expect.objectContaining({
							...abstractThing0,
							instance: expect.objectContaining({
								start: 10000,
								end: 10300,
							}),
						}),
					},
					time: 10000,
				}),
				myLayerMapping
			)
			expect(device0.handleState).toHaveBeenNthCalledWith(
				2, // setTimelineTriggerTime
				expect.objectContaining({
					layers: {
						[abstractThing0.layer]: expect.objectContaining({
							...abstractThing0,
							instance: expect.objectContaining({
								start: 10000,
								end: 10300,
							}),
						}),
					},
					time: 10000,
				}),
				myLayerMapping
			)
			expect(device0.handleState).toHaveBeenNthCalledWith(
				3, // End of object
				expect.objectContaining({
					layers: {
						[abstractThing1.layer]: expect.objectContaining({
							...abstractThing1,
							instance: expect.objectContaining({
								start: 10300,
								end: 15300,
							}),
						}),
					},
					time: 10300,
				}),
				myLayerMapping
			)

			device0.handleState.mockClear()

			await mockTime.advanceTimeToTicks(15500)

			expect(device0.clearFuture).toHaveBeenCalledTimes(2)
			expect(device0.handleState).toHaveBeenCalledTimes(2)
			expect(device0.handleState).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					layers: {},
					time: 15300,
				}),
				myLayerMapping
			)
			expect(device0.handleState).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					layers: {},
					time: 15300,
				}),
				myLayerMapping
			)
		} finally {
			await conductor.destroy()
		}
	})

	test('devicesMakeReady', async () => {
		const conductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})

		try {
			await conductor.init()
			await addConnections(conductor.connectionManager, {
				device0: {
					type: DeviceType.ABSTRACT,
					options: {},
				},
				device1: {
					type: DeviceType.ABSTRACT,
					options: {},
				},
			})

			const device0 = await getMockDeviceWrapper(conductor, 'device0')
			device0.makeReady.mockImplementationOnce(async () => {
				// Allow it
			})
			const device1 = await getMockDeviceWrapper(conductor, 'device1')
			device1.makeReady.mockImplementationOnce(async () => {
				// Allow it
			})

			expect(device0.makeReady).toHaveBeenCalledTimes(0)
			expect(device1.makeReady).toHaveBeenCalledTimes(0)

			await mockTime.advanceTimeTicks(10) // to allow casparcg to fake "connect"

			await conductor.devicesMakeReady(true)

			expect(device0.makeReady).toHaveBeenCalledTimes(1)
			expect(device1.makeReady).toHaveBeenCalledTimes(1)
		} finally {
			await conductor.destroy()
		}
	})

	test('Construction of multithreaded device', async () => {
		const myLayerMapping0: Mapping<SomeMappingAbstract> = {
			device: DeviceType.ABSTRACT,
			deviceId: 'device0',
			options: {},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const conductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		conductor.on('error', console.error)

		try {
			await conductor.init()
			await addConnections(conductor.connectionManager, {
				device0: {
					type: DeviceType.ABSTRACT,
					options: {},
					isMultiThreaded: true,
				},
			})
			conductor.setTimelineAndMappings([], myLayerMapping)

			const connection = conductor.connectionManager.getConnection('device0')!.device
			expect(await connection.getCurrentTime()).toBeTruthy()
		} finally {
			await conductor.destroy()
		}
	}, 1500)

	test('Changing of mappings live', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})

		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'device0',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 1,
				layer: 10,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const conductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})

		await conductor.init()
		await addConnections(conductor.connectionManager, {
			device0: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
				},
				commandReceiver: commandReceiver0,
			},
		})
		conductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10) // just a little bit

		// add something that will play "now"
		const video0: TSRTimelineObj<TimelineContentCCGMedia> = {
			// will be converted from "now" to 10000
			id: 'a0',
			enable: {
				start: 'now', // 10000
				duration: 10000, // 20000
			},
			layer: 'myLayer0',
			content: {
				deviceType: DeviceType.CASPARCG,
				type: TimelineContentTypeCasparCg.MEDIA,

				file: 'AMB',
			},
		}

		const timeline: TSRTimeline = [video0]

		const device0Container = conductor.connectionManager.getConnection('device0')
		const device0 = device0Container!.device as ThreadedClass<DeviceInstanceWrapper>
		expect(device0).toBeTruthy()

		conductor.setTimelineAndMappings(timeline)

		// there should now be commands queued:
		// await mockTime.tick()

		await mockTime.advanceTimeToTicks(10500)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).command).toEqual(Commands.Play)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			clip: 'AMB',
			channel: 1,
			layer: 10,
		})

		commandReceiver0.mockClear()

		// modify the mapping:
		myLayerMapping0.options.layer = 20
		conductor.setTimelineAndMappings(conductor.timeline, myLayerMapping)

		await mockTime.advanceTimeTicks(100) // just a little bit

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 0, 1).command).toEqual(Commands.Clear)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			// clip: 'AMB',
			channel: 1,
			layer: 10,
		})
		expect(getMockCall(commandReceiver0, 1, 1).command).toEqual(Commands.Play)
		expect(getMockCall(commandReceiver0, 1, 1).params).toMatchObject({
			clip: 'AMB',
			channel: 1,
			layer: 20,
		})

		commandReceiver0.mockClear()

		// Replace the mapping altogether:
		delete myLayerMapping['myLayer0']
		const myLayerMappingNew: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'device0',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 10,
			},
		}
		myLayerMapping['myLayerNew'] = myLayerMappingNew
		video0.layer = 'myLayerNew'
		conductor.setTimelineAndMappings(timeline, myLayerMapping)

		await mockTime.advanceTimeTicks(100) // just a little bit

		// const nææh = false
		// const DO_IT_RIGHT = nææh
		// if (DO_IT_RIGHT) {
		// 	// Note: We only expect a play command on the new channel,
		// 	// The old channel now has no mapping, and should be left alone
		// 	expect(commandReceiver0).toHaveBeenCalledTimes(1)
		// 	expect(getMockCall(commandReceiver0, 0, 1).name).toEqual('PlayCommand')
		// 	expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
		// 		_objectParams: {
		// 			clip: 'AMB',
		// 			channel: 2,
		// 			layer: 10,
		// 		},
		// 	})
		// } else {
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			command: Commands.Clear,
			params: {
				channel: 1,
				layer: 20,
			},
		})

		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			command: Commands.Play,
			params: {
				clip: 'AMB',
				channel: 2,
				layer: 10,
			},
		})
		// }
	})

	test('estimateResolveTime', () => {
		// Ensure that the resolveTime follows a certain curve:
		expect([
			Conductor.calculateResolveTime(0, 1),
			Conductor.calculateResolveTime(50, 1),
			Conductor.calculateResolveTime(100, 1),
			Conductor.calculateResolveTime(150, 1),
			Conductor.calculateResolveTime(200, 1),
			Conductor.calculateResolveTime(500, 1),
			Conductor.calculateResolveTime(1000, 1),
			Conductor.calculateResolveTime(10000, 1),
		]).toEqual([
			20, // 0
			40, // 50
			65, // 100
			87, // 150
			106, // 200
			200, // 500
			200, // 1000
			200, // 10000
		])
	})
})
