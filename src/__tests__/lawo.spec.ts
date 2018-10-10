import { TriggerType } from 'superfly-timeline'

import { Mappings, MappingLawo, DeviceType, MappingLawoType } from '../devices/mapping'
import { Conductor } from '../conductor'
import { LawoDevice,
	TimelineContentTypeLawo
} from '../devices/lawo'

describe('Lawo', () => {
	let now: number = 1000

	beforeAll(() => {
		Date.now = jest.fn()
		Date.now['mockReturnValue'](1000)
	})
	function getCurrentTime () {
		return now
	}
	// function literal<T> (o: T) { return o }

	function advanceTime (advanceTime: number) {
		now += advanceTime
		jest.advanceTimersByTime(advanceTime)
	}
	beforeEach(() => {
		now = 1000
		jest.useFakeTimers()
	})

	test('Lawo: Change volume', async () => {

		let commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})
		let myChannelMapping0: MappingLawo = {
			device: DeviceType.LAWO,
			deviceId: 'myLawo',
			mappingType: MappingLawoType.SOURCE,
			identifier: 'BASE'
		}
		let myChannelMapping: Mappings = {
			'lawo_c1_fader': myChannelMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: getCurrentTime
		})
		myConductor.mapping = myChannelMapping
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await myConductor.addDevice('myLawo', {
			type: DeviceType.LAWO,
			options: {
				host: '160.67.96.51',
				port: 9000,
				commandReceiver: commandReceiver0
			}
		})
		advanceTime(100) // 1100

		let device = myConductor.getDevice('myLawo') as LawoDevice

		// Check that no commands has been scheduled:
		expect(device.queue).toHaveLength(0)
		myConductor.timeline = [
			{
				id: 'obj0',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: now - 1000 // 1 seconds in the past
				},
				duration: 2000,
				LLayer: 'lawo_c1_fader',
				content: {
					type: TimelineContentTypeLawo.SOURCE,
					attributes: {
						'Fader/Motor dB Value': {
							value: -6
							// transitionDuration?: number,
							// triggerValue: string // only used for trigging new command sent
						}
					}
				}
			},
			{
				id: 'obj1',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: now + 500 // 0.5 seconds in the future
				},
				duration: 2000,
				LLayer: 'lawo_c1_fader',
				content: {
					type: TimelineContentTypeLawo.SOURCE,
					attributes: {
						'Fader/Motor dB Value': {
							value: -4,
							transitionDuration: 400
							// triggerValue: string // only used for trigging new command sent
						}
					}
				}
			},
			{
				id: 'obj2',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: now + 1000 // 1 seconds in the future
				},
				duration: 2000,
				LLayer: 'lawo_c1_fader',
				content: {
					type: TimelineContentTypeLawo.SOURCE,
					attributes: {
						'Fader/Motor dB Value': {
							value: -4,
							transitionDuration: 400
							// triggerValue: string // only used for trigging new command sent
						}
					}
				}
			},
			{
				id: 'obj3',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: now + 2000 // 2 seconds in the future
				},
				duration: 2000,
				LLayer: 'lawo_c1_fader',
				content: {
					type: TimelineContentTypeLawo.SOURCE,
					attributes: {
						'Fader/Motor dB Value': {
							value: -4,
							transitionDuration: 400,
							triggerValue: 'asdf' // only used for trigging new command sent
						}
					}
				}
			}
		]

		advanceTime(100) // 1200

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0.mock.calls[0][1]).toMatchObject(
			{
				// attribute: 'Motor dB Value',
				type: TimelineContentTypeLawo.SOURCE,
				value: -6,
				path: 'BASE.Fader.Motor dB Value'
			}
		)
		expect(commandReceiver0.mock.calls[0][2]).toMatch(/null/i) // context

		advanceTime(800) // 2000

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0.mock.calls[1][1]).toMatchObject(
			{
				// attribute: 'Motor dB Value',
				type: TimelineContentTypeLawo.SOURCE,
				value: -4,
				transitionDuration: 400,
				path: 'BASE.Fader.Motor dB Value'
			}
		)
		expect(commandReceiver0.mock.calls[1][2]).toBeTruthy() // context

		advanceTime(500) // 2500
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		// no new commands should have been sent, becuse obj2 is the same as obj1

		advanceTime(1000) // 3500
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(commandReceiver0.mock.calls[2][1]).toMatchObject(
			{
				// attribute: 'Motor dB Value',
				type: TimelineContentTypeLawo.SOURCE,
				value: -4,
				path: 'BASE.Fader.Motor dB Value'
			}
		)
		expect(commandReceiver0.mock.calls[2][2]).toMatch(/triggerValue/i) // context
		advanceTime(2000) // 5500
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		// no new commands should be sent, nothing is sent on object end
	})
})
