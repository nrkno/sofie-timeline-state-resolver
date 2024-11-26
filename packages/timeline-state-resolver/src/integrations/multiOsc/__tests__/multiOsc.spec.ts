import {
	Mappings,
	DeviceType,
	TimelineContentTypeOSC,
	OSCValueType,
	TimelineContentOSCMessage,
	MultiOSCDeviceType,
	MappingMultiOscLayer,
	Mapping,
	MappingMultiOscType,
	Timeline,
	SomeOSCValue,
} from 'timeline-state-resolver-types'
import { MockTime } from '../../../__tests__/mockTime'
import { getMockCall } from '../../../__tests__/lib'
import { MultiOSCMessageDevice } from '..'
import { getDeviceContext } from '../../__tests__/testlib'
import { TSRTimelineContent } from 'timeline-state-resolver-types/src'

// let nowActual = Date.now()
describe('MultiOSC-Message', () => {
	const mockTime = new MockTime()
	beforeEach(() => {
		mockTime.init()
	})
	test('MultiOSC message', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<MappingMultiOscLayer> = {
			device: DeviceType.MULTI_OSC,
			deviceId: 'osc0',
			options: {
				mappingType: MappingMultiOscType.Layer,
				connectionId: 'osc0',
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const device = new MultiOSCMessageDevice(getDeviceContext())
		await device.init(
			{
				connections: [
					{
						connectionId: 'osc0',
						host: '127.0.0.1',
						port: 80,
						type: MultiOSCDeviceType.UDP,
					},
				],
				timeBetweenCommands: 160,
			},
			{
				oscSenders: { osc0: commandReceiver0 },
			}
		)

		const testValues: SomeOSCValue[] = [
			{
				type: OSCValueType.INT,
				value: 123,
			},
			{
				type: OSCValueType.FLOAT,
				value: 123.45,
			},
			{
				type: OSCValueType.STRING,
				value: 'abc',
			},
			{
				type: OSCValueType.BLOB,
				value: new Uint8Array([1, 3, 5]),
			},
		]

		const state = device.convertTimelineStateToDeviceState(
			createTimelineState({
				obj0: {
					id: 'obj0',

					layer: 'myLayer0',

					content: {
						deviceType: DeviceType.OSC,
						type: TimelineContentTypeOSC.OSC,

						path: '/test-path',
						values: testValues,
					},
				},
			}),
			myLayerMapping
		)
		expect(state).toBeTruthy()
		expect(state).toEqual({
			osc0: {
				'/test-path': {
					connectionId: 'osc0',
					deviceType: DeviceType.OSC,
					type: TimelineContentTypeOSC.OSC,
					fromTlObject: 'obj0',
					path: '/test-path',
					values: testValues,
				},
			},
		})

		const commands = device.diffStates(undefined, state)
		expect(commands).toHaveLength(1)

		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		for (const command of commands) {
			await device.sendCommand(command)
		}
		expect(commandReceiver0).toHaveBeenCalledTimes(1)

		expect(getMockCall(commandReceiver0, 0, 0)).toMatchObject({
			address: '/test-path',
			args: [
				{
					type: OSCValueType.INT,
					value: 123,
				},
				{
					type: OSCValueType.FLOAT,
					value: 123.45,
				},
				{
					type: OSCValueType.STRING,
					value: 'abc',
				},
				{
					type: OSCValueType.BLOB,
					value: new Uint8Array([1, 3, 5]),
				},
			],
		})
	})
})

function createTimelineState(
	objs: Record<string, { id: string; layer: string; content: TimelineContentOSCMessage }>
): Timeline.TimelineState<TSRTimelineContent> {
	return {
		time: 10,
		layers: objs as any,
		nextEvents: [],
	}
}
