/* eslint-disable */
import { compile, compileFromFile } from 'json-schema-to-typescript'
import * as fs from 'fs/promises'
import * as path from 'path'

/** ********************************************************
 *
 * This script goes through the json-schemas of all devices (located under /$schemas )
 * and auto-generates types for those schemas
 *
 * @todo: auto generate the interfaces.ts in /src as well
 *
 ***********************************************************/
const BANNER =
	'/* eslint-disable */\n/**\n * This file was automatically generated by json-schema-to-typescript.\n * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,\n * and run "yarn generate-schema-types" to regenerate this file.\n */\n'

const PrettierConf = JSON.parse(
	await fs.readFile('../../node_modules/@sofie-automation/code-standard-preset/.prettierrc.json')
)

// convert action-schema
try {
	const actionSchemaDescr = JSON.parse(await fs.readFile('./src/$schemas/action-schema.json'))
	const actionSchema = await compile(actionSchemaDescr.properties.actions.items, 'TSRActionSchema', {
		additionalProperties: false,
		style: PrettierConf,
		bannerComment: '',
	})

	await fs.writeFile('../timeline-state-resolver-types/src/generated/action-schema.ts', BANNER + '\n' + actionSchema)
} catch (e) {
	console.error('Error while generating action-schema.json, continuing...')
	console.error(e)
}

// convert common-options
try {
	const commonOptionsDescr = JSON.parse(await fs.readFile('./src/$schemas/common-options.json'))
	const commonOptionsSchema = await compile(commonOptionsDescr, 'DeviceCommonOptions', {
		additionalProperties: false,
		style: PrettierConf,
		bannerComment: '',
	})

	await fs.writeFile(
		'../timeline-state-resolver-types/src/generated/common-options.ts',
		BANNER + '\n' + commonOptionsSchema
	)
} catch (e) {
	console.error('Error while generating common-options.json, continuing...')
	console.error(e)
}

const basePath = path.resolve('./src/integrations/')
const dirs = (await fs.readdir(basePath, { withFileTypes: true })).filter((c) => c.isDirectory()).map((d) => d.name)

const capitalise = (s) => {
	const base = s.slice(0, 1).toUpperCase() + s.slice(1)

	// replace `_a` with `A`
	return base.replace(/_[a-z]/gi, (v) => {
		return v.slice(1).toUpperCase()
	})
}

let indexFile = BANNER + `\nexport * from './action-schema'`
let baseMappingsTypes = []

// iterate over integrations
for (const dir of dirs) {
	const dirPath = path.join(basePath, dir)

	let output = ''

	// compile options from file
	try {
		const filePath = path.join(dirPath, '$schemas/options.json')
		if (await fsExists(filePath)) {
			const options = await compileFromFile(filePath, {
				additionalProperties: false,
				style: PrettierConf,
				bannerComment: '',
				enableConstEnums: false,
			})
			output += '\n' + options
		}
	} catch (e) {
		console.error('Error while generating options for ' + dirPath + ', continuing...')
		console.error(e)
	}

	// compile mappings from file
	const mappingIds = []
	try {
		const filePath = path.join(dirPath, '$schemas/mappings.json')
		if (await fsExists(filePath)) {
			const mappingDescr = JSON.parse(await fs.readFile(filePath))
			for (const [id, mapping] of Object.entries(mappingDescr.mappings)) {
				mappingIds.push(id)

				// Perform some tweaks of the schema for mappingType, which is required to be defined based on the id
				mapping.title = `Mapping${capitalise(dir)}${capitalise(id)}`
				mapping.properties['mappingType'] = {
					type: 'constant',
					tsType: `Mapping${capitalise(dir)}Type.${capitalise(id)}`,
				}

				if (!mapping.required) mapping.required = []
				if (!mapping.required.includes('mappingType')) mapping.required.push('mappingType')

				const mappingTypes = await compile(mapping, id + 'Mapping', {
					additionalProperties: false,
					style: PrettierConf,
					bannerComment: '',
					enableConstEnums: false,
				})
				output += '\n' + mappingTypes
			}
		}
	} catch (e) {
		console.error('Error while generating mappings for ' + dirPath + ', continuing...')
		console.error(e)
	}

	// very crude way to create an enum and union for the mappings:
	const mappingTypes = []
	if (mappingIds.length > 0) {
		let mappingsEnum = 'export enum Mapping' + capitalise(dir) + 'Type {\n'
		for (const id of mappingIds) {
			mappingTypes.push(`Mapping${capitalise(dir)}${capitalise(id)}`)
			mappingsEnum += '\t' + capitalise(id) + " = '" + id + "',\n"
		}
		mappingsEnum += '}\n'

		output += '\n' + mappingsEnum
	}

	const someMappingName = `SomeMapping${capitalise(dir)}`
	baseMappingsTypes.push(someMappingName)
	output += '\n' + `export type ${someMappingName} = ${mappingTypes.join(' | ') || 'Record<string, never>'}\n`

	// compile actions from file
	const actionIds = []
	try {
		const filePath = path.join(dirPath, '$schemas/actions.json')
		if (await fsExists(filePath)) {
			const actionsDescr = JSON.parse(await fs.readFile(filePath))
			for (const action of actionsDescr.actions) {
				actionIds.push(action.id)
				if (!action.payload) continue

				const actionTypes = await compile(action.payload, action.id + 'Payload', {
					additionalProperties: false,
					style: PrettierConf,
					bannerComment: '',
				})
				output += '\n' + actionTypes
			}
		}
	} catch (e) {
		console.error('Error while generating actions for ' + dirPath + ', continuing...')
		console.error(e)
	}

	// very crude way to create an enum for the actionIds:
	if (actionIds.length > 0) {
		let actionEnum = 'export enum ' + capitalise(dir) + 'Actions {\n'
		for (const id of actionIds) {
			actionEnum += '\t' + capitalise(id) + " = '" + id + "',\n"
		}
		actionEnum += '}\n'

		output += '\n' + actionEnum
	}

	// Output to tsr types package
	const outputFilePath = path.join('../timeline-state-resolver-types/src/generated', dir + '.ts')
	if (output) {
		output = BANNER + output

		await fs.writeFile(outputFilePath, output)

		indexFile += `\nexport * from './${dir}'`
		indexFile += `\nimport { ${someMappingName} } from './${dir}'`
		indexFile += '\n'
	} else {
		if (await fsUnlink(outputFilePath)) console.log('Removed ' + outputFilePath)
	}
}

if (baseMappingsTypes.length) {
	indexFile += `\nexport type TSRMappingOptions =\n\t| ${baseMappingsTypes.join('\n\t| ')}`
}

// Output the tsr-types index file
await fs.writeFile('../timeline-state-resolver-types/src/generated/index.ts', indexFile + '\n')

async function fsExists(filePath) {
	try {
		await fs.access(filePath, fs.F_OK)
		return true
	} catch (e) {
		if (`${e}`.match(/ENOENT/)) return false
		throw e
	}
}
async function fsUnlink(filePath) {
	try {
		await fs.unlink(filePath)
		return true
	} catch (e) {
		if (`${e}`.match(/ENOENT/)) return false // File doesn't exist, that's okay
		throw e
	}
}
