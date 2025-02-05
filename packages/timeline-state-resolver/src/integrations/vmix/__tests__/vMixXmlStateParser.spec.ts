import { VMixTransitionType } from 'timeline-state-resolver-types'
import { VMixAudioBusesState, VMixState } from '../vMixStateDiffer'
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
					layers: {},
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
					layers: {},
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
			audioBuses: {
				M: {
					muted: false,
					volume: 100,
					headphonesVolume: 74.80521,
				},
				A: {
					muted: false,
					volume: 100,
					sendToMaster: false,
					solo: false,
				},
				B: {
					muted: false,
					volume: 78.07491,
					sendToMaster: false,
					solo: false,
				},
				C: {
					muted: false,
					volume: 100,
					sendToMaster: false,
					solo: false,
				},
				D: {
					muted: false,
					volume: 100,
					sendToMaster: false,
					solo: false,
				},
				E: {
					muted: true,
					volume: 100,
					sendToMaster: false,
					solo: false,
				},
				F: {
					muted: false,
					volume: 100,
					sendToMaster: false,
					solo: false,
				},
				G: {
					muted: false,
					volume: 100,
					sendToMaster: false,
					solo: false,
				},
			} as VMixAudioBusesState, // we're parsing a little more, might be useful down the road
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
					layers: {},
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
					layers: {},
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
					layers: {
						3: { input: 3 },
						6: { input: 1 },
					},
				},
			},
		})
	})

	it('parses input overlay position and position+crop', () => {
		const parser = new VMixXmlStateParser()

		const parsedState = parser.parseVMixState(
			makeMockVMixXmlState([
				'<input key="a97b8de1-807a-4c14-8eb9-3de0129b41e3" number="1" type="Capture" title="Cam 0" state="Running" position="0" duration="0" loop="False" muted="False" volume="100" balance="0" solo="False" audiobusses="M" meterF1="0.03034842" meterF2="0.03034842"></input>',
				`<input key="ca9bc59f-f698-41fe-b17d-1e1743cfee88" number="2" type="Capture" title="Cam 1" state="Running" position="0" duration="0" loop="False" muted="False" volume="100" balance="0" solo="False" audiobusses="M" meterF1="0.03034842" meterF2="0.03034842">
	<overlay index="2" key="1d70bc59-6517-4571-a0c5-932e30311f01">
		<position panX="-0.673" zoomX="0.4" zoomY="0.4" x="-70.1" y="324" width="768" height="432"/>
	</overlay>
	<overlay index="5" key="a97b8de1-807a-4c14-8eb9-3de0129b41e3">
		<position panX="-0.79" panY="0.134" zoomX="0.208" zoomY="0.208" x="0" y="500" width="400" height="225"/>
		<crop X1="0.1042" Y1="0.1" X2="0.8958" Y2="0.7"/>
	</overlay>
</input>`,
				'<input key="1d70bc59-6517-4571-a0c5-932e30311f01" number="3" type="Capture" title="Cam 2" state="Running" position="0" duration="0" loop="False" muted="False" volume="100" balance="0" solo="False" audiobusses="M" meterF1="0.03034842" meterF2="0.03034842"></input>',
			])
		)

		expect(parsedState).toMatchObject<Partial<VMixState>>({
			existingInputs: {
				'2': {
					layers: {
						3: { input: 3, panX: -0.673, panY: 0, zoom: 0.4, cropLeft: 0, cropTop: 0, cropBottom: 1, cropRight: 1 },
						6: {
							input: 1,
							panX: -0.79,
							panY: 0.134,
							zoom: 0.208,
							cropLeft: 0.1042,
							cropTop: 0.1,
							cropBottom: 0.7,
							cropRight: 0.8958,
						},
					},
				},
			},
		})
	})

	it('parses text (titles)', () => {
		const parser = new VMixXmlStateParser()

		const parsedState = parser.parseVMixState(
			makeMockVMixXmlState([
				'<input key="a97b8de1-807a-4c14-8eb9-3de0129b41e3" number="1" type="Capture" title="Cam 0" state="Running" position="0" duration="0" loop="False" muted="False" volume="100" balance="0" solo="False" audiobusses="M" meterF1="0.03034842" meterF2="0.03034842"></input>',
				`<input key="ca9bc59f-f698-41fe-b17d-1e1743cfee88" number="2" type="GT" title="gfx.gtzip" shortTitle="gfx.gtzip" state="Paused" position="0" duration="0" loop="False" >
	gfx.gtzip
	<text index="0" name="TextBlock1.Text">SomeText</text>
	<text index="1" name="AnotherBlock.Text">Foo</text>
</input>`,
				'<input key="1d70bc59-6517-4571-a0c5-932e30311f01" number="3" type="Capture" title="Cam 2" state="Running" position="0" duration="0" loop="False" muted="False" volume="100" balance="0" solo="False" audiobusses="M" meterF1="0.03034842" meterF2="0.03034842"></input>',
			])
		)

		expect(parsedState).toMatchObject<Partial<VMixState>>({
			existingInputs: {
				'2': {
					text: {
						'TextBlock1.Text': 'SomeText',
						'AnotherBlock.Text': 'Foo',
					},
				},
			},
		})
	})

	it('parses images (titles)', () => {
		const parser = new VMixXmlStateParser()

		const parsedState = parser.parseVMixState(
			makeMockVMixXmlState([
				'<input key="a97b8de1-807a-4c14-8eb9-3de0129b41e3" number="1" type="Capture" title="Cam 0" state="Running" position="0" duration="0" loop="False" muted="False" volume="100" balance="0" solo="False" audiobusses="M" meterF1="0.03034842" meterF2="0.03034842"></input>',
				`<input key="ca9bc59f-f698-41fe-b17d-1e1743cfee88" number="2" type="GT" title="gfx.gtzip" shortTitle="gfx.gtzip" state="Paused" position="0" duration="0" loop="False" >
	gfx.gtzip
	<image index="0" name="SomeImage.Source">image1.png</image>
	<image index="1" name="AnotherImage.Source">image2.jpg</image>
</input>`,
				'<input key="1d70bc59-6517-4571-a0c5-932e30311f01" number="3" type="Capture" title="Cam 2" state="Running" position="0" duration="0" loop="False" muted="False" volume="100" balance="0" solo="False" audiobusses="M" meterF1="0.03034842" meterF2="0.03034842"></input>',
			])
		)

		expect(parsedState).toMatchObject<Partial<VMixState>>({
			existingInputs: {
				'2': {
					images: {
						'SomeImage.Source': 'image1.png',
						'AnotherImage.Source': 'image2.jpg',
					},
				},
			},
		})
	})
})
