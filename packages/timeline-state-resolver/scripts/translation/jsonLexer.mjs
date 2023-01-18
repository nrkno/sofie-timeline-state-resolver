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

			// The root could be an object in places without a meta-schema (eg options)
			processObject(keys, obj)

			// actions are nested
			if ('actions' in obj) {
				obj.actions.forEach((action) => {
					action.name && keys.push(action.name)
					processObject(keys, action.payload)
				})
			}

			// mappings are nested
			if ('mappings' in obj) {
				Object.values(obj.mappings).forEach((mapping) => {
					processObject(keys, mapping)
				})
			}
		} catch (e) {
			console.error(`File "${filename}" contains invalid json`)
		}

		// console.log(filename, keys) // haha just figuring wtf is going on

		return keys.map((k) => ({ key: k }))
	}
}

function processObject(keys, obj) {
	if (obj && obj.type === 'object') {
		for (const prop of Object.values(obj.properties || {})) {
			if (prop['ui:title']) keys.push(prop['ui:title'])
			if (prop['ui:summaryTitle']) keys.push(prop['ui:summaryTitle'])
			if (prop['ui:description']) keys.push(prop['ui:description'])

			processObject(prop)
		}
	}
}
