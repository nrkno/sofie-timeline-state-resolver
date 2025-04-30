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
	StatusCode,
} from 'timeline-state-resolver-types'
import { literal } from '../../../lib'
import { makeTimelineObjectResolved } from '../../../__mocks__/objects'
import { compareAtemCommands, createDevice, extractAllCommands, waitForConnection } from './util'
import { getDeviceContext } from '../../__tests__/testlib'

describe('Atem', () => {
	const mockTime = new MockTime()

	function getAtemConnection(device: AtemDevice): AtemConnection.BasicAtem {
		const atem = (device as any)._atem
		if (!atem) throw new Error('Property is missing, has `_atem` been renamed?')
		return atem
	}

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

		const device = await createDevice()

		return { device, myLayerMapping }
	}

	beforeEach(() => {
		mockTime.init()
	})

	test('Check Status', async () => {
		const device = new AtemDevice(getDeviceContext())
		const atem = getAtemConnection(device)

		expect(device.getStatus()).toEqual({
			messages: ['Atem disconnected'],
			statusCode: StatusCode.BAD,
		})

		await device.init(
			literal<AtemOptions>({
				host: '127.0.0.1',
			})
		)
		expect(device.getStatus()).toEqual({
			messages: ['Atem disconnected'],
			statusCode: StatusCode.BAD,
		})

		// Check OK once connected
		await waitForConnection(device)
		expect(device.getStatus()).toEqual({
			messages: [],
			statusCode: StatusCode.GOOD,
		})

		// Report two psus as connected
		const testState = AtemConnection.AtemStateUtil.Create()
		testState.info.power = [true, true]
		atem.emit('stateChanged', testState, ['info.power'])
		expect(device.getStatus()).toEqual({
			messages: [],
			statusCode: StatusCode.GOOD,
		})

		// Report one psus as offline
		testState.info.power = [true, false]
		atem.emit('stateChanged', testState, ['info.power'])
		expect(device.getStatus()).toEqual({
			messages: ['Atem PSU 2 is faulty. The device has 2 PSU(s) in total.'],
			statusCode: StatusCode.WARNING_MAJOR,
		})

		// Report only one psu
		testState.info.power = [true]
		atem.emit('stateChanged', testState, ['info.power'])
		expect(device.getStatus()).toEqual({
			messages: [],
			statusCode: StatusCode.GOOD,
		})

		// Disconnect
		atem.emit('disconnected')
		expect(device.getStatus()).toEqual({
			messages: ['Atem disconnected'],
			statusCode: StatusCode.BAD,
		})
	})

	test('Full state diff flow: Ensure clean initial state', async () => {
		const mockState: Timeline.TimelineState<TSRTimelineContent> = {
			time: mockTime.now + 50,
			layers: {},
			nextEvents: [],
		}

		const device = await createDevice()

		const { deviceState } = device.convertTimelineStateToDeviceState(mockState, {})

		const commands = device.diffStates(undefined, deviceState, {})

		expect(commands).toHaveLength(0)
	})

	test('Full state diff flow: Switch input', async () => {
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
		const { deviceState: deviceState1 } = device.convertTimelineStateToDeviceState(mockState1, myLayerMapping)
		expect(deviceState1.video.mixEffects[0]).toMatchObject({
			input: 2,
			transition: AtemTransitionStyle.CUT,
		})

		{
			const commands = device.diffStates(undefined, deviceState1, myLayerMapping)

			const allCommands = extractAllCommands(commands)
			expect(allCommands).toHaveLength(2)
			compareAtemCommands(allCommands[0], new AtemConnection.Commands.PreviewInputCommand(0, 2))
			compareAtemCommands(allCommands[1], new AtemConnection.Commands.CutCommand(0))
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
		const { deviceState: deviceState2 } = device.convertTimelineStateToDeviceState(mockState2, myLayerMapping)
		expect(deviceState2.video.mixEffects[0]).toMatchObject({
			input: 3,
			transition: AtemTransitionStyle.CUT,
		})

		{
			const commands = device.diffStates(deviceState1, deviceState2, myLayerMapping)

			const allCommands = extractAllCommands(commands)
			expect(allCommands).toHaveLength(2)
			compareAtemCommands(allCommands[0], new AtemConnection.Commands.PreviewInputCommand(0, 3))
			compareAtemCommands(allCommands[1], new AtemConnection.Commands.CutCommand(0))
		}
	})

	test('Full state diff flow: same state', async () => {
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

		const { deviceState } = device.convertTimelineStateToDeviceState(mockState, myLayerMapping)
		expect(deviceState.video.mixEffects[0]).toMatchObject({
			input: 4,
			transition: AtemTransitionStyle.CUT,
		})

		// Expect that a command has been scheduled
		const commands = device.diffStates(undefined, deviceState, myLayerMapping)
		const allCommands = extractAllCommands(commands)
		expect(allCommands).toHaveLength(2)

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

		const { deviceState: deviceState1 } = device.convertTimelineStateToDeviceState(mockState1, myLayerMapping)
		expect(deviceState1.video.mixEffects[0]).toMatchObject({
			input: 2,
			transition: AtemTransitionStyle.CUT,
		})

		{
			const commands = device.diffStates(undefined, deviceState1, myLayerMapping)

			const allCommands = extractAllCommands(commands)
			expect(allCommands).toHaveLength(2)
			compareAtemCommands(allCommands[0], new AtemConnection.Commands.PreviewInputCommand(0, 2))
			compareAtemCommands(allCommands[1], new AtemConnection.Commands.CutCommand(0))
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
		const { deviceState: deviceState2 } = device.convertTimelineStateToDeviceState(mockState2, myLayerMapping)
		expect(deviceState2.video.mixEffects[0]).toMatchObject({
			input: 3,
			transition: AtemTransitionStyle.DIP,
		})

		{
			const commands = device.diffStates(deviceState1, deviceState2, myLayerMapping)

			const allCommands = extractAllCommands(commands)
			expect(allCommands).toHaveLength(5)
			const transitionPropertiesCommand = new AtemConnection.Commands.TransitionPropertiesCommand(0)
			transitionPropertiesCommand.updateProps({ nextStyle: 1 })

			compareAtemCommands(allCommands[0], transitionPropertiesCommand)
			compareAtemCommands(allCommands[1], new AtemConnection.Commands.PreviewInputCommand(0, 3))
			compareAtemCommands(allCommands[2], transitionPropertiesCommand) // TODO - why is this sent twice?
			compareAtemCommands(allCommands[3], new AtemConnection.Commands.TransitionPositionCommand(0, 0))
			compareAtemCommands(allCommands[4], new AtemConnection.Commands.AutoTransitionCommand(0))
		}
	})
})
