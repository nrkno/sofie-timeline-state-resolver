import { CommandName, serializeToWebSocketMessage } from '../triCasterCommands'

describe('serializeToWebSocketMessage', () => {
	test('serializes command with numberic value', () => {
		const message = serializeToWebSocketMessage({ name: CommandName.RECORD_TOGGLE, value: 1 })

		expect(message).toEqual('name=record_toggle&value=1')
	})

	test('serializes command with target', () => {
		const message = serializeToWebSocketMessage({ name: CommandName.TAKE, target: 'v1_dsk3' })

		expect(message).toEqual('name=v1_dsk3_take')
	})

	test('serializes command with value and target', () => {
		const message = serializeToWebSocketMessage({
			name: CommandName.ROW_NAMED_INPUT,
			target: 'main_a',
			value: 'input3',
		})

		expect(message).toEqual('name=main_a_row_named_input&value=input3')
	})

	test('order of properties does not affect the output', () => {
		const message = serializeToWebSocketMessage({
			value: 'input3',
			target: 'main_a',
			name: CommandName.ROW_NAMED_INPUT,
		})

		expect(message).toEqual('name=main_a_row_named_input&value=input3')
	})
})
