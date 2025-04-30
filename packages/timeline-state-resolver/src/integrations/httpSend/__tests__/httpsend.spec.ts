/* eslint-disable jest/expect-expect */
import {
	ActionExecutionResultCode,
	DeviceType,
	TimelineContentTypeHTTP,
	TimelineContentHTTPSendAny,
	Timeline,
	TSRTimelineContent,
	HttpSendActions,
} from 'timeline-state-resolver-types'

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
import { HTTPSendDevice, HttpSendDeviceCommand, HttpSendDeviceState } from '..'
import { getDeviceContext } from '../../__tests__/testlib'

async function getInitialisedHttpDevice(retries = false) {
	const dev = new HTTPSendDevice(getDeviceContext())
	await dev.init({
		resendTime: retries === true ? 1000 : undefined,
	})
	return dev
}

describe('HTTP-Send', () => {
	beforeEach(() => {
		MOCKED_SOCKET_GET.mockReset()
		MOCKED_SOCKET_POST.mockReset()
		MOCKED_SOCKET_PUT.mockReset()
		MOCKED_SOCKET_DELETE.mockReset()

		MOCKED_SOCKET_GET.mockResolvedValue(Promise.resolve({ statusCode: 200 }))
		MOCKED_SOCKET_POST.mockResolvedValue(Promise.resolve({ statusCode: 200 }))
		MOCKED_SOCKET_PUT.mockResolvedValue(Promise.resolve({ statusCode: 200 }))
		MOCKED_SOCKET_DELETE.mockResolvedValue(Promise.resolve({ statusCode: 200 }))
	})

	describe('diffState', () => {
		async function compareStates(
			oldDevState: HttpSendDeviceState | undefined,
			newDevState: HttpSendDeviceState,
			expCommands: HttpSendDeviceCommand[]
		) {
			const device = await getInitialisedHttpDevice()

			const commands = device.diffStates(oldDevState, newDevState)

			expect(commands).toEqual(expCommands)
		}

		test('From undefined', async () => {
			await compareStates(
				undefined,
				{
					time: 20,
					nextEvents: [],
					layers: {},
				},
				[]
			)
		})

		test('empty states', async () => {
			await compareStates(createTimelineState({}), createTimelineState({}), [])
		})

		test('new command', async () => {
			const content = {
				...DEFAULT_TL_CONTENT,
				type: TimelineContentTypeHTTP.POST,
				url: 'http://testurl',
				params: {},
			}
			await compareStates(
				createTimelineState({}),
				createTimelineState({
					layer0: {
						id: 'obj0',
						content,
					},
				}),
				[
					{
						timelineObjId: 'obj0',
						context: `added: obj0`,
						command: {
							commandName: 'added',
							content,
							layer: 'layer0',
						},
					},
				]
			)
		})

		test('changed command', async () => {
			const content = {
				...DEFAULT_TL_CONTENT,
				type: TimelineContentTypeHTTP.POST,
				url: 'http://testurl',
				params: {},
			}
			await compareStates(
				createTimelineState({
					layer0: {
						id: 'obj0',
						content,
					},
				}),
				createTimelineState({
					layer0: {
						id: 'obj1',
						content: {
							...content,
							params: {
								xyz: 'asdf',
							},
						},
					},
				}),
				[
					{
						timelineObjId: 'obj1',
						context: `changed: obj1 (previously: obj0)`,
						command: {
							commandName: 'changed',
							content: {
								...content,
								params: {
									xyz: 'asdf',
								},
							},
							layer: 'layer0',
						},
					},
				]
			)
		})

		test('removed command', async () => {
			const content = {
				...DEFAULT_TL_CONTENT,
				type: TimelineContentTypeHTTP.POST,
				url: 'http://testurl',
				params: {},
			}
			await compareStates(
				createTimelineState({
					layer0: {
						id: 'obj0',
						content,
					},
				}),
				createTimelineState({}),
				[
					{
						timelineObjId: 'obj0',
						context: `removed: obj0`,
						command: {
							commandName: 'removed',
							content,
							layer: 'layer0',
						},
					},
				]
			)
		})
	})

	describe('sendCommand', () => {
		test('POST message', async () => {
			const device = await getInitialisedHttpDevice()

			device
				.sendCommand({
					timelineObjId: 'abc123',
					context: 'A context',
					command: {
						commandName: 'added',
						content: {
							...DEFAULT_TL_CONTENT,
							type: TimelineContentTypeHTTP.POST,
							url: 'http://testurl',
							params: {},
						},
						layer: 'layer0',
					},
				})
				.catch((e) => {
					throw e
				})

			expect(MOCKED_SOCKET_POST).toHaveBeenCalledTimes(1)
			expect(MOCKED_SOCKET_POST).toHaveBeenCalledWith(
				expect.stringMatching('http://testurl'),
				expect.objectContaining({})
			)
		})
		test('POST message with parameters', async () => {
			const device = await getInitialisedHttpDevice()

			device
				.sendCommand({
					timelineObjId: 'abc123',
					context: 'A context',
					command: {
						commandName: 'added',
						content: {
							...DEFAULT_TL_CONTENT,
							type: TimelineContentTypeHTTP.POST,
							url: 'http://testurl',
							params: {
								a: 1,
								b: 'xyz',
							},
						},
						layer: 'layer0',
					},
				})
				.catch((e) => {
					throw e
				})

			expect(MOCKED_SOCKET_POST).toHaveBeenCalledTimes(1)
			expect(MOCKED_SOCKET_POST).toHaveBeenCalledWith(
				expect.stringMatching('http://testurl'),
				expect.objectContaining({
					json: {
						a: 1,
						b: 'xyz',
					},
				})
			)
		})
		test('Retries', async () => {
			jest.useFakeTimers({ now: 10000 })
			const device = await getInitialisedHttpDevice(true)

			MOCKED_SOCKET_GET.mockRejectedValueOnce({ code: 'ETIMEDOUT' })

			// send the command
			await device
				.sendCommand({
					timelineObjId: 'abc123',
					context: 'A context',
					command: {
						commandName: 'added',
						content: {
							...DEFAULT_TL_CONTENT,
							type: TimelineContentTypeHTTP.GET,
							url: 'http://testurl',
							params: {},
						},
						layer: 'layer0',
					},
				})
				.catch((e) => {
					throw e
				})

			// check that it retries the command
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(1)
			jest.advanceTimersByTime(1000)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(2)

			// remove the command
			await device
				.sendCommand({
					timelineObjId: 'abc123',
					context: 'A context',
					command: {
						commandName: 'removed',
						content: {
							...DEFAULT_TL_CONTENT,
							type: TimelineContentTypeHTTP.GET,
							url: 'http://testurl',
							params: {},
						},
						layer: 'layer0',
					},
				})
				.catch((e) => {
					throw e
				})

			// check that it did nothing
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(2)
			jest.advanceTimersByTime(1000)
			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(2)
		})
		test('2 identical sends after each other', async () => {
			const content = {
				...DEFAULT_TL_CONTENT,
				type: TimelineContentTypeHTTP.POST,
				url: 'http://testurl',
				params: {},
			}

			const state = {
				genesis: createTimelineState({}),
				aStart: createTimelineState({
					layer0: {
						id: 'obj0',
						content,
					},
				}),
				aEnd: createTimelineState({}),
				bStart: createTimelineState({
					layer0: {
						id: 'obj1',
						content,
					},
				}),
				bEnd: createTimelineState({}),
			}

			const device = await getInitialisedHttpDevice()

			await Promise.all(device.diffStates(state.genesis, state.aStart).map(async (c) => device.sendCommand(c)))
			await Promise.all(device.diffStates(state.aStart, state.aEnd).map(async (c) => device.sendCommand(c)))

			{
				const commands = device.diffStates(state.aEnd, state.bStart)
				// Test that the internal state in HTTPSendDevice is correct:
				expect(commands).toStrictEqual([
					{
						timelineObjId: 'obj1',
						context: `added: obj1`,
						command: {
							commandName: 'added',
							content: content,
							layer: 'layer0',
						},
						queueId: undefined,
					},
				])
				await Promise.all(commands.map(async (c) => device.sendCommand(c)))
			}

			{
				// Verify the removal commands:
				expect(device.diffStates(state.bStart, state.bEnd)).toStrictEqual([
					{
						timelineObjId: 'obj1',
						context: `removed: obj1`,
						command: {
							commandName: 'removed',
							content: content,
							layer: 'layer0',
						},
						queueId: undefined,
					},
				])
			}
		})
	})

	describe('Send action', () => {
		test('Send action', async () => {
			const device = await getInitialisedHttpDevice()

			const result = await device.actions[HttpSendActions.SendCommand]({
				...DEFAULT_TL_CONTENT,
				type: TimelineContentTypeHTTP.GET,
				url: 'http://testurl',
				params: {},
			})

			expect(MOCKED_SOCKET_GET).toHaveBeenCalledTimes(1)
			expect(result).toMatchObject({
				result: ActionExecutionResultCode.Ok,
			})
		})
	})
})

function createTimelineState(
	objs: Record<string, { id: string; content: TimelineContentHTTPSendAny }>
): Timeline.TimelineState<TSRTimelineContent> {
	return {
		time: 10,
		layers: objs as any,
		nextEvents: [],
	}
}
const DEFAULT_TL_CONTENT: {
	deviceType: DeviceType.HTTPSEND
} = {
	deviceType: DeviceType.HTTPSEND,
}
