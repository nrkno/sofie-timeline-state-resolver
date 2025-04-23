import { builtinDeviceManifest, TSRManifest } from '../manifest'
import type { TranslationsBundle } from 'timeline-state-resolver-types'
import type { TSRDevicesManifestEntry } from 'timeline-state-resolver-api'
import { readFile } from 'fs/promises'

import Translations = require('../translations.json')

export class DevicesRegistry {
	private _manifest: TSRManifest
	private _deviceToPluginMap = new Map<string, string>()
	private _translations: TranslationsBundle[]

	public get manifest(): TSRManifest {
		return this._manifest
	}

	public get translations(): TranslationsBundle[] {
		return this._translations
	}

	constructor() {
		this._manifest = builtinDeviceManifest
		this._translations = Translations as TranslationsBundle[]
	}

	/**
	 * Load device integrations from a plugin path
	 * This assumes the manifest is the source of truth, and that all devices it includes exist in the code. This is to avoid loading device code in this thread.
	 * Note: This tried to avoid loading the plugin code in this thread, but does not attempt to prevent malicious code from being run in this thread.
	 * @returns A list of device types that were loaded from the plugin
	 */
	public async loadDeviceIntegrationsFromPath(pluginPath: string): Promise<string[]> {
		const [pluginManifest0, pluginTranslations0] = await Promise.all([
			readFile(`${pluginPath}/manifest.json`, 'utf8').then((data) => JSON.parse(data)),
			readFile(`${pluginPath}/translations.json`, 'utf8').then((data) => JSON.parse(data)),
		])

		const pluginManifest = pluginManifest0 as Record<string, TSRDevicesManifestEntry>
		const pluginTranslations = pluginTranslations0 as TranslationsBundle[]

		if (!pluginManifest || typeof pluginManifest !== 'object') throw new Error(`Manifest is not an object`)
		if (!pluginTranslations || !Array.isArray(pluginTranslations)) throw new Error(`Translations is not an array`)

		// TODO - how to merge translations bundles without it growing exponentially? can we have a labelled bundle per device?
		// TODO - ideally this should happen as each device is added below, to ensure it doesn't 'leak'
		this._translations = this._translations.concat(pluginTranslations)

		const deviceTypes: string[] = []

		for (const [deviceType, deviceManifest] of Object.entries<TSRDevicesManifestEntry>(pluginManifest)) {
			if (!deviceManifest) continue

			// Future: maybe this should check the manifest is of the correct shape
			this._manifest.subdevices[deviceType] = deviceManifest
			this._deviceToPluginMap.set(deviceType, pluginPath)
			deviceTypes.push(deviceType)
		}

		return deviceTypes
	}

	public getPluginPathForDeviceIntergration(deviceType: string): string | null {
		// Check if it came from a plugin
		const pluginPath = this._deviceToPluginMap.get(deviceType)
		if (pluginPath) return pluginPath

		// Then check the builtin devices
		const deviceManifest = this._manifest.subdevices[deviceType]
		if (deviceManifest) return null

		throw new Error(`Device "${deviceType}" not available`)
	}
}
