#!/usr/bin/env node

import * as fs from 'fs/promises'
import * as path from 'path'
import $RefParser from 'json-schema-ref-parser'
import meow from 'meow'

/** ********************************************************
 *
 * This script goes through the json-schemas of all devices (located under /$schemas )
 * and generates versions with flattened references.
 *
 ***********************************************************/

const cli = meow(
	`
	Tool to flatten references in json schemas

	Usage
		$ tsr-schema-deref <search-path> <output-path>

	Examples
		$ tsr-schema-deref ./src/integrations ./src/$schemas/generated
`,
	{
		importMeta: import.meta,
	}
)

const searchPath = cli.input[0]
const outputPath = cli.input[1]

if (!searchPath || !outputPath) {
	cli.showHelp()
	process.exit(1)
}

let hadError = false

const basePath = path.resolve(searchPath)
const basePathOfDereferencedShemas = path.resolve(outputPath)
const dirs = (await fs.readdir(basePath, { withFileTypes: true }))
	.filter((c) => c.isDirectory() && !c.name.includes('__tests__'))
	.map((d) => d.name)

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

// iterate over integrations
for (const dir of dirs) {
	const dirPath = path.join(basePath, dir)

	// Avoid deferencing recursively
	if (dirPath.startsWith(basePathOfDereferencedShemas)) continue

	const generatedSchemaDirectory = path.join(basePathOfDereferencedShemas, dir)

	try {
		await derefSchema(dirPath, 'options', generatedSchemaDirectory)
		await derefSchema(dirPath, 'mappings', generatedSchemaDirectory)
		await derefSchema(dirPath, 'actions', generatedSchemaDirectory)
	} catch (e) {
		console.error(`Error while dereferencing schemas for '${dir}', continuing...`)
		console.error(e)
		hadError = true
	}
}

// Finally
process.exit(hadError ? 1 : 0)

async function derefSchema(dirPath, schemaPath, outputDirectory) {
	try {
		// Check for schema files with references and write a flattened version for the manifest
		const filePath = path.join(dirPath, `$schemas/${schemaPath}.json`)
		if (await fsExists(filePath)) {
			const derefOptions = await $RefParser.dereference(filePath)
			await fs.mkdir(outputDirectory, { recursive: true })
			await fs.writeFile(path.join(outputDirectory, `${schemaPath}.json`), JSON.stringify(derefOptions, undefined, 2))
		}
	} catch (e) {
		console.error(`Error while dereferencing ${schemaPath} for '${dirPath}', continuing...`)
		console.error(e)
	}
}

async function fsExists(filePath) {
	try {
		await fs.access(filePath, fs.F_OK)
		return true
	} catch (e) {
		if (`${e}`.match(/ENOENT/)) return false
		throw e
	}
}
