import { Timeline, TSRTimelineContent } from 'timeline-state-resolver-types'
import { StateHandler } from '../stateHandler'
import { MockTime } from '../../__tests__/mockTime'

interface DeviceState {
	[prop: string]: {
		value: true
		preliminary?: number
	}
}
interface CommandWithContext {
	command: {
		type: 'added' | 'removed'
		property: string
	}
	context: string
	timelineObjId: string
}

const MOCK_COMMAND_RECEIVER = jest.fn()

const CONTEXT = {
	deviceId: 'unitTests0',
	logger: {
		debug: console.log,
		info: console.log,
		warn: console.log,
		error: console.log,
	},
	emitTimeTrace: () => null,
	reportStateChangeMeasurement: () => null,
	getCurrentTime: () => Date.now(),
}

describe('stateHandler', () => {
	const mockTime = new MockTime()
	beforeEach(() => {
		mockTime.init()
		// jest.useFakeTimers({ now: 10000 })
		MOCK_COMMAND_RECEIVER.mockReset()
	})

	function getNewStateHandler(): StateHandler<DeviceState, CommandWithContext> {
		return new StateHandler<DeviceState, CommandWithContext>(
			CONTEXT,
			{
				executionType: 'salvo',
			},
			{
				convertTimelineStateToDeviceState: (s) => s.layers as unknown as DeviceState,
				diffStates: (oldState, newState, _mapping, _time, context: string) =>
					[
						...Object.keys(newState)
							.filter((e) => !(oldState || {})[e])
							.map((e) => ({
								command: {
									type: `added (${context})`,
									property: e,
								},
								preliminary: newState[e].preliminary,
							})),
						...Object.keys(oldState || {})
							.filter((e) => !newState[e])
							.map((e) => ({
								command: {
									type: `removed (${context})`,
									property: e,
								},
							})),
					] as CommandWithContext[],
				sendCommand: MOCK_COMMAND_RECEIVER,
			}
		)
	}

	test('transition to a new state', async () => {
		const stateHandler = getNewStateHandler()

		stateHandler.setCurrentState(
			{
				entry1: { value: true },
			},
			'test'
		)
		await stateHandler.flush()

		stateHandler.handleState(createTimelineState(10000, {}), {}, 'test').catch((e) => {
			console.error('Error while handling state', e)
		})

		mockTime.advanceTime(1)

		expect(MOCK_COMMAND_RECEIVER).toHaveBeenCalledTimes(1)
		expect(MOCK_COMMAND_RECEIVER).toHaveBeenCalledWith({
			command: {
				type: 'removed (diff_1("test"))',
				property: 'entry1',
			},
		})
	})

	test('transition to 2 new states', async () => {
		const stateHandler = getNewStateHandler()

		stateHandler.setCurrentState(
			{
				entry1: { value: true },
			},
			'test'
		)
		await stateHandler.flush()

		stateHandler.handleState(createTimelineState(10000, {}), {}, 'test').catch((e) => {
			console.error('Error while handling state', e)
		})

		mockTime.advanceTime(1)

		expect(MOCK_COMMAND_RECEIVER).toHaveBeenCalledTimes(1)
		expect(MOCK_COMMAND_RECEIVER).toHaveBeenCalledWith({
			command: {
				type: expect.stringContaining('removed'),
				property: 'entry1',
			},
		})

		stateHandler
			.handleState(
				createTimelineState(10100, {
					entry1: { value: true },
				}),
				{},
				'test'
			)
			.catch((e) => {
				console.error('Error while handling state', e)
			})

		mockTime.advanceTime(1)

		// do not expect to be called because this is in the future
		expect(MOCK_COMMAND_RECEIVER).toHaveBeenCalledTimes(1)

		// advance time
		MOCK_COMMAND_RECEIVER.mockReset()
		await mockTime.advanceTimeTicks(100)

		// now expect to be called with new commands
		expect(MOCK_COMMAND_RECEIVER).toHaveBeenCalledTimes(1)
		expect(MOCK_COMMAND_RECEIVER).toHaveBeenCalledWith({
			command: {
				type: expect.stringContaining('added'),
				property: 'entry1',
			},
		})
	})

	test('transition to a new state with preliminary commands', async () => {
		const stateHandler = getNewStateHandler()

		stateHandler.setCurrentState({}, 'test')
		await stateHandler.flush()

		stateHandler
			.handleState(
				createTimelineState(12000, {
					entry1: {
						value: true,
						preliminary: 300,
					},
					entry2: {
						value: true,
					},
				}),
				{},
				'test'
			)
			.catch((e) => {
				console.error('Error while handling state', e)
			})

		mockTime.advanceTime(1)

		expect(MOCK_COMMAND_RECEIVER).toHaveBeenCalledTimes(0)

		await mockTime.advanceTimeTicks(1700)

		expect(MOCK_COMMAND_RECEIVER).toHaveBeenCalledTimes(1)
		expect(MOCK_COMMAND_RECEIVER).toHaveBeenNthCalledWith(1, {
			command: {
				type: expect.stringContaining('added'),
				property: 'entry1',
			},
			preliminary: 300,
		})

		await mockTime.advanceTimeTicks(300)

		expect(MOCK_COMMAND_RECEIVER).toHaveBeenCalledTimes(2)
		expect(MOCK_COMMAND_RECEIVER).toHaveBeenNthCalledWith(2, {
			command: {
				type: expect.stringContaining('added'),
				property: 'entry2',
			},
		})
	})
})

function createTimelineState(
	time: number,
	objs: Record<string, { value: true; preliminary?: number }>
): Timeline.TimelineState<TSRTimelineContent> {
	return {
		time,
		layers: objs as any,
		nextEvents: [],
	}
}
