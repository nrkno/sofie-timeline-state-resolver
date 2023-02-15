import { TriCasterStateDiffer } from '../triCasterStateDiffer'

function setupStateDiffer() {
	const stateDiffer = new TriCasterStateDiffer({
		inputCount: 8,
		meCount: 2,
		dskCount: 2,
		ddrCount: 2,
		productModel: 'TEST',
		sessionName: 'TEST',
		outputCount: 4,
	})
	return {
		stateDiffer,
		oldState: stateDiffer.getDefaultState(),
		newState: stateDiffer.getDefaultState(),
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
		test('issues auto transition when input changes and transition is not "cut"', () => {
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

		test('issues a take when program input changes and transition is "cut"', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			oldState.mixEffects.main.keyers.dsk2.input = 'input1'

			newState.mixEffects.main.keyers.dsk2.transitionEffect = 'cut'
			newState.mixEffects.main.keyers.dsk2.onAir = true
			newState.mixEffects.main.keyers.dsk2.input = 'input2'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(2)
			expect(commands[0].command).toEqual({ target: 'main_dsk2', name: '_select_named_input', value: 'input2' })
			expect(commands[1].command).toEqual({ target: 'main_dsk2', name: '_take' })
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

			newState.inputs.input5.videoActAsAlpha = true

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'input5', name: '_video_act_as_alpha', value: true })
		})

		test('sets video source', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.inputs.input5.videoSource = 'SOME-NETWORK-SOURCE (Output 1)'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({
				target: 'input5',
				name: '_video_source',
				value: 'SOME-NETWORK-SOURCE (Output 1)',
			})
		})
	})

	describe('Audio Channels', () => {
		test('unmutes', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.audioChannels.input5.isMuted = false

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'input5', name: '_mute', value: false })
		})

		test('sets volume', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.audioChannels.input5.volume = 5

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'input5', name: '_volume', value: 5 })
		})
	})

	describe('Outputs', () => {
		test('sets output source', () => {
			const { stateDiffer, oldState, newState } = setupStateDiffer()

			newState.outputs.mix3.source = 'me_preview'

			const commands = stateDiffer.getCommandsToAchieveState(newState, oldState)

			expect(commands.length).toEqual(1)
			expect(commands[0].command).toEqual({ target: 'mix3', name: '_output_source', value: 'me_preview' })
		})
	})
})
