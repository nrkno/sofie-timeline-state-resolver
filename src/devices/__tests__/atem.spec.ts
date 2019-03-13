import { Enums, MixEffect } from 'atem-state'
import { TriggerType } from 'superfly-timeline'
import { Conductor } from '../../conductor'
import { AtemDevice } from '../atem'
import { MockTime } from '../../__tests__/mockTime.spec'
import {
	Mappings,
	DeviceType ,
	MappingAtem,
	MappingAtemType,
	TimelineContentTypeAtem
} from '../../types/src'
import { ThreadedClass } from 'threadedclass'

describe('Atem', () => {
	let mockTime = new MockTime()
	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})
	test('Atem: switch input', async () => {

		let commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
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
			getCurrentTime: mockTime.getCurrentTime
		})
		await myConductor.init()
		await myConductor.addDevice('myAtem', {
			type: DeviceType.ATEM,
			options: {
				commandReceiver: commandReceiver0,
				host: '92.62.46.187',
				port: 9910
			}
		})
		await myConductor.setMapping(myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		let deviceContainer = myConductor.getDevice('myAtem')
		let device = deviceContainer.device as ThreadedClass<AtemDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.timeline = [
			{
				id: 'obj0',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: mockTime.now - 1000 // 1 seconds ago
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

		await mockTime.advanceTimeToTicks(10200)
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
		await mockTime.advanceTimeToTicks(12200)

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

	test('Atem: upstream keyer', async () => {

		let commandReceiver0 = jest.fn(() => {
			// nothing
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
			getCurrentTime: mockTime.getCurrentTime
		})
		await myConductor.init()
		await myConductor.addDevice('myAtem', {
			type: DeviceType.ATEM,
			options: {
				commandReceiver: commandReceiver0,
				host: '92.62.46.187',
				port: 9910
			}
		})
		await myConductor.setMapping(myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		let deviceContainer = myConductor.getDevice('myAtem')
		let device = deviceContainer.device as ThreadedClass<AtemDevice>
		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)
		myConductor.timeline = [
			{
				id: 'obj0',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: mockTime.now - 1000 // 1 seconds ago
				},
				duration: 2000,
				LLayer: 'myLayer0',
				content: {
					// @ts-ignore dveSettings missing
					attributes: {
						upstreamKeyers: [
							{
								patternSettings: {
									style: 5,
									positionX: 250
								}
							}
						]
					} as Partial<MixEffect>,
					type: 'me'
				}
			}
		]

		await mockTime.advanceTimeToTicks(10200)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0.mock.calls[0][1]).toMatchObject(
			{
				flag: 53,
				rawName: 'KePt',
				mixEffect: 0,
				upstreamKeyerId: 0,
				properties: {
					positionX: 250,
					positionY: 500,
					style: 5,
					symmetry: 5000
				}
			}
		)
	})
})
