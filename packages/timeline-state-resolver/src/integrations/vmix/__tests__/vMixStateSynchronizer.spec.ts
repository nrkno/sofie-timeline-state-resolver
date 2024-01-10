import { VMixStateSynchronizer } from '../vMixStateSynchronizer'
import { ADDED_INPUT_NAME_1, ADDED_INPUT_NAME_2, makeMockFullState, makeMockReportedState } from './mockState'

describe('VMixStateSynchronizer', () => {
	it('applies properties of existing inputs', () => {
		const synchronizer = new VMixStateSynchronizer()

		const realState = makeMockReportedState()
		realState.existingInputs[1].listFilePaths = ['C:\\lingeringFile.mp4']
		realState.existingInputs[2].loop = true

		const updatedState = synchronizer.applyRealState(makeMockFullState(), realState)

		const expectedState = makeMockFullState()
		expectedState.reportedState.existingInputs[1].listFilePaths = ['C:\\lingeringFile.mp4']
		expectedState.reportedState.existingInputs[2].loop = true

		expect(updatedState).toEqual(expectedState)
	})

	it('applies properties of inputs added by us', () => {
		const synchronizer = new VMixStateSynchronizer()

		const realState = makeMockReportedState()
		realState.inputsAddedByUs[ADDED_INPUT_NAME_1].transform = {
			alpha: -1,
			panX: 1.1,
			panY: -0.2,
			zoom: 0.5,
		}
		realState.inputsAddedByUs[ADDED_INPUT_NAME_2].loop = true

		const updatedState = synchronizer.applyRealState(makeMockFullState(), realState)

		const expectedState = makeMockFullState()
		expectedState.reportedState.inputsAddedByUs[ADDED_INPUT_NAME_1].transform = {
			alpha: -1,
			panX: 1.1,
			panY: -0.2,
			zoom: 0.5,
		}
		expectedState.reportedState.inputsAddedByUs[ADDED_INPUT_NAME_2].loop = true

		expect(updatedState).toEqual(expectedState)
	})

	it('does not apply unwanted properties of existing inputs', () => {
		// this test is not checking for any possible property that is disallowed, but rather serves as a sanity check of last resort

		const synchronizer = new VMixStateSynchronizer()

		const realState = makeMockReportedState()
		realState.existingInputs[1].playing = false
		realState.existingInputs[2].position = 10

		const updatedState = synchronizer.applyRealState(makeMockFullState(), realState)

		const expectedState = makeMockFullState()

		expect(updatedState).toEqual(expectedState)
	})

	it('does not apply unwanted properties of inputs added by us', () => {
		// this test is not checking for any possible property that is disallowed, but rather serves as a sanity check of last resort

		const synchronizer = new VMixStateSynchronizer()

		const realState = makeMockReportedState()
		realState.inputsAddedByUs[ADDED_INPUT_NAME_1].playing = false
		realState.inputsAddedByUs[ADDED_INPUT_NAME_2].position = 10

		const updatedState = synchronizer.applyRealState(makeMockFullState(), realState)

		const expectedState = makeMockFullState()

		expect(updatedState).toEqual(expectedState)
	})
})
