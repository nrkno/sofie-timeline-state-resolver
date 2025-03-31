import { MockTime } from '../../__tests__/mockTime'
import { StateTracker } from '../stateTracker'

interface AddressState {
	id: string
}

const MOCK_DIFF_FN = jest.fn((state1: AddressState | undefined, state2: AddressState) => state1?.id !== state2.id)
const MOCK_EVENT_DEVICE_AHEAD = jest.fn()
const MOCK_EVENT_DEVICE_SYNC = jest.fn()

describe('State Tracker', () => {
	const mockTime = new MockTime()

	beforeAll(() => {
		mockTime.init()
	})

	beforeEach(() => {
		MOCK_EVENT_DEVICE_AHEAD.mockReset()
		MOCK_EVENT_DEVICE_SYNC.mockReset()
	})

	function getNewStateTracker(): StateTracker<AddressState> {
		const st = new StateTracker(MOCK_DIFF_FN)

		st.on('deviceAhead', MOCK_EVENT_DEVICE_AHEAD)
		st.on('deviceUnderControl', MOCK_EVENT_DEVICE_SYNC)

		return st
	}

	function getNewStateTrackerWithState(): StateTracker<AddressState> {
		const st = getNewStateTracker()
		st.updateExpectedState('1', { id: 'a' }, false)
		st.updateState('1', { id: 'a' })
		mockTime.advanceTime(210)

		return st
	}

	describe('isDeviceAhead', () => {
		test('No state', () => {
			const st = getNewStateTracker()
			const isAhead = st.isDeviceAhead('1')

			expect(isAhead).toBe(false)
		})

		test('Only actual state', () => {
			const st = getNewStateTracker()
			st.updateState('1', { id: 'a' })
			mockTime.advanceTime(210)
			const isAhead = st.isDeviceAhead('1')

			expect(isAhead).toBe(true)
		})

		test('Only expected state', () => {
			const st = getNewStateTracker()
			st.updateExpectedState('1', { id: 'a' }, true)
			const isAhead = st.isDeviceAhead('1')

			expect(isAhead).toBe(false)
		})

		test('Equal State', () => {
			const st = getNewStateTracker()
			st.updateState('1', { id: 'a' })
			mockTime.advanceTime(210)
			st.updateExpectedState('1', { id: 'a' }, true)
			const isAhead = st.isDeviceAhead('1')

			expect(isAhead).toBe(false)
		})

		test('Expected State updated after Device State', () => {
			const st = getNewStateTracker()
			st.updateState('1', { id: 'a' })
			mockTime.advanceTime(210)
			st.updateExpectedState('1', { id: 'b' }, true)
			const isAhead = st.isDeviceAhead('1')

			expect(isAhead).toBe(false)
		})

		test('Device State updated after Expected State', () => {
			const st = getNewStateTracker()
			st.updateExpectedState('1', { id: 'b' }, true)
			st.updateState('1', { id: 'a' })
			mockTime.advanceTime(210)
			const isAhead = st.isDeviceAhead('1')

			expect(isAhead).toBe(true)
		})
	})

	describe('setExpectedState', () => {
		test('Set state', () => {
			const st = getNewStateTracker()
			st.updateExpectedState('1', { id: 'a' }, false)

			const state = st.getExpectedState('1')
			expect(state).toMatchObject({ id: 'a' })
		})

		test('Set state with didSetDevice', () => {
			const st = getNewStateTracker()
			st.updateExpectedState('1', { id: 'a' }, false)
			st.updateState('1', { id: 'b' }) // set this so it the device will be ahead
			mockTime.advanceTime(210)

			expect(st.isDeviceAhead('1')).toBe(true)

			st.updateExpectedState('1', { id: 'a' }, true) // didSetDevice = true => will be marked as not ahead

			expect(MOCK_DIFF_FN).toHaveBeenCalled()
			expect(st.isDeviceAhead('1')).toBe(false)
			expect(MOCK_EVENT_DEVICE_SYNC).toHaveBeenCalled()
		})
	})

	describe('getExpectedState', () => {
		test('has expected state', () => {
			const st = getNewStateTrackerWithState()
			const expectedState = st.getExpectedState('1')

			expect(expectedState).toMatchObject({ id: 'a' })
		})

		test('undefined state', () => {
			const st = getNewStateTrackerWithState()
			const expectedState = st.getExpectedState('2')

			expect(expectedState).toBe(undefined)
		})
	})

	describe('updateState', () => {
		test('Set state', () => {
			const st = getNewStateTracker()
			st.updateState('1', { id: 'a' })
			mockTime.advanceTime(210)

			const state = st.getCurrentState('1')
			expect(state).toMatchObject({ id: 'a' })
			expect(MOCK_DIFF_FN).toHaveBeenCalled()
		})
		test('Mark as device ahead', () => {
			const st = getNewStateTracker()
			st.updateExpectedState('1', { id: 'a' }, false)
			st.updateState('1', { id: 'b' })
			mockTime.advanceTime(210)

			expect(MOCK_DIFF_FN).toHaveBeenCalled()
			expect(MOCK_EVENT_DEVICE_AHEAD).toHaveBeenCalled()
			expect(st.isDeviceAhead('1')).toBe(true)
		})
		test('multiple device updates', () => {
			const st = getNewStateTracker()
			st.updateExpectedState('1', { id: 'a' }, false)
			st.updateState('1', { id: 'b' })
			mockTime.advanceTime(210)

			expect(MOCK_DIFF_FN).toHaveBeenCalled()
			expect(MOCK_EVENT_DEVICE_AHEAD).toHaveBeenCalled()
			expect(st.isDeviceAhead('1')).toBe(true)
		})
	})

	describe('getCurrentState', () => {
		test('has expected state', () => {
			const st = getNewStateTrackerWithState()
			const expectedState = st.getCurrentState('1')

			expect(expectedState).toMatchObject({ id: 'a' })
		})

		test('undefined state', () => {
			const st = getNewStateTrackerWithState()
			const expectedState = st.getCurrentState('2')

			expect(expectedState).toBe(undefined)
		})
	})

	describe('getAllAddresses', () => {
		test('all address', () => {
			const st = getNewStateTrackerWithState()
			st.updateExpectedState('2', { id: 'a' }, true)

			expect(st.getAllAddresses()).toEqual(['1', '2'])
		})
	})

	describe('clearState', () => {
		test('clear states', () => {
			const st = getNewStateTrackerWithState()
			expect(st.getAllAddresses()).toEqual(['1'])

			st.clearState()
			expect(st.getAllAddresses()).toEqual([])
		})
	})
})
