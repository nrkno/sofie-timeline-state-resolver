jest.mock('request')
import { Conductor } from '../../conductor'
import { HttpWatcherDevice } from '../httpWatcher'
import {
	Mappings,
	DeviceType,
	MappingHTTPWatcher
} from '../../types/src'
import { MockTime } from '../../__tests__/mockTime.spec'
import { ThreadedClass } from 'threadedclass'
import { StatusCode } from '../device'

const request = require('../../__mocks__/request')

describe('HTTP-Watcher', () => {
	let mockTime = new MockTime()

	let onGet: jest.Mock<void, any[]>
	let mockStatusCode: number
	let mockBody: string
	beforeAll(() => {
		Date.now = jest.fn(() => {
			return mockTime.getCurrentTime()
		})
		onGet = jest.fn((url, _options, callback) => {
			if (url === 'http://localhost:80') {
				callback(null, {
					statusCode: mockStatusCode,
					body: mockBody
				}, mockBody)
			} else if (url === 'http://localhost:1234') {
				callback(null, {
					statusCode: mockStatusCode,
					body: mockBody
				}, mockBody)
			} else {
				callback(new Error('Unsupported mock url: ' + url), null)
			}
		})
		request.setMockGet(onGet)
	})
	beforeEach(() => {
		mockTime.init()

		mockStatusCode = 200
		mockBody = 'this is my keyword and its really nice'
	})

	test('Good reply, turns bad, then good again', async () => {
		let myLayerMapping0: MappingHTTPWatcher = {
			device: DeviceType.HTTPWATCHER,
			deviceId: 'myHTTPWatch'
		}
		let myLayerMapping: Mappings = {
			'myLayer0': myLayerMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})

		let onError = jest.fn()
		myConductor.on('error', onError)

		await myConductor.init()
		const generatedDevice = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				host: 'http://localhost',
				port: '1234',
				httpMethod: 'get',
				expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10 * 1000
			}
		})

		expect(generatedDevice).toBeTruthy()
		expect(await generatedDevice.getStatus()).toMatchObject({ statusCode: StatusCode.UNKNOWN })

		myConductor.mapping = myLayerMapping

		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toHaveBeenCalled()
		expect(await generatedDevice.getStatus()).toMatchObject({ statusCode: StatusCode.GOOD })

		mockStatusCode = 500
		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toMatchObject({ statusCode: StatusCode.BAD, messages: [/status code/i] })

		mockStatusCode = 200
		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toMatchObject({ statusCode: StatusCode.GOOD })

		mockBody = 'sorry not sorry'
		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toMatchObject({ statusCode: StatusCode.BAD, messages: [/keyword/i] })

		mockBody = 'heres my keyword again'
		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toMatchObject({ statusCode: StatusCode.GOOD })

		let device = myConductor.getDevice('myHTTPWatch') as ThreadedClass<HttpWatcherDevice>

		await device.terminate()
		jest.clearAllTimers()
		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('Only check keyword', async () => {
		let myLayerMapping0: MappingHTTPWatcher = {
			device: DeviceType.HTTPWATCHER,
			deviceId: 'myHTTPWatch'
		}
		let myLayerMapping: Mappings = {
			'myLayer0': myLayerMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})

		let onError = jest.fn()
		myConductor.on('error', onError)

		await myConductor.init()
		const generatedDevice = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				host: 'http://localhost',
				port: '80',
				httpMethod: 'get',
				// expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10 * 1000
			}
		})

		expect(generatedDevice).toBeTruthy()
		expect(await generatedDevice.getStatus()).toMatchObject({ statusCode: StatusCode.UNKNOWN })

		myConductor.mapping = myLayerMapping

		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toHaveBeenCalled()
		expect(await generatedDevice.getStatus()).toMatchObject({ statusCode: StatusCode.GOOD })

		mockStatusCode = 500 // should not matter
		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toMatchObject({ statusCode: StatusCode.GOOD })

		mockStatusCode = 200
		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toMatchObject({ statusCode: StatusCode.GOOD })

		mockBody = 'sorry not sorry'
		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toMatchObject({ statusCode: StatusCode.BAD, messages: [/keyword/i] })

		mockBody = 'heres my keyword again'
		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toMatchObject({ statusCode: StatusCode.GOOD })

		let device = myConductor.getDevice('myHTTPWatch') as ThreadedClass<HttpWatcherDevice>

		await device.terminate()
		jest.clearAllTimers()
		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('Only check response code', async () => {
		let myLayerMapping0: MappingHTTPWatcher = {
			device: DeviceType.HTTPWATCHER,
			deviceId: 'myHTTPWatch'
		}
		let myLayerMapping: Mappings = {
			'myLayer0': myLayerMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})

		let onError = jest.fn()
		myConductor.on('error', onError)

		await myConductor.init()
		const generatedDevice = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				host: 'http://localhost',
				port: '80',
				httpMethod: 'get',
				expectedHttpResponse: 200,
				// keyword: 'my keyword',
				interval: 10 * 1000
			}
		})

		expect(generatedDevice).toBeTruthy()
		expect(await generatedDevice.getStatus()).toMatchObject({ statusCode: StatusCode.UNKNOWN })

		myConductor.mapping = myLayerMapping

		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toHaveBeenCalled()
		expect(await generatedDevice.getStatus()).toMatchObject({ statusCode: StatusCode.GOOD })

		mockStatusCode = 500
		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toMatchObject({ statusCode: StatusCode.BAD, messages: [/status code/i] })

		mockStatusCode = 200
		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toMatchObject({ statusCode: StatusCode.GOOD })

		mockBody = 'sorry not sorry' // should not matter
		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toMatchObject({ statusCode: StatusCode.GOOD })

		mockBody = 'heres my keyword again'
		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toMatchObject({ statusCode: StatusCode.GOOD })

		let device = myConductor.getDevice('myHTTPWatch') as ThreadedClass<HttpWatcherDevice>

		await device.terminate()
		jest.clearAllTimers()
		expect(onError).toHaveBeenCalledTimes(0)
	})
})
