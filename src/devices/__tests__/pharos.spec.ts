import { Conductor } from '../../conductor'
import { PharosDevice } from '../pharos'
import {
	Mappings,
	DeviceType,
	MappingPharos,
	TimelineContentTypePharos
} from '../../types/src'
import { MockTime } from '../../__tests__/mockTime'
import { ThreadedClass } from 'threadedclass'
import { getMockCall } from '../../__tests__/lib'
import * as WebSocket from '../../__mocks__/ws'

describe('Pharos', () => {
	jest.mock('ws', () => WebSocket)
	let mockTime = new MockTime()
	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()

		WebSocket.clearMockInstances()

		jest.useRealTimers()
		setTimeout(() => {
			let wsInstances = WebSocket.getMockInstances()
			expect(wsInstances).toHaveLength(1)
			WebSocket.getMockInstances()[0].mockSetConnected(true)
		}, 200)
		jest.useFakeTimers()
	})
	test('Scene', async () => {
		let device
		const commandReceiver0: any = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
			// return Promise.resolve()
		})
		let myLayerMapping0: MappingPharos = {
			device: DeviceType.PHAROS,
			deviceId: 'myPharos'
		}
		let myLayerMapping: Mappings = {
			'myLayer0': myLayerMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})
		let errorHandler = jest.fn()
		myConductor.on('error', errorHandler)

		let mockReply = jest.fn((_ws: WebSocket, message: string) => {
			let data = JSON.parse(message)
			if (data.request === 'project') {
				return JSON.stringify({
					request: data.request,
					author: 'Jest',
					filename: 'filename',
					name: 'Jest test mock',
					unique_id: 'abcde123',
					upload_date: '2018-10-22T08:09:02'
				})
			} else {
				console.log(data)
			}
			return ''
		})
		WebSocket.mockConstructor((ws: WebSocket) => {
			// @ts-ignore mock
			ws.mockReplyFunction((message) => {

				if (message === '') return '' // ping message

				return mockReply(ws, message)
			})
		})

		await myConductor.init()
		await myConductor.addDevice('myPharos', {
			type: DeviceType.PHAROS,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1'
			}
		})
		myConductor.setTimelineAndMappings([], myLayerMapping)

		let wsInstances = WebSocket.getMockInstances()
		expect(wsInstances).toHaveLength(1)
		// let wsInstance = wsInstances[0]

		await mockTime.advanceTimeToTicks(10100)

		let deviceContainer = myConductor.getDevice('myPharos')
		device = deviceContainer.device as ThreadedClass<PharosDevice>

		expect(mockReply).toHaveBeenCalledTimes(1)
		expect(getMockCall(mockReply, 0, 1)).toMatch(/project/) // get project info

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'scene0',
				enable: {
					start: mockTime.now + 1000,
					duration: 5000
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.PHAROS,
					type: TimelineContentTypePharos.SCENE,

					scene: 1
				}
			},
			{
				id: 'scene1',
				enable: {
					start: '#scene0.start + 1000',
					duration: 5000
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.PHAROS,
					type: TimelineContentTypePharos.SCENE,

					scene: 2
				}
			},
			{
				id: 'scene2',
				enable: {
					start: '#scene1.start + 1000',
					duration: 1000
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.PHAROS,
					type: TimelineContentTypePharos.SCENE,

					scene: 2,
					stopped: true
				}
			}
		])

		await mockTime.advanceTimeToTicks(10990)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		mockReply.mockReset()
		expect(mockReply).toHaveBeenCalledTimes(0)

		await mockTime.advanceTimeToTicks(11500)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).content.args[0]).toEqual(1) // scene
		expect(getMockCall(commandReceiver0, 0, 2)).toMatch(/added/) // context
		expect(getMockCall(commandReceiver0, 0, 2)).toMatch(/scene0/) // context

		await mockTime.advanceTimeToTicks(12500)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(getMockCall(commandReceiver0, 1, 1).content.args[0]).toEqual(1) // scene
		expect(getMockCall(commandReceiver0, 1, 2)).toMatch(/changed from/) // context
		expect(getMockCall(commandReceiver0, 1, 2)).toMatch(/scene0/) // context

		expect(getMockCall(commandReceiver0, 2, 1).content.args[0]).toEqual(2) // scene
		expect(getMockCall(commandReceiver0, 2, 2)).toMatch(/changed to/) // context
		expect(getMockCall(commandReceiver0, 2, 2)).toMatch(/scene1/) // context

		await mockTime.advanceTimeToTicks(13500)
		expect(commandReceiver0).toHaveBeenCalledTimes(5)
		expect(getMockCall(commandReceiver0, 3, 1).content.args[0]).toEqual(2) // scene
		expect(getMockCall(commandReceiver0, 3, 2)).toMatch(/removed/) // context
		expect(getMockCall(commandReceiver0, 3, 2)).toMatch(/scene1/) // context

		expect(getMockCall(commandReceiver0, 4, 1).content.args[0]).toEqual(2) // scene
		expect(getMockCall(commandReceiver0, 4, 2)).toMatch(/removed/) // context
		expect(getMockCall(commandReceiver0, 4, 2)).toMatch(/scene2/) // context

		await mockTime.advanceTimeToTicks(14500)
		expect(commandReceiver0).toHaveBeenCalledTimes(6)
		expect(getMockCall(commandReceiver0, 5, 1).content.args[0]).toEqual(2) // scene
		expect(getMockCall(commandReceiver0, 5, 2)).toMatch(/added/) // context
		expect(getMockCall(commandReceiver0, 5, 2)).toMatch(/scene1/) // context

		await mockTime.advanceTimeToTicks(20000)
		expect(commandReceiver0).toHaveBeenCalledTimes(7)
		expect(getMockCall(commandReceiver0, 6, 1).content.args[0]).toEqual(2) // scene
		expect(getMockCall(commandReceiver0, 6, 2)).toMatch(/removed/) // context
		expect(getMockCall(commandReceiver0, 6, 2)).toMatch(/scene1/) // context
	})
})
