import { Conductor } from '../../../conductor'
import { Mappings, DeviceType, Mapping, SomeMappingHttpWatcher, HttpMethod } from 'timeline-state-resolver-types'
import { MockTime } from '../../../__tests__/mockTime'
import { StatusCode } from '../../../devices/device'
import got from 'got'

jest.unmock('got') // Do not automock.

const myLayerMapping0: Mapping<SomeMappingHttpWatcher> = {
	device: DeviceType.HTTPWATCHER,
	deviceId: 'myHTTPWatch',
	options: {},
}
const myLayerMapping: Mappings = {
	myLayer0: myLayerMapping0,
}

describe('HTTP-Watcher', () => {
	const mockTime = new MockTime()
	let myConductor: Conductor = new Conductor({
		multiThreadedResolver: false,
		getCurrentTime: mockTime.getCurrentTime,
	})
	const get = jest.spyOn(got, 'get')
	const post = jest.spyOn(got, 'post')
	const goodStatusCode = 200
	const goodBody = 'this is my keyword and its really nice'

	beforeAll(() => {
		Date.now = jest.fn(() => {
			return mockTime.getCurrentTime()
		})
	})
	beforeEach(() => {
		mockTime.init()
		get.mockClear()
		post.mockClear()

		get.mockResolvedValue({ statusCode: goodStatusCode, body: goodBody })
		myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
	})

	afterEach(() => {
		jest.clearAllTimers()
	})

	test('Good reply, turns bad, then good again', async () => {
		const onError = jest.fn()
		myConductor.on('error', onError)

		await myConductor.init()
		const generatedDeviceContainer = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				uri: 'http://localhost:1234',
				httpMethod: HttpMethod.GET,
				expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10 * 1000,
			},
		})
		const generatedDevice = generatedDeviceContainer.device

		expect(generatedDevice).toBeTruthy()
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [], active: true })

		myConductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10100)
		expect(get).toHaveBeenCalledTimes(2)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [], active: true })

		get.mockResolvedValueOnce({ statusCode: 500, body: goodBody })
		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toMatchObject({
			statusCode: StatusCode.BAD,
			messages: [/status code/i],
			active: true,
		})

		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [], active: true })

		get.mockResolvedValueOnce({ statusCode: goodStatusCode, body: 'sorry not sorry' })
		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toMatchObject({
			statusCode: StatusCode.BAD,
			messages: [/keyword/i],
			active: true,
		})

		get.mockResolvedValueOnce({ statusCode: goodStatusCode, body: 'heres my keyword again' })
		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [], active: true })

		await generatedDevice.terminate()
		jest.clearAllTimers()
		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('Only check keyword', async () => {
		const onError = jest.fn()
		myConductor.on('error', onError)

		await myConductor.init()
		const generatedDeviceContainer = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				uri: 'http://localhost',
				httpMethod: HttpMethod.GET,
				// expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10 * 1000,
			},
		})
		const generatedDevice = generatedDeviceContainer.device

		expect(generatedDevice).toBeTruthy()
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [], active: true })

		myConductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10100)
		expect(get).toHaveBeenCalledTimes(2)
		get.mockClear()
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [], active: true })

		get.mockResolvedValueOnce({ statusCode: 500, body: goodBody })
		await mockTime.advanceTimeTicks(10100)
		expect(get).toHaveBeenCalledTimes(1)
		get.mockClear()
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [], active: true })

		await mockTime.advanceTimeTicks(10100)
		expect(get).toHaveBeenCalledTimes(1)
		get.mockClear()
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [], active: true })

		get.mockResolvedValueOnce({ statusCode: goodStatusCode, body: 'sorry not sorry' })
		await mockTime.advanceTimeTicks(10100)
		expect(get).toHaveBeenCalledTimes(1)
		get.mockClear()
		expect(await generatedDevice.getStatus()).toMatchObject({
			statusCode: StatusCode.BAD,
			messages: [/keyword/i],
			active: true,
		})

		get.mockResolvedValueOnce({ statusCode: goodStatusCode, body: 'heres my keyword again' })
		await mockTime.advanceTimeTicks(10100)
		expect(get).toHaveBeenCalledTimes(1)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [], active: true })

		await generatedDevice.terminate()
		jest.clearAllTimers()
		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('Only check response code', async () => {
		const onError = jest.fn()
		myConductor.on('error', onError)

		await myConductor.init()
		const generatedDeviceContainer = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				uri: 'http://localhost',
				httpMethod: HttpMethod.GET,
				expectedHttpResponse: 200,
				// keyword: 'my keyword',
				interval: 10 * 1000,
			},
		})
		const generatedDevice = generatedDeviceContainer.device

		expect(generatedDevice).toBeTruthy()
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [], active: true })

		myConductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10100)
		expect(get).toHaveBeenCalledTimes(2)
		get.mockClear()
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [], active: true })

		get.mockResolvedValueOnce({ statusCode: 500, body: goodBody })
		await mockTime.advanceTimeTicks(10100)
		expect(get).toHaveBeenCalledTimes(1)
		get.mockClear()
		expect(await generatedDevice.getStatus()).toMatchObject({
			statusCode: StatusCode.BAD,
			messages: [/status code/i],
			active: true,
		})

		await mockTime.advanceTimeTicks(10100)
		expect(get).toHaveBeenCalledTimes(1)
		get.mockClear()
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [], active: true })

		get.mockResolvedValueOnce({ statusCode: goodStatusCode, body: 'sorry not sorry' })
		await mockTime.advanceTimeTicks(10100)
		expect(get).toHaveBeenCalledTimes(1)
		get.mockClear()
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [], active: true })

		get.mockResolvedValueOnce({ statusCode: goodStatusCode, body: 'heres my keyword again' })
		await mockTime.advanceTimeTicks(10100)
		expect(get).toHaveBeenCalledTimes(1)
		get.mockClear()
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [], active: true })

		await generatedDevice.terminate()
		jest.clearAllTimers()
		expect(onError).toHaveBeenCalledTimes(0)
	})

	test('Successful GET returns GOOD state', async () => {
		await myConductor.init()
		const generatedDeviceContainer = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				uri: 'http://localhost',
				httpMethod: HttpMethod.GET,
				expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10 * 1000,
			},
		})
		const generatedDevice = generatedDeviceContainer.device
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [], active: true })
		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeTicks(10100)
		expect(get).toHaveBeenCalledTimes(2)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [], active: true })

		await generatedDevice.terminate()
	})
	test('Un-Successful get returns BAD state', async () => {
		get.mockRejectedValueOnce(new Error('Bad Gateway'))
		get.mockRejectedValueOnce(new Error('Bad Gateway'))

		await myConductor.init()
		const generatedDeviceContainer = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				uri: 'http://localhost',
				httpMethod: HttpMethod.GET,
				expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10 * 1000,
			},
		})
		const generatedDevice = generatedDeviceContainer.device
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [], active: true })
		myConductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10100)
		expect(get).toHaveBeenCalledTimes(2)
		expect(await generatedDevice.getStatus()).toEqual({
			statusCode: StatusCode.BAD,
			messages: ['Error: Bad Gateway'],
			active: true,
		})

		await generatedDevice.terminate()
	})

	test('Un-Successful get, bad keyword, returns BAD state', async () => {
		await myConductor.init()
		const generatedDeviceContainer = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				uri: 'http://localhost',
				httpMethod: HttpMethod.GET,
				expectedHttpResponse: 200,
				keyword: 'bad keyword',
				interval: 10 * 1000,
			},
		})
		const generatedDevice = generatedDeviceContainer.device
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [], active: true })
		myConductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10100)
		expect(get).toHaveBeenCalledTimes(2)
		expect(await generatedDevice.getStatus()).toEqual({
			statusCode: StatusCode.BAD,
			messages: ['Expected keyword "bad keyword" not found'],
			active: true,
		})

		await generatedDevice.terminate()
	})

	test('Un-Successful get, wrong status code, returns BAD state', async () => {
		get.mockResolvedValueOnce({ statusCode: 201, body: '' })
		get.mockResolvedValueOnce({ statusCode: 201, body: '' })

		await myConductor.init()
		const generatedDeviceContainer = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				uri: 'http://localhost:1234',
				httpMethod: HttpMethod.GET,
				expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10 * 1000,
			},
		})
		const generatedDevice = generatedDeviceContainer.device
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [], active: true })
		myConductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10100)
		expect(get).toHaveBeenCalledTimes(2)
		expect(await generatedDevice.getStatus()).toEqual({
			statusCode: StatusCode.BAD,
			messages: ['Expected status code 200, got 201'],
			active: true,
		})

		await generatedDevice.terminate()
	})
	test('Successful http POST returns GOOD state', async () => {
		post.mockResolvedValue({ statusCode: 200, body: 'my keyword2' })

		await myConductor.init()
		const generatedDeviceContainer = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				uri: 'http://localhost:1234',
				httpMethod: HttpMethod.POST,
				expectedHttpResponse: 200,
				keyword: 'my keyword2',
				interval: 10 * 1000,
			},
		})
		const generatedDevice = generatedDeviceContainer.device
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [], active: true })
		myConductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10000)
		expect(get).toHaveBeenCalledTimes(0)
		expect(post).toHaveBeenCalledTimes(2)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [], active: true })

		await generatedDevice.terminate()
	})
	test('"jibberish" http method defaults to GET and returns GOOD state', async () => {
		await myConductor.init()
		const generatedDeviceContainer = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				uri: 'http://localhost',
				httpMethod: 'jibberish' as any,
				expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10 * 1000,
			},
		})
		const generatedDevice = generatedDeviceContainer.device
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [], active: true })
		myConductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10100)
		expect(get).toHaveBeenCalledTimes(2)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [], active: true })

		await generatedDevice.terminate()
	})
	test('Send headers with request', async () => {
		await myConductor.init()
		const generatedDeviceContainer = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				uri: 'http://localhost',
				httpMethod: HttpMethod.GET,
				expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10 * 1000,
				headers: {
					myHeader: 'myValue',
				},
			},
		})
		const generatedDevice = generatedDeviceContainer.device
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [], active: true })
		myConductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10100)
		expect(get).toHaveBeenCalledTimes(2)
		expect(get).toHaveBeenCalledWith('http://localhost', {
			headers: {
				myHeader: 'myValue',
			},
		})
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [], active: true })

		await generatedDevice.terminate()
	})
})
