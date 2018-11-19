jest.mock('hyperdeck-connection')
import { TriggerType } from 'superfly-timeline'
import { Conductor } from '../../conductor'
import {
	HyperdeckDevice
} from '../hyperdeck'
import { RecordCommand, StopCommand } from 'hyperdeck-connection/dist/commands'
import { Hyperdeck } from '../../__mocks__/hyperdeck-connection'
import {
	Mappings,
	DeviceType,
	TimelineContentTypeHyperdeck,
	MappingHyperdeck,
	MappingHyperdeckType
} from '../../types/'
import { MockTime } from '../../__tests__/mockTime.spec'

let myChannelMapping0: MappingHyperdeck = {
	device: DeviceType.HYPERDECK,
	deviceId: 'hyperdeck0',
	mappingType: MappingHyperdeckType.TRANSPORT
}

describe('Hyperdeck', () => {
	let mockTime = new MockTime()

	beforeAll(() => {
		Date.now = jest.fn()
		Date.now['mockReturnValue'](1000)
	})
	beforeEach(() => {
		mockTime.init()
	})

	test('Hyperdeck: Record', async () => {
		let device: HyperdeckDevice

		let commandReceiver0 = jest.fn((...args: any[]) => {
			// Just forward the command:

			// @ts-ignore private function
			return device._defaultCommandReceiver(...args)
		})
		let myChannelMapping: Mappings = {
			'hyperdeck0_transport': myChannelMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
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
		mockTime.advanceTimeTo(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		let hyperdeckInstances = Hyperdeck.getMockInstances()
		expect(hyperdeckInstances).toHaveLength(1)

		let hyperdeckMock: Hyperdeck = hyperdeckInstances[0]

		let hyperdeckMockCommand = jest.fn(() => {
			return Promise.resolve()
		})
		hyperdeckMock.setMockCommandReceiver(hyperdeckMockCommand)

		device = myConductor.getDevice('hyperdeck0') as HyperdeckDevice

		// Check that no commands has been scheduled:
		expect(device.queue).toHaveLength(0)
		myConductor.timeline = [
			{
				id: 'obj0',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: 9000
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
					value: 10500
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

		mockTime.advanceTimeTo(10200)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0.mock.calls[0][1]).toBeInstanceOf(RecordCommand)
		expect(commandReceiver0.mock.calls[0][1]).toHaveProperty('filename', 'sofie_dev')
		expect(commandReceiver0.mock.calls[0][2]).toBeTruthy() // context
		// also test the actual command sent to hyperdeck:
		expect(hyperdeckMockCommand).toHaveBeenCalledTimes(1)
		expect(hyperdeckMockCommand.mock.calls[0][0]).toBeInstanceOf(RecordCommand)
		expect(hyperdeckMockCommand.mock.calls[0][0]).toMatchObject({
			filename: 'sofie_dev'
		})

		myConductor.timeline = myConductor.timeline // Same timeline
		mockTime.advanceTimeTo(10400)
		expect(hyperdeckMockCommand).toHaveBeenCalledTimes(1) // nothing has changed, so it should not be called again

		mockTime.advanceTimeTo(12000)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0.mock.calls[1][1]).toBeInstanceOf(StopCommand)
		expect(commandReceiver0.mock.calls[1][2]).toBeTruthy() // context

		mockTime.advanceTimeTo(13000)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		// no new commands should have been sent, becuse obj2 is the same as obj1
	})
})
