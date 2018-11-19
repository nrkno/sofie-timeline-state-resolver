import { TriggerType } from 'superfly-timeline'
import { Conductor } from '../../conductor'
import { LawoDevice } from '../lawo'
import {
	Mappings,
	DeviceType,
	TimelineContentTypeLawo,
	MappingLawo,
	MappingLawoType
} from '../../types'
import { MockTime } from '../../__tests__/mockTime.spec'

describe('Lawo', () => {
	let mockTime = new MockTime()

	beforeAll(() => {
		Date.now = jest.fn()
		Date.now['mockReturnValue'](1000)
	})
	beforeEach(() => {
		mockTime.init()
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
			getCurrentTime: mockTime.getCurrentTime
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
		mockTime.advanceTimeTo(10100)

		let device = myConductor.getDevice('myLawo') as LawoDevice

		// Check that no commands has been scheduled:
		expect(device.queue).toHaveLength(0)
		myConductor.timeline = [
			{
				id: 'obj0',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: mockTime.now - 1000 // 1 seconds in the past
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
					value: mockTime.now + 500 // 0.5 seconds in the future
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
					value: mockTime.now + 1000 // 1 seconds in the future
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
					value: mockTime.now + 2000 // 2 seconds in the future
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

		mockTime.advanceTimeTo(10200)

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

		mockTime.advanceTimeTo(11000)

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

		mockTime.advanceTimeTo(11500)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		// no new commands should have been sent, becuse obj2 is the same as obj1

		mockTime.advanceTimeTo(12500)
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
		mockTime.advanceTimeTo(14500)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		// no new commands should be sent, nothing is sent on object end
	})
})
