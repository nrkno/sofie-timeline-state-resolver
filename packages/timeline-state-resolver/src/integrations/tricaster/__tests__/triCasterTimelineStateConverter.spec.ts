import {
	DeviceType,
	MappingTriCaster,
	MappingTriCasterType,
	TimelineContentTypeTriCaster,
	TimelineObjTriCasterInput,
	TimelineObjTriCasterMatrixOutput,
	TimelineObjTriCasterME,
	TimelineObjTriCasterMixOutput,
} from 'timeline-state-resolver-types'
import { TriCasterTimelineStateConverter } from '../triCasterTimelineStateConverter'
import {
	CompleteTriCasterMixEffectState,
	CompleteTriCasterState,
	RequiredDeep,
	TriCasterKeyerState,
	TriCasterLayerState,
} from '../triCasterStateDiffer'
import { literal } from '../../../devices/device'
import { wrapIntoResolvedInstance } from './helpers'

function setupTimelineStateConverter() {
	return new TriCasterTimelineStateConverter(() => mockGetDefaultState(), {
		mixEffects: ['main', 'v1', 'v2'],
		inputs: ['input1', 'input2'],
		audioChannels: ['input1', 'input2', 'sound', 'master'],
		mixOutputs: ['mix1', 'mix2'],
		matrixOutputs: ['out1', 'out2'],
	})
}

const mockGetDefaultState = (): CompleteTriCasterState => ({
	mixEffects: { main: mockGetDefaultMe(), v1: mockGetDefaultMe() }, // pretend we only have mappings for those two
	inputs: {
		input1: {
			videoActAsAlpha: false,
			videoSource: undefined,
		},
		input2: {
			videoActAsAlpha: false,
			videoSource: undefined,
		},
	},
	// @ts-ignore for now
	audioChannels: {},
	isRecording: false,
	isStreaming: false,
	mixOutputs: {
		mix1: { source: 'program' },
		mix2: { source: 'program' },
	},
	matrixOutputs: {
		out1: { source: 'mix1' },
		out2: { source: 'mix1' },
	},
})

const mockGetDefaultMe = (): CompleteTriCasterMixEffectState => ({
	programInput: 'black',
	previewInput: 'black',
	transitionEffect: 'cut',
	transitionDuration: 1,
	layers: { a: mockGetDefaultLayer(), b: mockGetDefaultLayer() },
	keyers: {
		dsk1: mockGetDefaultKeyer(),
		dsk2: mockGetDefaultKeyer(),
	},
	delegates: ['background'],
	isInEffectMode: false,
})

const mockGetDefaultKeyer = (): RequiredDeep<TriCasterKeyerState> => ({
	input: 'black',
	positioningAndCropEnabled: false,
	position: { x: 0, y: 0 },
	scale: { x: 1, y: 1 },
	rotation: { x: 0, y: 0, z: 0 },
	crop: { left: 0, right: 0, up: 0, down: 0 },
	onAir: false,
	transitionEffect: 'cut',
	transitionDuration: 1,
	feather: 0,
})

const mockGetDefaultLayer = (): TriCasterLayerState => ({
	input: 'black',
	positioningAndCropEnabled: false,
	position: { x: 0, y: 0 },
	scale: { x: 1, y: 1 },
	rotation: { x: 0, y: 0, z: 0 },
	crop: { left: 0, right: 0, up: 0, down: 0 },
	feather: 0,
})

