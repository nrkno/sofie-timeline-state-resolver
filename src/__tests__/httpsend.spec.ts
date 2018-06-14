// import {Resolver, Enums} from "superfly-timeline"
// import { Commands, Atem } from 'atem-connection'
import { TriggerType } from 'superfly-timeline'

import { Mappings, MappingAtem, DeviceType, MappingAtemType, MappingHTTPSend } from '../devices/mapping'
import { Conductor } from '../conductor'
import { HttpSendDevice } from '../devices/httpSend'

// let nowActual = Date.now()
describe('HTTP-Send', () => {
	let now: number = 10000
	beforeAll(() => {
		Date.now = jest.fn(() => {
			return getCurrentTime()
		})
		// Date.now['mockReturnValue'](now)
	})
	function getCurrentTime () {
		return now
	}
	function advanceTime (advanceTime: number) {
		now += advanceTime
		jest.advanceTimersByTime(advanceTime)
		// console.log('Advancing ' + advanceTime + ' ms -----------------------')
	}
	beforeEach(() => {
		jest.useFakeTimers()
	})
	test('POST message', async () => {
		let commandReceiver0 = jest.fn(() => {
			// nothing.
		})
		let myLayerMapping0: MappingHTTPSend = {
			device: DeviceType.HTTPSEND,
			deviceId: 'myHTTP'
		}
		let myLayerMapping: Mappings = {
			'myLayer0': myLayerMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: getCurrentTime
		})
		await myConductor.init()
		await myConductor.addDevice('myHTTP', {
			type: DeviceType.HTTPSEND,
			options: {
				commandReceiver: commandReceiver0
			}
		})
		myConductor.mapping = myLayerMapping
		advanceTime(100) // 1100

		let device = myConductor.getDevice('myHTTP') as HttpSendDevice
		// console.log(device._device.state)

		// Check that no commands has been scheduled:
		expect(device.queue).toHaveLength(0)

		myConductor.timeline = [
			{
				id: 'obj0',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: now + 1000 // in 1 second
				},
				duration: 2000,
				LLayer: 'myLayer0',
				content: {
					type: 'POST',
					url: 'http://superfly.tv',
					params: {
						a: 1,
						b: 2
					}
				}
			}
		]

		advanceTime(990) // 10990
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		advanceTime(110) // 11000

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0.mock.calls[0][1]).toMatchObject(
			{
				type: 'POST',
				url: 'http://superfly.tv',
				params: {
					a: 1,
					b: 2
				}
			}
		)
		advanceTime(5000) // 16000
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
	})
})
