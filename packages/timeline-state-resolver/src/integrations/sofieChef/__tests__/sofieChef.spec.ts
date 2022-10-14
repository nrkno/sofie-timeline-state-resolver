import { Conductor } from '../../../conductor'
import { SofieChefDevice } from '..'
import {
	Mappings,
	DeviceType,
	MappingSofieChef,
	TimelineContentTypeSofieChef,
	StatusCode,
} from 'timeline-state-resolver-types'
import { MockTime } from '../../../__tests__/mockTime'
import { ThreadedClass } from 'threadedclass'
import { getMockCall } from '../../../__tests__/lib'
import * as WebSocket from '../../../__mocks__/ws'
import { literal } from '../../../devices/device'
import { SendWSMessageAny, SendWSMessageType, StatusCode as ChefStatusCode } from '../api'

describe('SofieChef', () => {
	jest.mock('ws', () => WebSocket)
	const mockTime = new MockTime()
	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()

		WebSocket.clearMockInstances()
	})

	test('Status & reconnection', async () => {
		let device: any = undefined
		const commandReceiver0: any = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
			// return Promise.resolve()
		})
		const myLayerMapping0: MappingSofieChef = {
			device: DeviceType.SOFIE_CHEF,
			deviceId: 'chef0',
			windowId: 'window0',
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn()
		myConductor.on('error', errorHandler)

		WebSocket.mockConstructor((ws: WebSocket) => {
			// @ts-ignore mock
			// ws.mockReplyFunction((message) => {
			// 	return ''
			// })

			setImmediate(() => {
				ws.mockSetConnected(true)

				setImmediate(() => {
					// Chef reports Good status upon connection:
					ws.mockSendMessage(
						JSON.stringify(
							literal<SendWSMessageAny>({
								type: SendWSMessageType.STATUS,
								status: {
									app: {
										statusCode: ChefStatusCode.GOOD,
										message: '',
									},
									windows: {
										'5': {
											statusCode: ChefStatusCode.GOOD,
											message: '',
										},
									},
								},
							})
						)
					)
				})
			})
		})

		await myConductor.init()
		await myConductor.addDevice('chef0', {
			type: DeviceType.SOFIE_CHEF,
			options: {
				address: 'ws://127.0.0.1',
			},
			commandReceiver: commandReceiver0,
		})
		myConductor.setTimelineAndMappings([], myLayerMapping)

		const wsInstances = WebSocket.getMockInstances()
		expect(wsInstances).toHaveLength(1)
		const wsInstance = wsInstances[0]

		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('chef0')
		device = deviceContainer!.device as ThreadedClass<SofieChefDevice>
		const chefDevice = deviceContainer!.device as ThreadedClass<SofieChefDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		await mockTime.advanceTimeTicks(100)

		expect(await chefDevice.getStatus()).toMatchObject({
			statusCode: StatusCode.GOOD,
		})

		// Chef reports that there is a problem with a window:
		wsInstance.mockSendMessage(
			JSON.stringify(
				literal<SendWSMessageAny>({
					type: SendWSMessageType.STATUS,
					status: {
						app: {
							statusCode: ChefStatusCode.GOOD,
							message: '',
						},
						windows: {
							'5': {
								statusCode: ChefStatusCode.ERROR,
								message: 'whoopsie',
							},
						},
					},
				})
			)
		)

		await mockTime.advanceTimeTicks(100)

		expect(await chefDevice.getStatus()).toMatchObject({
			statusCode: StatusCode.BAD,
			messages: ['Window 5: whoopsie'],
		})

		// Simulate loss-of-connection:
		wsInstance.mockSetConnected(false)

		await mockTime.advanceTimeTicks(100)

		expect(await chefDevice.getStatus()).toMatchObject({
			statusCode: StatusCode.BAD,
			messages: ['Not connected'],
		})

		// Simulate that connection is back:
		wsInstance.mockSetConnected(true)

		await mockTime.advanceTimeTicks(5000)

		expect(await chefDevice.getStatus()).toMatchObject({
			statusCode: StatusCode.GOOD,
			messages: [],
		})
	})
	test('Play & stop URL', async () => {
		let device: any = undefined
		const commandReceiver0: any = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
			// return Promise.resolve()
		})
		const myLayerMapping0: MappingSofieChef = {
			device: DeviceType.SOFIE_CHEF,
			deviceId: 'chef0',
			windowId: 'window0',
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn()
		myConductor.on('error', errorHandler)

		WebSocket.mockConstructor((ws: WebSocket) => {
			setImmediate(() => {
				ws.mockSetConnected(true)
			})
		})

		await myConductor.init()
		await myConductor.addDevice('chef0', {
			type: DeviceType.SOFIE_CHEF,
			options: {
				address: 'ws://127.0.0.1',
			},
			commandReceiver: commandReceiver0,
		})
		myConductor.setTimelineAndMappings([], myLayerMapping)

		const wsInstances = WebSocket.getMockInstances()
		expect(wsInstances).toHaveLength(1)

		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('chef0')
		device = deviceContainer!.device as ThreadedClass<SofieChefDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'url0',
					enable: {
						start: 11000,
						end: 20000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.SOFIE_CHEF,
						type: TimelineContentTypeSofieChef.URL,
						url: 'http://google.com',
					},
					keyframes: [
						{
							id: 'kf0',
							enable: {
								start: 4000, // 15000
							},
							content: {
								url: 'http://yahoo.com',
							},
						},
					],
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10990)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		await mockTime.advanceTimeToTicks(11100)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			content: {
				type: 'playurl',
				url: 'http://google.com',
				windowId: 'window0',
			},
			context: 'added',
			timelineObjId: 'url0',
		})

		commandReceiver0.mockReset()

		await mockTime.advanceTimeToTicks(18500)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			content: {
				type: 'playurl',
				url: 'http://yahoo.com',
				windowId: 'window0',
			},
			context: 'changed',
			timelineObjId: 'url0',
		})

		commandReceiver0.mockReset()
		await mockTime.advanceTimeToTicks(20100)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			content: {
				type: 'stop',
				windowId: 'window0',
			},
			context: 'removed',
			timelineObjId: 'url0',
		})
	})
})
