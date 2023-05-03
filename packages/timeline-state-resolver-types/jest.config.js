module.exports = {
	moduleFileExtensions: ['ts', 'js'],
	transform: {
		'^.+\\.(ts|tsx)$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.json',
			},
		],
	},
	testMatch: ['**/__tests__/**/*.spec.(ts|js)'],
	testPathIgnorePatterns: ['integrationTests'],
	testEnvironment: 'node',
	coverageThreshold: {
		global: {
			branches: 0,
			functions: 0,
			lines: 0,
			statements: 0,
		},
	},
	collectCoverageFrom: [
		'**/src/**/*.{ts,js}',
		'!**/node_modules/**',
		'!**/__tests__/**',
		'!**/__mocks__/**',
		'!**/dist/**',
	],
	coverageDirectory: './coverage/',
	collectCoverage: true,
}
