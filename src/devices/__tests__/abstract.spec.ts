import { TriggerType } from 'superfly-timeline'
import {
	Mappings,
	DeviceType,
	MappingAbstract
} from '../../types/'
import { Conductor } from '../../conductor'
import { AbstractDevice } from '../abstract'
import { StatusCode } from '../device'
import { MockTime } from '../../__tests__/mockTime.spec'

describe('Abstract device', () => {
	let mockTime = new MockTime()
	beforeAll(() => {
		Date.now = jest.fn(() => {
			return mockTime.getCurrentTime()
		})
	})
	beforeEach(() => {
		mockTime.init()
	})
	test('Abstract device methods', async () => {

		let commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})
		let myLayerMapping0: MappingAbstract = {
			device: DeviceType.ABSTRACT,
			deviceId: 'myAbstract'
		}
		let myLayerMapping: Mappings = {
			'myLayer0': myLayerMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})
		await myConductor.init()
		await myConductor.addDevice('myAbstract', {
			type: DeviceType.ABSTRACT,
			options: {
				commandReceiver: commandReceiver0
			}
		})
		myConductor.mapping = myLayerMapping
		mockTime.advanceTimeTo(10100)

		let device = myConductor.getDevice('myAbstract') as AbstractDevice
		device.terminate = jest.fn(device.terminate)
		let onError = jest.fn()
		let onDebug = jest.fn()
		device.on('error', onError)
		device.on('debug', onDebug)

		expect(device.canConnect).toBeFalsy()
		expect(device.connected).toBeFalsy()
		expect(device.deviceName).toMatch(/abstract/i)
		expect(device.getStatus()).toMatchObject({ statusCode: StatusCode.GOOD })

		// Check that no commands has been scheduled:
		expect(device.queue).toHaveLength(0)

		myConductor.timeline = [
			{
				id: 'obj0',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: mockTime.now - 1000 // 1 seconds ago
				},
				duration: 2000,
				LLayer: 'myLayer0',
				content: {}
			},
			{
				id: 'obj1',
				trigger: {
					type: TriggerType.TIME_RELATIVE,
					value: '#obj0.end'
				},
				duration: 1000,
				LLayer: 'myLayer0',
				content: {}
			}
		]

		mockTime.advanceTimeTo(10200)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0.mock.calls[0][1]).toMatchObject(
			{
				commandName: 'addedAbstract',
				content: {
					GLayer: 'myLayer0'
				},
				context: 'added: obj0'
			}
		)

		mockTime.advanceTimeTo(11200)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0.mock.calls[1][1]).toMatchObject(
			{
				commandName: 'changedAbstract',
				content: {
					GLayer: 'myLayer0'
				},
				context: 'changed: obj1'
			}
		)

		mockTime.advanceTimeTo(15000)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(commandReceiver0.mock.calls[2][1]).toMatchObject(
			{
				commandName: 'removedAbstract',
				content: {
					GLayer: 'myLayer0'
				},
				context: 'removed: obj1'
			}
		)
		await myConductor.removeDevice(device.deviceId)

		expect(device.terminate).toHaveBeenCalledTimes(1)
		expect(myConductor.getDevice('myAbstract')).toBeFalsy()

		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('Abstract without mock', async () => {

		let myLayerMapping0: MappingAbstract = {
			device: DeviceType.ABSTRACT,
			deviceId: 'myAbstract'
		}
		let myLayerMapping: Mappings = {
			'myLayer0': myLayerMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})
		await myConductor.init()
		await myConductor.addDevice('myAbstract', {
			type: DeviceType.ABSTRACT,
			options: {}
		})
		myConductor.mapping = myLayerMapping
		mockTime.advanceTimeTo(10100)

		let device = myConductor.getDevice('myAbstract') as AbstractDevice
		device.terminate = jest.fn(device.terminate)
		let onError = jest.fn()
		let onDebug = jest.fn()
		device.on('error', onError)
		device.on('debug', onDebug)

		// Check that no commands has been scheduled:
		expect(device.queue).toHaveLength(0)

		myConductor.timeline = [
			{
				id: 'obj0',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: mockTime.now - 1000 // 1 seconds ago
				},
				duration: 2000,
				LLayer: 'myLayer0',
				content: {}
			}
		]

		mockTime.advanceTimeTo(10200)
		expect(onDebug).toHaveBeenCalledTimes(1)

		await myConductor.removeDevice(device.deviceId)

		expect(device.terminate).toHaveBeenCalledTimes(1)
		expect(myConductor.getDevice('myAbstract')).toBeFalsy()

		expect(onError).toHaveBeenCalledTimes(0)
	})
})
