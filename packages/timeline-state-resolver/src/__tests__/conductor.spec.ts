import {
	Mappings,
	DeviceType,
	TSRTimelineObj,
	TSRTimeline,
	LawoDeviceMode,
	TimelineContentTypeCasparCg,
	TimelineContentCCGMedia,
	SomeMappingAbstract,
	Mapping,
	SomeMappingCasparCG,
	MappingCasparCGType,
} from 'timeline-state-resolver-types'
import { Conductor, TimelineTriggerTimeResult } from '../conductor'
import * as _ from 'underscore'
import { MockTime } from './mockTime'
import { ThreadedClass } from 'threadedclass'
import { getMockCall } from './lib'
import { setupAllMocks } from '../__mocks__/_setup-all-mocks'
import { Commands } from 'casparcg-connection'
import { DeviceInstanceWrapper } from '../service/DeviceInstance'

describe('Conductor', () => {
	const mockTime = new MockTime()
	beforeAll(() => {
		setupAllMocks()
	})
	beforeEach(() => {
		mockTime.init()
	})
	test.only('Abstract-device functionality', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const commandReceiver1: any = jest.fn(async () => {
			return Promise.resolve()
		})

		const myLayerMapping0: Mapping<SomeMappingAbstract> = {
			device: DeviceType.ABSTRACT,
			deviceId: 'device0',
			options: {},
		}
		const myLayerMapping1: Mapping<SomeMappingAbstract> = {
			device: DeviceType.ABSTRACT,
			deviceId: 'device1',
			options: {},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
			myLayer1: myLayerMapping1,
		}

		const conductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})

		await conductor.init()
		await conductor.addDevice('device0', {
			type: DeviceType.ABSTRACT,
			options: {},
		})
		await conductor.addDevice('device1', {
			type: DeviceType.ABSTRACT,
			options: {},
		})

		// add something that will play in a seconds time
		const abstractThing0: TSRTimelineObj<any> = {
			id: 'a0',
			enable: {
				start: mockTime.now,
				duration: 1000,
			},
			layer: 'myLayer0',
			content: {
				deviceType: DeviceType.ABSTRACT,
				myAttr1: 'one',
				myAttr2: 'two',
			},
		}
		const abstractThing1: TSRTimelineObj<any> = {
			id: 'a1',
			enable: {
				start: mockTime.now + 1000,
				duration: 1000,
			},
			layer: 'myLayer1',
			content: {
				deviceType: DeviceType.ABSTRACT,
				myAttr1: 'three',
				myAttr2: 'four',
			},
		}

		const device0Container = conductor.getDevice('device0')
		const device0 = device0Container!.device
		const device1Container = conductor.getDevice('device1')
		const device1 = device1Container!.device

		// The queues should be empty
		expect(await device0['queue']).toHaveLength(0)
		expect(await device1['queue']).toHaveLength(0)

		conductor.setTimelineAndMappings([abstractThing0, abstractThing1], myLayerMapping)

		// there should now be one command queued:
		await mockTime.tick()
		expect(await device0['queue']).toHaveLength(1)
		expect(await device1['queue']).toHaveLength(0)

		// Move forward in time
		await mockTime.advanceTimeTicks(500) // to time 10500

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 0)).toEqual(10000)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			commandName: 'addedAbstract',
			content: {
				deviceType: 'ABSTRACT',
				myAttr1: 'one',
				myAttr2: 'two',
			},
		})
		expect(getMockCall(commandReceiver0, 0, 2)).toEqual('added: a0') // context
		expect(commandReceiver1).toHaveBeenCalledTimes(0)

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(11500)

		// expect(device0['queue']).toHaveLength(0)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 0)).toEqual(11000)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			commandName: 'removedAbstract',
			content: {
				deviceType: 'ABSTRACT',
				myAttr1: 'one',
				myAttr2: 'two',
			},
		})
		expect(getMockCall(commandReceiver0, 0, 2)).toEqual('removed: a0') // context
		expect(commandReceiver1).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver1, 0, 0)).toEqual(11000)
		expect(getMockCall(commandReceiver1, 0, 1)).toMatchObject({
			commandName: 'addedAbstract',
			content: {
				deviceType: 'ABSTRACT',
				myAttr1: 'three',
				myAttr2: 'four',
			},
		})

		commandReceiver0.mockClear()
		commandReceiver1.mockClear()
		await mockTime.advanceTimeTicks(3000)

		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		expect(commandReceiver1).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver1, 0, 0)).toEqual(12000)
		expect(getMockCall(commandReceiver1, 0, 1)).toMatchObject({
			commandName: 'removedAbstract',
			content: {
				deviceType: 'ABSTRACT',
				myAttr1: 'three',
				myAttr2: 'four',
			},
		})
		expect(getMockCall(commandReceiver1, 0, 2)).toEqual('removed: a1') // context

		await conductor.removeDevice('device1')
		expect(conductor.getDevice('device1')).toBeFalsy()

		await conductor.addDevice('device1', { type: DeviceType.ABSTRACT, options: {} }).then((res) => {
			expect(res).toBeTruthy()
		})

		// @ts-ignore
		abstractThing0.enable.start = mockTime.now
		conductor.setTimelineAndMappings([abstractThing0], {
			myLayer0: myLayerMapping1,
			myLayer1: myLayerMapping0,
		})
		if (_.isArray(abstractThing0.enable)) throw new Error('.enable should not be an array')
		abstractThing0.enable.start = mockTime.now
		conductor.setTimelineAndMappings([abstractThing0])
	})

	test('the "Now" and "Callback-functionality', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})

		const myLayerMapping0: Mapping<SomeMappingAbstract> = {
			device: DeviceType.ABSTRACT,
			deviceId: 'device0',
			options: {},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const conductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})

		await conductor.init()
		await conductor.addDevice('device0', {
			type: DeviceType.ABSTRACT,
			options: {},
		})

		// add something that will play "now"
		const abstractThing0: TSRTimelineObj<any> = {
			// will be converted from "now" to 10000
			id: 'a0',
			enable: {
				start: 'now', // 10000
				duration: 5000, // 15000
			},
			layer: 'myLayer0',
			content: {
				deviceType: DeviceType.ABSTRACT,
				myAttr1: 'one',
				myAttr2: 'two',
			},
		}
		const abstractThing1: TSRTimelineObj<any> = {
			// will cause a callback to be sent
			id: 'a1',
			enable: {
				start: '#a0.start + 300', // 10300
				duration: 5000, // 15300
			},
			layer: 'myLayer0',
			content: {
				deviceType: DeviceType.ABSTRACT,
				myAttr1: 'one',
				myAttr2: 'two',
				callBack: 'abc',
				callBackData: {
					hello: 'dude',
				},
				callBackStopped: 'abcStopped',
			},
		}
		const timeline: TSRTimeline = [abstractThing0, abstractThing1]

		const setTimelineTriggerTime = jest.fn((results: TimelineTriggerTimeResult) => {
			_.each(results, (trigger) => {
				const o = _.findWhere(timeline, { id: trigger.id })
				if (o) {
					if (_.isArray(o.enable)) throw new Error('.enable should not be an array')
					o.enable.start = trigger.time
				}
			})
			// update the timeline:
			conductor.setTimelineAndMappings(timeline, myLayerMapping)
		})
		conductor.on('setTimelineTriggerTime', setTimelineTriggerTime)

		const timelineCallback = jest.fn()
		conductor.on('timelineCallback', timelineCallback)

		const device0Container = conductor.getDevice('device0')
		const device0 = device0Container!.device as ThreadedClass<DeviceInstanceWrapper>
		expect(device0).toBeTruthy()
		// let device1 = conductor.getDevice('device1')

		// The queues should be empty
		// expect(await device0.queue).toHaveLength(0)
		// expect(device1['queue']).toHaveLength(0)

		expect(setTimelineTriggerTime).toHaveBeenCalledTimes(0)

		conductor.setTimelineAndMappings(timeline)

		// there should now be commands queued:
		await mockTime.tick()

		// const q = await device0.queue
		// expect(q).toHaveLength(2)
		// expect(q[0].time).toEqual(10000)
		// expect(q[1].time).toEqual(10300)

		// the setTimelineTriggerTime event should have been emitted:
		expect(setTimelineTriggerTime).toHaveBeenCalledTimes(1)
		expect(getMockCall(setTimelineTriggerTime, 0, 0)[0].time).toEqual(10000)

		// the timelineCallback event should have been emitted:
		expect(timelineCallback).toHaveBeenCalledTimes(0)

		// Move forward in time
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(timelineCallback).toHaveBeenCalledTimes(0)

		await mockTime.advanceTimeToTicks(10500)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(timelineCallback).toHaveBeenCalledTimes(1)
		expect(getMockCall(timelineCallback, 0, 0)).toEqual(10300)
		expect(getMockCall(timelineCallback, 0, 1)).toEqual('a1')
		expect(getMockCall(timelineCallback, 0, 2)).toEqual('abc')
		expect(getMockCall(timelineCallback, 0, 3)).toEqual({ hello: 'dude' })

		await mockTime.advanceTimeToTicks(15500)

		// expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(commandReceiver0.mock.calls).toHaveLength(3)
	})

	test('devicesMakeReady', async () => {
		const commandReceiver1 = jest.fn(async () => {
			return Promise.resolve()
		})
		const commandReceiver2 = jest.fn(async () => {
			return Promise.resolve()
		})
		const commandReceiver4 = jest.fn(async () => {
			return Promise.resolve()
		})
		const conductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})

		await conductor.init()
		await conductor.addDevice('device0', {
			type: DeviceType.ABSTRACT,
			options: {},
		})
		await conductor.addDevice('device1', {
			type: DeviceType.CASPARCG,
			options: {
				host: '127.0.0.1',
			},
			commandReceiver: commandReceiver1,
		})
		await conductor.addDevice('device2', {
			type: DeviceType.ATEM,
			options: {
				host: '127.0.0.1',
			},
			commandReceiver: commandReceiver2,
		})
		await conductor.addDevice('device3', {
			type: DeviceType.HTTPSEND,
			options: {},
		})
		await conductor.addDevice('device4', {
			type: DeviceType.LAWO,
			options: {
				host: '',
				deviceMode: LawoDeviceMode.Ruby,
			},
			commandReceiver: commandReceiver4,
		})

		await mockTime.advanceTimeTicks(10) // to allow casparcg to fake "connect"

		await conductor.devicesMakeReady(true)

		await mockTime.advanceTimeTicks(10) // to allow for commands to be sent

		// expect(commandReceiver1).toHaveBeenCalledTimes(3)
		expect(commandReceiver1.mock.calls).toHaveLength(3)
		// expect(getMockCall(commandReceiver1, 0, 1).name).toEqual('TimeCommand')
		// expect(getMockCall(commandReceiver1, 0, 1)._objectParams).toMatchObject({
		// 	channel: 1,
		// 	timecode: '00:00:10:00'
		// })
		// expect(getMockCall(commandReceiver1, 1, 1).name).toEqual('TimeCommand')
		// expect(getMockCall(commandReceiver1, 1, 1)._objectParams).toMatchObject({
		// 	channel: 2,
		// 	timecode: '00:00:10:00'
		// })
		// expect(getMockCall(commandReceiver1, 2, 1).name).toEqual('TimeCommand')
		// expect(getMockCall(commandReceiver1, 2, 1)._objectParams).toMatchObject({
		// 	channel: 3,
		// 	timecode: '00:00:10:00'
		// })

		expect(getMockCall(commandReceiver1, 0, 1).command).toEqual(Commands.Clear)
		expect(getMockCall(commandReceiver1, 0, 1).params).toMatchObject({
			channel: 1,
		})
		expect(getMockCall(commandReceiver1, 1, 1).command).toEqual(Commands.Clear)
		expect(getMockCall(commandReceiver1, 1, 1).params).toMatchObject({
			channel: 2,
		})
		expect(getMockCall(commandReceiver1, 2, 1).command).toEqual(Commands.Clear)
		expect(getMockCall(commandReceiver1, 2, 1).params).toMatchObject({
			channel: 3,
		})
	})

	test('Construction of multithreaded device', async () => {
		const myLayerMapping0: Mapping<SomeMappingAbstract> = {
			device: DeviceType.ABSTRACT,
			deviceId: 'device0',
			options: {},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const conductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		conductor.on('error', console.error)

		await conductor.init()
		await conductor.addDevice('device0', {
			type: DeviceType.ABSTRACT,
			options: {},
			isMultiThreaded: true,
		})
		conductor.setTimelineAndMappings([], myLayerMapping)

		const device = conductor.getDevice('device0')!.device
		expect(await device.getCurrentTime()).toBeTruthy()
	}, 1500)
	test('Changing of mappings live', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})

		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'device0',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 1,
				layer: 10,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const conductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})

		await conductor.init()
		await conductor.addDevice('device0', {
			type: DeviceType.CASPARCG,
			options: {
				host: '127.0.0.1',
			},
			commandReceiver: commandReceiver0,
		})
		conductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10) // just a little bit

		// add something that will play "now"
		const video0: TSRTimelineObj<TimelineContentCCGMedia> = {
			// will be converted from "now" to 10000
			id: 'a0',
			enable: {
				start: 'now', // 10000
				duration: 10000, // 20000
			},
			layer: 'myLayer0',
			content: {
				deviceType: DeviceType.CASPARCG,
				type: TimelineContentTypeCasparCg.MEDIA,

				file: 'AMB',
			},
		}

		const timeline: TSRTimeline = [video0]

		const device0Container = conductor.getDevice('device0')
		const device0 = device0Container!.device as ThreadedClass<DeviceInstanceWrapper>
		expect(device0).toBeTruthy()

		conductor.setTimelineAndMappings(timeline)

		// there should now be commands queued:
		// await mockTime.tick()

		await mockTime.advanceTimeToTicks(10500)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).command).toEqual(Commands.Play)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			clip: 'AMB',
			channel: 1,
			layer: 10,
		})

		commandReceiver0.mockClear()

		// modify the mapping:
		myLayerMapping0.options.layer = 20
		conductor.setTimelineAndMappings(conductor.timeline, myLayerMapping)

		await mockTime.advanceTimeTicks(100) // just a little bit

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 0, 1).command).toEqual(Commands.Clear)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			// clip: 'AMB',
			channel: 1,
			layer: 10,
		})
		expect(getMockCall(commandReceiver0, 1, 1).command).toEqual(Commands.Play)
		expect(getMockCall(commandReceiver0, 1, 1).params).toMatchObject({
			clip: 'AMB',
			channel: 1,
			layer: 20,
		})

		commandReceiver0.mockClear()

		// Replace the mapping altogether:
		delete myLayerMapping['myLayer0']
		const myLayerMappingNew: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'device0',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 10,
			},
		}
		myLayerMapping['myLayerNew'] = myLayerMappingNew
		video0.layer = 'myLayerNew'
		conductor.setTimelineAndMappings(timeline, myLayerMapping)

		await mockTime.advanceTimeTicks(100) // just a little bit

		// const nææh = false
		// const DO_IT_RIGHT = nææh
		// if (DO_IT_RIGHT) {
		// 	// Note: We only expect a play command on the new channel,
		// 	// The old channel now has no mapping, and should be left alone
		// 	expect(commandReceiver0).toHaveBeenCalledTimes(1)
		// 	expect(getMockCall(commandReceiver0, 0, 1).name).toEqual('PlayCommand')
		// 	expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
		// 		_objectParams: {
		// 			clip: 'AMB',
		// 			channel: 2,
		// 			layer: 10,
		// 		},
		// 	})
		// } else {
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			command: Commands.Clear,
			params: {
				channel: 1,
				layer: 20,
			},
		})

		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			command: Commands.Play,
			params: {
				clip: 'AMB',
				channel: 2,
				layer: 10,
			},
		})
		// }
	})

	test('estimateResolveTime', () => {
		// Ensure that the resolveTime follows a certain curve:
		expect([
			Conductor.calculateResolveTime(0, 1),
			Conductor.calculateResolveTime(50, 1),
			Conductor.calculateResolveTime(100, 1),
			Conductor.calculateResolveTime(150, 1),
			Conductor.calculateResolveTime(200, 1),
			Conductor.calculateResolveTime(500, 1),
			Conductor.calculateResolveTime(1000, 1),
			Conductor.calculateResolveTime(10000, 1),
		]).toEqual([
			20, // 0
			40, // 50
			65, // 100
			87, // 150
			106, // 200
			200, // 500
			200, // 1000
			200, // 10000
		])
	})
})
