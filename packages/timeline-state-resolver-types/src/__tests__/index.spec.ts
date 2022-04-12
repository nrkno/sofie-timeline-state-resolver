import * as TSR_types from '../index'

describe('index', () => {
	test('imports', () => {
		// Just verify the exports, to catch breaking changes in exports:
		const exports: string[] = Object.keys(TSR_types).sort((a, b) => {
			if (a > b) return 1
			if (a < b) return -1
			return 0
		})

		expect(exports).toMatchSnapshot()
	})
})
