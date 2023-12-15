import { VMixTransitionType } from 'timeline-state-resolver-types'
import { TSR_INPUT_PREFIX, VMixState, VMixStateExtended } from '../VMixStateDiffer'
import { VMixStateSynchronizer } from '../VMixStateSynchronizer'

const ADDED_INPUT_NAME_1 = `${TSR_INPUT_PREFIX}C:\\someVideo.mp4`
const ADDED_INPUT_NAME_2 = `${TSR_INPUT_PREFIX}C:\\anotherVideo.mp4`

function makeMockReportedState(): VMixState {
	return {
		version: '21.0.0.55',
		edition: 'HD',
		existingInputs: {
			'1': {
				number: 1,
				type: 'Capture',
				state: 'Running',
				position: 0,
				duration: 0,
				loop: false,
				muted: false,
				volume: 100,
				balance: 0,
				audioBuses: 'M',
				transform: {
					alpha: -1,
					panX: 0,
					panY: 0,
					zoom: 1,
				},
				listFilePaths: undefined,
				overlays: undefined,
				playing: true,
				solo: false,
			},
			'2': {
				number: 2,
				type: 'Capture',
				state: 'Running',
				position: 0,
				duration: 0,
				loop: false,
				muted: true,
				volume: 100,
				balance: 0,
				audioBuses: 'M,C',
				transform: {
					alpha: -1,
					panX: 0,
					panY: 0,
					zoom: 1,
				},
				listFilePaths: undefined,
				overlays: undefined,
				playing: true,
				solo: false,
			},
		},
		inputsAddedByUs: {
			[ADDED_INPUT_NAME_1]: {
				number: 1,
				type: 'Video',
				state: 'Running',
				position: 0,
				duration: 0,
				loop: false,
				muted: false,
				volume: 100,
				balance: 0,
				audioBuses: 'M',
				transform: {
					alpha: -1,
					panX: 0,
					panY: 0,
					zoom: 1,
				},
				listFilePaths: undefined,
				overlays: undefined,
				playing: true,
				solo: false,
				name: ADDED_INPUT_NAME_1,
			},
			[ADDED_INPUT_NAME_2]: {
				number: 1,
				type: 'Video',
				state: 'Running',
				position: 0,
				duration: 0,
				loop: false,
				muted: false,
				volume: 100,
				balance: 0,
				audioBuses: 'M',
				transform: {
					alpha: -1,
					panX: 0,
					panY: 0,
					zoom: 1,
				},
				listFilePaths: undefined,
				overlays: undefined,
				playing: true,
				solo: false,
				name: ADDED_INPUT_NAME_2,
			},
		},
		overlays: [
			{ number: 1, input: undefined },
			{ number: 2, input: undefined },
			{ number: 3, input: undefined },
			{ number: 4, input: undefined },
			{ number: 5, input: undefined },
			{ number: 6, input: undefined },
		],
		mixes: [
			{
				number: 1,
				program: 1,
				preview: 2,
				transition: {
					duration: 0,
					effect: VMixTransitionType.Cut,
				},
			},
		],
		fadeToBlack: false,
		recording: true,
		external: true,
		streaming: true,
		playlist: false,
		multiCorder: false,
		fullscreen: false,
		audio: [
			{
				volume: 100,
				muted: false,
				meterF1: 0.04211706,
				meterF2: 0.04211706,
				headphonesVolume: 74.80521,
			},
		],
	}
}

function makeMockFullState(): VMixStateExtended {
	return {
		inputLayers: {},
		outputs: {
			External2: undefined,
			2: undefined,
			3: undefined,
			4: undefined,
			Fullscreen: undefined,
			Fullscreen2: undefined,
		},
		runningScripts: [],
		reportedState: makeMockReportedState(),
	}
}

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
		realState.existingInputs[1].volume = 50
		realState.existingInputs[2].position = 10

		const updatedState = synchronizer.applyRealState(makeMockFullState(), realState)

		const expectedState = makeMockFullState()

		expect(updatedState).toEqual(expectedState)
	})

	it('does not apply unwanted properties of inputs added by us', () => {
		// this test is not checking for any possible property that is disallowed, but rather serves as a sanity check of last resort

		const synchronizer = new VMixStateSynchronizer()

		const realState = makeMockReportedState()
		realState.inputsAddedByUs[ADDED_INPUT_NAME_1].volume = 50
		realState.inputsAddedByUs[ADDED_INPUT_NAME_2].position = 10

		const updatedState = synchronizer.applyRealState(makeMockFullState(), realState)

		const expectedState = makeMockFullState()

		expect(updatedState).toEqual(expectedState)
	})
})
