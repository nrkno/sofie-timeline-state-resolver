import { TriggerType } from 'superfly-timeline'
import { Conductor } from '../../conductor'
import { OSCMessageDevice } from '../osc'
import {
	MappingOSC,
	Mappings,
	DeviceType,
	TimelineContentTypeOSC,
	OSCValueType,
	TimelineObjOSCMessage
} from '../../types/src'
import { MockTime } from '../../__tests__/mockTime.spec'
import { literal } from '../device'

// let nowActual = Date.now()
describe('OSC-Message', () => {
	let mockTime = new MockTime()
	beforeAll(() => {
		Date.now = jest.fn(() => {
			return mockTime.getCurrentTime()
		})
		// Date.now['mockReturnValue'](now)
	})
	beforeEach(() => {
		mockTime.init()
	})
	test('POST message', async () => {
		let commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})
		let myLayerMapping0: MappingOSC = {
			device: DeviceType.OSC,
			deviceId: 'osc0'
		}
		let myLayerMapping: Mappings = {
			'myLayer0': myLayerMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})
		await myConductor.init()
		await myConductor.addDevice('osc0', {
			type: DeviceType.OSC,
			options: {
				commandReceiver: commandReceiver0
			}
		})
		myConductor.mapping = myLayerMapping
		mockTime.advanceTimeTo(10100)

		let device = myConductor.getDevice('osc0') as OSCMessageDevice

		// Check that no commands has been scheduled:
		expect(device.queue).toHaveLength(0)

		myConductor.timeline = [
			literal<TimelineObjOSCMessage>({
				id: 'obj0',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: mockTime.now + 1000 // in 1 second
				},
				duration: 2000,
				LLayer: 'myLayer0',
				content: {
					type: TimelineContentTypeOSC.OSC,
					path: '/test-path',
					values: [{
						type: OSCValueType.INT,
						value: 123.
					}, {
						type: OSCValueType.FLOAT,
						value: 123.45
					}, {
						type: OSCValueType.STRING,
						value: 'abc'
					}, {
						type: OSCValueType.BLOB,
						value: new Uint8Array([1, 3, 5])
					}]
				}
			})
		]

		mockTime.advanceTimeTo(10990)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		mockTime.advanceTimeTo(11100)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0.mock.calls[0][1]).toMatchObject(
			{
				type: TimelineContentTypeOSC.OSC,
				path: '/test-path',
				values: [{
					type: OSCValueType.INT,
					value: 123.
				}, {
					type: OSCValueType.FLOAT,
					value: 123.45
				}, {
					type: OSCValueType.STRING,
					value: 'abc'
				}, {
					type: OSCValueType.BLOB,
					value: new Uint8Array([1, 3, 5])
				}]
			}
		)
		expect(commandReceiver0.mock.calls[0][2]).toMatch(/added/) // context
		mockTime.advanceTimeTo(16000)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
	})
})
