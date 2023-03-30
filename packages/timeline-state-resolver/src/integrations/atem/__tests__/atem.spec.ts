import { Enums } from 'atem-state'
import * as AtemConnection from 'atem-connection'
import { ResolvedTimelineObjectInstance, TimelineState } from 'superfly-timeline'
import { Conductor } from '../../../conductor'
import { AtemDevice, DeviceOptionsAtemInternal } from '..'
import { MockTime } from '../../../__tests__/mockTime'
import {
	Mappings,
	DeviceType,
	MappingAtem,
	MappingAtemType,
	TimelineContentTypeAtem,
	AtemOptions,
	AtemTransitionStyle,
} from 'timeline-state-resolver-types'
import { ThreadedClass } from 'threadedclass'
import { AtemStateUtil } from 'atem-connection'
import { TransitionStyle } from 'atem-connection/dist/enums'
import { literal } from '../../../devices/device'
import { getMockCall } from '../../../__tests__/lib'

describe('Atem', () => {
	const mockTime = new MockTime()

	async function createTestee(mockTime: MockTime): Promise<{
		myConductor: Conductor
		myLayerMapping: Mappings
		commandReceiver0: jest.Mock
	}> {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingAtem = {
			device: DeviceType.ATEM,
			deviceId: 'myAtem',
			mappingType: MappingAtemType.MixEffect,
			index: 0,
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await myConductor.addDevice(
			'myAtem',
			literal<DeviceOptionsAtemInternal>({
				type: DeviceType.ATEM,
				options: {
					host: '127.0.0.1',
					port: 9910,
				},
				commandReceiver: commandReceiver0,
			})
		)
		return { myConductor, myLayerMapping, commandReceiver0 }
	}

	function compareAtemCommands(
		received: AtemConnection.Commands.ISerializableCommand,
		expected: AtemConnection.Commands.ISerializableCommand
	) {
		expect(received.constructor.name).toEqual(expected.constructor.name)
		expect(received.serialize(AtemConnection.Enums.ProtocolVersion.V8_0)).toEqual(
			expected.serialize(AtemConnection.Enums.ProtocolVersion.V8_0)
		)
	}

	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})

	test('Atem: Ensure clean initial state', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const mockState: TimelineState = {
			time: mockTime.now + 50,
			layers: {},
			nextEvents: [],
		}

		const device = new AtemDevice(
			'mock',
			literal<DeviceOptionsAtemInternal>({
				type: DeviceType.ATEM,
				options: {
					host: '127.0.0.1',
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime.getCurrentTime2
		)

		await device.init(
			literal<AtemOptions>({
				host: '127.0.0.1',
			})
		)

		device.handleState(mockState, {})

		device.queue.forEach((cmd) => {
			console.log(cmd)
		})
		expect(device.queue).toHaveLength(0)
	})

	test('Atem: switch input', async () => {
		const { myConductor, myLayerMapping, commandReceiver0 } = await createTestee(mockTime)

		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myAtem')
		const device = deviceContainer!.device as ThreadedClass<AtemDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.now - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.ME,
						me: {
							input: 2,
							transition: AtemTransitionStyle.CUT,
						},
					},
				},
				{
					id: 'obj1',
					enable: {
						start: '#obj0.end',
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.ME,
						me: {
							input: 3,
							transition: AtemTransitionStyle.CUT,
						},
					},
				},
			],
			myLayerMapping
		)

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(10200)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		compareAtemCommands(getMockCall(commandReceiver0, 0, 1), new AtemConnection.Commands.PreviewInputCommand(0, 2))
		compareAtemCommands(getMockCall(commandReceiver0, 1, 1), new AtemConnection.Commands.CutCommand(0))

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(12200)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		compareAtemCommands(getMockCall(commandReceiver0, 0, 1), new AtemConnection.Commands.PreviewInputCommand(0, 3))
		compareAtemCommands(getMockCall(commandReceiver0, 1, 1), new AtemConnection.Commands.CutCommand(0))
	})

	test('Atem: upstream keyer', async () => {
		const { myConductor, myLayerMapping, commandReceiver0 } = await createTestee(mockTime)

		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myAtem')
		const device = deviceContainer!.device as ThreadedClass<AtemDevice>
		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)
		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.now - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.ME,
						me: {
							upstreamKeyers: [
								{
									upstreamKeyerId: 0,

									lumaSettings: {
										preMultiplied: false,
										clip: 300,
										gain: 2,
										invert: true,
									},
								},
							],
						},
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10200)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		const cmd = new AtemConnection.Commands.MixEffectKeyLumaCommand(0, 0)
		cmd.updateProps({
			clip: 300,
			gain: 2,
			invert: true,
		})
		compareAtemCommands(getMockCall(commandReceiver0, 0, 1), cmd)
	})

	test('Atem: uses upstreamKeyerId to address upstream keyers', async () => {
		const { myConductor, myLayerMapping, commandReceiver0 } = await createTestee(mockTime)

		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myAtem')
		const device = deviceContainer!.device as ThreadedClass<AtemDevice>
		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)
		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.now - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.ME,
						me: {
							upstreamKeyers: [
								{
									upstreamKeyerId: 2,

									lumaSettings: {
										preMultiplied: false,
										clip: 300,
										gain: 2,
										invert: true,
									},
								},
							],
						},
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10200)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		const cmd = new AtemConnection.Commands.MixEffectKeyLumaCommand(0, 2)
		cmd.updateProps({
			clip: 300,
			gain: 2,
			invert: true,
		})
		compareAtemCommands(getMockCall(commandReceiver0, 0, 1), cmd)
	})

	test('Atem: handle same state', async () => {
		const commandReceiver0 = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping: Mappings = {
			myLayer0: literal<MappingAtem>({
				device: DeviceType.ATEM,
				deviceId: 'mock',
				mappingType: MappingAtemType.MixEffect,
				index: 0,
			}),
		}

		const resolvedObj: ResolvedTimelineObjectInstance = {
			id: 'obj0',
			enable: {
				start: mockTime.now - 1000, // 1 seconds ago
				duration: 0,
			},
			layer: 'myLayer0',
			content: {
				type: TimelineContentTypeAtem.ME,
				me: {
					input: 4,
					transition: Enums.TransitionStyle.CUT,
				},
			},
			resolved: {
				resolved: true,
				resolving: false,
				instances: [{ start: mockTime.now - 1000, end: Infinity, id: 'a0', references: [] }],
				directReferences: [],
			},
			instance: { start: mockTime.now - 1000, end: Infinity, id: 'a0', references: [] },
		}
		const mockState: TimelineState = {
			time: mockTime.now + 50,
			layers: {
				myLayer0: resolvedObj,
			},
			nextEvents: [],
		}

		const device = new AtemDevice(
			'mock',
			{
				type: DeviceType.ATEM,
				options: {
					host: '127.0.0.1',
				},
				commandReceiver: commandReceiver0,
			},
			mockTime.getCurrentTime2
		)

		await device.init(
			literal<AtemOptions>({
				host: '127.0.0.1',
			})
		)

		// Check that no commands has been scheduled
		expect(device.queue).toHaveLength(0)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		// Expect that a command has been scheduled
		device.handleState(mockState, myLayerMapping)
		expect(device.queue).toHaveLength(2)

		// Handle the same state, before the commands have been sent
		mockTime.advanceTimeTo(mockTime.now + 30)
		device.handleState(mockState, myLayerMapping)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		expect(device.queue).toHaveLength(2)

		// Send the commands
		mockTime.advanceTimeTo(mockTime.now + 30)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)

		// Handle the same state, after the commands have been sent
		device.handleState(mockState, myLayerMapping)
		expect(device.queue).toHaveLength(0)
	})

	test('Atem: sends TransitionPropertiesCommand for DIP', async () => {
		const { myConductor, myLayerMapping, commandReceiver0 } = await createTestee(mockTime)

		const deviceContainer = myConductor.getDevice('myAtem')
		const device = deviceContainer!.device as ThreadedClass<AtemDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.now - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.ME,
						me: {
							input: 2,
							transition: AtemTransitionStyle.CUT,
						},
					},
				},
				{
					id: 'obj1',
					enable: {
						start: '#obj0.end',
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.ME,
						me: {
							input: 3,
							transition: AtemTransitionStyle.DIP,
						},
					},
				},
			],
			myLayerMapping
		)

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(10200)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		compareAtemCommands(getMockCall(commandReceiver0, 0, 1), new AtemConnection.Commands.PreviewInputCommand(0, 2))
		compareAtemCommands(getMockCall(commandReceiver0, 1, 1), new AtemConnection.Commands.CutCommand(0))

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(12200)

		expect(commandReceiver0).toHaveBeenCalledTimes(5)
		const transitionPropertiesCommand = new AtemConnection.Commands.TransitionPropertiesCommand(0)
		transitionPropertiesCommand.updateProps({ nextStyle: 1 })
		compareAtemCommands(getMockCall(commandReceiver0, 0, 1), transitionPropertiesCommand)
		compareAtemCommands(getMockCall(commandReceiver0, 1, 1), new AtemConnection.Commands.PreviewInputCommand(0, 3))
		compareAtemCommands(getMockCall(commandReceiver0, 2, 1), transitionPropertiesCommand)
		compareAtemCommands(
			getMockCall(commandReceiver0, 3, 1),
			new AtemConnection.Commands.TransitionPositionCommand(0, 0)
		)
		compareAtemCommands(getMockCall(commandReceiver0, 4, 1), new AtemConnection.Commands.AutoTransitionCommand(0))
	})

	test('Atem: does not reset transition properties when initial nextStyle is not 0', async () => {
		const { myConductor, myLayerMapping, commandReceiver0 } = await createTestee(mockTime)

		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myAtem')
		const device = deviceContainer!.device as ThreadedClass<AtemDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		const oldState = AtemStateUtil.Create()
		const mixEffect = AtemStateUtil.getMixEffect(oldState, 0)
		mixEffect.transitionProperties.nextStyle = TransitionStyle.DIP
		mixEffect.programInput = 2

		// @ts-ignore
		device.setState(oldState, mockTime.now)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.now,
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.ME,
						me: {
							input: 2,
							transition: AtemTransitionStyle.DIP,
						},
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10200)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.now,
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.ME,
						me: {
							input: 4,
							transition: AtemTransitionStyle.DIP,
						},
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(11200)

		const transitionPropertiesCommand = commandReceiver0.mock.calls.find(
			(call) => call[1] instanceof AtemConnection.Commands.TransitionPropertiesCommand
		)
		expect(transitionPropertiesCommand).toBeUndefined()

		const autoTransitionCommand = commandReceiver0.mock.calls.find(
			(call) => call[1] instanceof AtemConnection.Commands.AutoTransitionCommand
		)
		expect(autoTransitionCommand).toBeDefined()
	})
})
