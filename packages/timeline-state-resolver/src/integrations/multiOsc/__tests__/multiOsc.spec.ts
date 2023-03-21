import { Conductor } from '../../../conductor'
import { OSCMessageDevice } from '../../osc'
import {
	Mappings,
	DeviceType,
	TimelineContentTypeOSC,
	OSCValueType,
	TimelineContentOSCMessage,
	TSRTimelineObj,
	MultiOSCDeviceType,
	MappingMultiOscLayer,
	Mapping,
	MappingMultiOscType,
} from 'timeline-state-resolver-types'
import { MockTime } from '../../../__tests__/mockTime'
import { literal } from '../../../devices/device'
import { ThreadedClass } from 'threadedclass'
import { getMockCall } from '../../../__tests__/lib'

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

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		myConductor.on('error', (e) => console.error(e))
		await myConductor.init()
		await myConductor.addDevice('osc0', {
			type: DeviceType.MULTI_OSC,
			options: {
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
			oscSenders: { osc0: commandReceiver0 },
		})
		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('osc0')
		const device = deviceContainer!.device as ThreadedClass<OSCMessageDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			literal<TSRTimelineObj<TimelineContentOSCMessage>>({
				id: 'obj0',
				enable: {
					start: mockTime.now + 1000, // in 1 second
					duration: 2000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.OSC,
					type: TimelineContentTypeOSC.OSC,

					path: '/test-path',
					values: [
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
				},
			}),
		])

		await mockTime.advanceTimeToTicks(10990)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		await mockTime.advanceTimeToTicks(11100)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		// console.log(commandReceiver0.mock.calls)
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
		await mockTime.advanceTimeToTicks(16000)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
	})
})
