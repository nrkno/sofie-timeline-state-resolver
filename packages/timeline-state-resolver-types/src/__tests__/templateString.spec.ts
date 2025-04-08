import { interpolateTemplateString, interpolateTemplateStringIfNeeded } from '../templateString'

describe('interpolateTemplateString', () => {
	test('basic input', () => {
		expect(interpolateTemplateString('Hello there {{name}}', { name: 'Bob' })).toEqual('Hello there Bob')
	})

	test('missing arg', () => {
		expect(interpolateTemplateString('Hello there {{name}}', {})).toEqual('Hello there name')
	})

	test('repeated arg', () => {
		expect(interpolateTemplateString('Hello there {{name}} {{name}} {{name}}', { name: 'Bob' })).toEqual(
			'Hello there Bob Bob Bob'
		)
	})
})

describe('interpolateTemplateStringIfNeeded', () => {
	test('string input', () => {
		const input = 'Hello there'

		expect(interpolateTemplateStringIfNeeded(input)).toEqual(input)
	})

	test('object input', () => {
		expect(
			interpolateTemplateStringIfNeeded({
				key: 'Hello there {{name}}',
				args: { name: 'Bob' },
			})
		).toEqual('Hello there Bob')
	})
})
