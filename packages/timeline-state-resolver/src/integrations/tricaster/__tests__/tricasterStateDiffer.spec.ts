import { DeviceType, MappingTriCasterType as MappingType } from 'timeline-state-resolver-types'
import { TriCasterInfo } from '../triCasterConnection'
import { MappingsTriCaster, TriCasterStateDiffer } from '../triCasterStateDiffer'

const MOCK_DEVICE_ID = 'tc0'
const MOCK_MAPPINGS: MappingsTriCaster = {
	main: { device: DeviceType.TRICASTER, mappingType: MappingType.ME, deviceId: MOCK_DEVICE_ID, name: 'main' },
	v1: { device: DeviceType.TRICASTER, mappingType: MappingType.ME, deviceId: MOCK_DEVICE_ID, name: 'v1' },
	v2: { device: DeviceType.TRICASTER, mappingType: MappingType.ME, deviceId: MOCK_DEVICE_ID, name: 'v2' },
	input1: { device: DeviceType.TRICASTER, mappingType: MappingType.INPUT, deviceId: MOCK_DEVICE_ID, name: 'input1' },
	input2: { device: DeviceType.TRICASTER, mappingType: MappingType.INPUT, deviceId: MOCK_DEVICE_ID, name: 'input2' },
	audio_input1: {
		device: DeviceType.TRICASTER,
		mappingType: MappingType.AUDIO_CHANNEL,
		deviceId: MOCK_DEVICE_ID,
		name: 'input1',
	},
	audio_input2: {
		device: DeviceType.TRICASTER,
		mappingType: MappingType.AUDIO_CHANNEL,
		deviceId: MOCK_DEVICE_ID,
		name: 'input2',
	},
	mix1: { device: DeviceType.TRICASTER, mappingType: MappingType.MIX_OUTPUT, deviceId: MOCK_DEVICE_ID, name: 'mix1' },
	mix2: { device: DeviceType.TRICASTER, mappingType: MappingType.MIX_OUTPUT, deviceId: MOCK_DEVICE_ID, name: 'mix2' },
	out1: {
		device: DeviceType.TRICASTER,
		mappingType: MappingType.MATRIX_OUTPUT,
		deviceId: MOCK_DEVICE_ID,
		name: 'out1',
	},
	out2: {
		device: DeviceType.TRICASTER,
		mappingType: MappingType.MATRIX_OUTPUT,
		deviceId: MOCK_DEVICE_ID,
		name: 'out2',
	},
}

function setupStateDiffer(oldMappings = MOCK_MAPPINGS, newMappings = MOCK_MAPPINGS) {
	const mockInfo: TriCasterInfo = {
		inputCount: 2,
		meCount: 2,
		dskCount: 2,
		ddrCount: 2,
		productModel: 'TEST',
		sessionName: 'TEST',
		outputCount: 3,
	}
	const stateDiffer = new TriCasterStateDiffer(mockInfo)

	return {
		stateDiffer,
		oldState: stateDiffer.getDefaultState(oldMappings),
		newState: stateDiffer.getDefaultState(newMappings),
	}
}

