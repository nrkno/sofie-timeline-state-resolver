import { VMixTransitionType } from 'timeline-state-resolver-types'
import { TSR_INPUT_PREFIX, VMixState, VMixStateExtended } from '../vMixStateDiffer'

export const ADDED_INPUT_NAME_1 = `${TSR_INPUT_PREFIX}C:\\someVideo.mp4`
export const ADDED_INPUT_NAME_2 = `${TSR_INPUT_PREFIX}C:\\anotherVideo.mp4`

export function makeMockReportedState(): VMixState {
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
				transform: {
					alpha: -1,
					panX: 0,
					panY: 0,
					zoom: 1,
				},
				listFilePaths: undefined,
				layers: undefined,
				playing: true,
			},
			'2': {
				number: 2,
				type: 'Capture',
				state: 'Running',
				position: 0,
				duration: 0,
				loop: false,
				transform: {
					alpha: -1,
					panX: 0,
					panY: 0,
					zoom: 1,
				},
				listFilePaths: undefined,
				layers: undefined,
				playing: true,
			},
		},
		existingInputsAudio: {
			'1': {
				muted: false,
				volume: 100,
				balance: 0,
				audioBuses: 'M',
				solo: false,
			},
			'2': {
				muted: true,
				volume: 100,
				balance: 0,
				audioBuses: 'M,C',
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
				transform: {
					alpha: -1,
					panX: 0,
					panY: 0,
					zoom: 1,
				},
				listFilePaths: undefined,
				layers: undefined,
				playing: true,
				name: ADDED_INPUT_NAME_1,
			},
			[ADDED_INPUT_NAME_2]: {
				number: 1,
				type: 'Video',
				state: 'Running',
				position: 0,
				duration: 0,
				loop: false,
				transform: {
					alpha: -1,
					panX: 0,
					panY: 0,
					zoom: 1,
				},
				listFilePaths: undefined,
				layers: undefined,
				playing: true,
				name: ADDED_INPUT_NAME_2,
			},
		},
		inputsAddedByUsAudio: {
			'1': {
				muted: false,
				volume: 100,
				balance: 0,
				audioBuses: 'M',
				solo: false,
			},
			'2': {
				muted: false,
				volume: 100,
				balance: 0,
				audioBuses: 'M',
				solo: false,
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
		audioBuses: {
			M: {
				muted: true,
				volume: 100,
			},
			A: {
				muted: true,
				volume: 100,
			},
			B: {
				muted: true,
				volume: 100,
			},
			C: {
				muted: true,
				volume: 100,
			},
			D: {
				muted: true,
				volume: 100,
			},
			E: {
				muted: true,
				volume: 100,
			},
			F: {
				muted: true,
				volume: 100,
			},
			G: {
				muted: true,
				volume: 100,
			},
		},
	}
}

export function makeMockFullState(): VMixStateExtended {
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

export function prefixAddedInput(inputName: string): string {
	return TSR_INPUT_PREFIX + inputName
}
