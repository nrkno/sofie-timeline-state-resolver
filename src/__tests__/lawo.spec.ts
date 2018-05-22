import { Commands, Atem } from 'atem-connection'
import { Enums } from 'atem-state'
import { Resolver, TimelineObject, TimelineState, TriggerType } from 'superfly-timeline'

import { Mappings, MappingLawo, DeviceType } from '../devices/mapping'
import { Conductor } from '../conductor'
import { LawoDevice } from '../devices/lawo'

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
		channel: 0
	}
	let myChannelMapping: Mappings = {
		'myChannel0': myChannelMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myLawo': {
				type: DeviceType.LAWO,
				options: {
					commandReceiver: commandReceiver0
				}
			}
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
			LLayer: 'myChannel0',
			content: {
				muted: false,
				volume: 100
			}
		}
	]

	advanceTime(1000)

	expect(commandReceiver0.mock.calls[0][1]).toMatchObject(
		{
			type: 'VOLUME',
			channelNo: 0,
			value: 100
		}
	)
	expect(commandReceiver0.mock.calls[1][1]).toMatchObject(
		{
			type: 'MUTED',
			channelNo: 0,
			value: false
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
		channel: 0
	}
	let myChannelMapping: Mappings = {
		'myChannel0': myChannelMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myLawo': {
				type: DeviceType.LAWO,
				options: {
					commandReceiver: commandReceiver0
				}
			}
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
			LLayer: 'myChannel0',
			content: {
				muted: false,
				volume: 100
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
			LLayer: 'myChannel0',
			content: {
				muted: false,
				volume: 50
			}
		}
	]
	advanceTime(100)
	expect(commandReceiver0.mock.calls[2][1]).toMatchObject(
		{
			type: 'VOLUME',
			channelNo: 0,
			value: 50
		}
	)
})

test('Lawo: mute channel', async () => {
	now = 1000
	jest.useFakeTimers()

	let commandReceiver0 = jest.fn((command) => {
		// nothing.
	})
	let myChannelMapping0: MappingLawo = {
		device: DeviceType.LAWO,
		deviceId: 'myLawo',
		channel: 0
	}
	let myChannelMapping: Mappings = {
		'myChannel0': myChannelMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myLawo': {
				type: DeviceType.LAWO,
				options: {
					commandReceiver: commandReceiver0
				}
			}
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
			LLayer: 'myChannel0',
			content: {
				muted: false,
				volume: 100
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
			LLayer: 'myChannel0',
			content: {
				muted: true,
				volume: 100
			}
		}
	]
	advanceTime(100)
	expect(commandReceiver0.mock.calls[2][1]).toMatchObject(
		{
			type: 'MUTED',
			channelNo: 0,
			value: true
		}
	)
})

test('Lawo: remove channel', async () => {
	now = 1000
	jest.useFakeTimers()

	let commandReceiver0 = jest.fn((command) => {
		// nothing.
	})
	let myChannelMapping0: MappingLawo = {
		device: DeviceType.LAWO,
		deviceId: 'myLawo',
		channel: 0
	}
	let myChannelMapping: Mappings = {
		'myChannel0': myChannelMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myLawo': {
				type: DeviceType.LAWO,
				options: {
					commandReceiver: commandReceiver0
				}
			}
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
			LLayer: 'myChannel0',
			content: {
				muted: false,
				volume: 100
			}
		}
	]

	advanceTime(100)
	myConductor.timeline = [
	]
	advanceTime(100)
	expect(commandReceiver0.mock.calls[2][1]).toMatchObject(
		{
			type: 'VOLUME',
			channelNo: 0,
			value: 0
		}
	)
	expect(commandReceiver0.mock.calls[3][1]).toMatchObject(
		{
			type: 'MUTED',
			channelNo: 0,
			value: true
		}
	)
})
