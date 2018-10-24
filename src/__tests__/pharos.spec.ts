jest.mock('ws')
import { TriggerType } from 'superfly-timeline'

import { Mappings, DeviceType, MappingPharos } from '../devices/mapping'
import { Conductor } from '../conductor'
import { PharosDevice } from '../devices/pharos'
const WebSocket = require('../__mocks__/ws')

describe('Pharos', () => {
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
		expect(advanceTime).toBeGreaterThan(0)
		now += advanceTime
		jest.advanceTimersByTime(advanceTime)
		// console.log('Advancing ' + advanceTime + ' ms -----------------------')
	}
	function advanceTimeTo (time: number) {
		let advance = time - now
		advanceTime(advance)
	}
	beforeEach(() => {
		now = 10000
		jest.useFakeTimers()

	})
	test('Scene', async () => {
		let device
		let commandReceiver0 = jest.fn((...args) => {
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
			getCurrentTime: getCurrentTime
		})
		let errorHandler = jest.fn()
		myConductor.on('error', errorHandler)

		let mockReply = jest.fn((_ws: WebSocket, message: string) => {
			let data = JSON.parse(message)
			if (data.request === 'project') {
				return {
					request: data.request,
					author: 'Jest',
					filename: 'filename',
					name: 'Jest test mock',
					unique_id: 'abcde123',
					upload_date: '2018-10-22T08:09:02'
				}
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
		myConductor.mapping = myLayerMapping

		let wsInstances = WebSocket.getMockInstances()
		expect(wsInstances).toHaveLength(1)
		// let wsInstance = wsInstances[0]

		advanceTimeTo(10100)

		device = myConductor.getDevice('myPharos') as PharosDevice

		expect(mockReply).toHaveBeenCalledTimes(1)
		expect(mockReply.mock.calls[0][1]).toMatch(/project/) // get project info

		// Check that no commands has been scheduled:
		expect(device.queue).toHaveLength(0)

		myConductor.timeline = [
			{
				id: 'scene0',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: now + 1000
				},
				duration: 5000,
				LLayer: 'myLayer0',
				content: {
					type: 'scene',
					attributes: {
						scene: 1
					}
				}
			},
			{
				id: 'scene1',
				trigger: {
					type: TriggerType.TIME_RELATIVE,
					value: '#scene0.start + 1000'
				},
				duration: 5000,
				LLayer: 'myLayer0',
				content: {
					type: 'scene',
					attributes: {
						scene: 2
					}
				}
			},
			{
				id: 'scene2',
				trigger: {
					type: TriggerType.TIME_RELATIVE,
					value: '#scene1.start + 1000'
				},
				duration: 1000,
				LLayer: 'myLayer0',
				content: {
					type: 'scene',
					attributes: {
						stopped: true,
						scene: 2
					}
				}
			}
		]

		advanceTimeTo(10990)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		mockReply.mockReset()
		expect(mockReply).toHaveBeenCalledTimes(0)

		advanceTimeTo(11500)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0.mock.calls[0][1].content.args[0]).toEqual(1) // scene
		expect(commandReceiver0.mock.calls[0][2]).toMatch(/added/) // context
		expect(commandReceiver0.mock.calls[0][2]).toMatch(/scene0/) // context

		advanceTimeTo(12500)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(commandReceiver0.mock.calls[1][1].content.args[0]).toEqual(1) // scene
		expect(commandReceiver0.mock.calls[1][2]).toMatch(/changed from/) // context
		expect(commandReceiver0.mock.calls[1][2]).toMatch(/scene0/) // context

		expect(commandReceiver0.mock.calls[2][1].content.args[0]).toEqual(2) // scene
		expect(commandReceiver0.mock.calls[2][2]).toMatch(/changed to/) // context
		expect(commandReceiver0.mock.calls[2][2]).toMatch(/scene1/) // context

		advanceTimeTo(13500)
		expect(commandReceiver0).toHaveBeenCalledTimes(5)
		expect(commandReceiver0.mock.calls[3][1].content.args[0]).toEqual(2) // scene
		expect(commandReceiver0.mock.calls[3][2]).toMatch(/removed/) // context
		expect(commandReceiver0.mock.calls[3][2]).toMatch(/scene1/) // context

		expect(commandReceiver0.mock.calls[4][1].content.args[0]).toEqual(2) // scene
		expect(commandReceiver0.mock.calls[4][2]).toMatch(/removed/) // context
		expect(commandReceiver0.mock.calls[4][2]).toMatch(/scene2/) // context

		advanceTimeTo(14500)
		expect(commandReceiver0).toHaveBeenCalledTimes(6)
		expect(commandReceiver0.mock.calls[5][1].content.args[0]).toEqual(2) // scene
		expect(commandReceiver0.mock.calls[5][2]).toMatch(/added/) // context
		expect(commandReceiver0.mock.calls[5][2]).toMatch(/scene1/) // context

		advanceTimeTo(20000)
		expect(commandReceiver0).toHaveBeenCalledTimes(7)
		expect(commandReceiver0.mock.calls[6][1].content.args[0]).toEqual(2) // scene
		expect(commandReceiver0.mock.calls[6][2]).toMatch(/removed/) // context
		expect(commandReceiver0.mock.calls[6][2]).toMatch(/scene1/) // context
	})
})
