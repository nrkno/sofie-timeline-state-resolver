jest.mock('osc')
import { Conductor } from '../../conductor'
import {
	Mappings,
	DeviceType
} from '../../types/src'
import { MockOSC } from '../../__mocks__/osc'
import { MockTime } from '../../__tests__/mockTime.spec'
import { ThreadedClass } from 'threadedclass'
import { MappingSisyfos, TimelineContentTypeSisyfos } from '../../types/src/sisyfos'
import { SisyfosMessageDevice } from '../sisyfos'
import { getMockCall } from '../../__tests__/lib.spec'

describe('Sisyfos', () => {
	let mockTime = new MockTime()

	const orgSetTimeout = setTimeout

	function wait (time: number = 1) {
		return new Promise((resolve) => {
			orgSetTimeout(resolve, time)
		})
	}

	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})

	test('Sisyfos: set ch1: pgm & ch2: lookahead and then ch1: vo, ch2: pgm', async () => {

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
			'sisyfos_channel_3': myChannelMapping3
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

					isPgm: 1
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

					isPgm: 2
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

					isPgm: 1
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

					isPgm: 1
				}
			},
			{
				id: 'obj4',
				enable: {
					start: mockTime.now + 4000, // 3 seconds in the future
					duration: 2000
				},
				layer: 'sisyfos_channel_1',
				content: {
					deviceType: DeviceType.SISYFOS,
					type: TimelineContentTypeSisyfos.SISYFOS,

					fadeToBlack: true
				}
			}
		]

		await mockTime.advanceTimeTicks(100) // now-ish
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		// set pgm
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			type: 'togglePgm',
			channel: 0,
			value: 1
		})

		await mockTime.advanceTimeTicks(1000) // 1 seconds into the future
		expect(commandReceiver0.mock.calls.length).toEqual(3)
		// set VO
		expect(getMockCall(commandReceiver0, 2, 1)).toMatchObject({
			type: 'togglePst',
			channel: 1,
			value: 1
		})

		await mockTime.advanceTimeTicks(2000) // 3 seconds into the future
		expect(commandReceiver0.mock.calls.length).toEqual(5)
		// set pst
		expect(getMockCall(commandReceiver0, 3, 1)).toMatchObject({
			type: 'togglePgm',
			channel: 1,
			value: 1
		})

		await mockTime.advanceTimeTicks(2000) // 5 seconds into the future
		expect(commandReceiver0.mock.calls.length).toEqual(8)
		// set pst off
		expect(getMockCall(commandReceiver0, 4, 1)).toMatchObject({
			type: 'togglePst',
			channel: 1,
			value: 0
		})
		// set pst off
		expect(getMockCall(commandReceiver0, 5, 1)).toMatchObject({
			type: 'togglePgm',
			channel: 0,
			value: 0
		})
		// fadeToBlack
		expect(getMockCall(commandReceiver0, 6, 1)).toMatchObject({
			type: 'fadeToBlack',
			channel: 0,
			value: true
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
			'sisyfos_channel_3': myChannelMapping3
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

					isPgm: 1
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

					isPgm: 1
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

					isPgm: 0
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
			value: 1
		})

		await mockTime.advanceTimeTicks(1000) // 1 seconds into the future
		expect(commandReceiver0.mock.calls.length).toEqual(3)

		await mockTime.advanceTimeTicks(2000) // 3 seconds into the future
		expect(commandReceiver0.mock.calls.length).toEqual(4)

		// set pst off
		expect(getMockCall(commandReceiver0, 3, 1)).toMatchObject({
			type: 'togglePgm',
			channel: 1,
			value: 0
		})
	})

	test('Connection status', async () => {
		let commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})
		// await myConductor.setMapping(myChannelMapping)
		await myConductor.init()
		await myConductor.addDevice('mySisyfos', {
			type: DeviceType.SISYFOS,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				port: 1234
			}
		})
		await mockTime.advanceTimeToTicks(10100)

		let deviceContainer = myConductor.getDevice('mySisyfos')
		let device = deviceContainer.device as ThreadedClass<SisyfosMessageDevice>

		let onConnectionChanged = jest.fn()
		await device.on('connectionChanged', onConnectionChanged)

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)
		expect(await device.connected).toEqual(true)
		expect(onConnectionChanged).toHaveBeenCalledTimes(0)

		// Simulate a connection loss:
		MockOSC.connectionIsGood = false

		await mockTime.advanceTimeTicks(3000)
		await(wait(1))
		await mockTime.advanceTimeTicks(3000)
		await(wait(1))

		expect(await device.connected).toEqual(false)
		expect(onConnectionChanged).toHaveBeenCalledTimes(1)

		// Simulate a connection regain:
		MockOSC.connectionIsGood = true
		await mockTime.advanceTimeTicks(3000)
		await(wait(1))
		await mockTime.advanceTimeTicks(3000)
		await(wait(1))

		expect(await device.connected).toEqual(true)
		expect(onConnectionChanged).toHaveBeenCalledTimes(2)
	})
})
