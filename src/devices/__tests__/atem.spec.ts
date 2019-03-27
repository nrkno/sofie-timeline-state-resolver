import { Enums, MixEffect } from 'atem-state'
import { TriggerType, TimelineResolvedObject } from 'superfly-timeline'
import { Conductor } from '../../conductor'
import { AtemDevice, AtemDeviceOptions } from '../atem'
import { MockTime } from '../../__tests__/mockTime.spec'
import {
	Mappings,
	DeviceType ,
	MappingAtem,
	MappingAtemType,
	TimelineContentTypeAtem,
	AtemOptions
} from '../../types/src'
import { ThreadedClass } from 'threadedclass'
import { TimelineState } from '../../types/src/superfly-timeline'
import { literal } from '../device'

describe('Atem', () => {
	let mockTime = new MockTime()
	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})

	test('Atem: Ensure clean initial state', async () => {
		const commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})
		const mockState: TimelineState = {
			time: mockTime.now + 50,
			GLayers: {},
			LLayers: {}
		}

		let device = new AtemDevice('mock', literal<AtemDeviceOptions>({
			type: DeviceType.ATEM,
			options: {
				commandReceiver: commandReceiver0
			}
		}), {
			getCurrentTime: mockTime.getCurrentTime
		})

		await device.init(literal<AtemOptions>({
			host: '127.0.0.1'
		}))

		device.handleState(mockState)
		expect(device.queue).toHaveLength(0)
	})

	test('Atem: switch input', async () => {

		let commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})
		let myLayerMapping0: MappingAtem = {
			device: DeviceType.ATEM,
			deviceId: 'myAtem',
			mappingType: MappingAtemType.MixEffect,
			index: 0
		}
		let myLayerMapping: Mappings = {
			'myLayer0': myLayerMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})
		await myConductor.init()
		await myConductor.addDevice('myAtem', {
			type: DeviceType.ATEM,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				port: 9910
			}
		})
		await myConductor.setMapping(myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		let deviceContainer = myConductor.getDevice('myAtem')
		let device = deviceContainer.device as ThreadedClass<AtemDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.timeline = [
			{
				id: 'obj0',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: mockTime.now - 1000 // 1 seconds ago
				},
				duration: 2000,
				LLayer: 'myLayer0',
				content: {
					type: TimelineContentTypeAtem.ME,
					attributes: {
						input: 2,
						transition: Enums.TransitionStyle.CUT
					}
				}
			},
			{
				id: 'obj1',
				trigger: {
					type: TriggerType.TIME_RELATIVE,
					value: '#obj0.end'
				},
				duration: 2000,
				LLayer: 'myLayer0',
				content: {
					type: TimelineContentTypeAtem.ME,
					attributes: {
						input: 3,
						transition: Enums.TransitionStyle.CUT
					}
				}
			}
		]

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(10200)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toBeCalledWith(expect.anything(), expect.objectContaining(
			{
				flag: 0,
				rawName: 'PrvI',
				mixEffect: 0,
				properties: {
					source: 2
				}
			}
		), null)
		expect(commandReceiver0).toBeCalledWith(expect.anything(), expect.objectContaining(
			{
				flag: 0,
				rawName: 'DCut',
				mixEffect: 0
			}
		), null)

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(12200)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toBeCalledWith(expect.anything(), expect.objectContaining(
			{
				flag: 0,
				rawName: 'PrvI',
				mixEffect: 0,
				properties: {
					source: 3
				}
			}
		), null)
		expect(commandReceiver0).toBeCalledWith(expect.anything(), expect.objectContaining(
			{
				flag: 0,
				rawName: 'DCut',
				mixEffect: 0
			}
		), null)
	})

	test('Atem: upstream keyer', async () => {

		let commandReceiver0 = jest.fn(() => {
			// nothing
		})
		let myLayerMapping0: MappingAtem = {
			device: DeviceType.ATEM,
			deviceId: 'myAtem',
			mappingType: MappingAtemType.MixEffect,
			index: 0
		}
		let myLayerMapping: Mappings = {
			'myLayer0': myLayerMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})
		await myConductor.init()
		await myConductor.addDevice('myAtem', {
			type: DeviceType.ATEM,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				port: 9910
			}
		})
		await myConductor.setMapping(myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		let deviceContainer = myConductor.getDevice('myAtem')
		let device = deviceContainer.device as ThreadedClass<AtemDevice>
		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)
		myConductor.timeline = [
			{
				id: 'obj0',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: mockTime.now - 1000 // 1 seconds ago
				},
				duration: 2000,
				LLayer: 'myLayer0',
				content: {
					// @ts-ignore dveSettings missing
					attributes: {
						upstreamKeyers: [
							{
								patternSettings: {
									style: 5,
									positionX: 250
								}
							}
						]
					} as Partial<MixEffect>,
					type: 'me'
				}
			}
		]

		await mockTime.advanceTimeToTicks(10200)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toBeCalledWith(expect.anything(), expect.objectContaining(
			{
				flag: 53,
				rawName: 'KePt',
				mixEffect: 0,
				upstreamKeyerId: 0,
				properties: {
					positionX: 250,
					positionY: 500,
					style: 5,
					symmetry: 5000
				}
			}
		), null)
	})

	test('Atem: handle same state', async () => {

		const commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping: Mappings = {
			'myLayer0': literal<MappingAtem>({
				device: DeviceType.ATEM,
				deviceId: 'myAtem',
				mappingType: MappingAtemType.MixEffect,
				index: 0
			})
		}

		const resolvedObj: TimelineResolvedObject = {
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: mockTime.now - 1000 // 1 seconds ago
			},
			duration: 0,
			LLayer: 'myLayer0',
			content: {
				type: TimelineContentTypeAtem.ME,
				attributes: {
					input: 4,
					transition: Enums.TransitionStyle.CUT
				}
			},
			resolved: {
				startTime: 1,
				endTime: mockTime.now + 99999,
				type: TimelineContentTypeAtem.ME,
				attributes: {
					input: 4,
					transition: Enums.TransitionStyle.CUT
				}
			}
		}
		const mockState: TimelineState = {
			time: mockTime.now + 50,
			GLayers: {
				'myLayer0': resolvedObj
			},
			LLayers: {
				'myLayer0': resolvedObj
			}
		}

		let device = new AtemDevice('mock', literal<AtemDeviceOptions>({
			type: DeviceType.ATEM,
			options: {
				commandReceiver: commandReceiver0
			}
		}), {
			getCurrentTime: mockTime.getCurrentTime
		})
		device.setMapping(myLayerMapping)
		// device.on('info', console.log)

		await device.init(literal<AtemOptions>({
			host: '127.0.0.1'
		}))

		// Check that no commands has been scheduled
		expect(device.queue).toHaveLength(0)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		// Expect that a command has been scheduled
		device.handleState(mockState)
		expect(device.queue).toHaveLength(2)

		// Handle the same state, before the commands have been sent
		mockTime.advanceTimeTo(mockTime.now + 30)
		device.handleState(mockState)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		expect(device.queue).toHaveLength(2)

		// Send the commands
		mockTime.advanceTimeTo(mockTime.now + 30)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)

		// Handle the same state, after the commands have been sent
		device.handleState(mockState)
		expect(device.queue).toHaveLength(0)
	})
})
