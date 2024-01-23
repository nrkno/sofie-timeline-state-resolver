import { LawoDevice } from '..'
import {
	Mappings,
	DeviceType,
	TimelineContentTypeLawo,
	SomeMappingLawo,
	MappingLawoType,
	LawoDeviceMode,
	Timeline,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { MockTime } from '../../../__tests__/mockTime'
import { getDeviceContext } from '../../../integrations/__tests__/testlib'
import { LawoState } from '../state'
import { ParameterType } from 'emberplus-connection/dist/model'
import { LawoCommandType, LawoCommandWithContext } from '../diff'
import { EmberClient } from '../../../__mocks__/emberplus-connection'

async function getInitialisedLawoDevice(clearMock?: jest.Mock) {
	const dev = new LawoDevice(getDeviceContext())
	await dev.init({
		host: '192.168.52.31',
		port: 3000,
		deviceMode: LawoDeviceMode.Ruby,
	})
	if (clearMock) {
		clearMock.mockClear()
	}
	return dev
}

describe('Lawo', () => {
	const mockTime = new MockTime()
	const setValueMock = EmberClient.mockSetValue
	const invokeMock = EmberClient.mockInvoke

	beforeEach(() => {
		mockTime.init()
		setValueMock.mockReset()
		invokeMock.mockReset()
	})

	describe('convertTimelineStateToDeviceState', () => {
		async function convertState(
			tlState: Timeline.TimelineState<TSRTimelineContent>,
			mappings: Mappings<SomeMappingLawo>,
			expDevState: LawoState
		) {
			const device = await getInitialisedLawoDevice()

			const actualState = device.convertTimelineStateToDeviceState(tlState, mappings)

			expect(actualState).toEqual(expDevState)
		}

		test('convert empty state', async () => {
			await convertState({ time: 10, layers: {}, nextEvents: [] }, {}, { faders: [], nodes: [] })
		})

		test('Volume - 1 source', async () => {
			await convertState(
				{
					time: 10,
					layers: {
						layer0_source: {
							id: 'object0',
							layer: 'layer0_source',
							content: {
								deviceType: DeviceType.LAWO,
								type: TimelineContentTypeLawo.SOURCE,

								faderValue: 12,
							},
						},
					} as any,
					nextEvents: [],
				},
				MAPPINGS,
				{
					faders: [
						{
							identifier: 'Source 1',
							value: 12,
							priority: 0,
							timelineObjId: 'object0',
						},
					],
					nodes: [],
				}
			)
		})

		test('Volume - Multiple sources', async () => {
			await convertState(
				{
					time: 10,
					layers: {
						layer1_sources: {
							id: 'object0',
							layer: 'layer1_sources',
							content: {
								deviceType: DeviceType.LAWO,
								type: TimelineContentTypeLawo.SOURCES,

								sources: [
									{
										faderValue: 12,
										mappingName: 'layer0_source',
									},
								],
							},
						} as any,
					},
					nextEvents: [],
				},
				MAPPINGS,
				{
					faders: [
						{
							identifier: 'Source 1',
							value: 12,
							priority: 0,
							timelineObjId: 'object0',
						},
					],
					nodes: [],
				}
			)
		})

		test('Volume - priority', async () => {
			await convertState(
				{
					time: 10,
					layers: {
						layer2_source: {
							id: 'object0',
							layer: 'layer2_source',
							content: {
								deviceType: DeviceType.LAWO,
								type: TimelineContentTypeLawo.SOURCE,

								faderValue: 12,
								overridePriority: 10, // this is really for ordering commands though?
							},
						} as any,
						layer1_sources: {
							id: 'object1',
							layer: 'layer1_sources',
							content: {
								deviceType: DeviceType.LAWO,
								type: TimelineContentTypeLawo.SOURCES,

								sources: [
									{
										faderValue: 4,
										mappingName: 'layer0_source',
									},
								],
							},
						} as any,
					},
					nextEvents: [],
				},
				MAPPINGS,
				{
					faders: [
						{
							identifier: 'Source 2',
							value: 12,
							priority: 10,
							timelineObjId: 'object0',
						},
						{
							identifier: 'Source 1',
							value: 4,
							priority: 0,
							timelineObjId: 'object1',
						},
					],
					nodes: [],
				}
			)
		})

		test('Property', async () => {
			await convertState(
				{
					time: 10,
					layers: {
						layer3_property: {
							id: 'object0',
							layer: 'layer3_property',
							content: {
								deviceType: DeviceType.LAWO,
								type: TimelineContentTypeLawo.EMBER_PROPERTY,

								value: 12,
							},
						},
					} as any,
					nextEvents: [],
				},
				MAPPINGS,
				{
					faders: [],
					nodes: [
						{
							identifier: 'Full.path.to.prop',
							value: 12,
							priority: 0,
							timelineObjId: 'object0',
							valueType: ParameterType.Real,
						},
					],
				}
			)
		})

		test('Trigger value', async () => {
			await convertState(
				{
					time: 10,
					layers: {
						layer4_trigger_value: {
							id: 'object0',
							layer: 'layer4_trigger_value',
							content: {
								deviceType: DeviceType.LAWO,
								type: TimelineContentTypeLawo.TRIGGER_VALUE,

								triggerValue: 'abc',
							},
						},
					} as any,
					nextEvents: [],
				},
				MAPPINGS,
				{
					faders: [],
					nodes: [],
					triggerValue: 'abc',
				}
			)
		})
	})

	describe('diffState', () => {
		async function compareStates(
			oldDevState: LawoState | undefined,
			newDevState: LawoState,
			expCommands: LawoCommandWithContext[]
		) {
			const device = await getInitialisedLawoDevice()

			const commands = device.diffStates(oldDevState, newDevState)

			expect(commands).toEqual(expCommands)
		}

		test('diff from undefined - change volume', async () => {
			await compareStates(
				undefined,
				{
					faders: [
						{
							identifier: 'test0',
							value: 0,
							priority: 0,
							timelineObjId: 'id0',
						},
					],
					nodes: [],
				},
				[
					{
						command: {
							type: LawoCommandType.FaderRamp,

							identifier: 'test0',
							value: 0,

							priority: 0,
						},
						context: 'Values: "undefined" !== "0", Changed TriggerValue: false',
						timelineObjId: 'id0',
					},
				]
			)
		})

		test('diff - change property', async () => {
			await compareStates(
				undefined,
				{
					faders: [],
					nodes: [
						{
							identifier: 'test0',
							value: 0,
							priority: 0,
							timelineObjId: 'id0',
						},
					],
				},
				[
					{
						command: {
							type: LawoCommandType.SetValue,

							identifier: 'test0',
							value: 0,

							priority: 0,
						},
						context: 'Values: "undefined" !== "0", Changed TriggerValue: false',
						timelineObjId: 'id0',
					},
				]
			)
		})

		test('priorities', async () => {
			await compareStates(
				undefined,
				{
					faders: [
						{
							identifier: 'test0',
							value: 0,
							priority: 0,
							timelineObjId: 'id0',
						},
						{
							identifier: 'test1',
							value: 0,
							priority: 8,
							timelineObjId: 'id1',
						},
					],
					nodes: [
						{
							identifier: 'test2',
							value: 0,
							priority: 3,
							timelineObjId: 'id2',
						},
					],
				},
				[
					{
						command: {
							type: LawoCommandType.FaderRamp,

							identifier: 'test1',
							value: 0,

							priority: 8,
						},
						context: 'Values: "undefined" !== "0", Changed TriggerValue: false',
						timelineObjId: 'id1',
					},
					{
						command: {
							type: LawoCommandType.SetValue,

							identifier: 'test2',
							value: 0,

							priority: 3,
						},
						context: 'Values: "undefined" !== "0", Changed TriggerValue: false',
						timelineObjId: 'id2',
					},
					{
						command: {
							type: LawoCommandType.FaderRamp,

							identifier: 'test0',
							value: 0,

							priority: 0,
						},
						context: 'Values: "undefined" !== "0", Changed TriggerValue: false',
						timelineObjId: 'id0',
					},
				]
			)
		})

		test('trigger value', async () => {
			await compareStates(
				{
					faders: [
						{
							identifier: 'test0',
							value: 0,
							priority: 0,
							timelineObjId: 'id0',
						},
					],
					nodes: [],
					triggerValue: 'old',
				},
				{
					faders: [
						{
							identifier: 'test0',
							value: 0,
							priority: 0,
							timelineObjId: 'id0',
						},
					],
					nodes: [],
					triggerValue: 'new',
				},
				[
					{
						command: {
							type: LawoCommandType.FaderRamp,

							identifier: 'test0',
							value: 0,
							from: 0,

							priority: 0,
						},
						context: 'Values: "0" !== "0", Changed TriggerValue: true',
						timelineObjId: 'id0',
					},
				]
			)
		})
	})

	describe('sendCommand', () => {
		test('Ramp fader - 0ms', async () => {
			const device = await getInitialisedLawoDevice()

			await device.sendCommand({
				command: {
					type: LawoCommandType.FaderRamp,

					identifier: 'test0',
					value: 1,
					transitionDuration: 0,

					priority: 0,
				},
				context: 'Values: "undefined" !== "0", Changed TriggerValue: false',
				timelineObjId: 'id0',
			})

			expect(setValueMock).toHaveBeenCalledTimes(1)
			expect(setValueMock).toHaveBeenCalledWith(
				{
					contents: {
						type: 'PARAMETER',
						value: 0,
					},
					path: 'Ruby.Sources.test0.Fader.Motor dB Value',
				},
				1,
				true
			)
		})
		test('Ramp fader - 160ms', async () => {
			const device = await getInitialisedLawoDevice()

			await device.sendCommand({
				command: {
					type: LawoCommandType.FaderRamp,

					identifier: 'test0',
					value: -191,
					transitionDuration: 160,

					priority: 0,
				},
				context: 'Values: "undefined" !== "0", Changed TriggerValue: false',
				timelineObjId: 'id0',
			})

			await mockTime.advanceTimeTicks(225)

			expect(setValueMock).toHaveBeenCalledTimes(3)
			expect(setValueMock).toHaveBeenNthCalledWith(
				1,
				{
					contents: {
						type: 'PARAMETER',
						value: 0,
					},
					path: 'Ruby.Sources.test0.Fader.Motor dB Value',
				},
				-28.125,
				false
			)
			expect(setValueMock).toHaveBeenNthCalledWith(
				2,
				{
					contents: {
						type: 'PARAMETER',
						value: 0,
					},
					path: 'Ruby.Sources.test0.Fader.Motor dB Value',
				},
				-56.25,
				false
			)
			expect(setValueMock).toHaveBeenNthCalledWith(
				3,
				{
					contents: {
						type: 'PARAMETER',
						value: 0,
					},
					path: 'Ruby.Sources.test0.Fader.Motor dB Value',
				},
				-191,
				true
			)
		})
		test('Ramp fader - 600ms', async () => {
			const device = await getInitialisedLawoDevice()

			await device.sendCommand({
				command: {
					type: LawoCommandType.FaderRamp,

					identifier: 'test0',
					value: 1,
					transitionDuration: 600,

					priority: 0,
				},
				context: 'Values: "undefined" !== "0", Changed TriggerValue: false',
				timelineObjId: 'id0',
			})

			expect(invokeMock).toHaveBeenCalledTimes(1)
			expect(invokeMock).toHaveBeenCalledWith(
				{
					contents: {
						type: 'FUNCTION',
						value: 0,
					},
					path: 'Ruby.Functions.RampMotorFader',
				},
				{ type: ParameterType.String, value: 'test0' },
				{ type: ParameterType.Real, value: 1 },
				{ type: ParameterType.Real, value: 0.6 }
			)
		})
	})
})

const MAPPINGS: Mappings<SomeMappingLawo> = {
	layer0_source: {
		deviceId: 'device0',
		device: DeviceType.LAWO,
		options: {
			mappingType: MappingLawoType.Source,
			identifier: 'Source 1',
		},
	},
	layer1_sources: {
		deviceId: 'device0',
		device: DeviceType.LAWO,
		options: {
			mappingType: MappingLawoType.Sources,
		},
	},
	layer2_source: {
		deviceId: 'device0',
		device: DeviceType.LAWO,
		options: {
			mappingType: MappingLawoType.Source,
			identifier: 'Source 2',
		},
	},
	layer3_property: {
		deviceId: 'device0',
		device: DeviceType.LAWO,
		options: {
			mappingType: MappingLawoType.Fullpath,
			identifier: 'Full.path.to.prop',
		},
	},
	layer4_trigger_value: {
		deviceId: 'device0',
		device: DeviceType.LAWO,
		options: {
			mappingType: MappingLawoType.TriggerValue,
		},
	},
}
