import { CasparCG, AMCP } from 'casparcg-connection'
// import {Resolver, Enums} from "superfly-timeline"
import { Resolver, TimelineObject, TimelineState, TriggerType } from 'superfly-timeline'

import { Mappings, MappingCasparCG, MappingAbstract, DeviceType } from '../devices/mapping'
import { Conductor } from '../conductor'

jest.mock('casparcg-connection')

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

test('Timeline: Play AMB for 60s', async () => {

	let myLayerMapping0: MappingCasparCG = {
		device: DeviceType.CASPARCG,
		deviceName: 'mySuperCCG',
		channel: 2,
		layer: 42
	}
	let myLayerMapping: Mappings = {
		'myLayer0': myLayerMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myCCG': {
				type: DeviceType.CASPARCG
			}
		},
		initializeAsClear: true
	})
	myConductor.mapping = myLayerMapping
	await myConductor.init()

	// Check that no commands has been sent:
	expect(CasparCG['mockDo']).toHaveBeenCalledTimes(0)

	jest.useFakeTimers()

	let now = myConductor.getCurrentTime()
	Date.now = jest.fn()
	Date.now
		.mockReturnValue(now * 1000)

	myConductor.timeline = [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 10 // 10 seconds ago
			},
			duration: 20,
			LLayer: 'myLayer',
			content: {
				type: 'video', // more to be implemented later!
				attributes: {
					file: 'AMB',
					loop: true
				}
			}
		}
	]

	// fast-forward:

	Date.now
		.mockReturnValue(now * 1000 + 5000)
	// jest.advanceTimersByTime(5000);
	jest.runOnlyPendingTimers()

	// Check that an ACMP-command has been sent
	expect(CasparCG['mockDo']).toHaveBeenCalledTimes(1)
	expect(CasparCG['mockDo'].mock.calls[0][0]).toBeInstanceOf(AMCP.PlayCommand)

	// looping doesn't work with seeking.
	expect(CasparCG['mockDo'].mock.calls[0][0]._objectParams.loop).toEqual(true)
	expect(CasparCG['mockDo'].mock.calls[0][0]._objectParams.clip).toMatch(/AMB/)
	// expect(CasparCG['mockDo'].mock.calls[0][0].seek).toBeGreaterThanOrEqual(10*50);
	// expect(CasparCG['mockDo'].mock.calls[0][0].seek).toBeLessThan(10*50 + 10);
	expect(CasparCG['mockDo'].mock.calls[0][0].layer).toEqual(42)
	expect(CasparCG['mockDo'].mock.calls[0][0].channel).toEqual(2)

	// fast-forward:
	// jest.advanceTimersByTime(20000);

	Date.now
		.mockReturnValue(now * 1000 + 15000)
	// jest.advanceTimersByTime(10000);
	jest.runOnlyPendingTimers()

	expect(CasparCG['mockDo'].mock.calls.length).toBe(2)
	expect(CasparCG['mockDo'].mock.calls[1][0]).toBeInstanceOf(AMCP.StopCommand)

	expect(CasparCG['mockDo'].mock.calls[1][0].layer).toEqual(2)
	expect(CasparCG['mockDo'].mock.calls[1][0].channel).toEqual(2)

	// fast-forward:
	// jest.advanceTimersByTime(10000);

	// Nothing more should've happened:

	Date.now
		.mockReturnValue(now * 1000 + 35000)
	jest.advanceTimersByTime(20000)

	expect(CasparCG['mockDo'].mock.calls.length).toBe(2)

	// expect(Conductor.mock.instances).toHaveLength(1);
	// expect(mockConductorInstance._initializeDevices).toHaveBeenCalledTimes(1)
	// let mockConductorInstance = Conductor.mock.instances[0];

	// expect(CasparCG.mock.instances).toHaveLength(1)

	/*
	// fast-forward:
	jest.runOnlyPendingTimers();

	console.log('CasparCG',CasparCG)

	expect(CasparCG).toHaveBeenCalledTimes(1)
	let mockCCGCall = CasparCG.mock.calls[0];

	expect(CasparCG.mock.instances).toHaveLength(1)
	let mockCCGInstance = CasparCG.mock.instances[0];

	//console.log('CasparCG.mock',mockCCGInstance);

	/*

	// Check that no commands has been sent:
	expect(mockCCGConn.do.mock.calls.length).toBe(0);

	myTSR.setTimeline([
		{
			id: 'obj0',
			trigger: {
				type: Timeline.enums.TriggerType.TIME_ABSOLUTE,
				value: Date.now()/1000 - 10 // 10 seconds ago
			},
			duration: 20,
			LLayer: 'myLayer',
			content: {
				type: 'video', // more to be implemented later!
				attributes: {
					file: 'AMB',
					loop: true,
				}
			}
		}
	]);

	*/
})

