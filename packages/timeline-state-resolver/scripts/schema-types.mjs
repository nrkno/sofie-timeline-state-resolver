/* eslint-disable */
import { compile, compileFromFile } from 'json-schema-to-typescript'
import * as fs from 'fs/promises'
import * as path from 'path'
import $RefParser from 'json-schema-ref-parser'

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

/// This is where schemas will be stored after they have had their references resolved.
const DEREFERENCED_SCHEMA_DIRECTORY = '$schemas/generated'

let hadError = false

const capitalise = (s) => {
	if (!s) return s
	const base = s.slice(0, 1).toUpperCase() + s.slice(1)

	// replace `_a` with `A`
	return base.replace(/_[a-z]/gi, (v) => {
		return v.slice(1).toUpperCase()
	})
}

const PrettierConf = JSON.parse(
	await fs.readFile('../../node_modules/@sofie-automation/code-standard-preset/.prettierrc.json')
)

// convert action-schema
try {
	const actionSchemaDescr = JSON.parse(await fs.readFile('./src/$schemas/action-schema.json'))
	const actionSchema = await compile(actionSchemaDescr.properties.actions.items, 'TSRActionSchema', {
		enableConstEnums: false,
		additionalProperties: false,
		style: PrettierConf,
		bannerComment: '',
	})

	await fs.writeFile('../timeline-state-resolver-types/src/generated/action-schema.ts', BANNER + '\n' + actionSchema)
} catch (e) {
	console.error('Error while generating action-schema.json, continuing...')
	console.error(e)
	hadError = true
}

// convert generic PTZ actions
try {
	const actionsDescr = JSON.parse(await fs.readFile('./src/$schemas/generic-ptz-actions.json'))
	const actionDefinitions = []
	let output = ''
	for (const action of actionsDescr.actions) {
		let actionTypes = []
		const actionDefinition = {
			id: action.id,
			payloadId: undefined,
			resultId: undefined
		}
		actionDefinitions.push(actionDefinition)
		// Payload:
		if (action.payload) {
			actionDefinition.payloadId = action.payload.id || capitalise(action.id + 'Payload')
			actionTypes.push(await compile(action.payload, actionDefinition.payloadId, {
				additionalProperties: false,
				style: PrettierConf,
				bannerComment: '',
				enableConstEnums: false,
			}))
		}
		// Return Data:
		if (action.result) {
			actionDefinition.resultId = action.result.id || capitalise(action.id + 'Result')
			actionTypes.push(await compile(action.result, actionDefinition.resultId, {
				additionalProperties: false,
				style: PrettierConf,
				bannerComment: '',
				enableConstEnums: false,
			}))
		}
		output += '\n' + actionTypes.join('\n')
	}

	await fs.writeFile(
		'../timeline-state-resolver-types/src/generated/generic-ptz-actions.ts',
		BANNER + '\n' + output
	)
} catch (e) {
	console.error('Error while generating common-options.json, continuing...')
	console.error(e)
}

// convert common-options
try {
	const commonOptionsDescr = JSON.parse(await fs.readFile('./src/$schemas/common-options.json'))
	const commonOptionsSchema = await compile(commonOptionsDescr, 'DeviceCommonOptions', {
		additionalProperties: false,
		style: PrettierConf,
		bannerComment: '',
		enableConstEnums: false,
	})

	await fs.writeFile(
		'../timeline-state-resolver-types/src/generated/common-options.ts',
		BANNER + '\n' + commonOptionsSchema
	)
} catch (e) {
	console.error('Error while generating common-options.json, continuing...')
	console.error(e)
	hadError = true
}

const basePath = path.resolve('./src/integrations')
const basePathOfDereferencedShemas = path.resolve(`./src/${DEREFERENCED_SCHEMA_DIRECTORY}`)
const dirs = (await fs.readdir(basePath, { withFileTypes: true })).filter((c) => c.isDirectory() && !c.name.includes('__tests__')).map((d) => d.name)

// Create output folder for dereferenced schemas
try {
	await fs.mkdir(basePathOfDereferencedShemas, {
		recursive: true,
	})
} catch (e) {
	console.error('Error while creating directory for dereferenced schemas, continuing...')
	console.error(e)
	hadError = true
}

let indexFile = BANNER + `\nexport * from './action-schema'\nexport * from './generic-ptz-actions'`
let baseMappingsTypes = []

