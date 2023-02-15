import { TriCasterShortcutStateConverter } from '../triCasterShortcutStateConverter'

function setUpShortcutStateConverter() {
	return new TriCasterShortcutStateConverter(
		['main', 'v1', 'v2'],
		['input1', 'input2'],
		['input1', 'input2', 'sound', 'master'],
		['a', 'b'],
		['dsk1', 'dsk2', 'dsk3', 'dsk4'],
		['mix1', 'mix2']
	)
}

describe('TriCasterShortcutStateConverter.getTriCasterStateFromShortcutState', () => {
	describe('MixEffects', () => {
		test('sets inputs', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="main_a_row_named_input" value="INPUT7" type="" sender="unknown"/>
	<shortcut_state name="main_b_row_named_input" value="DDR2" type="" sender="unknown"/>
</shortcut_states>`)

			expect(state.mixEffects['main'].programInput).toEqual('input7')
			expect(state.mixEffects['main'].previewInput).toEqual('ddr2')
		})
	})

	describe('DSK', () => {
		test('sets onAir', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="main_dsk1_value" value="0" type="double" sender="unknown" />
	<shortcut_state name="main_dsk2_value" value="1" type="double" sender="unknown" />
	<shortcut_state name="main_dsk3_value" value="0.5" type="double" sender="unknown" />
	<shortcut_state name="main_dsk4_value" value="0" type="double" sender="unknown" />
</shortcut_states>`)

			expect(state.mixEffects.main.keyers?.dsk1.onAir).toEqual(false)
			expect(state.mixEffects.main.keyers?.dsk2.onAir).toEqual(true)
			expect(state.mixEffects.main.keyers?.dsk3.onAir).toEqual(true)
			expect(state.mixEffects.main.keyers?.dsk4.onAir).toEqual(false)
		})

		test('sets input', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="main_dsk3_select_named_input" value="v6" type="" sender="unknown"/>
</shortcut_states>`)

			expect(state.mixEffects.main.keyers?.dsk3.input).toEqual('v6')
		})
	})

	describe('Layer', () => {
		test('sets input', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="v2_a_row_named_input" value="v6" type="" sender="unknown"/>
</shortcut_states>`)

			expect(state.mixEffects.v2.layers?.a?.input).toEqual('v6')
		})
	})

	describe('Mix Outputs', () => {
		test('sets outputs', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="mix1_output_source" value="input7" type="" sender="unknown"/>
	<shortcut_state name="mix2_output_source" value="me_preview" type="" sender="unknown"/>
</shortcut_states>`)

			expect(state.outputs.mix1.source).toEqual('input7')
			expect(state.outputs.mix2.source).toEqual('me_preview')
		})
	})
})
