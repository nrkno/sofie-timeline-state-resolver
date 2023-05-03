import { JsonLexer } from './jsonLexer.mjs'
const locales = ['en', 'nb', 'nn', 'sv']
export const translationsPath = 'locales/$LOCALE/$NAMESPACE'
export const conversionOptions = {
	gettextDefaultCharset: 'UTF-8',
	splitNewLine: true,
	ignorePlurals: true,
}
export const extractOptions = {
	useKeysAsDefaultValue: false,
	sort: true,
	namespaceSeparator: false,
	keySeparator: false,
	defaultValue: '',
	keepRemoved: false,
	locales,
	output: translationsPath,
	lexers: {
		ts: [
			{
				lexer: 'JavascriptLexer',
				functions: ['t', 'generateTranslation'], // Array of functions to match
			},
		],
		json: [
			{
				lexer: JsonLexer,
				customOption: true,
			},
		],
	},
}
