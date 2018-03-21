import { CasparCG, AMCP } from 'casparcg-connection'
// import {Resolver, Enums} from "superfly-timeline"
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

test('CasparCG: Play AMB for 60s', async () => {
	jest.useFakeTimers()

	let commandReceiver0 = jest.fn((command) => {
		// nothing.
	})
	let myLayerMapping0: MappingCasparCG = {
		device: DeviceType.CASPARCG,
		deviceId: 'myCCG',
		channel: 2,
		layer: 42
	}
	let myLayerMapping: Mappings = {
		'myLayer0': myLayerMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myCCG': {
				type: DeviceType.CASPARCG,
				options: {
					commandReceiver: commandReceiver0
				}
			}
		},
		initializeAsClear: true,
		getCurrentTime: getCurrentTime
	})
	myConductor.mapping = myLayerMapping
	myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
	advanceTime(100) // 5600

	let device = myConductor.getDevice('myCCG')

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
				type: 'video',
				attributes: {
					file: 'AMB',
					loop: true
				}
			}
		}
	]

	advanceTime(100) // 5700

	// one command has been sent:
	expect(commandReceiver0).toHaveBeenCalledTimes(1)
	expect(commandReceiver0.mock.calls[0][1]._objectParams).toMatchObject({
		channel: 2,
		layer: 42,
		noClear: false,
		clip: 'AMB',
		loop: true,
		seek: 0 // looping and seeking at the same time is not supported.
	})

	// advance time to end of clip:
	advanceTime(1500) // 7200

	// two commands have been sent:
	expect(commandReceiver0).toHaveBeenCalledTimes(2)
	expect(commandReceiver0.mock.calls[1][1]).toMatchObject({ 
		channel: 2,
		layer: 42,
		payload: {},
		response: {},
		status: 0,
		_commandName: 'ClearCommand',
		_objectParams: { channel: 2, layer: 42 },
		_stringParamsArray: []
	})
})

test('CasparCG: AMB with transitions', async () => {
	jest.useFakeTimers()

	let commandReceiver0 = jest.fn((command) => {
		// nothing.
	})
	let myLayerMapping0: MappingCasparCG = {
		device: DeviceType.CASPARCG,
		deviceId: 'myCCG',
		channel: 2,
		layer: 42
	}
	let myLayerMapping: Mappings = {
		'myLayer0': myLayerMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myCCG': {
				type: DeviceType.CASPARCG,
				options: {
					commandReceiver: commandReceiver0
				}
			}
		},
		initializeAsClear: true,
		getCurrentTime: getCurrentTime
	})
	myConductor.mapping = myLayerMapping
	myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
	advanceTime(100) // 7300

	// Check that no commands has been sent:
	expect(commandReceiver0).toHaveBeenCalledTimes(0)

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
				type: 'video', // more to be implemented later!
				attributes: {
					file: 'AMB'
				},
				transitions: {
					inTransition: {
						type: 'MIX',
						duration: 1000,
						easing: 'linear',
						direction: 'left'
					},
					outTransition: {
						type: 'MIX',
						duration: 1000,
						easing: 'linear',
						direction: 'right'
					}
				}
			}
		}
	]

	// fast-forward:
	advanceTime(100) // 7400

	// Check that an ACMP-command has been sent
	expect(commandReceiver0).toHaveBeenCalledTimes(1)
	expect(commandReceiver0.mock.calls[0][1]._objectParams).toMatchObject({
		channel: 2,
		layer: 42,
		noClear: false,
		transition: 'MIX',
		transitionDuration: 50,
		transitionEasing: 'linear',
		transitionDirection: 'left',
		clip: 'AMB',
		seek: 50,
		loop: false
	})

	// fast-forward:
	advanceTime(2000) // 9400

	expect(commandReceiver0).toHaveBeenCalledTimes(2)
	expect(commandReceiver0.mock.calls[0][1]._objectParams).toMatchObject({
		channel: 2,
		layer: 42,
		transition: 'MIX',
		transitionDuration: 50,
		transitionEasing: 'linear',
		transitionDirection: 'right',
		clip: 'empty'
	})

	// Nothing more should've happened:
	advanceTime(1000) // 10400

	expect(commandReceiver0.mock.calls.length).toBe(2)
})

