import {
	Conductor,
	ConductorOptions,
	TimelineTriggerTimeResult,
	SlowSentCommandInfo,
	SlowFulfilledCommandInfo,
	CasparCGDevice,
} from 'timeline-state-resolver'
import {
	DeviceOptionsAny,
	Mappings,
	TSRTimeline,
	Datastore,
	DeviceStatus,
	DeviceType,
	ActionExecutionResultCode,
	ListMediaResult,
	ActionExecutionResult,
} from 'timeline-state-resolver-types'
import { ThreadedClass } from 'threadedclass'

import { TSRSettings } from './index'

/**
 * Represents a connection between Gateway and TSR
 */
export class TSRHandler {
	private tsr!: Conductor

	// private _timeline: TSRTimeline
	// private _mappings: Mappings

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

		this.tsr.connectionManager.on('connectionEvent:connectionChanged', (deviceId: string, status: DeviceStatus) => {
			console.log(`Device ${deviceId} status changed: ${JSON.stringify(status)}`)
		})
		this.tsr.connectionManager.on(
			'connectionEvent:slowSentCommand',
			(_deviceId: string, _info: SlowSentCommandInfo) => {
				// console.log(`Device ${device.deviceId} slow sent command: ${_info}`)
			}
		)
		this.tsr.connectionManager.on(
			'connectionEvent:slowFulfilledCommand',
			(_deviceId: string, _info: SlowFulfilledCommandInfo) => {
				// console.log(`Device ${device.deviceId} slow fulfilled command: ${_info}`)
			}
		)
		this.tsr.connectionManager.on('connectionEvent:commandReport', (deviceId: string, command: any) => {
			console.log(`Device ${deviceId} command: ${JSON.stringify(command)}`)
		})
		this.tsr.connectionManager.on('connectionEvent:debug', (deviceId: string, ...args: any[]) => {
			const data = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
			console.log(`Device ${deviceId} debug: ${data}`)
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
	async logMediaList(): Promise<void> {
		for (const deviceContainer of this.tsr.connectionManager.getConnections()) {
			if (deviceContainer.deviceType === DeviceType.CASPARCG) {
				const device = deviceContainer.device as ThreadedClass<CasparCGDevice>

				console.log(`Fetching media list for ${device.deviceId}...`)

				const list: ActionExecutionResult<ListMediaResult> = await device.executeAction('listMedia', {})

				if (list.result === ActionExecutionResultCode.Error) {
					console.log(`Error fetching media list: ${list.response?.key}`)
				} else if (list.result === ActionExecutionResultCode.Ok) {
					console.log(`Media list:`)
					if (!list.resultData) return
					console.log(list.resultData.map((m) => `${m.clip} ${m.size} ${m.datetime}`))
				}
			}
		}
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
		this.tsr.connectionManager.setConnections(devices)
	}
}
