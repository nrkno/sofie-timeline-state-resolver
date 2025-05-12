/* eslint-disable jest/expect-expect */
import {
	DeviceType,
	MappingQuantelType,
	Mappings,
	QuantelControlMode,
	QuantelTransitionType,
	SomeMappingQuantel,
	Timeline,
	TimelineContentQuantelAny,
	TSRTimeline,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { QuantelCommandWithContext, QuantelDevice } from '..'
import { QuantelCommandType, QuantelState } from '../types'
import { setupQuantelGatewayMock } from './quantelGatewayMock'
import { MockTime } from '../../../__tests__/mockTime'
import { getDeviceContext } from '../../../integrations/__tests__/testlib'
import { StateHandler } from '../../../service/stateHandler'
import { CommandWithContext } from '../../..'
import { getResolvedState, resolveTimeline } from 'superfly-timeline'
import { DevicesDict } from '../../../service/devices'
import { setSoftJumpWaitTime } from '../connection'

async function getInitialisedQuantelDevice(clearMock?: jest.Mock) {
	const dev = new QuantelDevice(getDeviceContext())
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
		async function convertState(
			tlState: Timeline.TimelineState<TSRTimelineContent>,
			mappings: Mappings<SomeMappingQuantel>,
			expDevState: QuantelState
		) {
			const device = await getInitialisedQuantelDevice()

			const actualState = device.convertTimelineStateToDeviceState(tlState, mappings)

			expect(actualState).toEqual(expDevState)
		}

		test('convert empty state', async () => {
			await convertState(createTimelineState({}), {}, { time: 10, port: {} })
		})

		test('convert 1 layer', async () => {
			await convertState(
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

		test('convert 1 layer (with guid)', async () => {
			await convertState(
				createTimelineState({
					layer0: {
						id: 'obj0',
						content: {
							deviceType: DeviceType.QUANTEL,

							guid: 'guid-id',
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
								guid: 'guid-id',
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
			await convertState(
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
			await convertState(
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
			await convertState(
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

		test('convert inPoint', async () => {
			await convertState(
				createTimelineState({
					layer0: {
						id: 'obj0',
						content: {
							deviceType: DeviceType.QUANTEL,

							title: 'myClip0',
							inPoint: 500,
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
								inPoint: 500,
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
			expCommands: QuantelCommandWithContext[],
			t?: number
		) {
			const device = await getInitialisedQuantelDevice()

			const commands = device.diffStates(oldDevState, newDevState, {}, t ?? newDevState.time)

			expect(commands).toEqual(expCommands)
		}

		test('Empty states', async () => {
			await compareStates({ time: 10, port: {} }, { time: 10, port: {} }, [])
		})

		test('Set up port', async () => {
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
							type: QuantelCommandType.CANCELWAITING,
							portId: 'port0',
							timelineObjId: '',
						},
						context: 'Clear all delayed out-transitions',
						queueId: 'reset_port_port0',
						timelineObjId: '',
					},
					{
						command: {
							type: QuantelCommandType.SETUPPORT,
							portId: 'port0',
							timelineObjId: 'obj0',
							channel: 2,
						},
						context: 'Old state did not have port',
						timelineObjId: 'obj0',
						preliminary: 0,
					},
					{
						command: {
							type: QuantelCommandType.CLEARCLIP,
							portId: 'port0',
							timelineObjId: 'obj0',
							fromLookahead: false,
							transition: undefined,
						},
						context: 'New clip is empty',
						timelineObjId: 'obj0',
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
							type: QuantelCommandType.CANCELWAITING,
							portId: 'port0',
							timelineObjId: '',
						},
						context: 'Clear all delayed out-transitions',
						queueId: 'reset_port_port0',
						timelineObjId: '',
					},
					{
						command: {
							type: QuantelCommandType.LOADCLIPFRAGMENTS,
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
						timelineObjId: 'obj1',
						preliminary: 0,
					},
					{
						command: {
							type: QuantelCommandType.PAUSECLIP,
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
						preliminary: undefined,
						context: 'New clip is paused',
						timelineObjId: 'obj1',
					},
				]
			)
		})

		test('Load from GUID', async () => {
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
								guid: 'guid-id',
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
							type: QuantelCommandType.CANCELWAITING,
							portId: 'port0',
							timelineObjId: '',
						},
						context: 'Clear all delayed out-transitions',
						queueId: 'reset_port_port0',
						timelineObjId: '',
					},
					{
						command: {
							type: QuantelCommandType.LOADCLIPFRAGMENTS,
							portId: 'port0',
							timelineObjId: 'obj1',
							fromLookahead: false,
							clip: {
								guid: 'guid-id',
								playing: false,
								playTime: null,
							},
							timeOfPlay: 3000,
							allowedToPrepareJump: true,
						},
						context: 'Load from current state',
						timelineObjId: 'obj1',
						preliminary: 0,
					},
					{
						command: {
							type: QuantelCommandType.PAUSECLIP,
							portId: 'port0',
							timelineObjId: 'obj1',
							fromLookahead: false,
							clip: {
								guid: 'guid-id',
								playing: false,
								playTime: null,
							},
							mode: QuantelControlMode.QUALITY,
							transition: undefined,
						},
						context: 'New clip is paused',
						timelineObjId: 'obj1',
						preliminary: undefined,
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
							type: QuantelCommandType.CANCELWAITING,
							portId: 'port0',
							timelineObjId: '',
						},
						context: 'Clear all delayed out-transitions',
						queueId: 'reset_port_port0',
						timelineObjId: '',
					},
					{
						command: {
							type: QuantelCommandType.LOADCLIPFRAGMENTS,
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
						timelineObjId: 'obj1',
						preliminary: 0,
					},
					{
						command: {
							type: QuantelCommandType.PLAYCLIP,
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
						timelineObjId: 'obj1',
						preliminary: undefined,
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
							type: QuantelCommandType.CANCELWAITING,
							portId: 'port0',
							timelineObjId: '',
						},
						context: 'Clear all delayed out-transitions',
						queueId: 'reset_port_port0',
						timelineObjId: '',
					},
					{
						command: {
							type: QuantelCommandType.LOADCLIPFRAGMENTS,
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
						timelineObjId: 'obj1',
						preliminary: 0,
					},
					{
						command: {
							type: QuantelCommandType.PLAYCLIP,
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
						timelineObjId: 'obj1',
						preliminary: undefined,
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
							type: QuantelCommandType.CANCELWAITING,
							portId: 'port0',
							timelineObjId: '',
						},
						context: 'Clear all delayed out-transitions',
						queueId: 'reset_port_port0',
						timelineObjId: '',
					},
					{
						command: {
							type: QuantelCommandType.RELEASEPORT,
							portId: 'port0',
							timelineObjId: 'obj0',
							fromLookahead: false,
						},
						timelineObjId: 'obj0',
						context: 'Port does not exist in new state',
						preliminary: 0,
					},
				]
			)
		})

		test('Preliminary clip load', async () => {
			await compareStates(
				{
					time: 15000,
					port: {
						port0: {
							timelineObjId: 'obj1',
							mode: QuantelControlMode.QUALITY,
							notOnAir: false,
							lookahead: false,
							clip: {
								title: 'test0',
								playing: true,
								playTime: 1000,
							},
							channels: [2],
						},
					},
				},
				{
					time: 15500,
					port: {
						port0: {
							timelineObjId: 'obj2',
							mode: QuantelControlMode.QUALITY,
							notOnAir: false,
							lookahead: false,
							clip: {
								title: 'test1',
								playing: true,
								playTime: 1500,
							},
							channels: [2],
						},
					},
				},
				[
					{
						command: {
							type: QuantelCommandType.CANCELWAITING,
							portId: 'port0',
							timelineObjId: '',
						},
						context: 'Clear all delayed out-transitions',
						queueId: 'reset_port_port0',
						timelineObjId: '',
					},
					{
						command: {
							type: QuantelCommandType.LOADCLIPFRAGMENTS,
							portId: 'port0',
							timelineObjId: 'obj2',
							fromLookahead: false,
							clip: {
								title: 'test1',
								playing: true,
								playTime: 1500,
							},
							timeOfPlay: 15500,
							allowedToPrepareJump: true,
						},
						context: 'Load from current state',
						timelineObjId: 'obj2',
						preliminary: 450,
					},
					{
						command: {
							type: QuantelCommandType.PLAYCLIP,
							portId: 'port0',
							timelineObjId: 'obj2',
							fromLookahead: false,
							clip: {
								title: 'test1',
								playing: true,
								playTime: 1500,
							},
							mode: QuantelControlMode.QUALITY,
							transition: undefined,
						},
						context: 'New clip is playing',
						timelineObjId: 'obj2',
						preliminary: undefined,
					},
				],
				15020
			)
		})

		describe('Out transitions', () => {
			test('to clear', async () => {
				await compareStates(
					{
						time: 15000,
						port: {
							port0: {
								timelineObjId: 'obj1',
								mode: QuantelControlMode.QUALITY,
								notOnAir: false,
								lookahead: false,
								clip: {
									title: 'test0',
									playing: true,
									playTime: 1000,
								},
								channels: [2],
								outTransition: {
									type: QuantelTransitionType.DELAY,

									delay: 1000,
								},
							},
						},
					},
					{
						time: 15500,
						port: {
							port0: {
								timelineObjId: 'obj2',
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
								type: QuantelCommandType.CANCELWAITING,
								portId: 'port0',
								timelineObjId: '',
							},
							context: 'Clear all delayed out-transitions',
							queueId: 'reset_port_port0',
							timelineObjId: '',
						},
						{
							command: {
								type: QuantelCommandType.CLEARCLIP,
								portId: 'port0',
								timelineObjId: 'obj2',
								fromLookahead: false,
								transition: {
									type: QuantelTransitionType.DELAY,
									delay: 1000,
								},
							},
							context: 'New clip is empty',
							timelineObjId: 'obj2',
						},
					]
				)
			})

			test('to notOnAir', async () => {
				await compareStates(
					{
						time: 11000,
						port: {
							port0: {
								timelineObjId: 'obj1',
								mode: QuantelControlMode.QUALITY,
								notOnAir: false,
								lookahead: false,
								clip: {
									title: 'test0',
									playing: true,
									playTime: 1000,
								},
								channels: [2],
								outTransition: {
									type: QuantelTransitionType.DELAY,

									delay: 1000,
								},
							},
						},
					},
					{
						time: 13000,
						port: {
							port0: {
								timelineObjId: 'obj2',
								mode: QuantelControlMode.QUALITY,
								notOnAir: true,
								clip: {
									title: 'test1',
									playing: false,
									playTime: null,
								},
								lookahead: false,
								channels: [2],
							},
						},
					},
					[
						{
							command: {
								type: QuantelCommandType.CANCELWAITING,
								portId: 'port0',
								timelineObjId: '',
							},
							context: 'Clear all delayed out-transitions',
							queueId: 'reset_port_port0',
							timelineObjId: '',
						},
						{
							command: {
								type: QuantelCommandType.LOADCLIPFRAGMENTS,
								portId: 'port0',
								timelineObjId: 'obj2',
								fromLookahead: false,
								clip: {
									title: 'test1',
									playing: false,
									playTime: null,
								},
								timeOfPlay: 13000,
								allowedToPrepareJump: true,
							},
							context: 'Load from current state',
							timelineObjId: 'obj2',
							preliminary: 1000,
						},
						{
							command: {
								type: QuantelCommandType.PAUSECLIP,
								portId: 'port0',
								timelineObjId: 'obj2',
								fromLookahead: false,
								mode: QuantelControlMode.QUALITY,
								clip: {
									title: 'test1',
									playing: false,
									playTime: null,
								},
								transition: {
									type: QuantelTransitionType.DELAY,
									delay: 1000,
								},
							},
							context: 'New clip is paused',
							timelineObjId: 'obj2',
							preliminary: undefined,
						},
					],
					11500
				)
			})

			test('from lookahead', async () => {
				await compareStates(
					{
						time: 11000,
						port: {
							port0: {
								timelineObjId: 'obj1',
								mode: QuantelControlMode.QUALITY,
								notOnAir: true,
								lookahead: false,
								clip: {
									title: 'test0',
									playing: true,
									playTime: 1000,
								},
								channels: [2],
								outTransition: {
									type: QuantelTransitionType.DELAY,

									delay: 1000,
								},
							},
						},
					},
					{
						time: 13000,
						port: {
							port0: {
								timelineObjId: 'obj2',
								mode: QuantelControlMode.QUALITY,
								notOnAir: true,
								clip: {
									title: 'test1',
									playing: false,
									playTime: null,
								},
								lookahead: false,
								channels: [2],
							},
						},
					},
					[
						{
							command: {
								type: QuantelCommandType.CANCELWAITING,
								portId: 'port0',
								timelineObjId: '',
							},
							context: 'Clear all delayed out-transitions',
							queueId: 'reset_port_port0',
							timelineObjId: '',
						},
						{
							command: {
								type: QuantelCommandType.LOADCLIPFRAGMENTS,
								portId: 'port0',
								timelineObjId: 'obj2',
								fromLookahead: false,
								clip: {
									title: 'test1',
									playing: false,
									playTime: null,
								},
								timeOfPlay: 13000,
								allowedToPrepareJump: true,
							},
							context: 'Load from current state',
							timelineObjId: 'obj2',
							preliminary: 1000,
						},
						{
							command: {
								type: QuantelCommandType.PAUSECLIP,
								portId: 'port0',
								timelineObjId: 'obj2',
								fromLookahead: false,
								mode: QuantelControlMode.QUALITY,
								clip: {
									title: 'test1',
									playing: false,
									playTime: null,
								},
								transition: undefined,
							},
							context: 'New clip is paused',
							timelineObjId: 'obj2',
							preliminary: undefined,
						},
					],
					11500
				)
			})
		})

		test('Rename a port', async () => {
			await compareStates(
				{
					time: 11000,
					port: {
						port0: {
							timelineObjId: 'obj1',
							mode: QuantelControlMode.QUALITY,
							lookahead: false,
							channels: [2],
						},
					},
				},
				{
					time: 13000,
					port: {
						port0_renamed: {
							timelineObjId: 'obj2',
							mode: QuantelControlMode.QUALITY,
							lookahead: false,
							channels: [2],
						},
					},
				},
				[
					{
						command: {
							type: QuantelCommandType.CANCELWAITING,
							portId: 'port0_renamed',
							timelineObjId: '',
						},
						context: 'Clear all delayed out-transitions',
						queueId: 'reset_port_port0_renamed',
						timelineObjId: '',
					},
					{
						command: {
							type: QuantelCommandType.CANCELWAITING,
							portId: 'port0',
							timelineObjId: '',
						},
						context: 'Clear all delayed out-transitions',
						queueId: 'reset_port_port0',
						timelineObjId: '',
					},
					{
						command: {
							type: QuantelCommandType.RELEASEPORT,
							portId: 'port0',
							timelineObjId: 'obj1',
							fromLookahead: false,
						},
						context: 'Port does not exist in new state',
						timelineObjId: 'obj1',
						preliminary: 100,
					},
					{
						command: {
							type: QuantelCommandType.SETUPPORT,
							portId: 'port0_renamed',
							timelineObjId: 'obj2',
							channel: 2,
						},
						context: 'Old state did not have port',
						timelineObjId: 'obj2',
						preliminary: 100,
					},
					{
						command: {
							type: QuantelCommandType.CLEARCLIP,
							portId: 'port0_renamed',
							timelineObjId: 'obj2',
							fromLookahead: false,
						},
						context: 'New clip is empty',
						timelineObjId: 'obj2',
					},
				],
				12900
			)
		})
	})

	describe('sendCommand', () => {
		const ogTimeout = setTimeout
		const mockTime = new MockTime()
		beforeAll(() => {
			mockTime.init()
		})
		afterAll(() => {
			mockTime.reset()
		})

		test('sequence of commands', async () => {
			// note - the internals of the QuantelManager class are state-based so it's easier to do all of this in one long test
			const dev = await getInitialisedQuantelDevice()

			// give it some time to finish the init
			await new Promise<void>((r) => ogTimeout(() => r(), 10))

			dev
				.sendCommand({
					command: {
						type: QuantelCommandType.SETUPPORT,
						portId: 'my_port',
						timelineObjId: 'obj0',
						channel: 2,
					},
					context: 'Old state did not have port',
					timelineObjId: 'obj0',
				})
				.catch((e) => {
					throw e
				})

			// give it some time to settle after the command
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
					timelineObjId: 'obj1',
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
					timelineObjId: 'obj1',
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
						portId: 'my_port',
						timelineObjId: 'obj1',
						fromLookahead: false,
					},
					context: 'Clear',
					timelineObjId: 'obj1',
				})
				.catch((e) => {
					throw e
				})

			await mockTime.tick()

			expect(onRequest).toHaveBeenCalledTimes(1)
			expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('port/my_port/reset'))
		})
	})
	describe('with StateHandler', () => {
		const MOCK_SEND_COMMAND = jest.fn()
		const CONTEXT = {
			deviceId: 'unitTests0',
			logger: {
				debug: console.log,
				info: console.log,
				warn: console.log,
				error: console.log,
			},
			emitTimeTrace: () => null,
			reportStateChangeMeasurement: () => null,
			getCurrentTime: () => Date.now(),
		}
		function getNewStateHandler(device: QuantelDevice): StateHandler<QuantelState, CommandWithContext<any, any>> {
			// eslint-disable-next-line @typescript-eslint/unbound-method
			const orgSendCommand = device.sendCommand
			device.sendCommand = async function mockFunction(...args) {
				MOCK_SEND_COMMAND(...args)
				return orgSendCommand.apply(device, args)
			}

			const deviceSpecs = DevicesDict[DeviceType.QUANTEL]
			return new StateHandler<QuantelState, CommandWithContext<any, any>>(
				CONTEXT,
				{
					executionType: deviceSpecs.executionMode({}),
				},
				device
			)
		}
		function clearMocks() {
			MOCK_SEND_COMMAND.mockClear()
			onRequest.mockClear()
		}
		beforeAll(() => {
			setSoftJumpWaitTime(0)
		})

		test('outTransition to clear, cancel, then play another', async () => {
			const device = await getInitialisedQuantelDevice()

			// give it some time to finish the init
			await sleep(100)

			const stateHandler = getNewStateHandler(device)

			const now = Date.now()

			const timeline: TSRTimeline = [
				{
					id: 'obj0',
					enable: {
						start: now + 100,
						end: now + 200,
					},
					content: {
						deviceType: DeviceType.QUANTEL,
						title: 'myClip0',
						outTransition: {
							type: QuantelTransitionType.DELAY,
							delay: 500, // 2500
						},
					},
					layer: 'layer0',
				},
				{
					id: 'obj1',
					enable: {
						start: now + 210,
						end: now + 1000,
					},
					content: {
						deviceType: DeviceType.QUANTEL,
						title: 'myClip1',
					},
					layer: 'layer0',
				},
			]
			const mappings: Mappings = {
				layer0: {
					device: DeviceType.QUANTEL,
					deviceId: 'quantel0',
					options: {
						mappingType: MappingQuantelType.Port,
						portId: 'my_port',
						channelId: 1,
					},
				},
			}

			const resolved = resolveTimeline(timeline, {
				time: now,
			})

			// Handle state at time 0 (nothing is playing)
			{
				const state = getResolvedState(resolved, now)
				await stateHandler.handleState(state, mappings)

				// Give QuantelManager some time to process the commands
				await sleep(200)

				expect(MOCK_SEND_COMMAND).toHaveBeenCalledTimes(3)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					1,
					expect.objectContaining({
						command: expect.objectContaining({ type: QuantelCommandType.CANCELWAITING, portId: 'my_port' }),
					})
				)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					2,
					expect.objectContaining({
						command: expect.objectContaining({ type: QuantelCommandType.SETUPPORT, portId: 'my_port', channel: 1 }),
					})
				)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					3,
					expect.objectContaining({
						command: expect.objectContaining({ type: QuantelCommandType.CLEARCLIP, portId: 'my_port' }),
					})
				)

				expect(onRequest).toHaveBeenCalledWith('post', 'http://localhost:3000/connect/myISA%3A8000')
				expect(onRequest).toHaveBeenCalledWith('get', 'http://localhost:3000/default/server')
				expect(onRequest).toHaveBeenCalledWith('get', 'http://localhost:3000/default/server/1100/port/my_port')
				expect(onRequest).toHaveBeenCalledWith(
					'put',
					'http://localhost:3000/default/server/1100/port/my_port/channel/1'
				)
				expect(onRequest).toHaveBeenCalledWith('post', 'http://localhost:3000/default/server/1100/port/my_port/reset')
				clearMocks()
			}

			// Handle state at time 1000 (myClip0 starts to play)
			{
				const state = getResolvedState(resolved, now + 100)
				await stateHandler.handleState(state, mappings)
				// Give QuantelManager some time to process the commands
				await sleep(200)

				expect(MOCK_SEND_COMMAND).toHaveBeenCalledTimes(3)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					1,
					expect.objectContaining({
						command: expect.objectContaining({
							type: QuantelCommandType.CANCELWAITING,
							portId: 'my_port',
						}),
					})
				)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					2,
					expect.objectContaining({
						command: expect.objectContaining({
							type: QuantelCommandType.LOADCLIPFRAGMENTS,
							portId: 'my_port',
							clip: expect.objectContaining({ title: 'myClip0' }),
						}),
					})
				)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					3,
					expect.objectContaining({
						command: expect.objectContaining({
							type: QuantelCommandType.PLAYCLIP,
							portId: 'my_port',
							clip: expect.objectContaining({ title: 'myClip0' }),
						}),
					})
				)

				expect(onRequest).toHaveBeenCalledWith('post', expect.stringContaining('/1100/port/my_port/fragments?offset=0'))
				// expect(onRequest).toHaveBeenCalledWith('put', expect.stringContaining('/1100/port/my_port/jump?offset='))
				// expect(onRequest).toHaveBeenCalledWith('post', expect.stringContaining('/1100/port/my_port/trigger/JUMP'))
				expect(onRequest).toHaveBeenCalledWith('get', expect.stringContaining('/1100/port/my_port'))
				expect(onRequest).toHaveBeenCalledWith('post', expect.stringContaining('/1100/port/my_port/trigger/START'))
				expect(onRequest).toHaveBeenCalledWith(
					'post',
					expect.stringContaining('/1100/port/my_port/trigger/STOP?offset=1999')
				)

				clearMocks()
			}
			// Handle state at time 2000 (myClip0 should stop (but is delayed due to outTransition))
			{
				const state = getResolvedState(resolved, now + 200)
				await stateHandler.handleState(state, mappings)
				// Give QuantelManager some time to process the commands
				await sleep(100)

				expect(MOCK_SEND_COMMAND).toHaveBeenCalledTimes(2)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					1,
					expect.objectContaining({
						command: expect.objectContaining({
							type: QuantelCommandType.CANCELWAITING,
							portId: 'my_port',
						}),
					})
				)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					2,
					expect.objectContaining({
						command: expect.objectContaining({
							type: QuantelCommandType.CLEARCLIP,
							portId: 'my_port',
							transition: { type: QuantelTransitionType.DELAY, delay: 500 },
						}),
					})
				)

				// Since the clear is delayed, we should not have sent any commands:

				expect(onRequest).toHaveBeenCalledTimes(0)

				clearMocks()
			}
			// Handle state at time 2100 (myClip1 starts playing)
			{
				const state = getResolvedState(resolved, now + 210)
				await stateHandler.handleState(state, mappings)

				// Wait enough time to ensure that the outTransition from previous clip would have finished (had it not been cancelled)
				await sleep(100)

				expect(MOCK_SEND_COMMAND).toHaveBeenCalledTimes(3)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					1,
					expect.objectContaining({
						command: expect.objectContaining({
							type: QuantelCommandType.CANCELWAITING,
							portId: 'my_port',
						}),
					})
				)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					2,
					expect.objectContaining({
						command: expect.objectContaining({
							type: QuantelCommandType.LOADCLIPFRAGMENTS,
							portId: 'my_port',
							clip: expect.objectContaining({ title: 'myClip1' }),
						}),
					})
				)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					3,
					expect.objectContaining({
						command: expect.objectContaining({
							type: QuantelCommandType.PLAYCLIP,
							portId: 'my_port',
							clip: expect.objectContaining({ title: 'myClip1' }),
						}),
					})
				)
				// Start playing of next clip:
				expect(onRequest).toHaveBeenCalledWith(
					'post',
					expect.stringContaining('/1100/port/my_port/fragments?offset=2000')
				)
				expect(onRequest).toHaveBeenCalledWith('put', expect.stringContaining('/1100/port/my_port/jump?offset='))
				expect(onRequest).toHaveBeenCalledWith('post', expect.stringContaining('/1100/port/my_port/trigger/JUMP'))
				expect(onRequest).toHaveBeenCalledWith('post', expect.stringContaining('/1100/port/my_port/trigger/START'))
				expect(onRequest).toHaveBeenCalledWith('get', expect.stringContaining('/1100/port/my_port'))
				expect(onRequest).toHaveBeenCalledWith(
					'post',
					expect.stringContaining('/1100/port/my_port/trigger/STOP?offset=3233')
				)
				// The first clip should NOT have stopped, as it was delayed and cancelled:
				expect(onRequest).not.toHaveBeenCalledWith('post', expect.stringMatching(/trigger\/STOP$/))

				clearMocks()
			}
			await device.terminate()
		})
		test('outTransition to lookahead, cancel, then play another', async () => {
			const dev = await getInitialisedQuantelDevice()

			// give it some time to finish the init
			await sleep(100)

			const now = Date.now()

			const stateHandler = getNewStateHandler(dev)

			const timeline: TSRTimeline = [
				{
					id: 'obj0',
					enable: {
						start: now + 100,
						end: now + 200,
					},
					content: {
						deviceType: DeviceType.QUANTEL,
						title: 'myClip0',
						outTransition: {
							type: QuantelTransitionType.DELAY,
							delay: 500, // 2500
						},
					},
					layer: 'layer0',
				},
				{
					id: 'obj0_lookahead',
					enable: {
						start: '#obj0.end',
						end: '#obj1.start',
					},
					content: {
						deviceType: DeviceType.QUANTEL,
						title: 'myClip0',
						// outTransition: {
						// 	type: QuantelTransitionType.DELAY,
						// 	delay: 1000, // 3000
						// },
					},
					layer: 'layer0_lookahead',
					lookaheadForLayer: 'layer0',
					isLookahead: true,
				},
				{
					id: 'obj1',
					enable: {
						start: now + 210,
						end: now + 1000,
					},
					content: {
						deviceType: DeviceType.QUANTEL,
						title: 'myClip1',
					},
					layer: 'layer0',
				},
			]
			const mappings: Mappings = {
				layer0: {
					device: DeviceType.QUANTEL,
					deviceId: 'quantel0',
					options: {
						mappingType: MappingQuantelType.Port,
						portId: 'my_port',
						channelId: 1,
					},
				},
			}
			const resolved = resolveTimeline(timeline, { time: now })

			// Handle state at time 0 (nothing is playing)
			{
				const state = getResolvedState(resolved, now)

				await stateHandler.handleState(state, mappings)

				// Give QuantelManager some time to process the commands

				await sleep(200)

				expect(MOCK_SEND_COMMAND).toHaveBeenCalledTimes(3)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					1,
					expect.objectContaining({
						command: expect.objectContaining({ type: QuantelCommandType.CANCELWAITING, portId: 'my_port' }),
					})
				)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					2,
					expect.objectContaining({
						command: expect.objectContaining({ type: QuantelCommandType.SETUPPORT, portId: 'my_port', channel: 1 }),
					})
				)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					3,
					expect.objectContaining({
						command: expect.objectContaining({ type: QuantelCommandType.CLEARCLIP, portId: 'my_port' }),
					})
				)

				expect(onRequest).toHaveBeenCalledWith('post', 'http://localhost:3000/connect/myISA%3A8000')
				expect(onRequest).toHaveBeenCalledWith('get', 'http://localhost:3000/default/server')
				expect(onRequest).toHaveBeenCalledWith('get', 'http://localhost:3000/default/server/1100/port/my_port')
				expect(onRequest).toHaveBeenCalledWith(
					'put',
					'http://localhost:3000/default/server/1100/port/my_port/channel/1'
				)
				expect(onRequest).toHaveBeenCalledWith('post', 'http://localhost:3000/default/server/1100/port/my_port/reset')
				clearMocks()
			}

			// Handle state at time 1000 (myClip0 starts to play)
			{
				const state = getResolvedState(resolved, now + 100)
				await stateHandler.handleState(state, mappings)
				// Give QuantelManager some time to process the commands
				await sleep(200)

				expect(MOCK_SEND_COMMAND).toHaveBeenCalledTimes(3)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					1,
					expect.objectContaining({
						command: expect.objectContaining({
							type: QuantelCommandType.CANCELWAITING,
							portId: 'my_port',
						}),
					})
				)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					2,
					expect.objectContaining({
						command: expect.objectContaining({
							type: QuantelCommandType.LOADCLIPFRAGMENTS,
							portId: 'my_port',
							clip: expect.objectContaining({ title: 'myClip0' }),
						}),
					})
				)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					3,
					expect.objectContaining({
						command: expect.objectContaining({
							type: QuantelCommandType.PLAYCLIP,
							portId: 'my_port',
							clip: expect.objectContaining({ title: 'myClip0' }),
						}),
					})
				)
				expect(onRequest).toHaveBeenCalledWith('post', expect.stringContaining('/1100/port/my_port/fragments?offset=0'))
				// expect(onRequest).toHaveBeenCalledWith('put', expect.stringContaining('/1100/port/my_port/jump?offset='))
				// expect(onRequest).toHaveBeenCalledWith('post', expect.stringContaining('/1100/port/my_port/trigger/JUMP'))
				expect(onRequest).toHaveBeenCalledWith('post', expect.stringContaining('/1100/port/my_port/trigger/START'))
				expect(onRequest).toHaveBeenCalledWith('get', expect.stringContaining('/1100/port/my_port'))
				expect(onRequest).toHaveBeenCalledWith(
					'post',
					expect.stringContaining('/1100/port/my_port/trigger/STOP?offset=1999')
				)

				clearMocks()
			}
			// Handle state at time 2000 (myClip0 should stop (but is delayed due to outTransition))
			{
				const state = getResolvedState(resolved, now + 200)
				await stateHandler.handleState(state, mappings)
				// Give QuantelManager some time to process the commands
				await sleep(100)

				expect(MOCK_SEND_COMMAND).toHaveBeenCalledTimes(2)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					1,
					expect.objectContaining({
						command: expect.objectContaining({
							type: QuantelCommandType.LOADCLIPFRAGMENTS,
							portId: 'my_port',
							clip: expect.objectContaining({ title: 'myClip0' }),
						}),
					})
				)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					2,
					expect.objectContaining({
						command: expect.objectContaining({
							type: QuantelCommandType.PAUSECLIP,
							portId: 'my_port',
							clip: expect.objectContaining({ title: 'myClip0' }),
							transition: { type: QuantelTransitionType.DELAY, delay: 500 },
						}),
					})
				)

				// Since the pause is delayed, we should not have sent any reset or stop commands:

				expect(onRequest).not.toHaveBeenCalledWith('post', expect.stringContaining('reset'))
				expect(onRequest).not.toHaveBeenCalledWith('post', expect.stringContaining('trigger/STOP'))

				clearMocks()
			}
			// Handle state at time 2500 (myClip1 starts playing)
			{
				const state = getResolvedState(resolved, now + 250)
				await stateHandler.handleState(state, mappings)

				// Wait enough time to ensure that the outTransition from previous clip would have finished (had it not been cancelled)
				await sleep(200)

				expect(MOCK_SEND_COMMAND).toHaveBeenCalledTimes(3)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					1,
					expect.objectContaining({
						command: expect.objectContaining({
							type: QuantelCommandType.CANCELWAITING,
							portId: 'my_port',
						}),
					})
				)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					2,
					expect.objectContaining({
						command: expect.objectContaining({
							type: QuantelCommandType.LOADCLIPFRAGMENTS,
							portId: 'my_port',
							clip: expect.objectContaining({ title: 'myClip1' }),
						}),
					})
				)
				expect(MOCK_SEND_COMMAND).toHaveBeenNthCalledWith(
					3,
					expect.objectContaining({
						command: expect.objectContaining({
							type: QuantelCommandType.PLAYCLIP,
							portId: 'my_port',
							clip: expect.objectContaining({ title: 'myClip1' }),
						}),
					})
				)

				// Start playing of next clip:
				expect(onRequest).toHaveBeenCalledWith(
					'post',
					expect.stringContaining('/1100/port/my_port/fragments?offset=2000')
				)
				expect(onRequest).toHaveBeenCalledWith('put', expect.stringContaining('/1100/port/my_port/jump?offset='))
				expect(onRequest).toHaveBeenCalledWith('post', expect.stringContaining('/1100/port/my_port/trigger/JUMP'))
				expect(onRequest).toHaveBeenCalledWith('post', expect.stringContaining('/1100/port/my_port/trigger/START'))
				expect(onRequest).toHaveBeenCalledWith('get', expect.stringContaining('/1100/port/my_port'))
				expect(onRequest).toHaveBeenCalledWith(
					'post',
					expect.stringContaining('/1100/port/my_port/trigger/STOP?offset=3233')
				)
				// The first clip should NOT have stopped, as it was delayed and cancelled:
				expect(onRequest).not.toHaveBeenCalledWith('post', expect.stringMatching(/trigger\/STOP$/))

				clearMocks()
			}
			await dev.terminate()
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

async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}
