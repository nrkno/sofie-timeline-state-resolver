import { TriggerType } from 'superfly-timeline'

import { Mappings, MappingAbstract, DeviceType } from '../devices/mapping'
import { Conductor, TimelineTriggerTimeResult, TimelineContentObject } from '../conductor'
import * as _ from 'underscore'

// let nowActual: number = Date.now()
let externalLog = (...args) => {
	args = args
	// console.log('trace', ...args)
}
// process.on('unhandledRejection', (reason, p) => {
// 	setTimeout(() => {
// 		console.log('Unhandled Rejection at: Promise' + p + 'reason:' + reason.stack)
// 	},10)
// 	console.log('Unhandled Rejection at: Promise' + p + 'reason:' + reason.stack)
// })

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
	beforeEach(() => {
		now = 10000
		jest.useFakeTimers()
	})
	test('Test Abstract-device functionality', async () => {

		let commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})
		let commandReceiver1 = jest.fn(() => {
			return Promise.resolve()
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
			externalLog: externalLog,
			initializeAsClear: true,
			getCurrentTime: getCurrentTime
		})

		conductor.mapping = myLayerMapping
		await conductor.init()
		await conductor.addDevice('device0', {
			type: DeviceType.ABSTRACT,
			options: {
				commandReceiver: commandReceiver0
			}
		})
		await conductor.addDevice('device1', {
			type: DeviceType.ABSTRACT,
			options: {
				commandReceiver: commandReceiver1
			}
		})

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
				myAttr1: 'three',
				myAttr2: 'four'
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
		advanceTime(500) // to time 10500

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0.mock.calls[0][0]).toEqual(10000)
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
		advanceTime(1000) // 11500

		// expect(device0['queue']).toHaveLength(0)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0.mock.calls[0][0]).toEqual(11000)
		expect(commandReceiver0.mock.calls[0][1]).toMatchObject({
			commandName: 'removedAbstract',
			content: {
				GLayer: 'myLayer0',
				myAttr1: 'one',
				myAttr2: 'two'
			}
		})
		expect(commandReceiver1).toHaveBeenCalledTimes(1)
		expect(commandReceiver1.mock.calls[0][0]).toEqual(11000)
		expect(commandReceiver1.mock.calls[0][1]).toMatchObject({
			commandName: 'addedAbstract',
			content: {
				GLayer: 'myLayer1',
				myAttr1: 'three',
				myAttr2: 'four'
			}
		})

		commandReceiver0.mockClear()
		commandReceiver1.mockClear()
		advanceTime(3000)

		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		expect(commandReceiver1).toHaveBeenCalledTimes(1)
		expect(commandReceiver1.mock.calls[0][0]).toEqual(12000)
		expect(commandReceiver1.mock.calls[0][1]).toMatchObject({
			commandName: 'removedAbstract',
			content: {
				GLayer: 'myLayer1',
				myAttr1: 'three',
				myAttr2: 'four'
			}
		})

		await conductor.removeDevice('device1')
		expect(conductor.getDevice('device1')).toBeFalsy()

		await conductor.addDevice(
			'device1',
			{ type: DeviceType.ABSTRACT, options: { commandReceiver: commandReceiver1 } }
		).then((res) => {
			expect(res).toBeTruthy()
		})

		conductor.mapping = {
			'myLayer0': myLayerMapping1,
			'myLayer1': myLayerMapping0
		}
		abstractThing0.trigger.value = now
		conductor.timeline = [ abstractThing0 ]
	})

	test('Test the "Now" and "Callback-functionality', async () => {

		let commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
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
			externalLog: externalLog,
			initializeAsClear: true,
			getCurrentTime: getCurrentTime
		})

		await conductor.init()
		await conductor.addDevice('device0', {
			type: DeviceType.ABSTRACT,
			options: {
				commandReceiver: commandReceiver0
			}
		})
		conductor.mapping = myLayerMapping

		// add something that will play "now"
		let abstractThing0: TimelineContentObject = { // will be converted from "now" to 10000
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
		let abstractThing1: TimelineContentObject = { // will cause a callback to be sent
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

		let setTimelineTriggerTime = jest.fn((results: TimelineTriggerTimeResult) => {
			_.each(results, (trigger) => {
				let o = _.findWhere(timeline, { id: trigger.id })
				if (o) {
					o.trigger.value = trigger.time
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
		expect(device0).toBeTruthy()
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
		expect(setTimelineTriggerTime.mock.calls[0][0][0].time).toEqual(10000)

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
		expect(timelineCallback.mock.calls[0][0]).toEqual(10300)
		expect(timelineCallback.mock.calls[0][1]).toEqual('a1')
		expect(timelineCallback.mock.calls[0][2]).toEqual('abc')
		expect(timelineCallback.mock.calls[0][3]).toEqual({ hello: 'dude' })

		advanceTime(5000) // to time 6500

		expect(commandReceiver0).toHaveBeenCalledTimes(3)

	})

	test('devicesMakeReady', async () => {
		let commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})
		let commandReceiver1 = jest.fn(() => {
			return Promise.resolve()
		})
		let commandReceiver2 = jest.fn(() => {
			return Promise.resolve()
		})
		let commandReceiver3 = jest.fn(() => {
			return Promise.resolve()
		})
		let commandReceiver4 = jest.fn(() => {
			return Promise.resolve()
		})

		let conductor = new Conductor({
			externalLog: externalLog,
			initializeAsClear: true,
			getCurrentTime: getCurrentTime
		})

		await conductor.init()
		await conductor.addDevice('device0', {
			type: DeviceType.ABSTRACT,
			options: {
				commandReceiver: commandReceiver0
			}
		})
		await conductor.addDevice('device1', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver1
			}
		})
		await conductor.addDevice('device2', {
			type: DeviceType.ATEM,
			options: {
				commandReceiver: commandReceiver2
			}
		})
		await conductor.addDevice('device3', {
			type: DeviceType.HTTPSEND,
			options: {
				commandReceiver: commandReceiver3
			}
		})
		await conductor.addDevice('device4', {
			type: DeviceType.LAWO,
			options: {
				commandReceiver: commandReceiver4
			}
		})

		await conductor.devicesMakeReady(true)

		advanceTime(10) // to allow for commands to be sent

		expect(commandReceiver1).toHaveBeenCalledTimes(6)
		expect(commandReceiver1.mock.calls[0][1].name).toEqual('TimeCommand')
		expect(commandReceiver1.mock.calls[0][1]._objectParams).toMatchObject({
			channel: 1,
			timecode: '00:00:10:00'
		})
		expect(commandReceiver1.mock.calls[1][1].name).toEqual('TimeCommand')
		expect(commandReceiver1.mock.calls[1][1]._objectParams).toMatchObject({
			channel: 2,
			timecode: '00:00:10:00'
		})
		expect(commandReceiver1.mock.calls[2][1].name).toEqual('TimeCommand')
		expect(commandReceiver1.mock.calls[2][1]._objectParams).toMatchObject({
			channel: 3,
			timecode: '00:00:10:00'
		})

		expect(commandReceiver1.mock.calls[3][1].name).toEqual('ClearCommand')
		expect(commandReceiver1.mock.calls[3][1]._objectParams).toMatchObject({
			channel: 1
		})
		expect(commandReceiver1.mock.calls[4][1].name).toEqual('ClearCommand')
		expect(commandReceiver1.mock.calls[4][1]._objectParams).toMatchObject({
			channel: 2
		})
		expect(commandReceiver1.mock.calls[5][1].name).toEqual('ClearCommand')
		expect(commandReceiver1.mock.calls[5][1]._objectParams).toMatchObject({
			channel: 3
		})
	})
})
