/* eslint-disable jest/expect-expect */
import {
	DeviceType,
	MappingQuantelType,
	Mappings,
	QuantelControlMode,
	SomeMappingQuantel,
	Timeline,
	TimelineContentQuantelAny,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { QuantelCommandWithContext, QuantelDevice } from '..'
import { QuantelCommandType, QuantelState } from '../types'
import { setupQuantelGatewayMock } from './quantelGatewayMock'
import { MockTime } from '../../../__tests__/mockTime'

async function getInitialisedQuantelDevice(clearMock?: jest.Mock) {
	const dev = new QuantelDevice()
	await dev.init({
		gatewayUrl: 'localhost:3000',
		ISAUrlMaster: 'myISA:8000',
		zoneId: undefined, // fallback to 'default'
		serverId: 1100,
	})
	if (clearMock) {
		clearMock.mockClear()
	}
	return dev
}

describe('Quantel Device', () => {
	const { onRequest } = setupQuantelGatewayMock()

	beforeEach(() => {
		onRequest.mockClear()
	})

	describe('convertTimelineStateToDeviceState', () => {
		async function compareState(
			tlState: Timeline.TimelineState<TSRTimelineContent>,
			mappings: Mappings<SomeMappingQuantel>,
			expDevState: QuantelState
		) {
			const device = await getInitialisedQuantelDevice()

			const actualState = device.convertTimelineStateToDeviceState(tlState, mappings)

			expect(actualState).toEqual(expDevState)
		}

		test('convert empty state', async () => {
			await compareState(createTimelineState({}), {}, { time: 10, port: {} })
		})

		test('convert 1 layer', async () => {
			await compareState(
				createTimelineState({
					layer0: {
						id: 'obj0',
						content: {
							deviceType: DeviceType.QUANTEL,

							title: 'myClip0',
						},
						instance: {
							originalStart: 10,
						},
					},
				}),
				{
					layer0: {
						device: DeviceType.QUANTEL,
						deviceId: 'myQuantel',

						options: {
							mappingType: MappingQuantelType.Port,
							portId: 'my_port',
							channelId: 2,
						},
					},
				},
				{
					time: 10,
					port: {
						my_port: {
							timelineObjId: 'obj0',
							mode: QuantelControlMode.QUALITY,
							notOnAir: false,
							lookahead: false,
							clip: {
								title: 'myClip0',
								playTime: 10,
								playing: true,
							},
							channels: [2],
						},
					},
				}
			)
		})

		test('convert 2 layers for 1 port', async () => {
			await compareState(
				createTimelineState({
					layer0: {
						id: 'obj0',
						content: {
							deviceType: DeviceType.QUANTEL,

							title: 'myClip0',
						},
						instance: {
							originalStart: 10,
						},
					},
					layer1: {
						id: 'obj1',
						content: {
							deviceType: DeviceType.QUANTEL,

							title: 'myClip1',
						},
						instance: {
							originalStart: 10,
						},
					},
				}),
				{
					layer0: {
						device: DeviceType.QUANTEL,
						deviceId: 'myQuantel',

						options: {
							mappingType: MappingQuantelType.Port,
							portId: 'my_port',
							channelId: 2,
						},
					},
					layer1: {
						device: DeviceType.QUANTEL,
						deviceId: 'myQuantel',

						options: {
							mappingType: MappingQuantelType.Port,
							portId: 'my_port',
							channelId: 3,
						},
					},
				},
				{
					time: 10,
					port: {
						my_port: {
							timelineObjId: 'obj1',
							mode: QuantelControlMode.QUALITY,
							notOnAir: false,
							lookahead: false,
							clip: {
								title: 'myClip1',
								playTime: 10,
								playing: true,
							},
							channels: [2, 3],
						},
					},
				}
			)
		})
		test('convert empty layer + 1 lookahaed', async () => {
			await compareState(
				createTimelineState({
					layer0_lookahead: {
						id: 'obj1',
						content: {
							deviceType: DeviceType.QUANTEL,

							title: 'myClip1',
						},
						instance: {
							originalStart: 10,
						},
						isLookahead: true,
						lookaheadForLayer: 'layer0',
					},
				}),
				{
					layer0: {
						device: DeviceType.QUANTEL,
						deviceId: 'myQuantel',

						options: {
							mappingType: MappingQuantelType.Port,
							portId: 'my_port',
							channelId: 2,
						},
					},
				},
				{
					time: 10,
					port: {
						my_port: {
							timelineObjId: 'obj1',
							mode: QuantelControlMode.QUALITY,
							notOnAir: true,
							lookahead: true,
							lookaheadClip: {
								timelineObjId: 'obj1',
								title: 'myClip1',
							},
							clip: {
								title: 'myClip1',
								playing: false,
								playTime: null,
							},
							channels: [2],
						},
					},
				}
			)
		})
		test('convert 1 layer + 1 lookahaed', async () => {
			await compareState(
				createTimelineState({
					layer0: {
						id: 'obj0',
						content: {
							deviceType: DeviceType.QUANTEL,

							title: 'myClip0',
						},
						instance: {
							originalStart: 10,
						},
					},
					layer0_lookahead: {
						id: 'obj1',
						content: {
							deviceType: DeviceType.QUANTEL,

							title: 'myClip1',
						},
						instance: {
							originalStart: 10,
						},
						isLookahead: true,
						lookaheadForLayer: 'layer0',
					},
				}),
				{
					layer0: {
						device: DeviceType.QUANTEL,
						deviceId: 'myQuantel',

						options: {
							mappingType: MappingQuantelType.Port,
							portId: 'my_port',
							channelId: 2,
						},
					},
				},
				{
					time: 10,
					port: {
						my_port: {
							timelineObjId: 'obj0',
							mode: QuantelControlMode.QUALITY,
							notOnAir: false,
							lookahead: false,
							lookaheadClip: {
								timelineObjId: 'obj1',
								title: 'myClip1',
							},
							clip: {
								title: 'myClip0',
								playTime: 10,
								playing: true,
							},
							channels: [2],
						},
					},
				}
			)
		})
	})

	describe('diffState', () => {
		async function compareStates(
			oldDevState: QuantelState,
			newDevState: QuantelState,
			expCommands: QuantelCommandWithContext[]
		) {
			const device = await getInitialisedQuantelDevice()

			const commands = device.diffStates(oldDevState, newDevState)

			expect(commands).toEqual(expCommands)
		}

		test('Empty states', async () => {
			await compareStates({ time: 10, port: {} }, { time: 10, port: {} }, [])
		})

		test('Set up port', async () => {
			jest
			await compareStates(
				{ time: 1000, port: {} },
				{
					time: 3000,
					port: {
						port0: {
							timelineObjId: 'obj0',
							mode: QuantelControlMode.QUALITY,
							notOnAir: false,
							lookahead: false,
							channels: [2],
						},
					},
				},
				[
					{
						command: {
							type: QuantelCommandType.SETUPPORT,
							time: 2990,
							portId: 'port0',
							timelineObjId: 'obj0',
							channel: 2,
						},
						context: 'Old state did not have port',
						tlObjId: 'obj0',
					},
					{
						command: {
							type: QuantelCommandType.CLEARCLIP,
							time: 3000,
							portId: 'port0',
							timelineObjId: 'obj0',
							fromLookahead: false,
							transition: undefined,
						},
						context: 'New clip is empty',
						tlObjId: 'obj0',
					},
				]
			)
		})

		test('Load', async () => {
			await compareStates(
				{
					time: 1000,
					port: {
						port0: {
							timelineObjId: 'obj0',
							mode: QuantelControlMode.QUALITY,
							notOnAir: false,
							lookahead: false,
							channels: [2],
						},
					},
				},
				{
					time: 3000,
					port: {
						port0: {
							timelineObjId: 'obj1',
							mode: QuantelControlMode.QUALITY,
							notOnAir: false,
							lookahead: false,
							clip: {
								title: 'test0',
								playing: false,
								playTime: null,
							},
							channels: [2],
						},
					},
				},
				[
					{
						command: {
							type: QuantelCommandType.LOADCLIPFRAGMENTS,
							time: 2990,
							portId: 'port0',
							timelineObjId: 'obj1',
							fromLookahead: false,
							clip: {
								title: 'test0',
								playing: false,
								playTime: null,
							},
							timeOfPlay: 3000,
							allowedToPrepareJump: true,
						},
						context: 'Load from current state',
						tlObjId: 'obj1',
					},
					{
						command: {
							type: QuantelCommandType.PAUSECLIP,
							time: 3000,
							portId: 'port0',
							timelineObjId: 'obj1',
							fromLookahead: false,
							clip: {
								title: 'test0',
								playing: false,
								playTime: null,
							},
							mode: QuantelControlMode.QUALITY,
							transition: undefined,
						},
						context: 'New clip is paused',
						tlObjId: 'obj1',
					},
				]
			)
		})

		test('Load & play', async () => {
			await compareStates(
				{
					time: 2000,
					port: {
						port0: {
							timelineObjId: 'obj0',
							mode: QuantelControlMode.QUALITY,
							notOnAir: false,
							lookahead: false,
							clip: {
								title: 'test0',
								playing: false,
								playTime: null,
							},
							channels: [2],
						},
					},
				},
				{
					time: 3000,
					port: {
						port0: {
							timelineObjId: 'obj1',
							mode: QuantelControlMode.QUALITY,
							notOnAir: false,
							lookahead: false,
							clip: {
								title: 'test0',
								playing: true,
								playTime: 3000,
							},
							channels: [2],
						},
					},
				},
				[
					{
						command: {
							type: QuantelCommandType.LOADCLIPFRAGMENTS,
							time: 2990,
							portId: 'port0',
							timelineObjId: 'obj1',
							fromLookahead: false,
							clip: {
								title: 'test0',
								playing: true,
								playTime: 3000,
							},
							timeOfPlay: 3000,
							allowedToPrepareJump: true,
						},
						context: 'Load from current state',
						tlObjId: 'obj1',
					},
					{
						command: {
							type: QuantelCommandType.PLAYCLIP,
							time: 3000,
							portId: 'port0',
							timelineObjId: 'obj1',
							fromLookahead: false,
							clip: {
								title: 'test0',
								playing: true,
								playTime: 3000,
							},
							mode: QuantelControlMode.QUALITY,
							transition: undefined,
						},
						context: 'New clip is playing',
						tlObjId: 'obj1',
					},
				]
			)
		})

		test('Play after play', async () => {
			await compareStates(
				{
					time: 2000,
					port: {
						port0: {
							timelineObjId: 'obj0',
							mode: QuantelControlMode.QUALITY,
							notOnAir: false,
							lookahead: false,
							clip: {
								title: 'test0',
								playing: true,
								playTime: 2000,
							},
							channels: [2],
						},
					},
				},
				{
					time: 3000,
					port: {
						port0: {
							timelineObjId: 'obj1',
							mode: QuantelControlMode.QUALITY,
							notOnAir: false,
							lookahead: false,
							clip: {
								title: 'test1',
								playing: true,
								playTime: 3000,
							},
							channels: [2],
						},
					},
				},
				[
					{
						command: {
							type: QuantelCommandType.LOADCLIPFRAGMENTS,
							time: 2990,
							portId: 'port0',
							timelineObjId: 'obj1',
							fromLookahead: false,
							clip: {
								title: 'test1',
								playing: true,
								playTime: 3000,
							},
							timeOfPlay: 3000,
							allowedToPrepareJump: true,
						},
						context: 'Load from current state',
						tlObjId: 'obj1',
					},
					{
						command: {
							type: QuantelCommandType.PLAYCLIP,
							time: 3000,
							portId: 'port0',
							timelineObjId: 'obj1',
							fromLookahead: false,
							clip: {
								title: 'test1',
								playing: true,
								playTime: 3000,
							},
							mode: QuantelControlMode.QUALITY,
							transition: undefined,
						},
						context: 'New clip is playing',
						tlObjId: 'obj1',
					},
				]
			)
		})

		test('Clear', async () => {
			await compareStates(
				{
					time: 2000,
					port: {
						port0: {
							timelineObjId: 'obj0',
							mode: QuantelControlMode.QUALITY,
							notOnAir: false,
							lookahead: false,
							clip: {
								title: 'test0',
								playing: true,
								playTime: 2000,
							},
							channels: [2],
						},
					},
				},
				{ time: 3000, port: {} },
				[
					{
						command: {
							type: QuantelCommandType.RELEASEPORT,
							time: 2990,
							portId: 'port0',
							timelineObjId: 'obj0',
							fromLookahead: false,
						},
						tlObjId: 'obj0',
						context: 'Port does not exist in new state',
					},
				]
			)
		})
	})

	describe('sendCommand', () => {
		const mockTime = new MockTime()
		beforeAll(() => {
			mockTime.init()
		})

		test('sequence of commands', async () => {
			// note - the internals of the QuantelManager class are state-based so it's easier to do all of this in one long test
			const dev = await getInitialisedQuantelDevice()

			dev
				.sendCommand({
					command: {
						type: QuantelCommandType.SETUPPORT,
						time: 990,
						portId: 'my_port',
						timelineObjId: 'obj0',
						channel: 2,
					},
					context: 'Old state did not have port',
					tlObjId: 'obj0',
				})
				.catch((e) => {
					throw e
				})

			// give it some time to settle
			await mockTime.tick()

			expect(onRequest).toHaveBeenCalledTimes(5)

			// Connect to ISA
			expect(onRequest).toHaveBeenNthCalledWith(1, 'post', 'http://localhost:3000/connect/myISA%3A8000')
			// get initial server info
			expect(onRequest).toHaveBeenNthCalledWith(2, 'get', 'http://localhost:3000/default/server')

			// Set up port:
			// get server info
			expect(onRequest).toHaveBeenNthCalledWith(3, 'get', 'http://localhost:3000/default/server')
			// get port info
			expect(onRequest).toHaveBeenNthCalledWith(4, 'get', 'http://localhost:3000/default/server/1100/port/my_port')
			// create new port and assign to channel
			expect(onRequest).toHaveBeenNthCalledWith(
				5,
				'put',
				'http://localhost:3000/default/server/1100/port/my_port/channel/2'
			)

			onRequest.mockClear()
			mockTime.advanceTime(2000)

			dev
				.sendCommand({
					command: {
						type: QuantelCommandType.LOADCLIPFRAGMENTS,
						time: 2990,
						portId: 'my_port',
						timelineObjId: 'obj1',
						fromLookahead: false,
						clip: {
							guid: 'abcdef872832832a2b932c97d9b2eb9',
							playing: false,
							playTime: null,
						},
						timeOfPlay: 3000,
						allowedToPrepareJump: true,
					},
					context: 'Load from current state',
					tlObjId: 'obj1',
				})
				.catch((e) => {
					throw e
				})

			// give it some time to settle
			await mockTime.tick()

			expect(onRequest).toHaveBeenCalledTimes(5)
			// Search for and get clip info:
			expect(onRequest).toHaveBeenNthCalledWith(
				1,
				'get',
				expect.stringContaining('/default/clip?ClipGUID=%22abcdef872832832a2b932c97d9b2eb9%22')
			)
			expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip/1337'))
			// Fetch fragments:
			expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('clip/1337/fragments'))
			// get port info
			expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
			// Load fragments
			expect(onRequest).toHaveBeenNthCalledWith(5, 'post', expect.stringContaining('port/my_port/fragments'))

			onRequest.mockClear()

			dev
				.sendCommand({
					command: {
						type: QuantelCommandType.PLAYCLIP,
						time: 3000,
						portId: 'my_port',
						timelineObjId: 'obj1',
						fromLookahead: false,
						clip: {
							guid: 'abcdef872832832a2b932c97d9b2eb9',
							playing: true,
							playTime: 3000,
						},
						mode: QuantelControlMode.QUALITY,
						transition: undefined,
					},
					context: 'New clip is playing',
					tlObjId: 'obj1',
				})
				.catch((e) => {
					throw e
				})

			// give it some time to settle
			await mockTime.advanceTimeTicks(500)

			expect(onRequest).toHaveBeenCalledTimes(5)

			// prepare jump
			expect(onRequest).toHaveBeenNthCalledWith(1, 'put', expect.stringContaining('port/my_port/jump?offset=225'))
			// Trigger Jump
			expect(onRequest).toHaveBeenNthCalledWith(
				2,
				'post',
				expect.stringContaining('/default/server/1100/port/my_port/trigger/JUMP')
			)
			// Trigger play
			expect(onRequest).toHaveBeenNthCalledWith(
				3,
				'post',
				expect.stringContaining('/default/server/1100/port/my_port/trigger/START')
			)
			// Check that play worked
			expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
			// Plan to stop at end of clip
			expect(onRequest).toHaveBeenNthCalledWith(
				5,
				'post',
				expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=1999')
			)

			onRequest.mockClear()

			dev
				.sendCommand({
					command: {
						type: QuantelCommandType.CLEARCLIP,
						time: 3000,
						portId: 'my_port',
						timelineObjId: 'obj1',
						fromLookahead: false,
					},
					context: 'Clear',
					tlObjId: 'obj1',
				})
				.catch((e) => {
					throw e
				})

			await mockTime.tick()

			expect(onRequest).toHaveBeenCalledTimes(1)
			expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('port/my_port/reset'))
		})
	})
})

function createTimelineState(
	objs: Record<
		string,
		{
			id: string
			content: TimelineContentQuantelAny
			instance?: { originalStart: number }
			isLookahead?: boolean
			lookaheadForLayer?: string
		}
	>
): Timeline.TimelineState<TSRTimelineContent> {
	return {
		time: 10,
		layers: objs as any,
		nextEvents: [],
	}
}
