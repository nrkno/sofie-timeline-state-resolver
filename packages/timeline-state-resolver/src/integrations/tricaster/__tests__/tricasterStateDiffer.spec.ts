import { DeviceType, MappingTricasterType as MappingType } from 'timeline-state-resolver-types'
import { TriCasterInfo } from '../triCasterConnection'
import { MappingsTriCaster, TriCasterStateDiffer } from '../triCasterStateDiffer'

const MOCK_DEVICE_ID = 'tc0'
const MOCK_MAPPINGS: MappingsTriCaster = {
	main: {
		device: DeviceType.TRICASTER,
		deviceId: MOCK_DEVICE_ID,
		options: {
			mappingType: MappingType.ME,
			name: 'main',
		},
	},
	v1: {
		device: DeviceType.TRICASTER,
		deviceId: MOCK_DEVICE_ID,
		options: {
			mappingType: MappingType.ME,
			name: 'v1',
		},
	},
	v2: {
		device: DeviceType.TRICASTER,
		deviceId: MOCK_DEVICE_ID,
		options: {
			mappingType: MappingType.ME,
			name: 'v2',
		},
	},
	input1: {
		device: DeviceType.TRICASTER,
		deviceId: MOCK_DEVICE_ID,
		options: {
			mappingType: MappingType.INPUT,
			name: 'input1',
		},
	},
	input2: {
		device: DeviceType.TRICASTER,
		deviceId: MOCK_DEVICE_ID,
		options: {
			mappingType: MappingType.INPUT,
			name: 'input2',
		},
	},
	audio_input1: {
		device: DeviceType.TRICASTER,
		deviceId: MOCK_DEVICE_ID,
		options: {
			mappingType: MappingType.AUDIOCHANNEL,
			name: 'input1',
		},
	},
	audio_input2: {
		device: DeviceType.TRICASTER,
		deviceId: MOCK_DEVICE_ID,
		options: {
			mappingType: MappingType.AUDIOCHANNEL,
			name: 'input2',
		},
	},
	mix1: {
		device: DeviceType.TRICASTER,
		deviceId: MOCK_DEVICE_ID,
		options: {
			mappingType: MappingType.MIXOUTPUT,
			name: 'mix1',
		},
	},
	mix2: {
		device: DeviceType.TRICASTER,
		deviceId: MOCK_DEVICE_ID,
		options: {
			mappingType: MappingType.MIXOUTPUT,
			name: 'mix2',
		},
	},
	out1: {
		device: DeviceType.TRICASTER,
		deviceId: MOCK_DEVICE_ID,
		options: {
			mappingType: MappingType.MATRIXOUTPUT,
			name: 'out1',
		},
	},
	out2: {
		device: DeviceType.TRICASTER,
		deviceId: MOCK_DEVICE_ID,
		options: {
			mappingType: MappingType.MATRIXOUTPUT,
			name: 'out2',
		},
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

			newState.mixEffects.main.transitionDuration.value = 200

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'main', name: '_speed', value: 200 })
		})

		test('changes main transition effect to "fade", updating the speed even if it is the same', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.transitionDuration.value = 5.2

			newState.mixEffects.main.transitionEffect.value = 'fade'
			newState.mixEffects.main.transitionDuration.value = 5.2

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'main', name: '_set_mix_effect_bin_index', value: 0 })
			expect(commands[1].command).toEqual({ target: 'main', name: '_speed', value: 5.2 })
		})

		test('changes main transition effect to numeric, updating the speed even if it is the same', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.transitionDuration.value = 5.2

			newState.mixEffects.main.transitionEffect.value = 5
			newState.mixEffects.main.transitionDuration.value = 5.2

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'main', name: '_set_mix_effect_bin_index', value: 5 })
			expect(commands[1].command).toEqual({ target: 'main', name: '_speed', value: 5.2 })
		})

		test('issues auto transition when program input changes and transition is not "cut"', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.transitionDuration.value = 5.2
			oldState.mixEffects.main.programInput.value = 'input1'

			newState.mixEffects.main.transitionDuration.value = 5.2
			newState.mixEffects.main.transitionEffect.value = 5
			newState.mixEffects.main.programInput.value = 'input5'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(4)
			expect(commands[0].command).toEqual({ target: 'main', name: '_set_mix_effect_bin_index', value: 5 })
			expect(commands[1].command).toEqual({ target: 'main', name: '_speed', value: 5.2 })
			expect(commands[2].command).toEqual({ target: 'main_b', name: '_row_named_input', value: 'input5' })
			expect(commands[3].command).toEqual({ target: 'main', name: '_auto' })
		})

		test('issues a take when program input changes and transition is "cut"', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.transitionEffect.value = 5
			oldState.mixEffects.main.programInput.value = 'input1'

			newState.mixEffects.main.transitionEffect.value = 'cut'
			newState.mixEffects.main.programInput.value = 'input5'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'main_b', name: '_row_named_input', value: 'input5' })
			expect(commands[1].command).toEqual({ target: 'main', name: '_take' })
		})

		test('changes program and preview when previewInput is provided', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.previewInput!.value = 'input2'
			oldState.mixEffects.main.programInput.value = 'input1'

			newState.mixEffects.main.previewInput!.value = 'input6'
			newState.mixEffects.main.programInput.value = 'input5'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'main_b', name: '_row_named_input', value: 'input6' })
			expect(commands[1].command).toEqual({ target: 'main_a', name: '_row_named_input', value: 'input5' })
		})

		test('does not change preview when transition is other than "cut"', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.previewInput!.value = 'input2'
			oldState.mixEffects.main.programInput.value = 'input1'

			newState.mixEffects.main.transitionEffect.value = 5
			newState.mixEffects.main.transitionDuration.value = 5.2
			newState.mixEffects.main.previewInput!.value = 'input6'
			newState.mixEffects.main.programInput.value = 'input5'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(4)
			expect(commands[0].command).toEqual({ target: 'main', name: '_set_mix_effect_bin_index', value: 5 })
			expect(commands[1].command).toEqual({ target: 'main', name: '_speed', value: 5.2 })
			expect(commands[2].command).toEqual({ target: 'main_b', name: '_row_named_input', value: 'input5' })
			expect(commands[3].command).toEqual({ target: 'main', name: '_auto' })
		})

		test('changes preview when program has no change', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.previewInput!.value = 'input2'

			newState.mixEffects.main.previewInput!.value = 'input6'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'main_b', name: '_row_named_input', value: 'input6' })
		})

		test('sets delegates before a transition', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.programInput.value = 'input1'
			oldState.mixEffects.main.delegates.value = ['dsk3', 'dsk4']

			newState.mixEffects.main.programInput.value = 'input2'
			newState.mixEffects.main.delegates.value = ['dsk3', 'background']

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

			oldState.mixEffects.main.keyers.dsk2.input.value = 'input1'

			newState.mixEffects.main.keyers.dsk2.input.value = 'input2'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'main_dsk2', name: '_select_named_input', value: 'input2' })
		})

		test('issues auto transition when onAir changes and transition is not "cut"', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.keyers.dsk2.transitionDuration.value = 5.2
			oldState.mixEffects.main.keyers.dsk2.transitionEffect.value = 5
			oldState.mixEffects.main.keyers.dsk2.input.value = 'input1'

			newState.mixEffects.main.keyers.dsk2.transitionDuration.value = 5.2
			newState.mixEffects.main.keyers.dsk2.transitionEffect.value = 5
			newState.mixEffects.main.keyers.dsk2.onAir.value = true
			newState.mixEffects.main.keyers.dsk2.input.value = 'input1'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'main_dsk2', name: '_auto' })
		})

		test('commands are in order when onAir and input change, and transition is not "cut"', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.keyers.dsk2.input.value = 'input1'

			newState.mixEffects.main.keyers.dsk2.transitionDuration.value = 5.2
			newState.mixEffects.main.keyers.dsk2.transitionEffect.value = 5
			newState.mixEffects.main.keyers.dsk2.onAir.value = true
			newState.mixEffects.main.keyers.dsk2.input.value = 'input2'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(4)
			expect(commands[0].command).toEqual({ target: 'main_dsk2', name: '_select_index', value: 5 })
			expect(commands[1].command).toEqual({ target: 'main_dsk2', name: '_speed', value: 5.2 })
			expect(commands[2].command).toEqual({ target: 'main_dsk2', name: '_select_named_input', value: 'input2' })
			expect(commands[3].command).toEqual({ target: 'main_dsk2', name: '_auto' })
		})

		test('issues a value change when onAir changes and transition is "cut"', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixEffects.main.keyers.dsk2.transitionEffect.value = 'cut'
			newState.mixEffects.main.keyers.dsk2.onAir.value = true

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'main_dsk2', name: '_value', value: 1 })
		})

		test('commands are in order when when onAir and input changes and transition is "cut"', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.keyers.dsk2.input.value = 'input1'

			newState.mixEffects.main.keyers.dsk2.transitionEffect.value = 'cut'
			newState.mixEffects.main.keyers.dsk2.onAir.value = true
			newState.mixEffects.main.keyers.dsk2.input.value = 'input2'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'main_dsk2', name: '_select_named_input', value: 'input2' })
			expect(commands[1].command).toEqual({ target: 'main_dsk2', name: '_value', value: 1 })
		})

		test('generates position commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixEffects.main.keyers.dsk2.position = {
				x: { value: 2.8 },
				y: { value: -1 },
			}

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'main_dsk2', name: '_position_x', value: 2.8 })
			expect(commands[1].command).toEqual({ target: 'main_dsk2', name: '_position_y', value: -1 })
		})

		test('generates scale commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixEffects.main.keyers.dsk2.scale = {
				x: { value: 2.8 },
				y: { value: -1 },
			}

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'main_dsk2', name: '_scale_x', value: 2.8 })
			expect(commands[1].command).toEqual({ target: 'main_dsk2', name: '_scale_y', value: -1 })
		})

		test('generates rotation commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixEffects.main.keyers.dsk2.rotation = {
				x: { value: 2.8 },
				y: { value: -1 },
				z: { value: 5.0 },
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
				left: { value: 10 },
				right: { value: 50 },
				up: { value: 25.67 },
				down: { value: 99.9 },
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

			newState.mixEffects.main.keyers.dsk2.feather.value = 50

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'main_dsk2', name: '_feather_value', value: 50 })
		})
	})

	describe('MixEffects > layers', () => {
		test('preview change is discarded when layers are used', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.v1.previewInput!.value = 'input1'
			oldState.mixEffects.v1.isInEffectMode.value = true

			newState.mixEffects.v1.previewInput!.value = 'input2'
			newState.mixEffects.v1.isInEffectMode.value = true

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(0)
		})

		test('program change is discarded when layers are used', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.v1.programInput.value = 'input1'
			oldState.mixEffects.v1.isInEffectMode.value = true

			newState.mixEffects.v1.programInput.value = 'input2'
			newState.mixEffects.v1.isInEffectMode.value = true

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(0)
		})

		test('changes inputs', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.v1.layers!.a!.input!.value = 'input1'
			oldState.mixEffects.v1.isInEffectMode.value = true

			newState.mixEffects.v1.layers!.a!.input!.value = 'input2'
			newState.mixEffects.v1.isInEffectMode.value = true

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'v1_a', name: '_row_named_input', value: 'input2' })
		})

		test('does not change a or b inputs when not in effect mode', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.v1.layers!.a!.input!.value = 'input1'
			oldState.mixEffects.v1.layers!.b!.input!.value = 'input3'
			oldState.mixEffects.v1.isInEffectMode.value = false

			newState.mixEffects.v1.layers!.a!.input!.value = 'input2'
			newState.mixEffects.v1.layers!.b!.input!.value = 'input4'
			newState.mixEffects.v1.isInEffectMode.value = false

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(0)
		})

		test('generates position commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.v1.isInEffectMode.value = true

			newState.mixEffects.v1.layers!.a!.position = {
				x: { value: 2.8 },
				y: { value: -1 },
			}
			newState.mixEffects.v1.isInEffectMode.value = true

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'v1_a', name: '_position_x', value: 2.8 })
			expect(commands[1].command).toEqual({ target: 'v1_a', name: '_position_y', value: -1 })
		})

		test('generates scale commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.v1.isInEffectMode.value = true

			newState.mixEffects.v1.layers!.a!.scale = {
				x: { value: 2.8 },
				y: { value: -1 },
			}
			newState.mixEffects.v1.isInEffectMode.value = true

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'v1_a', name: '_scale_x', value: 2.8 })
			expect(commands[1].command).toEqual({ target: 'v1_a', name: '_scale_y', value: -1 })
		})

		test('generates rotation commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.v1.isInEffectMode.value = true

			newState.mixEffects.v1.layers!.a!.rotation = {
				x: { value: 2.8 },
				y: { value: -1 },
				z: { value: 5.0 },
			}
			newState.mixEffects.v1.isInEffectMode.value = true

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(3)
			expect(commands[0].command).toEqual({ target: 'v1_a', name: '_rotation_x', value: 2.8 })
			expect(commands[1].command).toEqual({ target: 'v1_a', name: '_rotation_y', value: -1 })
			expect(commands[2].command).toEqual({ target: 'v1_a', name: '_rotation_z', value: 5.0 })
		})

		test('generates crop commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.v1.isInEffectMode.value = true

			newState.mixEffects.v1.layers!.a!.crop = {
				left: { value: 10 },
				right: { value: 50 },
				up: { value: 25.67 },
				down: { value: 99.9 },
			}
			newState.mixEffects.v1.isInEffectMode.value = true

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(4)
			expect(commands[0].command).toEqual({ target: 'v1_a', name: '_crop_left_value', value: 10 })
			expect(commands[1].command).toEqual({ target: 'v1_a', name: '_crop_right_value', value: 50 })
			expect(commands[2].command).toEqual({ target: 'v1_a', name: '_crop_up_value', value: 25.67 })
			expect(commands[3].command).toEqual({ target: 'v1_a', name: '_crop_down_value', value: 99.9 })
		})

		test('generates feather commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.v1.isInEffectMode.value = true

			newState.mixEffects.v1.layers!.a!.feather!.value = 50
			newState.mixEffects.v1.isInEffectMode.value = true

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'v1_a', name: '_feather_value', value: 50 })
		})

		test('generates all commands when `isInEffectMode` changes to `true`', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.v1.isInEffectMode.value = false

			newState.mixEffects.v1.isInEffectMode.value = true

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(56)
			const layerCommands = commands.filter(
				(command) => 'target' in command.command && ['v1_a', 'v1_b', 'v1_c', 'v1_d'].includes(command.command.target)
			)
			expect(commands.length).toEqual(layerCommands.length)
		})
	})

	describe('Inputs', () => {
		test('sets act-as-alpha', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.inputs.input2.videoActAsAlpha.value = true

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'input2', name: '_video_act_as_alpha', value: true })
		})

		test('sets video source', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.inputs.input2.videoSource!.value = 'SOME-NETWORK-SOURCE (Output 1)'

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

			newState.audioChannels.input2.isMuted.value = false

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'input2', name: '_mute', value: false })
		})

		test('sets volume', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.audioChannels.input2.volume.value = 5

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'input2', name: '_volume', value: 5 })
		})
	})

	describe('Mix Outputs', () => {
		test('sets output source', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixOutputs.mix2.source.value = 'me_preview'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'mix2', name: '_output_source', value: 'me_preview' })
		})

		test('sets ME Clean', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixOutputs.mix2.meClean.value = true

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ name: 'set_output_config_video_source', output_index: 1, me_clean: true })
		})
	})

	describe('Matrix Outputs', () => {
		test('sets output source', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.matrixOutputs.out2.source.value = 'input5'

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
						deviceId: MOCK_DEVICE_ID,
						options: {
							mappingType: MappingType.MIXOUTPUT,
							name: 'mix1',
						},
					},
				}
			)

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'mix1', name: '_output_source', value: 'program' })
			expect(commands[1].command).toEqual({ name: 'set_output_config_video_source', output_index: 0, me_clean: false })
		})

		test('removed mapings do not generate commands', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer(MOCK_MAPPINGS, {})

			// some example state
			oldState.mixEffects.main.keyers.dsk2.transitionDuration.value = 5.2
			oldState.mixEffects.main.keyers.dsk2.transitionEffect.value = 5
			oldState.mixEffects.main.keyers.dsk2.input.value = 'input1'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(0)
		})
	})

	describe('Tracking timeline objects', () => {
		test('command with contexts has timelineObjectId from new state', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			// some example states
			oldState.mixEffects.main.keyers.dsk2.onAir.value = false
			oldState.mixEffects.main.keyers.dsk2.onAir.timelineObjId = 't0'
			oldState.mixEffects.main.keyers.dsk2.input.value = 'input1'
			oldState.mixEffects.main.keyers.dsk2.input.timelineObjId = 't1'

			newState.mixEffects.main.keyers.dsk2.onAir.value = true
			newState.mixEffects.main.keyers.dsk2.onAir.timelineObjId = 't2'
			newState.mixEffects.main.keyers.dsk2.input.value = 'input2'
			newState.mixEffects.main.keyers.dsk2.input.timelineObjId = 't3'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0]).toEqual({
				command: { target: 'main_dsk2', name: '_select_named_input', value: 'input2' },
				timelineObjId: 't3',
				context: '',
				temporalPriority: 0,
			})
			expect(commands[1]).toEqual({
				command: { target: 'main_dsk2', name: '_value', value: 1 },
				timelineObjId: 't2',
				context: '',
				temporalPriority: 0,
			})
		})

		test('command are not generated if only the timeline object id has changed', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			// some example states
			oldState.mixEffects.main.keyers.dsk2.onAir.value = true
			oldState.mixEffects.main.keyers.dsk2.onAir.timelineObjId = 't0'
			oldState.mixEffects.main.keyers.dsk2.input.value = 'input1'
			oldState.mixEffects.main.keyers.dsk2.input.timelineObjId = 't1'

			newState.mixEffects.main.keyers.dsk2.onAir.value = true
			newState.mixEffects.main.keyers.dsk2.onAir.timelineObjId = 't2'
			newState.mixEffects.main.keyers.dsk2.input.value = 'input1'
			newState.mixEffects.main.keyers.dsk2.input.timelineObjId = 't3'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(0)
		})
	})

	describe('Temporal priority', () => {
		test('command with contexts are sorted by temporal priority', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.mixEffects.main.keyers.dsk2.input.value = 'input2'
			newState.mixEffects.main.keyers.dsk2.input.temporalPriority = 1
			newState.mixEffects.main.keyers.dsk2.onAir.value = true
			newState.mixEffects.main.keyers.dsk2.onAir.temporalPriority = 0
			newState.mixEffects.v2.keyers.dsk2.input.value = 'input3'
			newState.mixEffects.v2.keyers.dsk2.input.temporalPriority = -1

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(3)
			expect(commands[0]).toMatchObject({
				command: { target: 'v2_dsk2', name: '_select_named_input', value: 'input3' },
				temporalPriority: -1,
			})
			expect(commands[1]).toMatchObject({
				command: { target: 'main_dsk2', name: '_value', value: 1 },
				temporalPriority: 0,
			})
			expect(commands[2]).toMatchObject({
				command: { target: 'main_dsk2', name: '_select_named_input', value: 'input2' },
				temporalPriority: 1,
			})
		})

		test('command are not generated if only the temporal priority has changed', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			// some example states
			oldState.mixEffects.main.keyers.dsk2.onAir.value = true
			oldState.mixEffects.main.keyers.dsk2.onAir.temporalPriority = 0
			oldState.mixEffects.main.keyers.dsk2.input.value = 'input1'
			oldState.mixEffects.main.keyers.dsk2.input.temporalPriority = 1

			newState.mixEffects.main.keyers.dsk2.onAir.value = true
			newState.mixEffects.main.keyers.dsk2.onAir.temporalPriority = 1
			newState.mixEffects.main.keyers.dsk2.input.value = 'input1'
			newState.mixEffects.main.keyers.dsk2.input.temporalPriority = 0

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(0)
		})
	})
})
