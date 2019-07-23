jest.mock('osc')
import { Conductor } from '../../conductor'
import {
	Mappings,
	DeviceType
} from '../../types/src'
import { MockTime } from '../../__tests__/mockTime.spec'
import { ThreadedClass } from 'threadedclass'
import { MappingSisyfos, TimelineContentTypeSisyfos } from '../../types/src/sisyfos'
import { SisyfosMessageDevice } from '../sisyfos'
import { getMockCall } from '../../__tests__/lib.spec'

describe('Sisyfos', () => {
	let mockTime = new MockTime()

	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})

	test('Sisyfos: set pst & lookahead and take to pgm', async () => {

		let commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})
		let myChannelMapping0: MappingSisyfos = {
			device: DeviceType.SISYFOS,
			deviceId: 'mySisyfos',
			channel: 0
		}
		let myChannelMapping1: MappingSisyfos = {
			device: DeviceType.SISYFOS,
			deviceId: 'mySisyfos',
			channel: 1
		}
		let myChannelMapping2: MappingSisyfos = {
			device: DeviceType.SISYFOS,
			deviceId: 'mySisyfos',
			channel: 1
		}
		let myChannelMapping3: MappingSisyfos = {
			device: DeviceType.SISYFOS,
			deviceId: 'mySisyfos',
			channel: 3
		}
		let myChannelMapping: Mappings = {
			'sisyfos_channel_1': myChannelMapping0,
			'sisyfos_channel_2': myChannelMapping1,
			'sisyfos_channel_2_lookahead': myChannelMapping2,
			'sisyfos_channel_4': myChannelMapping3
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})
		await myConductor.setMapping(myChannelMapping)
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await myConductor.addDevice('mySisyfos', {
			type: DeviceType.SISYFOS,
			options: {
				commandReceiver: commandReceiver0,
				host: '192.168.0.10',
				port: 8900
			}
		})
		await mockTime.advanceTimeToTicks(10100)

		let deviceContainer = myConductor.getDevice('mySisyfos')
		let device = deviceContainer.device as ThreadedClass<SisyfosMessageDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.timeline = [
			{
				id: 'obj0',
				enable: {
					start: mockTime.now - 1000, // 1 seconds in the past
					duration: 2000
				},
				layer: 'sisyfos_channel_1',
				content: {
					deviceType: DeviceType.SISYFOS,
					type: TimelineContentTypeSisyfos.SISYFOS,

					isPst: true
				}
			},
			{
				id: 'obj1',
				enable: {
					start: mockTime.now + 1000, // 1 seconds in the future
					duration: 4000
				},
				layer: 'sisyfos_channel_1',
				content: {
					deviceType: DeviceType.SISYFOS,
					type: TimelineContentTypeSisyfos.SISYFOS,

					isPgm: true
				}
			},
			{
				id: 'obj2',
				enable: {
					start: mockTime.now + 1000, // 1 seconds in the future
					duration: 2000
				},
				layer: 'sisyfos_channel_2_lookahead',
				content: {
					deviceType: DeviceType.SISYFOS,
					type: TimelineContentTypeSisyfos.SISYFOS,

					isPgm: true
				},
				isLookahead: true,
				lookaheadForLayer: 'sisyfos_channel_2'
			},
			{
				id: 'obj3',
				enable: {
					start: mockTime.now + 3000, // 3 seconds in the future
					duration: 2000
				},
				layer: 'sisyfos_channel_2',
				content: {
					deviceType: DeviceType.SISYFOS,
					type: TimelineContentTypeSisyfos.SISYFOS,

					isPgm: true
				}
			}
		]

		await mockTime.advanceTimeTicks(100) // now-ish
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		// set pst
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			type: 'togglePst',
			channel: 0,
			value: true
		})

		await mockTime.advanceTimeTicks(1000) // 1 seconds into the future
		expect(commandReceiver0.mock.calls.length).toEqual(3)
		// take
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			type: 'take'
		})
		// set pst
		expect(getMockCall(commandReceiver0, 2, 1)).toMatchObject({
			type: 'togglePst',
			channel: 1,
			value: true
		})

		await mockTime.advanceTimeTicks(2000) // 3 seconds into the future
		expect(commandReceiver0.mock.calls.length).toEqual(6)
		// set pst
		expect(getMockCall(commandReceiver0, 3, 1)).toMatchObject({
			type: 'togglePst',
			channel: 0,
			value: true
		})
		// take
		expect(getMockCall(commandReceiver0, 4, 1)).toMatchObject({
			type: 'take'
		})
		// set pst off
		expect(getMockCall(commandReceiver0, 5, 1)).toMatchObject({
			type: 'togglePst',
			channel: 0,
			value: false
		})

		await mockTime.advanceTimeTicks(2000) // 5 seconds into the future
		expect(commandReceiver0.mock.calls.length).toEqual(9)
		// take
		expect(getMockCall(commandReceiver0, 6, 1)).toMatchObject({
			type: 'take'
		})
		// set pst off
		expect(getMockCall(commandReceiver0, 7, 1)).toMatchObject({
			type: 'togglePst',
			channel: 0,
			value: false
		})
		// set pst off
		expect(getMockCall(commandReceiver0, 8, 1)).toMatchObject({
			type: 'togglePst',
			channel: 1,
			value: false
		})
	})

	test('Sisyfos: set lookahead and take to pgm, with lookahead still on', async () => {

		let commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})
		let myChannelMapping0: MappingSisyfos = {
			device: DeviceType.SISYFOS,
			deviceId: 'mySisyfos',
			channel: 0
		}
		let myChannelMapping1: MappingSisyfos = {
			device: DeviceType.SISYFOS,
			deviceId: 'mySisyfos',
			channel: 1
		}
		let myChannelMapping2: MappingSisyfos = {
			device: DeviceType.SISYFOS,
			deviceId: 'mySisyfos',
			channel: 1
		}
		let myChannelMapping3: MappingSisyfos = {
			device: DeviceType.SISYFOS,
			deviceId: 'mySisyfos',
			channel: 3
		}
		let myChannelMapping: Mappings = {
			'sisyfos_channel_1': myChannelMapping0,
			'sisyfos_channel_2': myChannelMapping1,
			'sisyfos_channel_2_lookahead': myChannelMapping2,
			'sisyfos_channel_4': myChannelMapping3
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})
		await myConductor.setMapping(myChannelMapping)
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await myConductor.addDevice('mySisyfos', {
			type: DeviceType.SISYFOS,
			options: {
				commandReceiver: commandReceiver0,
				host: '192.168.0.10',
				port: 8900
			}
		})
		await mockTime.advanceTimeToTicks(10100)

		let deviceContainer = myConductor.getDevice('mySisyfos')
		let device = deviceContainer.device as ThreadedClass<SisyfosMessageDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.timeline = [
			{
				id: 'obj0',
				enable: {
					start: mockTime.now - 1000, // 1 seconds in the past
					duration: 2000
				},
				layer: 'sisyfos_channel_2_lookahead',
				content: {
					deviceType: DeviceType.SISYFOS,
					type: TimelineContentTypeSisyfos.SISYFOS,

					isPgm: true
				},
				isLookahead: true,
				lookaheadForLayer: 'sisyfos_channel_2'
			},
			{
				id: 'obj1',
				enable: {
					start: mockTime.now + 1000, // 1 seconds in the future
					duration: 2000
				},
				layer: 'sisyfos_channel_2',
				content: {
					deviceType: DeviceType.SISYFOS,
					type: TimelineContentTypeSisyfos.SISYFOS,

					isPgm: true
				}
			},
			{
				id: 'obj2',
				enable: {
					start: mockTime.now + 1000, // 1 seconds in the past
					duration: 2000
				},
				layer: 'sisyfos_channel_2_lookahead',
				content: {
					deviceType: DeviceType.SISYFOS,
					type: TimelineContentTypeSisyfos.SISYFOS,

					isPgm: false
				},
				isLookahead: true,
				lookaheadForLayer: 'sisyfos_channel_2'
			}
		]

		await mockTime.advanceTimeTicks(100) // now-ish
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		// set pst
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			type: 'togglePst',
			channel: 1,
			value: true
		})

		await mockTime.advanceTimeTicks(1000) // 1 seconds into the future
		expect(commandReceiver0.mock.calls.length).toEqual(2)
		// take
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			type: 'take'
		})

		await mockTime.advanceTimeTicks(2000) // 3 seconds into the future
		expect(commandReceiver0.mock.calls.length).toEqual(4)
		// take
		expect(getMockCall(commandReceiver0, 2, 1)).toMatchObject({
			type: 'take'
		})
		// set pst off
		expect(getMockCall(commandReceiver0, 3, 1)).toMatchObject({
			type: 'togglePst',
			channel: 1,
			value: false
		})
	})
})
