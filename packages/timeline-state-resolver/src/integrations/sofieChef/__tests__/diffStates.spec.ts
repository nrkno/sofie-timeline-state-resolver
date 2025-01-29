import { diffStates } from '../diffStates'
import { SofieChefCommandWithContext, SofieChefState } from '..'
import { ReceiveWSMessageType } from '../api'

describe('Diff States', () => {
	test('Simple diff against undefined state', async () => {
		const state1: SofieChefState = {
			windows: {
				test: {
					url: 'http://test.com',
					urlTimelineObjId: 'abc',
				},
			},
		}

		const commands = diffStates(undefined, state1, {}, 'test')

		expect(commands).toHaveLength(1)
		expect(commands[0]).toEqual({
			command: {
				msgId: 0,
				type: ReceiveWSMessageType.PLAYURL,
				url: 'http://test.com',
				windowId: 'test',
			},
			context: 'added (test)',
			timelineObjId: 'abc',
		} satisfies SofieChefCommandWithContext)
	})

	test('Simple diff against another state', async () => {
		const state1: SofieChefState = {
			windows: {
				test: {
					url: 'http://test.com',
					urlTimelineObjId: 'abc',
				},
				two: {
					url: 'http://two.com',
					urlTimelineObjId: 'def',
				},
				three: {
					url: 'http://three.com',
					urlTimelineObjId: 'ghi',
				},
			},
		}

		const state2: SofieChefState = {
			windows: {
				two: {
					url: 'http://two.com/2',
					urlTimelineObjId: '012',
				},
				another: {
					url: 'http://another.com',
					urlTimelineObjId: '345',
				},
				three: {
					url: 'http://three.com',
					urlTimelineObjId: 'ghi',
				},
			},
		}

		const commands = diffStates(state1, state2, {}, 'test')

		expect(commands).toHaveLength(3)
		expect(commands[0]).toEqual({
			command: {
				msgId: 0,
				type: ReceiveWSMessageType.PLAYURL,
				url: 'http://two.com/2',
				windowId: 'two',
			},
			context: 'changed (test)',
			timelineObjId: '012',
		} satisfies SofieChefCommandWithContext)
		expect(commands[1]).toEqual({
			command: {
				msgId: 0,
				type: ReceiveWSMessageType.PLAYURL,
				url: 'http://another.com',
				windowId: 'another',
			},
			context: 'added (test)',
			timelineObjId: '345',
		} satisfies SofieChefCommandWithContext)
		expect(commands[2]).toEqual({
			command: {
				msgId: 0,
				type: ReceiveWSMessageType.STOP,
				windowId: 'test',
			},
			context: 'removed (test)',
			timelineObjId: 'abc',
		} satisfies SofieChefCommandWithContext)
	})
})
