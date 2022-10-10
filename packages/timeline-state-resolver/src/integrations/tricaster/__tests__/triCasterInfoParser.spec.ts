import { TriCasterInfoParser } from '../triCasterInfoParser'

describe('TriCasterInfoParser', () => {
	test('parseSwitcher returns info', () => {
		const parser = new TriCasterInfoParser()

		const info = parser.parseSwitcherUpdate(MOCK_SWITCHER_UPDATE)

		expect(info).toEqual({
			inputCount: 30,
			dskCount: 3,
			meCount: 6,
			ddrCount: 3,
		})
	})

	test('parseProductInformation returns info', () => {
		const parser = new TriCasterInfoParser()

		const info = parser.parseProductInformation(MOCK_PRODUCT_INFORMATION)

		expect(info).toEqual({
			productModel: 'TC2ELITE',
			sessionName: 'TEST SESSION',
			outputCount: 8,
		})
	})
})

const MOCK_SWITCHER_UPDATE = `<switcher_update main_source="INPUT2" preview_source="INPUT9" effect="C:\\ProgramData\\NewTek\\Effects\\Transitions\\Fades\\Non Additive Fade.trans" iso_label="INPUT 9" button_label="9">
<tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
<switcher_overlays>
  <overlay z_order_position="0" source="DDR1" effect="" iso_label="DDR 1" button_label="DDR 1">
    <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
  </overlay>
  <overlay z_order_position="1" source="DDR2" effect="C:\\ProgramData\\NewTek\\Effects\\Overlays\\Pinwheel\\Hard\\Pwheel 2blde V(H).ofx" iso_label="DDR 2" button_label="DDR 2">
    <tbar position="1" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
  </overlay>
  <overlay z_order_position="2" source="INPUT24" effect="" iso_label="INPUT 24" button_label="24">
    <tbar position="0" speed="0" current_speed="2" slow_speed="2" medium_speed="1" fast_speed="0.5" />
  </overlay>
  <overlay z_order_position="4" source="">
    <tbar position="0" speed="0" />
  </overlay>
</switcher_overlays>
<inputs>
  <physical_input physical_input_number="Input1" iso_label="KAM 1" button_label="1">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input2" iso_label="INPUT 2" button_label="2">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input3" iso_label="INPUT 3" button_label="3">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input4" iso_label="INPUT 4" button_label="4">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input5" iso_label="INPUT 5" button_label="5">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input6" iso_label="INPUT 6" button_label="6">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input7" iso_label="INPUT 7" button_label="7">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input8" iso_label="INPUT 8" button_label="8">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input9" iso_label="INPUT 9" button_label="9">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input10" iso_label="INPUT 10" button_label="10">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input11" iso_label="INPUT 11" button_label="11">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input12" iso_label="INPUT 12" button_label="12">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input13" iso_label="INPUT 13" button_label="13">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input14" iso_label="INPUT 14" button_label="14">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input15" iso_label="INPUT 15" button_label="15">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input16" iso_label="INPUT 16" button_label="16">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input17" iso_label="INPUT 17" button_label="17">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input18" iso_label="INPUT 18" button_label="18">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input19" iso_label="INPUT 19" button_label="19">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input20" iso_label="INPUT 20" button_label="20">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input21" iso_label="INPUT 21" button_label="21">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input22" iso_label="INPUT 22" button_label="22">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input23" iso_label="INPUT 23" button_label="23">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input24" iso_label="INPUT 24" button_label="24">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input25" iso_label="INPUT 25" button_label="25">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input26" iso_label="INPUT 26" button_label="26">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input27" iso_label="INPUT 27" button_label="27">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input28" iso_label="INPUT 28" button_label="28">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input29" iso_label="INPUT 29" button_label="29">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="Input30" iso_label="INPUT 30" button_label="30">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="BFR1" iso_label="BUFFER 1" button_label="BFR 1">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="BFR2" iso_label="BUFFER 2" button_label="BFR 2">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="BFR3" iso_label="BUFFER 3" button_label="BFR 3">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="BFR4" iso_label="BUFFER 4" button_label="BFR 4">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="BFR5" iso_label="BUFFER 5" button_label="BFR 5">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="BFR6" iso_label="BUFFER 6" button_label="BFR 6">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="BFR7" iso_label="BUFFER 7" button_label="BFR 7">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="BFR8" iso_label="BUFFER 8" button_label="BFR 8">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="BFR9" iso_label="BUFFER 9" button_label="BFR 9">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="BFR10" iso_label="BUFFER 10" button_label="BFR 10">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="BFR11" iso_label="BUFFER 11" button_label="BFR 11">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="BFR12" iso_label="BUFFER 12" button_label="BFR 12">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="BFR13" iso_label="BUFFER 13" button_label="BFR 13">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="BFR14" iso_label="BUFFER 14" button_label="BFR 14">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="BFR15" iso_label="BUFFER 15" button_label="BFR 15">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="DDR1_A" iso_label="DDR 1_A" button_label="DDR 1 A">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="DDR1_B" iso_label="DDR 1_B" button_label="DDR 1 B">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="DDR2_A" iso_label="DDR 2_A" button_label="DDR 2 A">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="DDR2_B" iso_label="DDR 2_B" button_label="DDR 2 B">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="DDR3_A" iso_label="DDR 3_A" button_label="DDR 3 A">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="DDR3_B" iso_label="DDR 3_B" button_label="DDR 3 B">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="DDR4_A" iso_label="DDR 4_A" button_label="DDR 4 A">
    <playback speed="0" position="0" />
  </physical_input>
  <physical_input physical_input_number="DDR4_B" iso_label="DDR 4_B" button_label="DDR 4 B">
    <playback speed="0" position="0" />
  </physical_input>
  <simulated_input simulated_input_number="DDR1" effect=" ">
    <source_a a="47" />
    <source_b b="48" />
    <source_c c="v2" />
    <source_d d="v3" />
    <overlay z_order_position="0" source="DDR1" iso_label="DDR 1" button_label="DDR 1">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="1" source="DDR2" iso_label="DDR 2" button_label="DDR 2">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="2" source="BFR1" iso_label="BUFFER 1" button_label="BFR 1">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="3" source="BFR2" iso_label="BUFFER 2" button_label="BFR 2">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="4" source="">
      <tbar position="0" speed="0" />
    </overlay>
    <tbar position="0" speed="0" />
  </simulated_input>
  <simulated_input simulated_input_number="DDR2" effect=" ">
    <source_a a="49" />
    <source_b b="50" />
    <source_c c="v2" />
    <source_d d="v3" />
    <overlay z_order_position="0" source="DDR1" iso_label="DDR 1" button_label="DDR 1">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="1" source="DDR2" iso_label="DDR 2" button_label="DDR 2">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="2" source="BFR1" iso_label="BUFFER 1" button_label="BFR 1">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="3" source="BFR2" iso_label="BUFFER 2" button_label="BFR 2">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="4" source="">
      <tbar position="0" speed="0" />
    </overlay>
    <tbar position="0" speed="0" />
  </simulated_input>
  <simulated_input simulated_input_number="DDR3" effect=" ">
    <source_a a="51" />
    <source_b b="52" />
    <source_c c="v2" />
    <source_d d="v3" />
    <overlay z_order_position="0" source="DDR1" iso_label="DDR 1" button_label="DDR 1">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="1" source="DDR2" iso_label="DDR 2" button_label="DDR 2">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="2" source="BFR1" iso_label="BUFFER 1" button_label="BFR 1">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="3" source="BFR2" iso_label="BUFFER 2" button_label="BFR 2">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="4" source="">
      <tbar position="0" speed="0" />
    </overlay>
    <tbar position="0" speed="0" />
  </simulated_input>
  <simulated_input simulated_input_number="V1" effect="C:\\ProgramData\\NewTek\\Effects\\Transitions\\Fades\\Clouds.trans">
    <source_a a="v0" />
    <source_b b="v3" />
    <source_c c="v2" />
    <source_d d="v3" />
    <overlay z_order_position="0" source="DDR3" effect="" iso_label="DDR 3" button_label="DDR 3">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="1" source="DDR2" effect="" iso_label="DDR 2" button_label="DDR 2">
      <tbar position="0" speed="0" current_speed="2" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="2" source="BFR1" effect="" iso_label="BUFFER 1" button_label="BFR 1">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="3" source="BFR2" effect="" iso_label="BUFFER 2" button_label="BFR 2">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="4" source="">
      <tbar position="0" speed="0" />
    </overlay>
    <tbar position="0" speed="0" current_speed="2" slow_speed="2" medium_speed="1" fast_speed="0.5" />
  </simulated_input>
  <simulated_input simulated_input_number="V2" effect="">
    <source_a a="v0" />
    <source_b b="v1" />
    <source_c c="v2" />
    <source_d d="v3" />
    <overlay z_order_position="0" source="DDR1" effect="" iso_label="DDR 1" button_label="DDR 1">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="1" source="DDR2" effect="" iso_label="DDR 2" button_label="DDR 2">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="2" source="BFR1" effect="" iso_label="BUFFER 1" button_label="BFR 1">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="3" source="BFR2" effect="" iso_label="BUFFER 2" button_label="BFR 2">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="4" source="">
      <tbar position="0" speed="0" />
    </overlay>
    <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
  </simulated_input>
  <simulated_input simulated_input_number="V3" effect="">
    <source_a a="v0" />
    <source_b b="v1" />
    <source_c c="v2" />
    <source_d d="v3" />
    <overlay z_order_position="0" source="DDR1" effect="" iso_label="DDR 1" button_label="DDR 1">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="1" source="DDR2" effect="" iso_label="DDR 2" button_label="DDR 2">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="2" source="BFR1" effect="" iso_label="BUFFER 1" button_label="BFR 1">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="3" source="BFR2" effect="" iso_label="BUFFER 2" button_label="BFR 2">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="4" source="">
      <tbar position="0" speed="0" />
    </overlay>
    <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
  </simulated_input>
  <simulated_input simulated_input_number="V4" effect="">
    <source_a a="v0" />
    <source_b b="v1" />
    <source_c c="v2" />
    <source_d d="v3" />
    <overlay z_order_position="0" source="DDR1" effect="" iso_label="DDR 1" button_label="DDR 1">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="1" source="DDR2" effect="" iso_label="DDR 2" button_label="DDR 2">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="2" source="BFR1" effect="" iso_label="BUFFER 1" button_label="BFR 1">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="3" source="BFR2" effect="" iso_label="BUFFER 2" button_label="BFR 2">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="4" source="">
      <tbar position="0" speed="0" />
    </overlay>
    <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
  </simulated_input>
  <simulated_input simulated_input_number="V5" effect="">
    <source_a a="v0" />
    <source_b b="v1" />
    <source_c c="v2" />
    <source_d d="v3" />
    <overlay z_order_position="0" source="DDR1" effect="" iso_label="DDR 1" button_label="DDR 1">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="1" source="DDR2" effect="" iso_label="DDR 2" button_label="DDR 2">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="2" source="BFR1" effect="" iso_label="BUFFER 1" button_label="BFR 1">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="3" source="BFR2" effect="" iso_label="BUFFER 2" button_label="BFR 2">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="4" source="">
      <tbar position="0" speed="0" />
    </overlay>
    <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
  </simulated_input>
  <simulated_input simulated_input_number="V6" effect="">
    <source_a a="v0" />
    <source_b b="v1" />
    <source_c c="v2" />
    <source_d d="v3" />
    <overlay z_order_position="0" source="DDR1" effect="" iso_label="DDR 1" button_label="DDR 1">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="1" source="DDR2" effect="" iso_label="DDR 2" button_label="DDR 2">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="2" source="BFR1" effect="" iso_label="BUFFER 1" button_label="BFR 1">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="3" source="BFR2" effect="" iso_label="BUFFER 2" button_label="BFR 2">
      <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
    </overlay>
    <overlay z_order_position="4" source="">
      <tbar position="0" speed="0" />
    </overlay>
    <tbar position="0" speed="0" current_speed="1" slow_speed="2" medium_speed="1" fast_speed="0.5" />
  </simulated_input>
  <simulated_input simulated_input_number="preview" effect=" ">
    <source_a a="8" />
    <source_b b="1" />
    <source_c c="v2" />
    <source_d d="v3" />
    <overlay z_order_position="0" source="DDR1" iso_label="DDR 1" button_label="DDR 1">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="1" source="DDR2" iso_label="DDR 2" button_label="DDR 2">
      <tbar position="1" speed="0" />
    </overlay>
    <overlay z_order_position="2" source="INPUT24" iso_label="INPUT 24" button_label="24">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="3" source="INPUT3" iso_label="INPUT 3" button_label="3">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="4" source="">
      <tbar position="0" speed="0" />
    </overlay>
    <tbar position="0" speed="0" />
  </simulated_input>
  <simulated_input simulated_input_number="me_preview" effect=" ">
    <source_a a="v3" />
    <source_b b="v0" />
    <source_c c="v2" />
    <source_d d="v3" />
    <overlay z_order_position="0" source="DDR3" iso_label="DDR 3" button_label="DDR 3">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="1" source="DDR2" iso_label="DDR 2" button_label="DDR 2">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="2" source="BFR1" iso_label="BUFFER 1" button_label="BFR 1">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="3" source="BFR2" iso_label="BUFFER 2" button_label="BFR 2">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="4" source="">
      <tbar position="0" speed="0" />
    </overlay>
    <tbar position="0" speed="0" />
  </simulated_input>
  <simulated_input simulated_input_number="me_follow" effect=" ">
    <source_a a="v4" />
    <source_b b="v1" />
    <source_c c="v2" />
    <source_d d="v3" />
    <overlay z_order_position="0" source="DDR1" iso_label="DDR 1" button_label="DDR 1">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="1" source="DDR2" iso_label="DDR 2" button_label="DDR 2">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="2" source="BFR1" iso_label="BUFFER 1" button_label="BFR 1">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="3" source="BFR2" iso_label="BUFFER 2" button_label="BFR 2">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="4" source="">
      <tbar position="0" speed="0" />
    </overlay>
    <tbar position="0" speed="0" />
  </simulated_input>
  <simulated_input simulated_input_number="previz" effect=" ">
    <source_a a="v0" />
    <source_b b="v1" />
    <source_c c="v2" />
    <source_d d="v3" />
    <overlay z_order_position="0" source="DDR1" iso_label="DDR 1" button_label="DDR 1">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="1" source="DDR2" iso_label="DDR 2" button_label="DDR 2">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="2" source="BFR1" iso_label="BUFFER 1" button_label="BFR 1">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="3" source="BFR2" iso_label="BUFFER 2" button_label="BFR 2">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="4" source="">
      <tbar position="0" speed="0" />
    </overlay>
    <tbar position="0" speed="0" />
  </simulated_input>
  <simulated_input simulated_input_number="web_follow" effect=" ">
    <source_a a="v4" />
    <source_b b="-1" />
    <source_c c="-1" />
    <source_d d="-1" />
    <overlay z_order_position="0" source="Black" iso_label="BLACK" button_label="BLACK">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="1" source="Black" iso_label="BLACK" button_label="BLACK">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="2" source="Black" iso_label="BLACK" button_label="BLACK">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="3" source="Black" iso_label="BLACK" button_label="BLACK">
      <tbar position="0" speed="0" />
    </overlay>
    <overlay z_order_position="4" source="">
      <tbar position="0" speed="0" />
    </overlay>
    <tbar position="0" speed="0" />
  </simulated_input>
</inputs>
</switcher_update>`

const MOCK_PRODUCT_INFORMATION = `<product_information>
    <product_model>TC2ELITE</product_model>
    <product_name>TriCaster 2 Elite</product_name>
    <product_version>7-9</product_version>
    <product_id>MOCK-PRODUCT-ID</product_id>
    <product_serial_no>MOCK-SERIAL-NUMBER</product_serial_no>
    <product_build_no>7-9-220826</product_build_no>
    <machine_name>TRICASTER-2-ELITE</machine_name>
    <session_x_resolution>1920</session_x_resolution>
    <session_y_resolution>1080</session_y_resolution>
    <session_fielded>true</session_fielded>
    <session_frame_rate>25.000000</session_frame_rate>
    <session_aspect_ratio>1.777778</session_aspect_ratio>
    <session_color_format>CCIR709</session_color_format>
    <session_color_coding>PAL</session_color_coding>
    <session_name>TEST SESSION</session_name>
    <output_count>8</output_count>
</product_information>

`
