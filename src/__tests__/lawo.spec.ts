import { Resolver, TimelineObject, TimelineState, TriggerType } from 'superfly-timeline'

import { Mappings, MappingLawo, DeviceType } from '../devices/mapping'
import { Conductor } from '../conductor'
import { LawoDevice } from '../devices/lawo'
import { DeviceOptions } from '../devices/device'
import { DeviceTree } from 'emberplus'

let nowActual: number = Date.now()
let now: number = 1000

beforeAll(() => {
	Date.now = jest.fn()
	Date.now['mockReturnValue'](1000)
})
function getCurrentTime () {
	return now
}

function advanceTime (advanceTime: number) {
	now += advanceTime
	jest.advanceTimersByTime(advanceTime)
	// console.log('Advancing ' + advanceTime + ' ms -----------------------')
}

test('Lawo: add channel', async () => {
	jest.useFakeTimers()

	let commandReceiver0 = jest.fn((command) => {
		// nothing.
	})
	let myChannelMapping0: MappingLawo = {
		device: DeviceType.LAWO,
		deviceId: 'myLawo',
		path: [1, 1, 2, 3],
		defaults: {
			'Motor dB Value': -191
		}
	}
	let myChannelMapping: Mappings = {
		'lawo_c1_fader': myChannelMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myLawo': {
				type: DeviceType.LAWO,
				host: '160.67.96.51',
				port: 9000,
				options: {
					commandReceiver: commandReceiver0
				}
			} as DeviceOptions
		},
		initializeAsClear: true,
		getCurrentTime: getCurrentTime
	})
	myConductor.mapping = myChannelMapping
	await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
	advanceTime(100) // 1100

	let device = myConductor.getDevice('myLawo') as LawoDevice
	// console.log(device._device.state)

	// Check that no commands has been scheduled:
	expect(device.queue).toHaveLength(0)

	myConductor.timeline = [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now + 1000 // 1 seconds in the future
			},
			duration: 2000,
			LLayer: 'lawo_c1_fader',
			content: {
				'Motor dB Value': -6
			}
		}
	]

	advanceTime(1000)

	expect(commandReceiver0.mock.calls[0][1]).toMatchObject(
		{
			attribute: 'Motor dB Value',
			value: -6,
			path: '1/1/2/3'
		}
	)

	advanceTime(2000)
	expect(commandReceiver0.mock.calls[1][1]).toMatchObject(
		{
			attribute: 'Motor dB Value',
			value: -191,
			path: '1/1/2/3'
		}
	)
})

test('Lawo: change volume', async () => {
	now = 1000
	jest.useFakeTimers()

	let commandReceiver0 = jest.fn((command) => {
		// nothing.
	})
	let myChannelMapping0: MappingLawo = {
		device: DeviceType.LAWO,
		deviceId: 'myLawo',
		path: [1, 1, 2, 3],
		defaults: {
			'Motor dB Value': -191
		}
	}
	let myChannelMapping: Mappings = {
		'lawo_c1_fader': myChannelMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myLawo': {
				type: DeviceType.LAWO,
				host: '160.67.96.51',
				port: 9000,
				options: {
					commandReceiver: commandReceiver0
				}
			} as DeviceOptions
		},
		initializeAsClear: true,
		getCurrentTime: getCurrentTime
	})
	myConductor.mapping = myChannelMapping
	await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
	advanceTime(100) // 1100

	let device = myConductor.getDevice('myLawo') as LawoDevice
	// console.log(device._device.state)

	// Check that no commands has been scheduled:
	expect(device.queue).toHaveLength(0)

	myConductor.timeline = [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 1000 // 1 seconds in the future
			},
			duration: 2000,
			LLayer: 'lawo_c1_fader',
			content: {
				'Motor dB Value': 0 // 0 dBFS
			}
		}
	]

	advanceTime(100)
	myConductor.timeline = [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 1000 // 1 seconds in the future
			},
			duration: 2000,
			LLayer: 'lawo_c1_fader',
			content: {
				'Motor dB Value': -15 // -15 dBFS
			}
		}
	]
	advanceTime(100)
	expect(commandReceiver0.mock.calls[1][1]).toMatchObject(
		{
			path: '1/1/2/3',
			attribute: 'Motor dB Value',
			value: -15
		}
	)
})