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

		test.skip('sets cut transition', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="main_select_fade" value="false" type="bool" sender="unknown"/>
	<shortcut_state name="main_dsk1_select_index" value="0" type="int" sender="unknown" />
	<shortcut_state name="main_dsk1_speed" value="0" type="double" sender="unknown" />
</shortcut_states>`)

			expect(state.mixEffects['main'].keyers?.['dsk1'].transition).toEqual({
				effect: 'cut',
				duration: 0,
			})
		})

		test.skip('sets fade transition', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="main_dsk1_select_fade" value="true" type="bool" sender="unknown"/>
	<shortcut_state name="main_dsk1_select_index" value="0" type="int" sender="unknown" />
	<shortcut_state name="main_dsk1_speed" value="2.6" type="double" sender="unknown" />
</shortcut_states>`)

			expect(state.mixEffects['main'].keyers?.['dsk1'].transition).toEqual({
				effect: 'fade',
				duration: 2.6, // 2:15 in seconds:frames
			})
		})

		test.skip('sets numeric transition', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="main_dsk1_select_fade" value="false" type="bool" sender="unknown"/>
	<shortcut_state name="main_dsk1_select_index" value="5" type="int" sender="unknown" />
	<shortcut_state name="main_dsk1_speed" value="1.3" type="double" sender="unknown" />
</shortcut_states>`)

			expect(state.mixEffects['main'].keyers?.['dsk1'].transition).toEqual({
				effect: 5,
				duration: 1.3,
			})
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

		test.skip('sets cut transition', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="main_dsk1_select_fade" value="false" type="bool" sender="unknown"/>
	<shortcut_state name="main_dsk1_select_index" value="0" type="int" sender="unknown" />
	<shortcut_state name="main_dsk1_speed" value="0" type="double" sender="unknown" />
</shortcut_states>`)

			expect(state.mixEffects['main'].keyers?.['dsk1'].transition).toEqual({
				effect: 'cut',
				duration: 0,
			})
		})

		test.skip('sets fade transition', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="main_dsk1_select_fade" value="true" type="bool" sender="unknown"/>
	<shortcut_state name="main_dsk1_select_index" value="0" type="int" sender="unknown" />
	<shortcut_state name="main_dsk1_speed" value="2.6" type="double" sender="unknown" />
</shortcut_states>`)

			expect(state.mixEffects['main'].keyers?.['dsk1'].transition).toEqual({
				effect: 'fade',
				duration: 2.6, // 2:15 in seconds:frames
			})
		})

		test.skip('sets numeric transition', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="main_dsk1_select_fade" value="false" type="bool" sender="unknown"/>
	<shortcut_state name="main_dsk1_select_index" value="5" type="int" sender="unknown" />
	<shortcut_state name="main_dsk1_speed" value="1.3" type="double" sender="unknown" />
</shortcut_states>`)

			expect(state.mixEffects['main'].keyers?.['dsk1'].transition).toEqual({
				effect: 5,
				duration: 1.3,
			})
		})

		test('sets input', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="main_dsk3_select_named_input" value="v6" type="" sender="unknown"/>
</shortcut_states>`)

			expect(state.mixEffects.main.keyers?.dsk3.input).toEqual('v6')
		})

		test.skip('sets position', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="main_dsk3_position_x" value="1.25" type="double" sender="unknown"/>
	<shortcut_state name="main_dsk3_position_y" value="-3.12" type="double" sender="unknown"/>
</shortcut_states>`)

			expect(state.mixEffects['main'].keyers?.['dsk3'].position?.x).toBeCloseTo(1.25)
			expect(state.mixEffects['main'].keyers?.['dsk3'].position?.x).toBeCloseTo(-3.12)
		})

		test.skip('sets crop', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="main_dsk2_crop_down_value" value="14.6666666666667" type="double" sender="unknown"/>
	<shortcut_state name="main_dsk2_crop_left_value" value="29" type="double" sender="unknown"/>
	<shortcut_state name="main_dsk2_crop_right_value" value="0.333333333333333" type="double" sender="unknown"/>
	<shortcut_state name="main_dsk2_crop_up_value" value="3.33333333333333" type="double" sender="unknown"/>
</shortcut_states>`)

			const dsk2 = state.mixEffects['main'].keyers?.['dsk2']

			expect(dsk2?.crop?.down).toBeCloseTo(14.6666666666667)
			expect(dsk2?.crop?.left).toBeCloseTo(29)
			expect(dsk2?.crop?.right).toBeCloseTo(0.333333333333333)
			expect(dsk2?.crop?.up).toBeCloseTo(3.33333333333333)
		})

		test.skip('sets rotation', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="main_dsk2_rotation_x" value="559.685555555" type="double" sender="unknown"/>
	<shortcut_state name="main_dsk2_rotation_y" value="362.1" type="double" sender="unknown"/>
	<shortcut_state name="main_dsk2_rotation_z" value="-200" type="double" sender="unknown"/>
</shortcut_states>`)

			const dsk2 = state.mixEffects['main'].keyers?.['dsk2']

			expect(dsk2?.rotation?.x).toBeCloseTo(559.685555555)
			expect(dsk2?.rotation?.y).toBeCloseTo(362.1)
			expect(dsk2?.rotation?.z).toBeCloseTo(-2000)
		})

		test.skip('sets feather', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="main_dsk2_feather_value" value="75" type="double" sender="unknown"/>
</shortcut_states>`)

			expect(state.mixEffects['main'].keyers?.['dsk2'].feather).toBeCloseTo(75)
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

		test.skip('sets position', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="v2_a_position_x" value="1.25" type="double" sender="unknown"/>
	<shortcut_state name="v2_a_position_y" value="-3.12" type="double" sender="unknown"/>
</shortcut_states>`)

			const layerA = state.mixEffects.v2.layers?.a

			expect(layerA?.position?.x).toBeCloseTo(1.25)
			expect(layerA?.position?.x).toBeCloseTo(-3.12)
		})

		test.skip('sets crop', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="v2_a_crop_down_value" value="14.6666666666667" type="double" sender="unknown"/>
	<shortcut_state name="v2_a_crop_left_value" value="29" type="double" sender="unknown"/>
	<shortcut_state name="v2_a_crop_right_value" value="0.333333333333333" type="double" sender="unknown"/>
	<shortcut_state name="v2_a_crop_up_value" value="3.33333333333333" type="double" sender="unknown"/>
</shortcut_states>`)

			const layerA = state.mixEffects.v2.layers?.a

			expect(layerA?.crop?.down).toBeCloseTo(14.6666666666667)
			expect(layerA?.crop?.left).toBeCloseTo(29)
			expect(layerA?.crop?.right).toBeCloseTo(0.333333333333333)
			expect(layerA?.crop?.up).toBeCloseTo(3.33333333333333)
		})

		test.skip('sets rotation', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="v2_a_rotation_x" value="559.685555555" type="double" sender="unknown"/>
	<shortcut_state name="v2_a_rotation_y" value="362.1" type="double" sender="unknown"/>
	<shortcut_state name="v2_a_rotation_z" value="-200" type="double" sender="unknown"/>
</shortcut_states>`)

			const layerA = state.mixEffects.v2.layers?.a

			expect(layerA?.rotation?.x).toBeCloseTo(559.685555555)
			expect(layerA?.rotation?.y).toBeCloseTo(362.1)
			expect(layerA?.rotation?.z).toBeCloseTo(-2000)
		})

		test.skip('sets feather', () => {
			const converter = setUpShortcutStateConverter()

			const state = converter.getTriCasterStateFromShortcutState(`<shortcut_states>
	<shortcut_state name="v2_a_feather_value" value="75" type="double" sender="unknown"/>
</shortcut_states>`)

			expect(state.mixEffects.v2.layers?.a?.feather).toBeCloseTo(75)
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