test('Timeline: AMB with transitions', async () => {
	let myLayerMapping0: MappingCasparCG = {
		device: DeviceType.CASPARCG,
		deviceName: 'mySuperCCG',
		channel: 2,
		layer: 42
	}
	let myLayerMapping: Mappings = {
		'myLayer0': myLayerMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myCCG': {
				type: DeviceType.CASPARCG
			}
		},
		initializeAsClear: true
	})

	myConductor.mapping = myLayerMapping
	await myConductor.init()

	// Check that no commands has been sent:
	expect(CasparCG['mockDo']).toHaveBeenCalledTimes(0)

	jest.useFakeTimers()

	let now = myConductor.getCurrentTime()
	Date.now = jest.fn()
	Date.now
		.mockReturnValue(now * 1000)

	myConductor.timeline = [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 10 // 10 seconds ago
			},
			duration: 20,
			LLayer: 'myLayer',
			content: {
				type: 'video', // more to be implemented later!
				attributes: {
					file: 'AMB',
					loop: true
				},
				transitions: {
					inTransition: {
						type: 'MIX',
						duration: 10,
						easing: 'linear',
						direction: 'left'
					},
					outTransition: {
						type: 'MIX',
						duration: 10,
						easing: 'linear',
						direction: 'right'
					}
				}
			}
		}
	]

	// fast-forward:

	Date.now
		.mockReturnValue(now * 1000 + 5000)
	// jest.advanceTimersByTime(5000);
	jest.runOnlyPendingTimers()

	// Check that an ACMP-command has been sent
	expect(CasparCG['mockDo']).toHaveBeenCalledTimes(1)
	expect(CasparCG['mockDo'].mock.calls[0][0]).toBeInstanceOf(AMCP.PlayCommand)

	expect(CasparCG['mockDo'].mock.calls[0][0]._objectParams.loop).toEqual(true)
	expect(CasparCG['mockDo'].mock.calls[0][0]._objectParams.clip).toMatch(/AMB/)
	expect(CasparCG['mockDo'].mock.calls[0][0]._objectParams.transition).toMatch(/MIX/)
	expect(CasparCG['mockDo'].mock.calls[0][0]._objectParams.transitionDuration).toEqual(500)
	expect(CasparCG['mockDo'].mock.calls[0][0]._objectParams.transitionEasing).toMatch(/linear/)
	expect(CasparCG['mockDo'].mock.calls[0][0]._objectParams.transitionDirection).toMatch(/LEFT/)
	expect(CasparCG['mockDo'].mock.calls[0][0].layer).toEqual(42)
	expect(CasparCG['mockDo'].mock.calls[0][0].channel).toEqual(2)

	// fast-forward:
	// jest.advanceTimersByTime(20000);

	Date.now
		.mockReturnValue(now * 1000 + 15000)
	// jest.advanceTimersByTime(10000);
	jest.runOnlyPendingTimers()

	expect(CasparCG['mockDo'].mock.calls.length).toBe(2)
	expect(CasparCG['mockDo'].mock.calls[1][0]).toBeInstanceOf(AMCP.StopCommand)
	// @todo: add tests for removal
	expect(CasparCG['mockDo'].mock.calls[1][0].layer).toEqual(42)
	expect(CasparCG['mockDo'].mock.calls[1][0].channel).toEqual(2)
	// @todo: do some more checks for transitions

	// Nothing more should've happened:

	Date.now
		.mockReturnValue(now * 1000 + 35000)
	jest.advanceTimersByTime(20000)

	expect(CasparCG['mockDo'].mock.calls.length).toBe(2)
})

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
