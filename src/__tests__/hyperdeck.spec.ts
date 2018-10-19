jest.mock('hyperdeck-connection')
import { TriggerType } from 'superfly-timeline'

import { Mappings, MappingHyperdeck, DeviceType, MappingHyperdeckType } from '../devices/mapping'
import { Conductor } from '../conductor'
import {
	HyperdeckDevice,
	TimelineContentTypeHyperdeck
} from '../devices/hyperdeck'
import { RecordCommand, StopCommand } from 'hyperdeck-connection/dist/commands'

let myChannelMapping0: MappingHyperdeck = {
	device: DeviceType.HYPERDECK,
	deviceId: 'hyperdeck0',
	mappingType: MappingHyperdeckType.TRANSPORT
}

describe('Hyperdeck', () => {
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

	test('Hyperdeck: Record', async () => {

		let commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})
		let myChannelMapping: Mappings = {
			'hyperdeck0_transport': myChannelMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: getCurrentTime
		})
		myConductor.mapping = myChannelMapping
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await myConductor.addDevice('hyperdeck0', {
			type: DeviceType.HYPERDECK,
			options: {
				host: '127.0.0.1',
				port: 9993,
				commandReceiver: commandReceiver0
			}
		})
		advanceTime(100) // 1100

		let device = myConductor.getDevice('hyperdeck0') as HyperdeckDevice

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
				LLayer: 'hyperdeck0_transport',
				content: {
					type: TimelineContentTypeHyperdeck.TRANSPORT,
					attributes: {
						status: 'record',
						recordFilename: 'sofie_dev'
					}
				}
			},
			{
				id: 'obj1',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: now + 500 // 0.5 seconds in the future
				},
				duration: 2000,
				LLayer: 'hyperdeck0_transport',
				content: {
					type: TimelineContentTypeHyperdeck.TRANSPORT,
					attributes: {
						status: 'preview'
					}
				}
			}
		]

		advanceTime(100) // 1200

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0.mock.calls[0][1]).toBeInstanceOf(RecordCommand)
		expect(commandReceiver0.mock.calls[0][1]).toHaveProperty('filename', 'sofie_dev')
		expect(commandReceiver0.mock.calls[0][2]).toBeNull() // context

		advanceTime(800) // 2000

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0.mock.calls[1][1]).toBeInstanceOf(StopCommand)
		expect(commandReceiver0.mock.calls[1][2]).toBeNull() // context

		advanceTime(500) // 2500
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		// no new commands should have been sent, becuse obj2 is the same as obj1
	})
})
