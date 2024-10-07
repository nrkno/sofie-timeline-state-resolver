import {
	DeviceType,
	MappingTricasterType,
	TimelineContentTypeTriCaster,
	TimelineContentTriCasterInput,
	TimelineContentTriCasterME,
	TimelineContentTriCasterMixOutput,
	TimelineContentTriCasterMatrixOutput,
	Mapping,
	SomeMappingTricaster,
} from 'timeline-state-resolver-types'
import { TriCasterTimelineStateConverter } from '../triCasterTimelineStateConverter'
import {
	CompleteTriCasterMixEffectState,
	CompleteTriCasterState,
	RequiredDeep,
	TriCasterKeyerState,
	TriCasterLayerState,
	WithContext,
	wrapStateInContext,
} from '../triCasterStateDiffer'
import { literal } from '../../../lib'
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

const mockGetDefaultState = (): WithContext<CompleteTriCasterState> =>
	wrapStateInContext<CompleteTriCasterState>({
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
			mix1: { source: 'program', meClean: false },
			mix2: { source: 'program', meClean: false },
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
					tc_me0_0: wrapIntoResolvedInstance<TimelineContentTriCasterME>({
						layer: 'tc_me0_0',
						enable: { while: '1' },
						id: 't0',
						content: {
							deviceType: DeviceType.TRICASTER,
							type: TimelineContentTypeTriCaster.ME,
							me: { programInput: 'input2', previewInput: 'input3', transitionEffect: 5, transitionDuration: 20 },
						},
					}),
					tc_me0_1: wrapIntoResolvedInstance<TimelineContentTriCasterME>({
						layer: 'tc_me0_1',
						enable: { while: '1' },
						id: 't1',
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
				tc_me0_0: literal<Mapping<SomeMappingTricaster>>({
					device: DeviceType.TRICASTER,
					deviceId: 'tc0',
					options: {
						mappingType: MappingTricasterType.ME,
						name: 'main',
					},
				}),
				tc_me0_1: literal<Mapping<SomeMappingTricaster>>({
					device: DeviceType.TRICASTER,
					deviceId: 'tc0',
					options: {
						mappingType: MappingTricasterType.ME,
						name: 'v1',
					},
				}),
			}
		)

		const expectedState = mockGetDefaultState()
		expectedState.mixEffects.main.programInput = { value: 'input2', timelineObjId: 't0' }
		expectedState.mixEffects.main.previewInput = { value: 'input3', timelineObjId: 't0' }
		expectedState.mixEffects.main.transitionEffect = { value: 5, timelineObjId: 't0' }
		expectedState.mixEffects.main.transitionDuration = { value: 20, timelineObjId: 't0' }
		expectedState.mixEffects.v1.keyers.dsk2.input = { value: 'input5', timelineObjId: 't1' }
		expectedState.mixEffects.v1.keyers.dsk2.onAir = { value: true, timelineObjId: 't1' }

		expectedState.mixEffects.v1.layers!.b = {
			input: { value: 'ddr3', timelineObjId: 't1' },
			position: {
				x: { value: 2, timelineObjId: 't1' },
				y: { value: -1.5, timelineObjId: 't1' },
			},
			crop: {
				left: { value: 5, timelineObjId: 't1' },
				right: { value: 10, timelineObjId: 't1' },
				up: { value: 1.1111, timelineObjId: 't1' },
				down: { value: 99.9, timelineObjId: 't1' },
			},
			scale: { x: { value: 200, timelineObjId: 't1' }, y: { value: 90, timelineObjId: 't1' } },
			rotation: {
				x: { value: 1, timelineObjId: 't1' },
				y: { value: 2, timelineObjId: 't1' },
				z: { value: 3, timelineObjId: 't1' },
			},
			feather: { value: 67.67, timelineObjId: 't1' },
			positioningAndCropEnabled: { value: true, timelineObjId: 't1' },
		}
		expectedState.mixEffects.v1.isInEffectMode.value = true

		expect(convertedState).toEqual(expectedState)
	})

	test('sets matrix outputs', () => {
		const converter = setupTimelineStateConverter()

		const convertedState = converter.getTriCasterStateFromTimelineState(
			{
				time: Date.now(),
				layers: {
					tc_out2: wrapIntoResolvedInstance<TimelineContentTriCasterMatrixOutput>({
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
				tc_out2: literal<Mapping<SomeMappingTricaster>>({
					device: DeviceType.TRICASTER,
					deviceId: 'tc0',
					options: {
						mappingType: MappingTricasterType.MATRIXOUTPUT,
						name: 'out2',
					},
				}),
			}
		)

		const expectedState = mockGetDefaultState()
		expectedState.matrixOutputs.out2.source = { value: 'input5', timelineObjId: 't0' }

		expect(convertedState).toEqual(expectedState)
	})

	test('sets mix outputs', () => {
		const converter = setupTimelineStateConverter()

		const convertedState = converter.getTriCasterStateFromTimelineState(
			{
				time: Date.now(),
				layers: {
					tc_out2: wrapIntoResolvedInstance<TimelineContentTriCasterMixOutput>({
						layer: 'tc_out2',
						enable: { while: '1' },
						id: 't0',
						content: {
							deviceType: DeviceType.TRICASTER,
							type: TimelineContentTypeTriCaster.MIX_OUTPUT,
							source: 'me_program',
							meClean: true,
						},
					}),
				},
				nextEvents: [],
			},
			{
				tc_out2: literal<Mapping<SomeMappingTricaster>>({
					device: DeviceType.TRICASTER,
					deviceId: 'tc0',
					options: {
						mappingType: MappingTricasterType.MIXOUTPUT,
						name: 'mix2',
					},
				}),
			}
		)

		const expectedState = mockGetDefaultState()
		expectedState.mixOutputs.mix2.source = { value: 'me_program', timelineObjId: 't0' }
		expectedState.mixOutputs.mix2.meClean = { value: true, timelineObjId: 't0' }

		expect(convertedState).toEqual(expectedState)
	})

	test('sets input properties', () => {
		const converter = setupTimelineStateConverter()

		const convertedState = converter.getTriCasterStateFromTimelineState(
			{
				time: Date.now(),
				layers: {
					tc_inp2: wrapIntoResolvedInstance<TimelineContentTriCasterInput>({
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
				tc_inp2: literal<Mapping<SomeMappingTricaster>>({
					device: DeviceType.TRICASTER,
					deviceId: 'tc0',
					options: {
						mappingType: MappingTricasterType.INPUT,
						name: 'input2',
					},
				}),
			}
		)

		const expectedState = mockGetDefaultState()
		expectedState.inputs.input2 = {
			videoSource: { value: 'Input 10', timelineObjId: 't0' },
			videoActAsAlpha: { value: true, timelineObjId: 't0' },
		}

		expect(convertedState).toEqual(expectedState)
	})

	test('sets temporal priority', () => {
		const converter = setupTimelineStateConverter()

		const convertedState = converter.getTriCasterStateFromTimelineState(
			{
				time: Date.now(),
				layers: {
					tc_me0_0: wrapIntoResolvedInstance<TimelineContentTriCasterME>({
						layer: 'tc_me0_0',
						enable: { while: '1' },
						id: 't0',
						content: {
							deviceType: DeviceType.TRICASTER,
							type: TimelineContentTypeTriCaster.ME,
							me: { programInput: 'input2', previewInput: 'input3', transitionEffect: 5, transitionDuration: 20 },
						},
					}),
					tc_me0_1: wrapIntoResolvedInstance<TimelineContentTriCasterME>({
						layer: 'tc_me0_1',
						enable: { while: '1' },
						id: 't1',
						content: {
							deviceType: DeviceType.TRICASTER,
							type: TimelineContentTypeTriCaster.ME,
							me: {
								keyers: { dsk2: { onAir: true, input: 'input5' } },
							},
							temporalPriority: -1,
						},
					}),
				},
				nextEvents: [],
			},
			{
				tc_me0_0: literal<Mapping<SomeMappingTricaster>>({
					device: DeviceType.TRICASTER,
					deviceId: 'tc0',
					options: {
						mappingType: MappingTricasterType.ME,
						name: 'main',
					},
				}),
				tc_me0_1: literal<Mapping<SomeMappingTricaster>>({
					device: DeviceType.TRICASTER,
					deviceId: 'tc0',
					options: {
						mappingType: MappingTricasterType.ME,
						name: 'main',
					},
				}),
			}
		)

		const expectedState = mockGetDefaultState()
		expectedState.mixEffects.main.programInput = { value: 'input2', timelineObjId: 't0' }
		expectedState.mixEffects.main.previewInput = { value: 'input3', timelineObjId: 't0' }
		expectedState.mixEffects.main.transitionEffect = { value: 5, timelineObjId: 't0' }
		expectedState.mixEffects.main.transitionDuration = { value: 20, timelineObjId: 't0' }
		expectedState.mixEffects.main.keyers.dsk2.input = { value: 'input5', timelineObjId: 't1', temporalPriority: -1 }
		expectedState.mixEffects.main.keyers.dsk2.onAir = { value: true, timelineObjId: 't1', temporalPriority: -1 }

		expect(convertedState).toEqual(expectedState)
	})
})
