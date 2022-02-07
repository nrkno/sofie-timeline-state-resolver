import { Mappings, DeviceType, MappingAbstract } from 'timeline-state-resolver-types'
import { AbstractDevice, DeviceOptionsAbstractInternal } from '../abstract'
import { StatusCode } from '../device'
import { MockTime } from '../../__tests__/mockTime'
import { getMockCall } from '../../__tests__/lib'
import { SetRequired } from 'type-fest'
import { MockConductor } from '../../__mocks__/mockConductor'

describe('Abstract device', () => {
	const mockTime = new MockTime()
	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})
	test('Abstract device methods', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingAbstract = {
			device: DeviceType.ABSTRACT,
			deviceId: 'myAbstract',
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const deviceOptions: SetRequired<DeviceOptionsAbstractInternal, 'options'> = {
			type: DeviceType.ABSTRACT,
			options: {},
			commandReceiver: commandReceiver0,
		}
		const device = new AbstractDevice(
			'myAbstract',
			{
				type: DeviceType.ABSTRACT,
				options: {},
				commandReceiver: commandReceiver0,
			},
			mockTime.getCurrentTime2
		)
		await device.init(deviceOptions.options)

		const myConductor = new MockConductor(mockTime)
		myConductor.addDevice(device)

		await myConductor.runTo(10100)

		const onError = jest.fn()
		const onDebug = jest.fn()
		device.on('error', onError)
		device.on('debug', onDebug)

		expect(device.canConnect).toBeFalsy()
		expect(device.connected).toBeFalsy()
		expect(device.deviceName).toMatch(/abstract/i)
		expect(device.getStatus()).toMatchObject({ statusCode: StatusCode.GOOD })

		// Check that no commands has been scheduled:
		expect(device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.now - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ABSTRACT,
						tmp0: 'abc',
					},
				},
				{
					id: 'obj1',
					enable: {
						start: '#obj0.end',
						duration: 1000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ABSTRACT,
						tmp0: 'abcde',
					},
				},
			],
			myLayerMapping
		)

		await myConductor.runTo(10200)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			commandName: 'addedAbstract',
			content: {
				deviceType: 0, // abstract
				tmp0: 'abc',
			},
			context: 'added: obj0',
		})

		await myConductor.runTo(11200)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			commandName: 'changedAbstract',
			content: {
				deviceType: 0, // abstract
				tmp0: 'abcde',
			},
			context: 'changed: obj1',
		})

		await myConductor.runTo(15000)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(getMockCall(commandReceiver0, 2, 1)).toMatchObject({
			commandName: 'removedAbstract',
			content: {
				deviceType: 0, // abstract
				tmp0: 'abcde',
			},
			context: 'removed: obj1',
		})

		await device.terminate()

		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('Abstract without mock', async () => {
		const myLayerMapping0: MappingAbstract = {
			device: DeviceType.ABSTRACT,
			deviceId: 'myAbstract',
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const deviceOptions: SetRequired<DeviceOptionsAbstractInternal, 'options'> = {
			type: DeviceType.ABSTRACT,
			options: {},
		}
		const device = new AbstractDevice('myAbstract', deviceOptions, mockTime.getCurrentTime2)
		await device.init(deviceOptions.options)

		const myConductor = new MockConductor(mockTime)
		myConductor.addDevice(device)

		await myConductor.runTo(10100)

		const onError = jest.fn()
		const onDebug = jest.fn()
		device.on('error', onError)
		device.on('debug', onDebug)

		// Check that no commands has been scheduled:
		expect(device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.now - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ABSTRACT,
					},
				},
			],
			myLayerMapping
		)

		await myConductor.runTo(10200)
		expect(onDebug).toHaveBeenCalledTimes(1)

		await device.terminate()

		expect(onError).toHaveBeenCalledTimes(0)
	})
})
