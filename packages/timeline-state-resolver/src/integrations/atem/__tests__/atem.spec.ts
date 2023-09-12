import * as AtemConnection from 'atem-connection'
import { AtemDevice } from '..'
import { MockTime } from '../../../__tests__/mockTime'
import {
	Mappings,
	DeviceType,
	Mapping,
	SomeMappingAtem,
	MappingAtemType,
	TimelineContentTypeAtem,
	AtemOptions,
	AtemTransitionStyle,
	TSRTimelineContent,
	Timeline,
	TimelineContentAtemME,
} from 'timeline-state-resolver-types'
import { literal } from '../../../devices/device'
import { makeTimelineObjectResolved } from '../../../__mocks__/objects'

describe('Atem', () => {
	const mockTime = new MockTime()

	async function createTestee(): Promise<{
		device: AtemDevice
		myLayerMapping: Mappings
	}> {
		const myLayerMapping0: Mapping<SomeMappingAtem> = {
			device: DeviceType.ATEM,
			deviceId: 'myAtem',
			options: {
				mappingType: MappingAtemType.MixEffect,
				index: 0,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const device = new AtemDevice()
		await device.init(
			literal<AtemOptions>({
				host: '127.0.0.1',
			})
		)

		// HACK: force to appear connected
		;(device as any)._connected = true

		return { device, myLayerMapping }
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

	beforeEach(() => {
		mockTime.init()
	})

	test('Atem: Ensure clean initial state', async () => {
		const mockState: Timeline.TimelineState<TSRTimelineContent> = {
			time: mockTime.now + 50,
			layers: {},
			nextEvents: [],
		}

		const device = new AtemDevice()
		await device.init(
			literal<AtemOptions>({
				host: '127.0.0.1',
			})
		)

		const deviceState = device.convertTimelineStateToDeviceState(mockState, {})

		const commands = device.diffStates(undefined, deviceState, {})

		expect(commands).toHaveLength(0)
	})

	test('Atem: switch input', async () => {
		const { device, myLayerMapping } = await createTestee()

		const mockState1: Timeline.TimelineState<TSRTimelineContent> = {
			time: mockTime.now,
			layers: {
				myLayer0: makeTimelineObjectResolved({
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
				}),
			},
			nextEvents: [],
		}
		const deviceState1 = device.convertTimelineStateToDeviceState(mockState1, myLayerMapping)
		expect(deviceState1.video.mixEffects[0]).toMatchObject({
			input: 2,
			transition: AtemTransitionStyle.CUT,
		})

		{
			const commands = device.diffStates(undefined, deviceState1, myLayerMapping)

			expect(commands).toHaveLength(2)
			compareAtemCommands(commands[0].command, new AtemConnection.Commands.PreviewInputCommand(0, 2))
			compareAtemCommands(commands[1].command, new AtemConnection.Commands.CutCommand(0))
		}

		const mockState2: Timeline.TimelineState<TSRTimelineContent> = {
			time: mockTime.now + 2000,
			layers: {
				myLayer0: makeTimelineObjectResolved({
					id: 'obj1',
					enable: {
						start: mockTime.now + 1000, // 1 seconds ago
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
				}),
			},
			nextEvents: [],
		}
		const deviceState2 = device.convertTimelineStateToDeviceState(mockState2, myLayerMapping)
		expect(deviceState2.video.mixEffects[0]).toMatchObject({
			input: 3,
			transition: AtemTransitionStyle.CUT,
		})

		{
			const commands = device.diffStates(deviceState1, deviceState2, myLayerMapping)

			expect(commands).toHaveLength(2)
			compareAtemCommands(commands[0].command, new AtemConnection.Commands.PreviewInputCommand(0, 3))
			compareAtemCommands(commands[1].command, new AtemConnection.Commands.CutCommand(0))
		}
	})

	test('Atem: upstream keyer', async () => {
		const { device, myLayerMapping } = await createTestee()

		const mockState1: Timeline.TimelineState<TSRTimelineContent> = {
			time: mockTime.now,
			layers: {
				myLayer0: makeTimelineObjectResolved({
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
				}),
			},
			nextEvents: [],
		}
		const deviceState1 = device.convertTimelineStateToDeviceState(mockState1, myLayerMapping)
		expect(deviceState1.video.mixEffects[0]?.upstreamKeyers?.[0]).toMatchObject({
			upstreamKeyerId: 0,

			lumaSettings: {
				preMultiplied: false,
				clip: 300,
				gain: 2,
				invert: true,
			},
		})

		{
			const commands = device.diffStates(undefined, deviceState1, myLayerMapping)

			expect(commands).toHaveLength(1)

			const cmd = new AtemConnection.Commands.MixEffectKeyLumaCommand(0, 0)
			cmd.updateProps({
				clip: 300,
				gain: 2,
				invert: true,
			})
			compareAtemCommands(commands[0].command, cmd)
		}
	})

	test('Atem: uses upstreamKeyerId to address upstream keyers', async () => {
		const { device, myLayerMapping } = await createTestee()

		const mockState1: Timeline.TimelineState<TSRTimelineContent> = {
			time: mockTime.now,
			layers: {
				myLayer0: makeTimelineObjectResolved({
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
				}),
			},
			nextEvents: [],
		}
		const deviceState1 = device.convertTimelineStateToDeviceState(mockState1, myLayerMapping)
		expect(deviceState1.video.mixEffects[0]?.upstreamKeyers).toMatchObject([
			undefined,
			undefined,
			{
				upstreamKeyerId: 2,

				lumaSettings: {
					preMultiplied: false,
					clip: 300,
					gain: 2,
					invert: true,
				},
			},
		])
	})

	test('Atem: handle same state', async () => {
		const { device, myLayerMapping } = await createTestee()

		const mockState: Timeline.TimelineState<TSRTimelineContent> = {
			time: mockTime.now + 50,
			layers: {
				myLayer0: makeTimelineObjectResolved<TimelineContentAtemME>({
					id: 'obj0',
					enable: {
						start: mockTime.now - 1000, // 1 seconds ago
						duration: 0,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.ME,
						me: {
							input: 4,
							transition: AtemTransitionStyle.CUT,
						},
					},
				}),
			},
			nextEvents: [],
		}

		const deviceState = device.convertTimelineStateToDeviceState(mockState, myLayerMapping)
		expect(deviceState.video.mixEffects[0]).toMatchObject({
			input: 4,
			transition: AtemTransitionStyle.CUT,
		})

		// Expect that a command has been scheduled
		const commands = device.diffStates(undefined, deviceState, myLayerMapping)
		expect(commands).toHaveLength(2)

		// Diff the same state, after the commands have been sent
		const commands2 = device.diffStates(deviceState, deviceState, myLayerMapping)
		expect(commands2).toHaveLength(0)
	})

	test('Atem: sends TransitionPropertiesCommand for DIP', async () => {
		const { device, myLayerMapping } = await createTestee()

		const mockState1: Timeline.TimelineState<TSRTimelineContent> = {
			time: mockTime.now,
			layers: {
				myLayer0: makeTimelineObjectResolved<TimelineContentAtemME>({
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
				}),
			},
			nextEvents: [],
		}

		const deviceState1 = device.convertTimelineStateToDeviceState(mockState1, myLayerMapping)
		expect(deviceState1.video.mixEffects[0]).toMatchObject({
			input: 2,
			transition: AtemTransitionStyle.CUT,
		})

		{
			const commands = device.diffStates(undefined, deviceState1, myLayerMapping)

			expect(commands).toHaveLength(2)
			compareAtemCommands(commands[0].command, new AtemConnection.Commands.PreviewInputCommand(0, 2))
			compareAtemCommands(commands[1].command, new AtemConnection.Commands.CutCommand(0))
		}

		const mockState2: Timeline.TimelineState<TSRTimelineContent> = {
			time: mockTime.now,
			layers: {
				myLayer0: makeTimelineObjectResolved<TimelineContentAtemME>({
					id: 'obj1',
					enable: {
						start: mockTime.now + 1000, // 1 seconds ago
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
				}),
			},
			nextEvents: [],
		}
		const deviceState2 = device.convertTimelineStateToDeviceState(mockState2, myLayerMapping)
		expect(deviceState2.video.mixEffects[0]).toMatchObject({
			input: 3,
			transition: AtemTransitionStyle.DIP,
		})

		{
			const commands = device.diffStates(deviceState1, deviceState2, myLayerMapping)

			expect(commands).toHaveLength(5)
			const transitionPropertiesCommand = new AtemConnection.Commands.TransitionPropertiesCommand(0)
			transitionPropertiesCommand.updateProps({ nextStyle: 1 })

			compareAtemCommands(commands[0].command, transitionPropertiesCommand)
			compareAtemCommands(commands[1].command, new AtemConnection.Commands.PreviewInputCommand(0, 3))
			compareAtemCommands(commands[2].command, transitionPropertiesCommand) // TODO - why is this sent twice?
			compareAtemCommands(commands[3].command, new AtemConnection.Commands.TransitionPositionCommand(0, 0))
			compareAtemCommands(commands[4].command, new AtemConnection.Commands.AutoTransitionCommand(0))
		}
	})

	test('Atem: does not reset transition properties when initial nextStyle is not 0', async () => {
		const { device, myLayerMapping } = await createTestee()

		const mockState1: Timeline.TimelineState<TSRTimelineContent> = {
			time: mockTime.now,
			layers: {
				myLayer0: makeTimelineObjectResolved<TimelineContentAtemME>({
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
							transition: AtemTransitionStyle.DIP,
						},
					},
				}),
			},
			nextEvents: [],
		}

		const deviceState1 = device.convertTimelineStateToDeviceState(mockState1, myLayerMapping)
		expect(deviceState1.video.mixEffects[0]).toMatchObject({
			input: 2,
			transition: AtemTransitionStyle.DIP,
		})

		{
			const commands = device.diffStates(undefined, deviceState1, myLayerMapping)
			expect(commands).toHaveLength(5)
		}

		const mockState2: Timeline.TimelineState<TSRTimelineContent> = {
			time: mockTime.now,
			layers: {
				myLayer0: makeTimelineObjectResolved<TimelineContentAtemME>({
					id: 'obj1',
					enable: {
						start: mockTime.now + 1000, // 1 seconds ago
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
				}),
			},
			nextEvents: [],
		}
		const deviceState2 = device.convertTimelineStateToDeviceState(mockState2, myLayerMapping)
		expect(deviceState2.video.mixEffects[0]).toMatchObject({
			input: 4,
			transition: AtemTransitionStyle.DIP,
		})

		{
			const commands = device.diffStates(deviceState1, deviceState2, myLayerMapping)

			expect(commands).toHaveLength(3)
			const transitionPropertiesCommand = new AtemConnection.Commands.TransitionPropertiesCommand(0)
			transitionPropertiesCommand.updateProps({ nextStyle: 1 })

			compareAtemCommands(commands[0].command, new AtemConnection.Commands.PreviewInputCommand(0, 4))
			compareAtemCommands(commands[1].command, new AtemConnection.Commands.TransitionPositionCommand(0, 0))
			compareAtemCommands(commands[2].command, new AtemConnection.Commands.AutoTransitionCommand(0))
		}
	})
})
