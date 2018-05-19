import { TriggerType } from 'superfly-timeline'

import { Mappings, MappingAbstract, DeviceType } from '../devices/mapping'
import { Conductor, TimelineTriggerTimeResult, TimelineContentObject } from '../conductor'
import * as _ from 'underscore'

// let nowActual: number = Date.now()

describe('Conductor', () => {
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
	test('Test Abstract-device functionality', async () => {
		jest.useFakeTimers()

		let commandReceiver0 = jest.fn(() => {
			// nothing
		})
		let commandReceiver1 = jest.fn(() => {
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
			// devices: {
			// 	'device0': {
			// 		type: DeviceType.ABSTRACT,
			// 		options: {
			// 			commandReceiver: commandReceiver0
			// 		}
			// 	},
			// 	'device1': {
			// 		type: DeviceType.ABSTRACT,
			// 		options: {
			// 			commandReceiver: commandReceiver1
			// 		}
			// 	}
			// },
			initializeAsClear: true,
			getCurrentTime: getCurrentTime
		})

		conductor.mapping = myLayerMapping
		await conductor.init()

		// add something that will play in a seconds time
		let abstractThing0: TimelineContentObject = {
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
		let abstractThing1: TimelineContentObject = {
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
		expect(device0['queue']).toHaveLength(0)
		expect(device1['queue']).toHaveLength(0)

		conductor.timeline = [abstractThing0, abstractThing1]

		// there should now be one command queued:
		expect(device0['queue']).toHaveLength(1)
		expect(device1['queue']).toHaveLength(0)

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

		// expect(device0['queue']).toHaveLength(0)

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

		await conductor.removeDevice('device1').then((res) => {
			expect(res).toBe(true)
		})
		expect(conductor.getDevice('device1')).toBe(undefined)

		conductor.addDevice(
			'device1',
			{ type: DeviceType.ABSTRACT, options: { commandReceiver: commandReceiver1 } }
		).then((res) => {
			expect(res).toBe(true)
		})
		.catch((e) => {
			throw e
		})

		conductor.mapping = {
			'myLayer0': myLayerMapping1,
			'myLayer1': myLayerMapping0
		}
		abstractThing0.trigger.value = now
		conductor.timeline = [ abstractThing0 ]
	})

	test.only('Test the "Now" and "Callback-functionality', async () => {
		jest.useFakeTimers()

		let commandReceiver0 = jest.fn(() => {
			// nothing
		})

		let myLayerMapping0: MappingAbstract = {
			device: DeviceType.ABSTRACT,
			deviceId: 'device0',
			abstractPipe: 32
		}
		let myLayerMapping: Mappings = {
			'myLayer0': myLayerMapping0
		}

		let conductor = new Conductor({
			devices: {
				'device0': {
					type: DeviceType.ABSTRACT,
					options: {
						commandReceiver: commandReceiver0
					}
				}
			},
			initializeAsClear: true,
			getCurrentTime: getCurrentTime
		})

		await conductor.init()
		conductor.mapping = myLayerMapping

		// add something that will play "now"
		let abstractThing0: TimelineContentObject = {
			id: 'a0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: 'now'
			},
			duration: 5000,
			LLayer: 'myLayer0',
			content: {
				myAttr1: 'one',
				myAttr2: 'two'
			}
		}
		let abstractThing1: TimelineContentObject = {
			id: 'a1',
			trigger: {
				type: TriggerType.TIME_RELATIVE,
				value: '#a0.start + 300'
			},
			duration: 5000,
			LLayer: 'myLayer0',
			content: {
				myAttr1: 'one',
				myAttr2: 'two',
				callBack: 'abc',
				callBackData: {
					hello: 'dude'
				}
			}
		}
		let timeline = [abstractThing0, abstractThing1]

		let setTimelineTriggerTime = jest.fn((r: TimelineTriggerTimeResult) => {
			_.each(r.objectIds, (id) => {
				let o = _.findWhere(timeline, { id: id })
				if (o) {
					o.trigger.value = r.time
				}
			})
			// update the timeline:
			// console.log('Setting timeline from callback..')
			conductor.timeline = timeline
		})
		conductor.on('setTimelineTriggerTime', setTimelineTriggerTime)
		let timelineCallback = jest.fn()
		conductor.on('timelineCallback', timelineCallback)

		let device0 = conductor.getDevice('device0')
		// let device1 = conductor.getDevice('device1')

		// The queues should be empty
		expect(device0['queue']).toHaveLength(0)
		// expect(device1['queue']).toHaveLength(0)

		// console.log('Setting timeline..')
		conductor.timeline = timeline

		// there should now be one command queued:
		expect(device0['queue']).toHaveLength(1)

		// the setTimelineTriggerTime event should have been emitted:
		expect(setTimelineTriggerTime).toHaveBeenCalledTimes(1)
		expect(setTimelineTriggerTime.mock.calls[0][0].time).toEqual(1000)

		// the timelineCallback event should have been emitted:
		expect(timelineCallback).toHaveBeenCalledTimes(0)

		// Move forward in time
		advanceTime(100) // to time 1100

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(timelineCallback).toHaveBeenCalledTimes(0)
		// console.log(timelineCallback.mock.calls)

		advanceTime(400) // to time 1500

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(timelineCallback).toHaveBeenCalledTimes(1)
		expect(timelineCallback.mock.calls[0][0]).toEqual(1300)
		expect(timelineCallback.mock.calls[0][1]).toEqual('a1')
		expect(timelineCallback.mock.calls[0][2]).toEqual('abc')
		expect(timelineCallback.mock.calls[0][3]).toEqual({hello: 'dude'})

		advanceTime(5000) // to time 6500

		expect(commandReceiver0).toHaveBeenCalledTimes(3)

	})
})
