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
	beforeAll(() => {
		Date.now = jest.fn(() => {
			return mockTime.getCurrentTime()
		})
	})
	beforeEach(() => {
		mockTime.init()
	})

	test('Successful GET returns GOOD state', async () => {
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

		let onGet = jest.fn((url, _options, callback) => {
			if (url === 'http://localhost:1234') {
				callback(null, {
					statusCode: 200,
					body: 'my keyword'
				}, 'my keyword')
			} else {
				callback(new Error('Unsupported mock'), null)
			}
		})
		request.setMockGet(onGet)

		await myConductor.init()
		const generatedDevice = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				host: 'http://localhost',
				port: '1234',
				httpMethod: 'get',
				expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10
			}
		})
		.catch(error => {
			fail(error)
			return
		})
		if (!generatedDevice) {
			expect(generatedDevice).toBeTruthy()
			return
		}
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN })
		myConductor.mapping = myLayerMapping

		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(1)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD })

		let device = myConductor.getDevice('myHTTPWatch') as ThreadedClass<HttpWatcherDevice>

		await device.stopInterval()
		jest.clearAllTimers()
	})
	test('Un-Successful get returns BAD state', async () => {
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

		let onGet = jest.fn((url, _options, callback) => {
			callback(new Error('Bad Gateway'), null)
		})
		request.setMockGet(onGet)

		await myConductor.init()
		const generatedDevice = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				host: 'http://localhost',
				port: '1234',
				httpMethod: 'get',
				expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10
			}
		})
		.catch(error => {
			fail(error)
			return
		})
		if (!generatedDevice) {
			expect(generatedDevice).toBeTruthy()
			return
		}
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN })
		myConductor.mapping = myLayerMapping

		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(1)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.BAD })

		let device = myConductor.getDevice('myHTTPWatch') as ThreadedClass<HttpWatcherDevice>

		await device.stopInterval()
		jest.clearAllTimers()
	})
	test('Un-Successful get, bad keyword, returns BAD state', async () => {
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

		let onGet = jest.fn((url, _options, callback) => {
			if (url === 'http://localhost:1234') {
				callback(null, {
					statusCode: 200,
					body: 'bad keyword'
				}, 'bad keyword')
			} else {
				callback(new Error('Unsupported mock'), null)
			}
		})
		request.setMockGet(onGet)

		await myConductor.init()
		const generatedDevice = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				host: 'http://localhost',
				port: '1234',
				httpMethod: 'get',
				expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10
			}
		})
		.catch(error => {
			fail(error)
			return
		})
		if (!generatedDevice) {
			expect(generatedDevice).toBeTruthy()
			return
		}
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN })
		myConductor.mapping = myLayerMapping

		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(1)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.BAD })

		let device = myConductor.getDevice('myHTTPWatch') as ThreadedClass<HttpWatcherDevice>

		await device.stopInterval()
		jest.clearAllTimers()
	})

	test('Un-Successful get, wrong status code, returns BAD state', async () => {
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

		let onGet = jest.fn((url, _options, callback) => {
			if (url === 'http://localhost:1234') {
				callback(null, {
					statusCode: 201,
					body: 'my keyword'
				}, 'my keyword')
			} else {
				callback(new Error('Unsupported mock'), null)
			}
		})
		request.setMockGet(onGet)

		await myConductor.init()
		const generatedDevice = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				host: 'http://localhost',
				port: '1234',
				httpMethod: 'get',
				expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10
			}
		})
		.catch(error => {
			fail(error)
			return
		})
		if (!generatedDevice) {
			expect(generatedDevice).toBeTruthy()
			return
		}
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN })
		myConductor.mapping = myLayerMapping

		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(1)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.BAD })

		let device = myConductor.getDevice('myHTTPWatch') as ThreadedClass<HttpWatcherDevice>

		await device.stopInterval()
		jest.clearAllTimers()
	})
	test('Successful http POST returns GOOD state', async () => {
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

		let onGet = jest.fn((url, _options, callback) => {
			if (url === 'http://localhost:1234') {
				callback(null, {
					statusCode: 200,
					body: 'my keyword'
				}, 'my keyword')
			} else {
				callback(new Error('Unsupported mock'), null)
			}
		})
		let onPost = jest.fn((url, _options, callback) => {
			if (url === 'http://localhost:1234') {
				callback(null, {
					statusCode: 200,
					body: 'my keyword2'
				}, 'my keyword2')
			} else {
				callback(new Error('Unsupported mock'), null)
			}
		})
		request.setMockGet(onGet)
		request.setMockPost(onPost)

		await myConductor.init()
		const generatedDevice = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				host: 'http://localhost',
				port: '1234',
				httpMethod: 'post',
				expectedHttpResponse: 200,
				keyword: 'my keyword2',
				interval: 10
			}
		})
		.catch(error => {
			fail(error)
			return
		})
		if (!generatedDevice) {
			expect(generatedDevice).toBeTruthy()
			return
		}
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN })
		myConductor.mapping = myLayerMapping

		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(0)
		expect(onPost).toBeCalledTimes(1)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD })

		let device = myConductor.getDevice('myHTTPWatch') as ThreadedClass<HttpWatcherDevice>

		await device.stopInterval()
		jest.clearAllTimers()
	})
	test('"jibberish" http method defaults to GET and returns GOOD state', async () => {
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

		let onGet = jest.fn((url, _options, callback) => {
			if (url === 'http://localhost:1234') {
				callback(null, {
					statusCode: 200,
					body: 'my keyword'
				}, 'my keyword')
			} else {
				callback(new Error('Unsupported mock'), null)
			}
		})
		let onPost = jest.fn((url, _options, callback) => {
			if (url === 'http://localhost:1234') {
				callback(null, {
					statusCode: 200,
					body: 'my keyword2'
				}, 'my keyword2')
			} else {
				callback(new Error('Unsupported mock'), null)
			}
		})
		request.setMockGet(onGet)
		request.setMockPost(onPost)

		await myConductor.init()
		const generatedDevice = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				host: 'http://localhost',
				port: '1234',
				httpMethod: 'jibberish',
				expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10
			}
		})
		.catch(error => {
			fail(error)
			return
		})
		if (!generatedDevice) {
			expect(generatedDevice).toBeTruthy()
			return
		}
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN })
		myConductor.mapping = myLayerMapping

		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(1)
		expect(onPost).toBeCalledTimes(0)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD })

		let device = myConductor.getDevice('myHTTPWatch') as ThreadedClass<HttpWatcherDevice>

		await device.stopInterval()
		jest.clearAllTimers()
	})
	test('Port defaults to 80 returns GOOD state', async () => {
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

		let onGet = jest.fn((url, _options, callback) => {
			if (url === 'http://localhost:80') {
				callback(null, {
					statusCode: 200,
					body: 'my keyword'
				}, 'my keyword')
			} else {
				callback(new Error('Unsupported mock'), null)
			}
		})
		request.setMockGet(onGet)

		await myConductor.init()
		const generatedDevice = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				host: 'http://localhost',
				httpMethod: 'jibberish',
				expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10
			}
		})
		.catch(error => {
			fail(error)
			return
		})
		if (!generatedDevice) {
			expect(generatedDevice).toBeTruthy()
			return
		}
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN })
		myConductor.mapping = myLayerMapping

		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(1)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD })

		let device = myConductor.getDevice('myHTTPWatch') as ThreadedClass<HttpWatcherDevice>

		await device.stopInterval()
		jest.clearAllTimers()
	})
})
