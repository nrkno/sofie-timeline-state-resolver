import { BaseLexer } from 'i18next-parser'

export class JsonLexer extends BaseLexer {
	constructor(options = {}) {
		super(options)

		this.functions = options.functions || ['$t']
	}

	extract(content, filename) {
		let keys = []

		try {
			const obj = JSON.parse(content)

			if ('actions' in obj) {
				obj.actions.forEach((action) => {
					action.name && keys.push(action.name)
					if (action.payload && action.payload.type === 'object') {
						Object.values(action.payload.properties || {}).forEach((prop) => prop.title && keys.push(prop.title))
					}
				})
			}
		} catch (e) {
			console.error(`File "${filename}" contains invalid json`)
		}

		console.log(keys) // haha just figuring wtf is going on

		return keys.map((k) => ({ key: k }))
	}
}
