import { Resolver, TimelineObject, TimelineState, TriggerType } from 'superfly-timeline'

import { Mappings, MappingCasparCG, MappingAbstract, DeviceType } from '../devices/mapping'
import { Conductor } from '../conductor'

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

test('Test Abstract-device functionality', async () => {
	jest.useFakeTimers()

	let commandReceiver0 = jest.fn((command) => {
		// nothing
	})
	let commandReceiver1 = jest.fn((command) => {
		// nothing
	})

	let myLayerMapping0: MappingAbstract = {
		device: DeviceType.ABSTRACT,
		deviceId: 'device0',
		abstractPipe: 32
	}
	let myLayerMapping1: MappingAbstract = {
		device: DeviceType.ABSTRACT,
		deviceId: 'device1',
		abstractPipe: 33
	}
	let myLayerMapping: Mappings = {
		'myLayer0': myLayerMapping0,
		'myLayer1': myLayerMapping1
	}

	let conductor = new Conductor({
		devices: {
			'device0': {
				type: DeviceType.ABSTRACT,
				options: {
					commandReceiver: commandReceiver0
				}
			},
			'device1': {
				type: DeviceType.ABSTRACT,
				options: {
					commandReceiver: commandReceiver1
				}
			}
		},
		initializeAsClear: true,
		getCurrentTime: getCurrentTime
	})

	conductor.mapping = myLayerMapping
	await conductor.init()

	// add something that will play in a seconds time
	let abstractThing0: TimelineObject = {
		id: 'a0',
		trigger: {
			type: TriggerType.TIME_ABSOLUTE,
			value: now
		},
		duration: 1000,
		LLayer: 'myLayer0',
		content: {
			myAttr1: 'one',
			myAttr2: 'two'
		}
	}
	let abstractThing1: TimelineObject = {
		id: 'a1',
		trigger: {
			type: TriggerType.TIME_ABSOLUTE,
			value: now + 1000
		},
		duration: 1000,
		LLayer: 'myLayer1',
		content: {
			myAttr1: 'one',
			myAttr2: 'two'
		}
	}

	let device0 = conductor.getDevice('device0')
	let device1 = conductor.getDevice('device1')

	// The queues should be empty
	expect(device0.queue).toHaveLength(0)
	expect(device1.queue).toHaveLength(0)

	conductor.timeline = [abstractThing0, abstractThing1]

	// there should now be one command queued:
	expect(device0.queue).toHaveLength(1)
	expect(device1.queue).toHaveLength(0)

	// Move forward in time
	advanceTime(500) // to time 1500

	expect(commandReceiver0).toHaveBeenCalledTimes(1)
	expect(commandReceiver0.mock.calls[0][0]).toEqual(1500)
	expect(commandReceiver0.mock.calls[0][1]).toMatchObject({
		commandName: 'addedAbstract',
		content: {
			GLayer: 'myLayer0',
			myAttr1: 'one',
			myAttr2: 'two'
		}
	})
	expect(commandReceiver1).toHaveBeenCalledTimes(0)

	commandReceiver0.mockClear()
	advanceTime(1000) // 2500

	// expect(device0.queue).toHaveLength(0)

	expect(commandReceiver0).toHaveBeenCalledTimes(1)
	expect(commandReceiver0.mock.calls[0][0]).toEqual(2500)
	expect(commandReceiver0.mock.calls[0][1]).toMatchObject({
		commandName: 'removedAbstract',
		content: {
			GLayer: 'myLayer0',
			myAttr1: 'one',
			myAttr2: 'two'
		}
	})
	expect(commandReceiver1).toHaveBeenCalledTimes(1)
	expect(commandReceiver1.mock.calls[0][0]).toEqual(2500)
	expect(commandReceiver1.mock.calls[0][1]).toMatchObject({
		commandName: 'addedAbstract',
		content: {
			GLayer: 'myLayer1',
			myAttr1: 'one',
			myAttr2: 'two'
		}
	})

	commandReceiver0.mockClear()
	commandReceiver1.mockClear()
	advanceTime(3000) // 5500

	expect(commandReceiver0).toHaveBeenCalledTimes(0)
	expect(commandReceiver1).toHaveBeenCalledTimes(1)
	expect(commandReceiver1.mock.calls[0][0]).toEqual(5500)
	expect(commandReceiver1.mock.calls[0][1]).toMatchObject({
		commandName: 'removedAbstract',
		content: {
			GLayer: 'myLayer1',
			myAttr1: 'one',
			myAttr2: 'two'
		}
	})
})
