#!/usr/bin/env node

import { extractTranslations } from '../lib/translation/extract.mjs'
import meow from 'meow'

const cli = meow(
	`
	Tool to extract translations from the TypeScript sourcecode, and associated json schemas

	Usage
		$ tsr-extract-versions <package-name> <entrypoint>

	Examples
		$ tsr-extract-versions timeline-state-resolver ./src/index.ts
`,
	{
		importMeta: import.meta,
	}
)

const packageName = cli.input[0]
const sourcePath = cli.input[1]

if (!packageName || !sourcePath) {
	cli.showHelp()
	process.exit(1)
}

extractTranslations(packageName, sourcePath).catch(console.error)
