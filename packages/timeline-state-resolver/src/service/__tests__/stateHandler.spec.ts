import { Timeline, TSRTimelineContent } from 'timeline-state-resolver-types'
import { StateHandler } from '../stateHandler'

interface DeviceState {
	[prop: string]: true
}
interface Command {
	type: 'added' | 'removed'
	property: string
}

const MOCK_COMMAND_RECEIVER = jest.fn()

describe('stateHandler', () => {
	beforeEach(() => {
		jest.useFakeTimers({ now: 10000 })
		MOCK_COMMAND_RECEIVER.mockReset()
	})

	function getNewStateHandler(): StateHandler<DeviceState, Command> {
		return new StateHandler<DeviceState, Command>(
			(s) => s.layers as unknown as DeviceState,
			(o, n) =>
				[
					...Object.keys(n)
						.filter((e) => !o[e])
						.map((e) => ({
							type: 'added',
							property: e,
						})),
					...Object.keys(o)
						.filter((e) => !n[e])
						.map((e) => ({
							type: 'removed',
							property: e,
						})),
				] as Command[],
			MOCK_COMMAND_RECEIVER
		)
	}

	test('transition to a new state', async () => {
		const stateHandler = getNewStateHandler()

		stateHandler.setCurrentState({
			entry1: true,
		})

		stateHandler.handleState(createTimelineState(10000, {}), {})

		expect(MOCK_COMMAND_RECEIVER).toBeCalledTimes(1)
		expect(MOCK_COMMAND_RECEIVER).toBeCalledWith({
			type: 'removed',
			property: 'entry1',
		})
	})

	test('transition to 2 new states', async () => {
		const stateHandler = getNewStateHandler()

		stateHandler.setCurrentState({
			entry1: true,
		})

		stateHandler.handleState(createTimelineState(10000, {}), {})

		expect(MOCK_COMMAND_RECEIVER).toBeCalledTimes(1)
		expect(MOCK_COMMAND_RECEIVER).toBeCalledWith({
			type: 'removed',
			property: 'entry1',
		})

		stateHandler.handleState(
			createTimelineState(10100, {
				entry1: true,
			}),
			{}
		)

		// do not expect to be called because this is in the future
		expect(MOCK_COMMAND_RECEIVER).toBeCalledTimes(1)

		// advance time
		jest.advanceTimersByTime(100)

		// now expect to be called with new commands
		expect(MOCK_COMMAND_RECEIVER).toBeCalledTimes(2)
		expect(MOCK_COMMAND_RECEIVER).toBeCalledWith({
			type: 'added',
			property: 'entry1',
		})
	})
})

function createTimelineState(time: number, objs: Record<string, true>): Timeline.TimelineState<TSRTimelineContent> {
	return {
		time,
		layers: objs as any,
		nextEvents: [],
	}
}
