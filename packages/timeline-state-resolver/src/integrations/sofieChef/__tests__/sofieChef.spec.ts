import { SofieChefDevice } from '..'
import { StatusCode } from 'timeline-state-resolver-types'
import { MockTime } from '../../../__tests__/mockTime'
import * as WebSocket from '../../../__mocks__/ws'
import { literal } from '../../../lib'
import { SendWSMessageAny, SendWSMessageType, StatusCode as ChefStatusCode } from '../api'
import { getDeviceContext } from '../../__tests__/testlib'

describe('SofieChef', () => {
	jest.mock('ws', () => WebSocket)
	const mockTime = new MockTime()
	beforeEach(() => {
		mockTime.init()

		WebSocket.clearMockInstances()
	})

	test('Status & reconnection', async () => {
		WebSocket.mockConstructor((ws: WebSocket) => {
			// @ts-ignore mock
			// ws.mockReplyFunction((message) => {
			// 	return Buffer.from('')
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

		const device = new SofieChefDevice(getDeviceContext())
		await device.init({
			address: 'ws://127.0.0.1',
		})

		const wsInstances = WebSocket.getMockInstances()
		expect(wsInstances).toHaveLength(1)
		const wsInstance = wsInstances[0]

		await mockTime.advanceTimeTicks(100)

		expect(device.getStatus()).toMatchObject({
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

		expect(device.getStatus()).toMatchObject({
			statusCode: StatusCode.BAD,
			messages: ['Window 5: whoopsie'],
		})

		// Simulate loss-of-connection:
		wsInstance.mockSetConnected(false)

		await mockTime.advanceTimeTicks(100)

		expect(device.getStatus()).toMatchObject({
			statusCode: StatusCode.BAD,
			messages: ['Not connected'],
		})

		// Simulate that connection is back:
		wsInstance.mockSetConnected(true)

		await mockTime.advanceTimeTicks(5000)

		expect(device.getStatus()).toMatchObject({
			statusCode: StatusCode.GOOD,
			messages: [],
		})
	})
})