test ('CasparCG: Mixer commands', async () => {
	jest.useFakeTimers()

	let commandReceiver0 = jest.fn((command) => {
		// nothing.
	})
	let myLayerMapping0: MappingCasparCG = {
		device: DeviceType.CASPARCG,
		deviceId: 'myCCG',
		channel: 2,
		layer: 42
	}
	let myLayerMapping: Mappings = {
		'myLayer0': myLayerMapping0
	}

	let myConductor = new Conductor({
		devices: {
			'myCCG': {
				type: DeviceType.CASPARCG,
				options: {
					commandReceiver: commandReceiver0
				}
			}
		},
		initializeAsClear: true,
		getCurrentTime: getCurrentTime
	})
	myConductor.mapping = myLayerMapping
	myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
	advanceTime(100) // 10500

	// Check that no commands has been sent:
	expect(commandReceiver0).toHaveBeenCalledTimes(0)

	myConductor.timeline = [
		{
			id: 'obj0',
			trigger: {
				type: TriggerType.TIME_ABSOLUTE,
				value: now - 1000 // 1 seconds ago
			},
			duration: 12000, // 12s
			LLayer: 'myLayer0',
			content: {
				type: 'video', // more to be implemented later!
				attributes: {
					file: 'AMB',
					loop: true
				},
				keyframes: [{
					id: 'kf1',
					trigger: {
						type: TriggerType.TIME_ABSOLUTE, // Absolute time, relative time or logical
						value: 500 // 0 = parent's start
					},
					duration: 5500,
					content: { mixer: {
						perspective: {
							topLeftX: 0,
							topLeftY: 0,
							topRightX: 0.5,
							topRightY: 0,
							bottomRightX: 0.5,
							bottomRightY: 1,
							bottomLeftX: 0,
							bottomLeftY: 1
						}
					}}

				},{
					id: 'kf2',
					trigger: {
						type: TriggerType.TIME_ABSOLUTE, // Absolute time, relative time or logical
						value: 6000 // 0 = parent's start
					},
					duration: 6000,
					content: { mixer: {
						perspective: {
							topLeftX: 0,
							topLeftY: 0,
							topRightX: 1,
							topRightY: 0,
							bottomRightX: 1,
							bottomRightY: 1,
							bottomLeftX: 0,
							bottomLeftY: 1
						}
					}}

				}]
			}
		}
	]

	// fast-forward:
	advanceTime(500)

	// Check that ACMP-commands has been sent
	expect(commandReceiver0).toHaveBeenCalledTimes(2)
	// we've already tested play commands so let's check the mixer command:
	expect(commandReceiver0.mock.calls[1][1]._commandName).toMatch(/MixerPerspectiveCommand/)
	expect(commandReceiver0.mock.calls[1][1]._objectParams).toMatchObject({
		channel: 2,
		layer: 42,
		topLeftX: 0,
		topLeftY: 0,
		topRightX: 0.5,
		topRightY: 0,
		bottomRightX: 0.5,
		bottomRightY: 1,
		bottomLeftX: 0,
		bottomLeftY: 1,
		keyword: 'PERSPECTIVE'
	})

	// fast-forward:
	advanceTime(5000)

	expect(commandReceiver0.mock.calls.length).toBe(3)
	// expect(CasparCG.mockDo.mock.calls[2][0]).toBeInstanceOf(AMCP.StopCommand);
	expect(commandReceiver0.mock.calls[2][1]._commandName).toMatch(/MixerPerspectiveCommand/)
	expect(commandReceiver0.mock.calls[2][1]._objectParams).toMatchObject({
		channel: 2,
		layer: 42,
		topLeftX: 0,
		topLeftY: 0,
		topRightX: 1,
		topRightY: 0,
		bottomRightX: 1,
		bottomRightY: 1,
		bottomLeftX: 0,
		bottomLeftY: 1,
		keyword: 'PERSPECTIVE'
	})

	advanceTime(6000)
	expect(commandReceiver0.mock.calls.length).toBe(4)

})
