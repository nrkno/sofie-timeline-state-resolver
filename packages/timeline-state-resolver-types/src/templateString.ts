/** This resolves to a string, where parts can be defined by the datastore */
export interface TemplateString {
	/** The string template. Example: "http://google.com?q={{searchString}}" */
	key: string
	/** Values for the arguments in the key string. Example: { searchString: "TSR" } */
	args?: {
		[k: string]: any
	}
}

/**
 * Interpolate a translation style string
 */
export function interpolateTemplateString(key: string, args: { [key: string]: any } | undefined): string {
	if (!args || typeof key !== 'string') {
		return String(key)
	}

	let interpolated = String(key)
	for (const placeholder of key.match(/[^{}]+(?=})/g) || []) {
		const value = args[placeholder] || placeholder
		interpolated = interpolated.replace(`{{${placeholder}}}`, value)
	}

	return interpolated
}

export function interpolateTemplateStringIfNeeded(str: string | TemplateString): string {
	if (typeof str === 'string') return str
	return interpolateTemplateString(str.key, str.args)
}
