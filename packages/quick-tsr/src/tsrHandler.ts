import {
	Conductor,
	ConductorOptions,
	TimelineTriggerTimeResult,
	DeviceOptionsAny,
	Mappings,
	TSRTimeline,
	Datastore,
	DeviceStatus,
	SlowSentCommandInfo,
	DeviceOptionsBase,
	SlowFulfilledCommandInfo,
} from 'timeline-state-resolver'

import * as _ from 'underscore'
import { TSRSettings } from './index'
import { BaseRemoteDeviceIntegration } from 'timeline-state-resolver/dist/service/remoteDeviceInstance'

/**
 * Represents a connection between Gateway and TSR
 */
export class TSRHandler {
	private tsr!: Conductor

	private _multiThreaded: boolean | null = null

	// private _timeline: TSRTimeline
	// private _mappings: Mappings

	private _devices: { [deviceId: string]: BaseRemoteDeviceIntegration<DeviceOptionsBase<any>> } = {}

	constructor() {
		// nothing
	}

	public async init(tsrSettings: TSRSettings): Promise<any> {
		// this._config = config

		console.log('TSRHandler init')

		// let settings: TSRSettings = peripheralDevice.settings || {}

		// console.log('Devices', settings.devices)
		const c: ConductorOptions = {
			getCurrentTime: Date.now,
			multiThreadedResolver: tsrSettings.multiThreadedResolver,
			proActiveResolve: true,
		}
		this.tsr = new Conductor(c)

		this.tsr.on('error', (e, ...args) => {
			console.error('TSR', e, ...args)
		})
		this.tsr.on('info', (msg, ...args) => {
			console.log('TSR', msg, ...args)
		})
		this.tsr.on('warning', (msg, ...args) => {
			console.log('Warning: TSR', msg, ...args)
		})
		this.tsr.on('debug', (msg, ...args) => {
			console.log('Debug: TSR', msg, ...args)
		})
		// this.tsr.on('debug', (...args: any[]) => {
		// console.log(...args)
		// })

		this.tsr.on('setTimelineTriggerTime', (_r: TimelineTriggerTimeResult) => {
			// TODO
		})
		this.tsr.on('timelineCallback', (_time, _objId, _callbackName, _data) => {
			// todo ?
		})

		await this.tsr.init()

		// this._initialized = true
		// this._triggerupdateMapping()
		// this._triggerupdateTimeline()
		// this._triggerupdateDevices()
		// this.onSettingsChanged()
		// this.logger.debug('tsr init done')
	}
	async destroy(): Promise<void> {
		if (this.tsr) return this.tsr.destroy()
		else return Promise.resolve()
	}
	setTimelineAndMappings(tl: TSRTimeline, mappings: Mappings): void {
		// this._timeline = tl
		// this._mappings = mappings

		this.tsr.setTimelineAndMappings(tl, mappings)
	}
	setDatastore(store: Datastore): void {
		this.tsr.setDatastore(store)
	}
	public async setDevices(devices: { [deviceId: string]: DeviceOptionsAny }): Promise<void> {
		const ps: Array<Promise<void>> = []

		_.each(devices, (deviceOptions: DeviceOptionsAny, deviceId: string) => {
			const oldDevice = this.tsr.getDevice(deviceId)

			if (!oldDevice) {
				if (deviceOptions.options) {
					console.log('Initializing device: ' + deviceId)
					ps.push(this._addDevice(deviceId, deviceOptions))
				}
			} else {
				if (this._multiThreaded !== null && deviceOptions.isMultiThreaded === undefined) {
					deviceOptions.isMultiThreaded = this._multiThreaded
				}
				if (deviceOptions.options) {
					let anyChanged = false

					// let oldOptions = (oldDevice.deviceOptions).options || {}

					if (!_.isEqual(oldDevice.deviceOptions, deviceOptions)) {
						anyChanged = true
					}

					if (anyChanged) {
						console.log('Re-initializing device: ' + deviceId)
						ps.push(this._removeDevice(deviceId).then(async () => this._addDevice(deviceId, deviceOptions)))
					}
				}
			}
		})

		_.each(this.tsr.getDevices(), (oldDevice: BaseRemoteDeviceIntegration<DeviceOptionsBase<any>>) => {
			const deviceId = oldDevice.deviceId
			if (!devices[deviceId]) {
				console.log('Un-initializing device: ' + deviceId)
				ps.push(this._removeDevice(deviceId))
			}
		})

		await Promise.all(ps)
	}
	private async _addDevice(deviceId: string, options: DeviceOptionsAny) {
		// console.log('Adding device ' + deviceId)

		if (!options.limitSlowSentCommand) options.limitSlowSentCommand = 40
		if (!options.limitSlowFulfilledCommand) options.limitSlowFulfilledCommand = 100

		try {
			const device = await this.tsr.addDevice(deviceId, options)

			this._devices[deviceId] = device

			await device.device.on('connectionChanged', ((status: DeviceStatus) => {
				console.log(`Device ${device.deviceId} status changed: ${JSON.stringify(status)}`)
			}) as () => void)
			await device.device.on('slowSentCommand', ((_info: SlowSentCommandInfo) => {
				// console.log(`Device ${device.deviceId} slow sent command: ${_info}`)
			}) as () => void)
			await device.device.on('slowFulfilledCommand', ((_info: SlowFulfilledCommandInfo) => {
				// console.log(`Device ${device.deviceId} slow fulfilled command: ${_info}`)
			}) as () => void)
			await device.device.on('commandReport', ((command: any) => {
				console.log(`Device ${device.deviceId} command: ${JSON.stringify(command)}`)
			}) as () => void)
			await device.device.on('debug', (...args: any[]) => {
				const data = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
				console.log(`Device ${device.deviceId} debug: ${data}`)
			})
			// also ask for the status now, and update:
			// onConnectionChanged(await device.device.getStatus())
		} catch (e) {
			console.error(`Error when adding device "${deviceId}"`, e)
		}
	}
	private async _removeDevice(deviceId: string) {
		try {
			await this.tsr.removeDevice(deviceId)
		} catch (e) {
			console.error('Error when removing tsr device: ' + e)
		}

		if (this._devices[deviceId]) {
			try {
				await this._devices[deviceId].device.terminate()
			} catch (e) {
				console.error('Error when removing device: ' + e)
			}
		}
		delete this._devices[deviceId]
	}
}
