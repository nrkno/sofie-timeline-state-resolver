import { HttpMethod, HttpWatcherOptions } from 'timeline-state-resolver-types'
import { MockTime } from '../../../__tests__/mockTime'
import { StatusCode } from '../../../devices/device'

const MOCKED_SOCKET_GET = jest.fn()
const MOCKED_SOCKET_POST = jest.fn()
const MOCKED_SOCKET_PUT = jest.fn()
const MOCKED_SOCKET_DELETE = jest.fn()

jest.mock('got', () => {
	return {
		default: {
			get: MOCKED_SOCKET_GET,
			post: MOCKED_SOCKET_POST,
			put: MOCKED_SOCKET_PUT,
			delete: MOCKED_SOCKET_DELETE,
		},
	}
})

// note - this import should be below the got mock
import { HTTPWatcherDevice } from '..'
import { getDeviceContext } from '../../__tests__/testlib'

async function getInitialisedDevice(options: HttpWatcherOptions) {
	const dev = new HTTPWatcherDevice(getDeviceContext())
	await dev.init(options)
	return dev
}

describe('HTTP-Watcher', () => {
	const mockTime = new MockTime()

	const goodStatusCode = 200
	const goodBody = 'this is my keyword and its really nice'

	beforeAll(() => {
		Date.now = jest.fn(() => {
			return mockTime.getCurrentTime()
		})
	})
	beforeEach(() => {
		mockTime.init()
		MOCKED_SOCKET_GET.mockClear()
		MOCKED_SOCKET_POST.mockClear()
		MOCKED_SOCKET_PUT.mockClear()
		MOCKED_SOCKET_DELETE.mockClear()

		MOCKED_SOCKET_GET.mockResolvedValue({ statusCode: goodStatusCode, body: goodBody })
	})

	afterEach(() => {
		jest.clearAllTimers()
	})

	test('Good reply, turns bad, then good again', async () => {
		const httpDevice = await getInitialisedDevice({
			uri: 'http://localhost:1234',
			httpMethod: HttpMethod.GET,
			expectedHttpResponse: 200,
			keyword: 'my keyword',
			interval: 10 * 1000,
		})

		try {
			expect(httpDevice).toBeTruthy()
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [] })

			await mockTime.advanceTimeTicks(10100)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(2)
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [] })

			MOCKED_SOCKET_GET.mockResolvedValueOnce({ statusCode: 500, body: goodBody })
			await mockTime.advanceTimeTicks(10100)
			expect(httpDevice.getStatus()).toMatchObject({
				statusCode: StatusCode.BAD,
				messages: [/status code/i],
			})

			await mockTime.advanceTimeTicks(10100)
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [] })

			MOCKED_SOCKET_GET.mockResolvedValueOnce({ statusCode: goodStatusCode, body: 'sorry not sorry' })
			await mockTime.advanceTimeTicks(10100)
			expect(httpDevice.getStatus()).toMatchObject({
				statusCode: StatusCode.BAD,
				messages: [/keyword/i],
			})

			MOCKED_SOCKET_GET.mockResolvedValueOnce({ statusCode: goodStatusCode, body: 'heres my keyword again' })
			await mockTime.advanceTimeTicks(10100)
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [] })
		} finally {
			await httpDevice.terminate()
			jest.clearAllTimers()
		}
	})
	test('Only check keyword', async () => {
		const httpDevice = await getInitialisedDevice({
			uri: 'http://localhost',
			httpMethod: HttpMethod.GET,
			// expectedHttpResponse: 200,
			keyword: 'my keyword',
			interval: 10 * 1000,
		})

		try {
			expect(httpDevice).toBeTruthy()
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [] })

			await mockTime.advanceTimeTicks(10100)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(2)
			MOCKED_SOCKET_GET.mockClear()
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [] })

			MOCKED_SOCKET_GET.mockResolvedValueOnce({ statusCode: 500, body: goodBody })
			await mockTime.advanceTimeTicks(10100)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(1)
			MOCKED_SOCKET_GET.mockClear()
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [] })

			await mockTime.advanceTimeTicks(10100)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(1)
			MOCKED_SOCKET_GET.mockClear()
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [] })

			MOCKED_SOCKET_GET.mockResolvedValueOnce({ statusCode: goodStatusCode, body: 'sorry not sorry' })
			await mockTime.advanceTimeTicks(10100)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(1)
			MOCKED_SOCKET_GET.mockClear()
			expect(httpDevice.getStatus()).toMatchObject({
				statusCode: StatusCode.BAD,
				messages: [/keyword/i],
			})

			MOCKED_SOCKET_GET.mockResolvedValueOnce({ statusCode: goodStatusCode, body: 'heres my keyword again' })
			await mockTime.advanceTimeTicks(10100)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(1)
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [] })
		} finally {
			await httpDevice.terminate()
			jest.clearAllTimers()
		}
	})
	test('Only check response code', async () => {
		const httpDevice = await getInitialisedDevice({
			uri: 'http://localhost',
			httpMethod: HttpMethod.GET,
			expectedHttpResponse: 200,
			// keyword: 'my keyword',
			interval: 10 * 1000,
		})

		try {
			expect(httpDevice).toBeTruthy()
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [] })

			await mockTime.advanceTimeTicks(10100)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(2)
			MOCKED_SOCKET_GET.mockClear()
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [] })

			MOCKED_SOCKET_GET.mockResolvedValueOnce({ statusCode: 500, body: goodBody })
			await mockTime.advanceTimeTicks(10100)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(1)
			MOCKED_SOCKET_GET.mockClear()
			expect(httpDevice.getStatus()).toMatchObject({
				statusCode: StatusCode.BAD,
				messages: [/status code/i],
			})

			await mockTime.advanceTimeTicks(10100)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(1)
			MOCKED_SOCKET_GET.mockClear()
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [] })

			MOCKED_SOCKET_GET.mockResolvedValueOnce({ statusCode: goodStatusCode, body: 'sorry not sorry' })
			await mockTime.advanceTimeTicks(10100)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(1)
			MOCKED_SOCKET_GET.mockClear()
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [] })

			MOCKED_SOCKET_GET.mockResolvedValueOnce({ statusCode: goodStatusCode, body: 'heres my keyword again' })
			await mockTime.advanceTimeTicks(10100)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(1)
			MOCKED_SOCKET_GET.mockClear()
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [] })
		} finally {
			await httpDevice.terminate()
			jest.clearAllTimers()
		}
	})

	test('Successful GET returns GOOD state', async () => {
		const httpDevice = await getInitialisedDevice({
			uri: 'http://localhost',
			httpMethod: HttpMethod.GET,
			expectedHttpResponse: 200,
			keyword: 'my keyword',
			interval: 10 * 1000,
		})

		try {
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [] })

			await mockTime.advanceTimeTicks(10100)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(2)
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [] })
		} finally {
			await httpDevice.terminate()
			jest.clearAllTimers()
		}
	})
	test('Un-Successful get returns BAD state', async () => {
		MOCKED_SOCKET_GET.mockRejectedValueOnce(new Error('Bad Gateway'))
		MOCKED_SOCKET_GET.mockRejectedValueOnce(new Error('Bad Gateway'))

		const httpDevice = await getInitialisedDevice({
			uri: 'http://localhost',
			httpMethod: HttpMethod.GET,
			expectedHttpResponse: 200,
			keyword: 'my keyword',
			interval: 10 * 1000,
		})

		try {
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [] })

			await mockTime.advanceTimeTicks(10100)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(2)
			expect(httpDevice.getStatus()).toEqual({
				statusCode: StatusCode.BAD,
				messages: ['Error: Bad Gateway'],
			})
		} finally {
			await httpDevice.terminate()
			jest.clearAllTimers()
		}
	})

	test('Un-Successful get, bad keyword, returns BAD state', async () => {
		const httpDevice = await getInitialisedDevice({
			uri: 'http://localhost',
			httpMethod: HttpMethod.GET,
			expectedHttpResponse: 200,
			keyword: 'bad keyword',
			interval: 10 * 1000,
		})

		try {
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [] })

			await mockTime.advanceTimeTicks(10100)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(2)
			expect(httpDevice.getStatus()).toEqual({
				statusCode: StatusCode.BAD,
				messages: ['Expected keyword "bad keyword" not found'],
			})
		} finally {
			await httpDevice.terminate()
			jest.clearAllTimers()
		}
	})

	test('Un-Successful get, wrong status code, returns BAD state', async () => {
		MOCKED_SOCKET_GET.mockResolvedValueOnce({ statusCode: 201, body: '' })
		MOCKED_SOCKET_GET.mockResolvedValueOnce({ statusCode: 201, body: '' })

		const httpDevice = await getInitialisedDevice({
			uri: 'http://localhost:1234',
			httpMethod: HttpMethod.GET,
			expectedHttpResponse: 200,
			keyword: 'my keyword',
			interval: 10 * 1000,
		})

		try {
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [] })

			await mockTime.advanceTimeTicks(10100)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(2)
			expect(httpDevice.getStatus()).toEqual({
				statusCode: StatusCode.BAD,
				messages: ['Expected status code 200, got 201'],
			})
		} finally {
			await httpDevice.terminate()
			jest.clearAllTimers()
		}
	})
	test('Successful http POST returns GOOD state', async () => {
		MOCKED_SOCKET_POST.mockResolvedValue({ statusCode: 200, body: 'my keyword2' })

		const httpDevice = await getInitialisedDevice({
			uri: 'http://localhost:1234',
			httpMethod: HttpMethod.POST,
			expectedHttpResponse: 200,
			keyword: 'my keyword2',
			interval: 10 * 1000,
		})

		try {
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [] })

			await mockTime.advanceTimeTicks(10000)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(0)
			expect(MOCKED_SOCKET_POST).toHaveBeenCalledTimes(2)
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [] })
		} finally {
			await httpDevice.terminate()
			jest.clearAllTimers()
		}
	})
	test('"jibberish" http method defaults to GET and returns GOOD state', async () => {
		const httpDevice = await getInitialisedDevice({
			uri: 'http://localhost',
			httpMethod: 'jibberish' as any,
			expectedHttpResponse: 200,
			keyword: 'my keyword',
			interval: 10 * 1000,
		})

		try {
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [] })

			await mockTime.advanceTimeTicks(10100)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(2)
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [] })
		} finally {
			await httpDevice.terminate()
			jest.clearAllTimers()
		}
	})
	test('Send headers with request', async () => {
		const httpDevice = await getInitialisedDevice({
			uri: 'http://localhost',
			httpMethod: HttpMethod.GET,
			expectedHttpResponse: 200,
			keyword: 'my keyword',
			interval: 10 * 1000,
			headers: {
				myHeader: 'myValue',
			},
		})

		try {
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, messages: [] })

			await mockTime.advanceTimeTicks(10100)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(2)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledWith('http://localhost', {
				headers: {
					myHeader: 'myValue',
				},
			})
			expect(httpDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, messages: [] })
		} finally {
			await httpDevice.terminate()
			jest.clearAllTimers()
		}
	})
})
