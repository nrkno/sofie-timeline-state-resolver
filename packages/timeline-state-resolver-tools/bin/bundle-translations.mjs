#!/usr/bin/env node

import { getTranslations } from '../lib/translation/bundle.mjs'
import { writeFile } from 'fs/promises'
import meow from 'meow'

const cli = meow(
	`
	Tool to bundle already extracted translations into the final .json files.

	Usage
		$ tsr-bundle-versions <package-name> <output-file>

	Examples
		$ tsr-bundle-versions timeline-state-resolver ./src/translations.json
`,
	{
		importMeta: import.meta,
	}
)

const packageName = cli.input[0]
const outputPath = cli.input[1]

if (!packageName || !outputPath) {
	cli.showHelp()
	process.exit(1)
}

;(async function () {
	const bundledTranslations = await getTranslations([{ root: packageName, refs: [] }])

	await writeFile(outputPath, JSON.stringify(bundledTranslations))
})()