describe('TriCasterStateDiffer.getCommandsToAchieveState', () => {
	describe('MixEffects', () => {
		test('changes main transition speed', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixEffects.main.transitionDuration = 200

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'main', name: '_speed', value: 200 })
		})

		test('changes main transition effect to "fade", updating the speed even if it is the same', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.transitionDuration = 5.2

			newState.mixEffects.main.transitionEffect = 'fade'
			newState.mixEffects.main.transitionDuration = 5.2

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'main', name: '_select_index', value: 1 })
			expect(commands[1].command).toEqual({ target: 'main', name: '_speed', value: 5.2 })
		})

		test('changes main transition effect to numeric, updating the speed even if it is the same', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.transitionDuration = 5.2

			newState.mixEffects.main.transitionEffect = 5
			newState.mixEffects.main.transitionDuration = 5.2

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'main', name: '_select_index', value: 5 })
			expect(commands[1].command).toEqual({ target: 'main', name: '_speed', value: 5.2 })
		})

		test('issues auto transition when program input changes and transition is not "cut"', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.transitionDuration = 5.2
			oldState.mixEffects.main.programInput = 'input1'

			newState.mixEffects.main.transitionDuration = 5.2
			newState.mixEffects.main.transitionEffect = 5
			newState.mixEffects.main.programInput = 'input5'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(4)
			expect(commands[0].command).toEqual({ target: 'main', name: '_select_index', value: 5 })
			expect(commands[1].command).toEqual({ target: 'main', name: '_speed', value: 5.2 })
			expect(commands[2].command).toEqual({ target: 'main_b', name: '_row_named_input', value: 'input5' })
			expect(commands[3].command).toEqual({ target: 'main', name: '_auto' })
		})

		test('issues a take when program input changes and transition is "cut"', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.transitionEffect = 5
			oldState.mixEffects.main.programInput = 'input1'

			newState.mixEffects.main.transitionEffect = 'cut'
			newState.mixEffects.main.programInput = 'input5'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'main_b', name: '_row_named_input', value: 'input5' })
			expect(commands[1].command).toEqual({ target: 'main', name: '_take' })
		})

		test('changes program and preview when previewInput is provided', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.previewInput = 'input2'
			oldState.mixEffects.main.programInput = 'input1'

			newState.mixEffects.main.previewInput = 'input6'
			newState.mixEffects.main.programInput = 'input5'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'main_b', name: '_row_named_input', value: 'input6' })
			expect(commands[1].command).toEqual({ target: 'main_a', name: '_row_named_input', value: 'input5' })
		})

		test('does not change preview when transition is other than "cut"', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.previewInput = 'input2'
			oldState.mixEffects.main.programInput = 'input1'

			newState.mixEffects.main.transitionEffect = 5
			newState.mixEffects.main.transitionDuration = 5.2
			newState.mixEffects.main.previewInput = 'input6'
			newState.mixEffects.main.programInput = 'input5'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(4)
			expect(commands[0].command).toEqual({ target: 'main', name: '_select_index', value: 5 })
			expect(commands[1].command).toEqual({ target: 'main', name: '_speed', value: 5.2 })
			expect(commands[2].command).toEqual({ target: 'main_b', name: '_row_named_input', value: 'input5' })
			expect(commands[3].command).toEqual({ target: 'main', name: '_auto' })
		})

		test('changes preview when program has no change', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.previewInput = 'input2'

			newState.mixEffects.main.previewInput = 'input6'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'main_b', name: '_row_named_input', value: 'input6' })
		})

		test('sets delegates before a transition', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.programInput = 'input1'
			oldState.mixEffects.main.delegates = ['dsk3', 'dsk4']

			newState.mixEffects.main.programInput = 'input2'
			newState.mixEffects.main.delegates = ['dsk3', 'background']

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(3)
			expect(commands[0].command).toEqual({ target: 'main', name: '_delegate', value: 'main_background|main_dsk3' })
			expect(commands[1].command).toEqual({ target: 'main_b', name: '_row_named_input', value: 'input2' })
			expect(commands[2].command).toEqual({ target: 'main', name: '_take' })
		})
	})

	describe('MixEffects > keyers', () => {
		test('changes input when only the input changes', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.keyers.dsk2.input = 'input1'

			newState.mixEffects.main.keyers.dsk2.input = 'input2'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'main_dsk2', name: '_select_named_input', value: 'input2' })
		})

		test('issues auto transition when onAir changes and transition is not "cut"', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.keyers.dsk2.transitionDuration = 5.2
			oldState.mixEffects.main.keyers.dsk2.transitionEffect = 5
			oldState.mixEffects.main.keyers.dsk2.input = 'input1'

			newState.mixEffects.main.keyers.dsk2.transitionDuration = 5.2
			newState.mixEffects.main.keyers.dsk2.transitionEffect = 5
			newState.mixEffects.main.keyers.dsk2.onAir = true
			newState.mixEffects.main.keyers.dsk2.input = 'input1'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'main_dsk2', name: '_auto' })
		})

		test('commands are in order when onAir and input change, and transition is not "cut"', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.keyers.dsk2.input = 'input1'

			newState.mixEffects.main.keyers.dsk2.transitionDuration = 5.2
			newState.mixEffects.main.keyers.dsk2.transitionEffect = 5
			newState.mixEffects.main.keyers.dsk2.onAir = true
			newState.mixEffects.main.keyers.dsk2.input = 'input2'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(4)
			expect(commands[0].command).toEqual({ target: 'main_dsk2', name: '_select_index', value: 5 })
			expect(commands[1].command).toEqual({ target: 'main_dsk2', name: '_speed', value: 5.2 })
			expect(commands[2].command).toEqual({ target: 'main_dsk2', name: '_select_named_input', value: 'input2' })
			expect(commands[3].command).toEqual({ target: 'main_dsk2', name: '_auto' })
		})

		test('issues a value change when onAir changes and transition is "cut"', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixEffects.main.keyers.dsk2.transitionEffect = 'cut'
			newState.mixEffects.main.keyers.dsk2.onAir = true

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'main_dsk2', name: '_value', value: 1 })
		})

		test('commands are in order when when onAir and input changes and transition is "cut"', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.keyers.dsk2.input = 'input1'

			newState.mixEffects.main.keyers.dsk2.transitionEffect = 'cut'
			newState.mixEffects.main.keyers.dsk2.onAir = true
			newState.mixEffects.main.keyers.dsk2.input = 'input2'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'main_dsk2', name: '_select_named_input', value: 'input2' })
			expect(commands[1].command).toEqual({ target: 'main_dsk2', name: '_value', value: 1 })
		})

		test('generates position commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixEffects.main.keyers.dsk2.position = {
				x: 2.8,
				y: -1,
			}

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'main_dsk2', name: '_position_x', value: 2.8 })
			expect(commands[1].command).toEqual({ target: 'main_dsk2', name: '_position_y', value: -1 })
		})

		test('generates scale commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixEffects.main.keyers.dsk2.scale = {
				x: 2.8,
				y: -1,
			}

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'main_dsk2', name: '_scale_x', value: 2.8 })
			expect(commands[1].command).toEqual({ target: 'main_dsk2', name: '_scale_y', value: -1 })
		})

		test('generates rotation commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixEffects.main.keyers.dsk2.rotation = {
				x: 2.8,
				y: -1,
				z: 5.0,
			}

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(3)
			expect(commands[0].command).toEqual({ target: 'main_dsk2', name: '_rotation_x', value: 2.8 })
			expect(commands[1].command).toEqual({ target: 'main_dsk2', name: '_rotation_y', value: -1 })
			expect(commands[2].command).toEqual({ target: 'main_dsk2', name: '_rotation_z', value: 5.0 })
		})

		test('generates crop commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixEffects.main.keyers.dsk2.crop = {
				left: 10,
				right: 50,
				up: 25.67,
				down: 99.9,
			}

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(4)
			expect(commands[0].command).toEqual({ target: 'main_dsk2', name: '_crop_left_value', value: 10 })
			expect(commands[1].command).toEqual({ target: 'main_dsk2', name: '_crop_right_value', value: 50 })
			expect(commands[2].command).toEqual({ target: 'main_dsk2', name: '_crop_up_value', value: 25.67 })
			expect(commands[3].command).toEqual({ target: 'main_dsk2', name: '_crop_down_value', value: 99.9 })
		})

		test('generates feather commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixEffects.main.keyers.dsk2.feather = 50

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'main_dsk2', name: '_feather_value', value: 50 })
		})
	})

	describe('MixEffects > layers', () => {
		test('preview change is discarded when layers are used', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.v1.previewInput = 'input1'
			oldState.mixEffects.v1.isInEffectMode = true

			newState.mixEffects.v1.previewInput = 'input2'
			newState.mixEffects.v1.isInEffectMode = true

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(0)
		})

		test('program change is discarded when layers are used', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.v1.programInput = 'input1'
			oldState.mixEffects.v1.isInEffectMode = true

			newState.mixEffects.v1.programInput = 'input2'
			newState.mixEffects.v1.isInEffectMode = true

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(0)
		})

		test('generates position commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixEffects.v1.layers!.a!.position = {
				x: 2.8,
				y: -1,
			}

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'v1_a', name: '_position_x', value: 2.8 })
			expect(commands[1].command).toEqual({ target: 'v1_a', name: '_position_y', value: -1 })
		})

		test('generates scale commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixEffects.v1.layers!.a!.scale = {
				x: 2.8,
				y: -1,
			}

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'v1_a', name: '_scale_x', value: 2.8 })
			expect(commands[1].command).toEqual({ target: 'v1_a', name: '_scale_y', value: -1 })
		})

		test('generates rotation commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixEffects.v1.layers!.a!.rotation = {
				x: 2.8,
				y: -1,
				z: 5.0,
			}

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(3)
			expect(commands[0].command).toEqual({ target: 'v1_a', name: '_rotation_x', value: 2.8 })
			expect(commands[1].command).toEqual({ target: 'v1_a', name: '_rotation_y', value: -1 })
			expect(commands[2].command).toEqual({ target: 'v1_a', name: '_rotation_z', value: 5.0 })
		})

		test('generates crop commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixEffects.v1.layers!.a!.crop = {
				left: 10,
				right: 50,
				up: 25.67,
				down: 99.9,
			}

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(4)
			expect(commands[0].command).toEqual({ target: 'v1_a', name: '_crop_left_value', value: 10 })
			expect(commands[1].command).toEqual({ target: 'v1_a', name: '_crop_right_value', value: 50 })
			expect(commands[2].command).toEqual({ target: 'v1_a', name: '_crop_up_value', value: 25.67 })
			expect(commands[3].command).toEqual({ target: 'v1_a', name: '_crop_down_value', value: 99.9 })
		})

		test('generates feather commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixEffects.v1.layers!.a!.feather = 50

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'v1_a', name: '_feather_value', value: 50 })
		})
	})

	describe('Inputs', () => {
		test('sets act-as-alpha', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.inputs.input2.videoActAsAlpha = true

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'input2', name: '_video_act_as_alpha', value: true })
		})

		test('sets video source', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.inputs.input2.videoSource = 'SOME-NETWORK-SOURCE (Output 1)'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({
				target: 'input2',
				name: '_video_source',
				value: 'SOME-NETWORK-SOURCE (Output 1)',
			})
		})
	})

	describe('Audio Channels', () => {
		test('unmutes', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.audioChannels.input2.isMuted = false

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'input2', name: '_mute', value: false })
		})

		test('sets volume', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.audioChannels.input2.volume = 5

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'input2', name: '_volume', value: 5 })
		})
	})

	describe('Mix Outputs', () => {
		test('sets output source', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixOutputs.mix2.source = 'me_preview'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'mix2', name: '_output_source', value: 'me_preview' })
		})
	})

	describe('Matrix Outputs', () => {
		test('sets output source', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.matrixOutputs.out2.source = 'input5'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'out2', name: '_crosspoint_source', value: 'input5' })
		})
	})

	describe('Mapping changes', () => {
		test('added mapings generate commands with default state, only for the mapped resource', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer(
				{},
				{
					mix1: {
						device: DeviceType.TRICASTER,
						mappingType: MappingType.MIX_OUTPUT,
						deviceId: MOCK_DEVICE_ID,
						name: 'mix1',
					},
				}
			)

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'mix1', name: '_output_source', value: 'program' })
		})

		test('removed mapings do not generate commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer(MOCK_MAPPINGS, {})

			// some example state
			oldState.mixEffects.main.keyers.dsk2.transitionDuration = 5.2
			oldState.mixEffects.main.keyers.dsk2.transitionEffect = 5
			oldState.mixEffects.main.keyers.dsk2.input = 'input1'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(0)
		})
	})
})
