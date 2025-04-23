import * as chokidar from 'chokidar'

import * as fs from 'fs'
import * as _ from 'underscore'
import * as path from 'path'
import { Mappings, TSRTimeline, DeviceOptionsAny, Datastore } from 'timeline-state-resolver-types'
import { TSRHandler } from './tsrHandler'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const clone = require('fast-clone')
// import { TSRHandler } from './tsrHandler'

console.log('Starting Quick-TSR')

// const tsr = new TSRHandler(console.log)

const watcher = chokidar.watch('input/**', { ignored: /^\./, persistent: true })

watcher
	.on('add', () => {
		reloadInput()
	})
	.on('change', (path: string, stats: fs.Stats) => {
		reloadInput({ path, stats })
	})
	.on('unlink', () => {
		reloadInput()
	})
	.on('error', (error) => {
		console.error('Error', error)
	})

let pendingInput: Input | undefined
const currentInput: Input = {
	devices: {},
	mappings: {},
	settings: {},
	timeline: [],
	datastore: {},
}
let applyingNewInput = false
let tsr = new TSRHandler()
function reloadInput(changed?: { path: string; stats: fs.Stats }) {
	const newInput: Input = pendingInput ?? clone(currentInput)
	pendingInput = newInput

	_.each(getAllFilesInDirectory('input/'), (filePath) => {
		const requirePath = '../' + filePath.replace(/\\/g, '/')

		if (requirePath.match(/[/\\]_/)) {
			// ignore and folders files that begin with "_"
			return
		}

		if (filePath.match(/\.ts$/)) {
			if (changed) {
				// Only update if the file has updated:
				if (changed.path !== filePath) {
					return
				}
			}

			delete require.cache[require.resolve(requirePath)]

			try {
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const fileContents = require(requirePath)

				const fileInput: TSRInput = fileContents.input || {}

				if (fileInput.devices) {
					newInput.devices = {}
					_.each(fileInput.devices, (device: any, deviceId) => {
						newInput.devices[deviceId] = device
					})
				}
				if (fileInput.mappings) {
					newInput.mappings = {}
					_.each(fileInput.mappings, (mapping: any, mappingId) => {
						newInput.mappings[mappingId] = mapping
					})
				}
				if (fileInput.settings) {
					newInput.settings = {}
					_.each(fileInput.settings, (setting: any, settingId) => {
						// @ts-expect-error generic module applying
						newInput.settings[settingId] = setting
					})
				}

				if (fileInput.timeline) {
					newInput.timeline = []
					_.each(fileInput.timeline, (obj: any) => {
						newInput.timeline.push(obj)
					})
				}
				if (fileInput.datastore) {
					newInput.datastore = {}
					_.each(fileInput.datastore, (datastoreValue: any, datastoreKey) => {
						newInput.datastore[datastoreKey] = datastoreValue
					})
				}
			} catch (e) {
				console.error(`Failed to load file: ${requirePath}`, e)
			}
		}
	})

	// react to changes:
	triggerApplyNewInput()
}
function getAllFilesInDirectory(dir: string): string[] {
	const files = fs.readdirSync(dir)

	const filelist: string[] = []
	files.forEach((file) => {
		if (fs.statSync(path.join(dir, file)).isDirectory()) {
			getAllFilesInDirectory(path.join(dir, file)).forEach((innerFile) => {
				filelist.push(innerFile)
			})
		} else {
			filelist.push(path.join(dir, file))
		}
	})
	return filelist
}

function triggerApplyNewInput() {
	if (applyingNewInput || !pendingInput) return
	applyingNewInput = true

	const newInput = pendingInput
	pendingInput = undefined

	applyNewInput(newInput)
		.catch(console.error)
		.finally(() => {
			applyingNewInput = false
		})
}
async function applyNewInput(newInput: Input): Promise<void> {
	if (!_.isEqual(newInput.settings, currentInput.settings)) {
		console.log('')
		console.log('')
		console.log('************************ Settings changed ******************')
		currentInput.settings = clone(newInput.settings)
		currentInput.devices = {}
		currentInput.mappings = {}
		currentInput.timeline = []

		await tsr.destroy()

		tsr = new TSRHandler()
		await tsr.init(newInput.settings)
	}

	if (!_.isEqual(newInput.devices, currentInput.devices)) {
		console.log('')
		console.log('')
		console.log('************************ Devices changed ******************')
		currentInput.devices = clone(newInput.devices)
		currentInput.mappings = {}
		currentInput.timeline = []

		await tsr.setDevices(newInput.devices)

		setTimeout(() => {
			tsr.logMediaList().catch(console.error)
		}, 1000)
	}

	if (!_.isEqual(newInput.mappings, currentInput.mappings) || !_.isEqual(newInput.timeline, currentInput.timeline)) {
		console.log('')
		console.log('')
		console.log('************************ Timeline / Mappings changed ******************')
		currentInput.mappings = clone(newInput.mappings)
		currentInput.timeline = clone(newInput.timeline)

		// Check that layers are correct.
		newInput.timeline.forEach((obj) => {
			if (!newInput.mappings[obj.layer])
				console.error(`Object ${obj.id} refers to a layer/mapping that does not exist: "${obj.layer}"`)
		})

		tsr.setTimelineAndMappings(newInput.timeline, newInput.mappings)
	}
	if (!_.isEqual(newInput.datastore, currentInput.datastore)) {
		console.log('')
		console.log('')
		console.log('************************ Datastore changed ******************')
		currentInput.datastore = clone(newInput.datastore)

		tsr.setDatastore(newInput.datastore)
	}
}

export type TSRInput = Partial<Input>

export interface Input {
	settings: TSRSettings
	devices: {
		[deviceId: string]: DeviceOptionsAny
	}
	mappings: Mappings
	timeline: TSRTimeline
	datastore: Datastore
}
export interface TSRSettings {
	multiThreading?: boolean
	multiThreadedResolver?: boolean
}

// ------------
reloadInput()
console.log('Listening to changes in /input...')