// iterate over integrations
for (const dir of dirs) {
	const dirPath = path.join(basePath, dir)

	const dirId = capitalise(dir)

	let output = ''

	const generatedSchemaDirectory = path.join(basePathOfDereferencedShemas, dir)
	try {
		await fs.mkdir(generatedSchemaDirectory, {
			recursive: true,
		})
	} catch (e) {
		console.error(`Error while dereferencing schemas for '${dir}', continuing...`)
		console.error(e)
		hadError = true
	}

	await derefSchema(dirPath, 'options', generatedSchemaDirectory)
	await derefSchema(dirPath, 'mappings', generatedSchemaDirectory)
	await derefSchema(dirPath, 'actions', generatedSchemaDirectory)

	// compile options from file
	try {
		const filePath = path.join(generatedSchemaDirectory, 'options.json')
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
		hadError = true
	}

	// compile mappings from file
	const mappingIds = []
	try {
		const filePath = path.join(generatedSchemaDirectory, 'mappings.json')
		if (await fsExists(filePath)) {
			const mappingDescr = JSON.parse(await fs.readFile(filePath))
			for (const [id, mapping] of Object.entries(mappingDescr.mappings)) {
				mappingIds.push(id)

				// Perform some tweaks of the schema for mappingType, which is required to be defined based on the id
				mapping.title = `Mapping${dirId}${capitalise(id)}`
				mapping.properties['mappingType'] = {
					type: 'constant',
					tsType: `Mapping${dirId}Type.${capitalise(id)}`,
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
		hadError = true
	}

	// very crude way to create an enum and union for the mappings:
	const mappingTypes = []
	if (mappingIds.length > 0) {
		let mappingsEnum = 'export enum Mapping' + dirId + 'Type {\n'
		for (const id of mappingIds) {
			mappingTypes.push(`Mapping${dirId}${capitalise(id)}`)
			mappingsEnum += '\t' + capitalise(id) + " = '" + id + "',\n"
		}
		mappingsEnum += '}\n'

		output += '\n' + mappingsEnum
	}

	const someMappingName = `SomeMapping${dirId}`
	baseMappingsTypes.push(someMappingName)
	output += '\n' + `export type ${someMappingName} = ${mappingTypes.join(' | ') || 'Record<string, never>'}\n`

	// compile actions from file
	const actionDefinitions = []

	try {
		const filePath = path.join(generatedSchemaDirectory, 'actions.json')
		if (await fsExists(filePath)) {
			const actionsDescr = JSON.parse(await fs.readFile(filePath))
			for (const action of actionsDescr.actions) {
				const actionDefinition = {
					id: action.id,
					payloadId: undefined,
					resultId: undefined
				}
				actionDefinitions.push(actionDefinition)
				if (action.generic) continue


				const actionTypes = []
				// Payload:
				if (action.payload) {
					actionDefinition.payloadId = action.payload.id || capitalise(action.id + 'Payload')
					actionTypes.push(await compile(action.payload, actionDefinition.payloadId, {
						additionalProperties: false,
						style: PrettierConf,
						bannerComment: '',
						enableConstEnums: false,
					}))
				}
				// Return Data:
				if (action.result) {
					actionDefinition.resultId = action.result.id || capitalise(action.id + 'Result')
					actionTypes.push(await compile(action.result, actionDefinition.resultId, {
						additionalProperties: false,
						style: PrettierConf,
						bannerComment: '',
						enableConstEnums: false,
					}))
				}

				if (actionTypes.length) {
					output += '\n' + actionTypes.join('\n')
				}
			}
		}
	} catch (e) {
		console.error('Error while generating actions for ' + dirPath + ', continuing...')
		console.error(e)
		hadError = true
	}

	if (actionDefinitions.length > 0) {
		// An enum for all action ids:

		output += `
export enum ${dirId}Actions {
${actionDefinitions.map(
			(actionDefinition) => `\t${capitalise(actionDefinition.id)} = '${actionDefinition.id}'`
		).join(',\n')}
}`
		// An interface for all the action methods:
		output += `
export interface ${dirId}ActionExecutionResults {
${actionDefinitions.map(
			(actionDefinition) => `\t${actionDefinition.id}: (${actionDefinition.payloadId ? `payload: ${actionDefinition.payloadId}` : ''}) => ${actionDefinition.resultId || 'void'}`
		).join(',\n')}
}`
		// Prepend import:
		output = 'import { ActionExecutionResult } from ".."\n' + output


		// A helper type used to access the action methods payload:
		output += `
export type ${dirId}ActionExecutionPayload<A extends keyof ${dirId}ActionExecutionResults> = Parameters<
	${dirId}ActionExecutionResults[A]
>[0]
`
		// A helper type used to access the action methods return Data:
		output += `
export type ${dirId}ActionExecutionResult<A extends keyof ${dirId}ActionExecutionResults> =
	ActionExecutionResult<ReturnType<${dirId}ActionExecutionResults[A]>>
`
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

// Finally
process.exit(hadError ? 1 : 0)

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

async function derefSchema(dirPath, schemaPath, outputDirectory) {
	try {
		// Check for schema files with references and write a flattened version for the manifest
		const filePath = path.join(dirPath, `$schemas/${schemaPath}.json`)
		if (await fsExists(filePath)) {
			const derefOptions = await $RefParser.dereference(filePath)
			await fs.writeFile(path.join(outputDirectory, `${schemaPath}.json`), JSON.stringify(derefOptions, undefined, 2))
		}
	} catch (e) {
		console.error(`Error while dereferencing ${schemaPath} for '${dir}', continuing...`)
		console.error(e)
	}
}
