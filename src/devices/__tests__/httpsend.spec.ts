// import {Resolver, Enums} from "superfly-timeline"
// import { Commands, Atem } from 'atem-connection'
import { TriggerType } from 'superfly-timeline'
import { Conductor } from '../../conductor'
import { HttpSendDevice } from '../httpSend'
import {
	MappingHTTPSend,
	Mappings,
	DeviceType
} from '../../types/'
import { MockTime } from '../../__tests__/mockTime.spec'

// let nowActual = Date.now()
describe('HTTP-Send', () => {
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
		let myLayerMapping0: MappingHTTPSend = {
			device: DeviceType.HTTPSEND,
			deviceId: 'myHTTP'
		}
		let myLayerMapping: Mappings = {
			'myLayer0': myLayerMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})
		await myConductor.init()
		await myConductor.addDevice('myHTTP', {
			type: DeviceType.HTTPSEND,
			options: {
				commandReceiver: commandReceiver0
			}
		})
		myConductor.mapping = myLayerMapping
		mockTime.advanceTimeTo(10100)

		let device = myConductor.getDevice('myHTTP') as HttpSendDevice

		// Check that no commands has been scheduled:
		expect(device.queue).toHaveLength(0)

		myConductor.timeline = [
			{
				id: 'obj0',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: mockTime.now + 1000 // in 1 second
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

		mockTime.advanceTimeTo(10990)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		mockTime.advanceTimeTo(11100)

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
		expect(commandReceiver0.mock.calls[0][2]).toMatch(/added/) // context
		mockTime.advanceTimeTo(16000)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
	})
})