describe('TimelineStateConverter.getTriCasterStateFromTimelineState', () => {
	test('sets MixEffect properties', () => {
		const converter = setupTimelineStateConverter()

		const convertedState = converter.getTriCasterStateFromTimelineState(
			{
				time: Date.now(),
				layers: {
					tc_me0_0: wrapIntoResolvedInstance<TimelineObjTriCasterME>({
						layer: 'tc_me0_0',
						enable: { while: '1' },
						id: 't0',
						content: {
							deviceType: DeviceType.TRICASTER,
							type: TimelineContentTypeTriCaster.ME,
							me: { programInput: 'input2', previewInput: 'input3', transitionEffect: 5, transitionDuration: 20 },
						},
					}),
					tc_me0_1: wrapIntoResolvedInstance<TimelineObjTriCasterME>({
						layer: 'tc_me0_1',
						enable: { while: '1' },
						id: 't0',
						content: {
							deviceType: DeviceType.TRICASTER,
							type: TimelineContentTypeTriCaster.ME,
							me: {
								keyers: { dsk2: { onAir: true, input: 'input5' } },
								layers: {
									b: {
										input: 'ddr3',
										position: { x: 2, y: -1.5 },
										crop: {
											left: 5,
											right: 10,
											up: 1.1111,
											down: 99.9,
										},
										scale: { x: 200, y: 90 },
										rotation: {
											x: 1,
											y: 2,
											z: 3,
										},
										feather: 67.67,
										positioningAndCropEnabled: true,
									},
								},
							},
						},
					}),
				},
				nextEvents: [],
			},
			{
				tc_me0_0: literal<MappingTriCaster>({
					device: DeviceType.TRICASTER,
					mappingType: MappingTriCasterType.ME,
					name: 'main',
					deviceId: 'tc0',
				}),
				tc_me0_1: literal<MappingTriCaster>({
					device: DeviceType.TRICASTER,
					mappingType: MappingTriCasterType.ME,
					name: 'v1',
					deviceId: 'tc0',
				}),
			}
		)

		const expectedState = mockGetDefaultState()
		expectedState.mixEffects.main.programInput = 'input2'
		expectedState.mixEffects.main.previewInput = 'input3'
		expectedState.mixEffects.main.transitionEffect = 5
		expectedState.mixEffects.main.transitionDuration = 20
		expectedState.mixEffects.v1.keyers.dsk2.input = 'input5'
		expectedState.mixEffects.v1.keyers.dsk2.onAir = true
		expectedState.mixEffects.v1.layers!.b = {
			input: 'ddr3',
			position: {
				x: 2,
				y: -1.5,
			},
			crop: {
				left: 5,
				right: 10,
				up: 1.1111,
				down: 99.9,
			},
			scale: { x: 200, y: 90 },
			rotation: {
				x: 1,
				y: 2,
				z: 3,
			},
			feather: 67.67,
			positioningAndCropEnabled: true,
		}
		expectedState.mixEffects.v1.isInEffectMode = true

		expect(convertedState).toEqual(expectedState)
	})

	test('sets mix outputs', () => {
		const converter = setupTimelineStateConverter()

		const convertedState = converter.getTriCasterStateFromTimelineState(
			{
				time: Date.now(),
				layers: {
					tc_out2: wrapIntoResolvedInstance<TimelineObjTriCasterMatrixOutput>({
						layer: 'tc_out2',
						enable: { while: '1' },
						id: 't0',
						content: {
							deviceType: DeviceType.TRICASTER,
							type: TimelineContentTypeTriCaster.MATRIX_OUTPUT,
							source: 'input5',
						},
					}),
				},
				nextEvents: [],
			},
			{
				tc_out2: literal<MappingTriCaster>({
					device: DeviceType.TRICASTER,
					mappingType: MappingTriCasterType.MATRIX_OUTPUT,
					name: 'out2',
					deviceId: 'tc0',
				}),
			}
		)

		const expectedState = mockGetDefaultState()
		expectedState.matrixOutputs.out2.source = 'input5'

		expect(convertedState).toEqual(expectedState)
	})

	test('sets matrix outputs', () => {
		const converter = setupTimelineStateConverter()

		const convertedState = converter.getTriCasterStateFromTimelineState(
			{
				time: Date.now(),
				layers: {
					tc_out2: wrapIntoResolvedInstance<TimelineObjTriCasterMixOutput>({
						layer: 'tc_out2',
						enable: { while: '1' },
						id: 't0',
						content: {
							deviceType: DeviceType.TRICASTER,
							type: TimelineContentTypeTriCaster.MIX_OUTPUT,
							source: 'me_program',
						},
					}),
				},
				nextEvents: [],
			},
			{
				tc_out2: literal<MappingTriCaster>({
					device: DeviceType.TRICASTER,
					mappingType: MappingTriCasterType.MIX_OUTPUT,
					name: 'mix2',
					deviceId: 'tc0',
				}),
			}
		)

		const expectedState = mockGetDefaultState()
		expectedState.mixOutputs.mix2.source = 'me_program'

		expect(convertedState).toEqual(expectedState)
	})

	test('sets input properties', () => {
		const converter = setupTimelineStateConverter()

		const convertedState = converter.getTriCasterStateFromTimelineState(
			{
				time: Date.now(),
				layers: {
					tc_inp2: wrapIntoResolvedInstance<TimelineObjTriCasterInput>({
						layer: 'tc_inp2',
						enable: { while: '1' },
						id: 't0',
						content: {
							deviceType: DeviceType.TRICASTER,
							type: TimelineContentTypeTriCaster.INPUT,
							input: {
								videoSource: 'Input 10',
								videoActAsAlpha: true,
							},
						},
					}),
				},
				nextEvents: [],
			},
			{
				tc_inp2: literal<MappingTriCaster>({
					device: DeviceType.TRICASTER,
					mappingType: MappingTriCasterType.INPUT,
					name: 'input2',
					deviceId: 'tc0',
				}),
			}
		)

		const expectedState = mockGetDefaultState()
		expectedState.inputs.input2 = {
			videoSource: 'Input 10',
			videoActAsAlpha: true,
		}

		expect(convertedState).toEqual(expectedState)
	})
})
