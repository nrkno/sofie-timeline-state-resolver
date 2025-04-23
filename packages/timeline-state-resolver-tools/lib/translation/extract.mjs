/**
 * This script will extract keys from the source code (provided they are wrapped
 * in a call to the (mock) i18next translation function t()).
 * The extracted keys are written to .po files, one for each specified locale.
 *
 * Translations in already existing .po files will be preserved.
 */
/* eslint-disable */
import { format, parse } from 'path'
import { promises } from 'fs'
const { readFile } = promises
import { Transform } from 'stream'
import { pipeline } from 'stream/promises'
import vfs from 'vinyl-fs'
import { transform as i18nTransform } from 'i18next-parser'
import { i18nextToPo, gettextToI18next } from 'i18next-conv'

import { conversionOptions, extractOptions } from './config.mjs'

class JsonToPoTransform extends Transform {
	constructor() {
		super({ objectMode: true })
	}

	_transform(file, encoding, callback) {
		const language = file.dirname.split(/[/|\\]/).pop()

		i18nextToPo(
			language,
			file.contents.toString(),
			Object.assign({}, conversionOptions, {
				language,
				skipUntranslated: false, // when extracting no keys will have translations yet :)
			})
		)
			.then((poContent) => {
				file.contents = Buffer.from(poContent)
				file.extname = '.po'

				callback(null, file)
			})
			.catch(callback)
	}
}

class MergeExistingTranslationsTransform extends Transform {
	constructor(statsCallback) {
		super({ objectMode: true })
		this.statsCallback = statsCallback
	}

	_transform(file, encoding, callback) {
		const poPath = format({
			dir: file.dirname,
			name: file.stem,
			ext: '.po',
		})

		readFile(poPath, 'utf-8')
			.then(
				(existingFile) => existingFile,
				() => null
			)
			.then((existingFile) => {
				if (!existingFile) {
					return null
				}

				const language = file.dirname.split(/[/|\\]/).pop()
				return gettextToI18next(
					language,
					existingFile,
					Object.assign({}, conversionOptions, {
						language,
						// Keys with no value will fall back to default bundle, and eventually the key itself will
						// be used as value if no values are found. Since we use the string as key, this means
						// untranslated keys will be represented by their original (English) text. This is not great
						// but better than inserting empty strings everywhere.
						skipUntranslated: true,
					})
				)
			})
			.then(JSON.parse)
			.then((existingTranslations) => {
				const language = file.dirname.split(/[/|\\]/).pop()
				const currentKeys = Object.keys(JSON.parse(file.contents.toString()))
				const keysExtracted = currentKeys.length

				if (!existingTranslations) {
					this.statsCallback({
						keysExtracted,
						language,
						keysMerged: 0,
						keysRemoved: 0,
					})
					return callback(null, file)
				}

				const existingTranslationKeyCount = Object.keys(existingTranslations).length
				let keysMerged = 0

				const mergedTranslations = {}

				for (const key of currentKeys) {
					const existingValue = existingTranslations[key]
					if (existingValue) {
						mergedTranslations[key] = existingValue
						keysMerged++
					} else {
						mergedTranslations[key] = ''
					}
				}
				file.contents = Buffer.from(JSON.stringify(mergedTranslations))

				this.statsCallback({
					keysExtracted,
					language,
					keysMerged,
					keysRemoved: existingTranslationKeyCount - keysMerged,
				})
				return callback(null, file)
			})
			.catch((err) => {
				callback(err)
			})
	}
}

export async function extractTranslations(packageName, sourcePath) {
	const start = Date.now()
	console.info(`\nExtracting keys from ${packageName} (${sourcePath})...`)
	const entryPointRoot = parse(sourcePath).dir

	let extractionStats = { locales: [] }

	await pipeline(
		vfs.src([`${entryPointRoot}/**/*.ts`, `${entryPointRoot}/**/$schemas/*.json`]),
		new i18nTransform(Object.assign({}, extractOptions, { defaultNamespace: packageName })).on(
			'warning:variable',
			console.log
		),
		new MergeExistingTranslationsTransform((stats) => {
			const { language, keysExtracted, keysMerged, keysRemoved } = stats
			extractionStats.keysExtracted = keysExtracted
			extractionStats.locales.push({ language, keysMerged, keysRemoved })
		}),
		new JsonToPoTransform(),
		vfs.dest('./')
	)
		.then(() => {
			const taskDuration = Date.now() - start
			const { keysExtracted, locales } = extractionStats
			if (keysExtracted) {
				console.info(`=> OK, ${keysExtracted || 0} keys extracted in ${taskDuration} ms`)
				for (const locale of locales) {
					const { language, keysMerged, keysRemoved } = locale
					console.info(
						`\t${language}: added ${
							keysExtracted - keysMerged
						} new keys, merged ${keysMerged} existing translations, removed ${keysRemoved} obsolete keys`
					)
				}
			} else {
				console.info(`=> No keys found in ${taskDuration}ms`)
			}
		})
		.catch(console.error)
}
