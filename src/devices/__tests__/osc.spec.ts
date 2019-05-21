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
import { ThreadedClass } from 'threadedclass'
import { getMockCall } from '../../__tests__/lib.spec'

// let nowActual = Date.now()
describe('OSC-Message', () => {
	let mockTime = new MockTime()
	beforeAll(() => {
		mockTime.mockDateNow()
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
		myConductor.on('error', e => console.error(e))
		await myConductor.init()
		await myConductor.addDevice('osc0', {
			type: DeviceType.OSC,
			options: {
				commandReceiver: commandReceiver0
			}
		})
		await myConductor.setMapping(myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		let deviceContainer = myConductor.getDevice('osc0')
		let device = deviceContainer.device as ThreadedClass<OSCMessageDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.timeline = [
			literal<TimelineObjOSCMessage>({
				id: 'obj0',
				enable: {
					start: mockTime.now + 1000, // in 1 second
					duration: 2000
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.OSC,
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

		await mockTime.advanceTimeToTicks(10990)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		await mockTime.advanceTimeToTicks(11100)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject(
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
		expect(getMockCall(commandReceiver0, 0, 2)).toMatch(/added/) // context
		await mockTime.advanceTimeToTicks(16000)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
	})
})
