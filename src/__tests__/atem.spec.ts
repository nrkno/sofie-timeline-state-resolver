// import {Resolver, Enums} from "superfly-timeline"
// import { Commands, Atem } from 'atem-connection'
import { Enums } from 'atem-state'
import { TriggerType } from 'superfly-timeline'

import { Mappings, MappingAtem, DeviceType, MappingAtemType } from '../devices/mapping'
import { Conductor } from '../conductor'
import { AtemDevice, TimelineContentTypeAtem } from '../devices/atem'

// let nowActual: number = Date.now()
describe('Atem', () => {
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
	test.only('Atem: switch input', async () => {
		jest.useFakeTimers()

		let commandReceiver0 = jest.fn(() => {
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
			initializeAsClear: true,
			getCurrentTime: getCurrentTime
		})
		await myConductor.init()
		await myConductor.addDevice('myAtem', {
			type: DeviceType.ATEM,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				port: 9910
			}
		})
		myConductor.mapping = myLayerMapping
		advanceTime(100) // 10100

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
					type: TimelineContentTypeAtem.ME,
					attributes: {
						input: 2,
						transition: Enums.TransitionStyle.CUT
					}
				}
			},
			{
				id: 'obj1',
				trigger: {
					type: TriggerType.TIME_RELATIVE,
					value: '#obj0.end'
				},
				duration: 2000,
				LLayer: 'myLayer0',
				content: {
					type: TimelineContentTypeAtem.ME,
					attributes: {
						input: 3,
						transition: Enums.TransitionStyle.CUT
					}
				}
			}
		]

		advanceTime(100) // 10200
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
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
		console.log('===========================================')
		advanceTime(2000) // 22200

		expect(commandReceiver0).toHaveBeenCalledTimes(4)
		expect(commandReceiver0.mock.calls[2][1]).toMatchObject(
			{
				flag: 0,
				rawName: 'PrvI',
				mixEffect: 0,
				properties: {
					source: 3
				}
			}
		)
		expect(commandReceiver0.mock.calls[3][1]).toMatchObject(
			{
				flag: 0,
				rawName: 'DCut',
				mixEffect: 0
			}
		)
	})
})
