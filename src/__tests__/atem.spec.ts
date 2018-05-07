// import {Resolver, Enums} from "superfly-timeline"
import { Commands, Atem } from 'atem-connection'
import { Enums } from 'atem-state'
import { Resolver, TimelineObject, TimelineState, TriggerType } from 'superfly-timeline'

import { Mappings, MappingAtem, DeviceType, MappingAtemType } from '../devices/mapping'
import { Conductor } from '../conductor'
import { AtemDevice } from '../devices/atem'

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

test('Atem: switch input', async () => {
	jest.useFakeTimers()

	let commandReceiver0 = jest.fn((command) => {
		// nothing.
	})
	let myLayerMapping0: MappingAtem = {
		device: DeviceType.ATEM,
		deviceId: 'myAtem',
		mappingType: MappingAtemType.MixEffect,
		index: 0
	}
	let myLayerMapping: Mappings = {
		'myLayer0': myLayerMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myAtem': {
				type: DeviceType.ATEM,
				options: {
					commandReceiver: commandReceiver0,
					host: '192.168.168.240',
					port: 9910
				}
			}
		},
		initializeAsClear: true,
		getCurrentTime: getCurrentTime
	})
	myConductor.mapping = myLayerMapping
	await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
	advanceTime(100) // 1100

	let device = myConductor.getDevice('myAtem') as AtemDevice
	// console.log(device._device.state)

	// Check that no commands has been scheduled:
	expect(device.queue).toHaveLength(0)

	myConductor.timeline = [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 1000 // 1 seconds ago
			},
			duration: 2000,
			LLayer: 'myLayer0',
			content: {
				input: 2,
				transition: Enums.TransitionStyle.CUT
			}
		}
	]

	advanceTime(100) // 1200

	expect(commandReceiver0.mock.calls[0][1]).toMatchObject(
		{
			flag: 0,
			rawName: 'PrvI',
			mixEffect: 0,
			properties: {
				source: 2
			}
		}
	)
	expect(commandReceiver0.mock.calls[1][1]).toMatchObject(
		{
			flag: 0,
			rawName: 'DCut',
			mixEffect: 0
		}
	)
})
