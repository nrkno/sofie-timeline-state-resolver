import { VMixTransitionType } from 'timeline-state-resolver-types'
import { VMixState } from '../vMixStateDiffer'
import { VMixXmlStateParser } from '../vMixXmlStateParser'
import { makeMockVMixXmlState } from './vmixMock'
import { prefixAddedInput } from './mockState'

describe('VMixXmlStateParser', () => {
	it('parses incoming state', () => {
		const parser = new VMixXmlStateParser()

		const parsedState = parser.parseVMixState(makeMockVMixXmlState())

		expect(parsedState).toEqual<VMixState>({
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
					overlays: {},
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
					overlays: {},
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
			inputsAddedByUs: {},
			inputsAddedByUsAudio: {},
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
		})
	})

	it('identifies TSR-added inputs', () => {
		const parser = new VMixXmlStateParser()

		const xmlState = makeMockVMixXmlState([
			'<input key="ca9bc59f-f698-41fe-b17d-1e1743cfee88" number="1" type="Capture" title="Cam 1" state="Running" position="0" duration="0" loop="False" muted="False" volume="100" balance="0" solo="False" audiobusses="M" meterF1="0.03034842" meterF2="0.03034842"></input>',
			`<input key="1a50938d-c653-4eae-bc4c-24d9c12fa773" number="2" type="Video" title="${prefixAddedInput(
				'C:\\someVideo.mp4'
			)}" state="Running" position="0" duration="0" loop="False" muted="True" volume="100" balance="0" solo="False" audiobusses="M,C" meterF1="0.0007324442" meterF2="0.0007629627"></input>`,
		])
		const parsedState = parser.parseVMixState(xmlState)

		expect(parsedState).toMatchObject<Partial<VMixState>>({
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
					overlays: {},
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
			},
			inputsAddedByUs: {
				[prefixAddedInput('C:\\someVideo.mp4')]: {
					number: 2,
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
					name: prefixAddedInput('C:\\someVideo.mp4'),
					overlays: {},
					playing: true,
				},
			},
			inputsAddedByUsAudio: {
				[prefixAddedInput('C:\\someVideo.mp4')]: {
					muted: true,
					volume: 100,
					balance: 0,
					audioBuses: 'M,C',
					solo: false,
				},
			},
		})
	})

	it('parses input overlays', () => {
		const parser = new VMixXmlStateParser()

		const parsedState = parser.parseVMixState(
			makeMockVMixXmlState([
				'<input key="a97b8de1-807a-4c14-8eb9-3de0129b41e3" number="1" type="Capture" title="Cam 0" state="Running" position="0" duration="0" loop="False" muted="False" volume="100" balance="0" solo="False" audiobusses="M" meterF1="0.03034842" meterF2="0.03034842"></input>',
				`<input key="ca9bc59f-f698-41fe-b17d-1e1743cfee88" number="2" type="Capture" title="Cam 1" state="Running" position="0" duration="0" loop="False" muted="False" volume="100" balance="0" solo="False" audiobusses="M" meterF1="0.03034842" meterF2="0.03034842">
	<overlay index="2" key="1d70bc59-6517-4571-a0c5-932e30311f01"/>
	<overlay index="5" key="a97b8de1-807a-4c14-8eb9-3de0129b41e3"/>
</input>`,
				'<input key="1d70bc59-6517-4571-a0c5-932e30311f01" number="3" type="Capture" title="Cam 2" state="Running" position="0" duration="0" loop="False" muted="False" volume="100" balance="0" solo="False" audiobusses="M" meterF1="0.03034842" meterF2="0.03034842"></input>',
			])
		)

		expect(parsedState).toMatchObject<Partial<VMixState>>({
			existingInputs: {
				'2': {
					overlays: {
						3: 3,
						6: 1,
					},
				},
			},
		})
	})
})
