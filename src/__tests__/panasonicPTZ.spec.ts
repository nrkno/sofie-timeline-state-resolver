import { TriggerType } from 'superfly-timeline'

import { Mappings, MappingPanasonicPtz, DeviceType, MappingPanasonicPtzType } from '../devices/mapping'
import { Conductor } from '../conductor'
import {
	PanasonicPtzDevice,
	TimelineContentTypePanasonicPtz
} from '../devices/panasonicPTZ'

import * as nock from 'nock'

let externalLog = (...args) => {
	args = args
	// console.log('trace', ...args)
}

nock('http://192.168.0.10')
	.get('/cgi-bin/aw_ptz?cmd=%23O&res=1')
	.reply(200, 'p1')

describe('Panasonic PTZ', () => {
	let now: number = 1000

	beforeAll(() => {
		Date.now = jest.fn()
		Date.now['mockReturnValue'](1000)
	})
	function getCurrentTime () {
		return now
	}
	// function literal<T> (o: T) { return o }

	function advanceTime (advanceTime: number) {
		now += advanceTime
		jest.advanceTimersByTime(advanceTime)
	}
	beforeEach(() => {
		now = 1000
		jest.useFakeTimers()
	})

	test('Panasonic PTZ: change preset', async () => {

		let commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})
		let myChannelMapping0: MappingPanasonicPtz = {
			device: DeviceType.PANASONIC_PTZ,
			deviceId: 'myPtz',
			mappingType: MappingPanasonicPtzType.PRESET
		}
		let myChannelMapping1: MappingPanasonicPtz = {
			device: DeviceType.PANASONIC_PTZ,
			deviceId: 'myPtz',
			mappingType: MappingPanasonicPtzType.PRESET_SPEED
		}
		let myChannelMapping: Mappings = {
			'ptz_k1': myChannelMapping0,
			'ptz_k1_s': myChannelMapping1
		}

		let myConductor = new Conductor({
			externalLog: externalLog,
			initializeAsClear: true,
			getCurrentTime: getCurrentTime
		})
		myConductor.mapping = myChannelMapping
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await myConductor.addDevice('myPtz', {
			type: DeviceType.PANASONIC_PTZ,
			options: {
				commandReceiver: commandReceiver0,
				host: '192.168.0.10'
			}
		})
		advanceTime(100) // 1100

		let device = myConductor.getDevice('myPtz') as PanasonicPtzDevice

		// Check that no commands has been scheduled:
		expect(device.queue).toHaveLength(0)

		myConductor.timeline = [
			{
				id: 'obj0',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: now - 1000 // 1 seconds in the past
				},
				duration: 2000,
				LLayer: 'ptz_k1',
				content: {
					type: TimelineContentTypePanasonicPtz.PRESET,
					preset: 1
				}
			},
			{
				id: 'obj0_s',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: now - 1000 // 1 seconds in the past
				},
				duration: 10000,
				LLayer: 'ptz_k1_s',
				content: {
					type: TimelineContentTypePanasonicPtz.SPEED,
					speed: 250
				}
			},
			{
				id: 'obj1',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: now + 500 // 0.5 seconds in the future
				},
				duration: 2000,
				LLayer: 'ptz_k1',
				content: {
					type: TimelineContentTypePanasonicPtz.PRESET,
					preset: 2
				}
			},
			{
				id: 'obj2',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: now + 1000 // 1 seconds in the future
				},
				duration: 2000,
				LLayer: 'ptz_k1',
				content: {
					type: TimelineContentTypePanasonicPtz.PRESET,
					preset: 2
				}
			},
			{
				id: 'obj2_s',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: now + 1000 // 1 seconds in the past
				},
				duration: 500,
				LLayer: 'ptz_k1_s',
				content: {
					type: TimelineContentTypePanasonicPtz.SPEED,
					speed: 0
				}
			},
			{
				id: 'obj3',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: now + 2000 // 2 seconds in the future
				},
				duration: 2000,
				LLayer: 'ptz_k1',
				content: {
					type: TimelineContentTypePanasonicPtz.PRESET,
					preset: 1
				}
			}
		]

		advanceTime(100) // 1200

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0.mock.calls[0][1]).toMatchObject(
			{
				type: TimelineContentTypePanasonicPtz.PRESET,
				preset: 1
			}
		)
		expect(commandReceiver0.mock.calls[1][1]).toMatchObject(
			{
				type: TimelineContentTypePanasonicPtz.SPEED,
				speed: 250
			}
		)

		advanceTime(800) // 2000

		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(commandReceiver0.mock.calls[2][1]).toMatchObject(
			{
				type: TimelineContentTypePanasonicPtz.PRESET,
				preset: 2
			}
		)

		advanceTime(500) // 2500

		expect(commandReceiver0).toHaveBeenCalledTimes(4)
		expect(commandReceiver0.mock.calls[3][1]).toMatchObject(
			{
				type: TimelineContentTypePanasonicPtz.SPEED,
				speed: 0
			}
		)

		advanceTime(500) // 3000

		// return speed to previous value
		expect(commandReceiver0).toHaveBeenCalledTimes(5)
		expect(commandReceiver0.mock.calls[4][1]).toMatchObject(
			{
				// attribute: 'Motor dB Value',
				type: TimelineContentTypePanasonicPtz.SPEED,
				speed: 250
			}
		)

		advanceTime(500) // 3500

		expect(commandReceiver0).toHaveBeenCalledTimes(6)
		expect(commandReceiver0.mock.calls[5][1]).toMatchObject(
			{
				// attribute: 'Motor dB Value',
				type: TimelineContentTypePanasonicPtz.PRESET,
				preset: 1
			}
		)
		advanceTime(7000) // 10500

		expect(commandReceiver0).toHaveBeenCalledTimes(6)
		// no new commands should be sent, nothing is sent on object end
	})
})
