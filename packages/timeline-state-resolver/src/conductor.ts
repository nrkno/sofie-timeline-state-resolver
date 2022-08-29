import * as _ from 'underscore'
import {
	TimelineState,
	ResolvedTimelineObjectInstance,
	ResolvedStates,
	TimelineObject,
	Resolver,
} from 'superfly-timeline'

import { CommandWithContext, DeviceEvents } from './devices/device'
import { CasparCGDevice, DeviceOptionsCasparCGInternal } from './devices/casparCG'
import { AbstractDevice, DeviceOptionsAbstractInternal } from './devices/abstract'
import { HTTPSendDevice, DeviceOptionsHTTPSendInternal } from './devices/httpSend'
import {
	Mappings,
	Mapping,
	DeviceType,
	ResolvedTimelineObjectInstanceExtended,
	TSRTimeline,
	DeviceOptionsBase,
	DeviceOptionsTelemetrics,
} from 'timeline-state-resolver-types'
import { AtemDevice, DeviceOptionsAtemInternal } from './devices/atem'
import { EventEmitter } from 'eventemitter3'
import { LawoDevice, DeviceOptionsLawoInternal } from './devices/lawo'
import { PanasonicPtzDevice, DeviceOptionsPanasonicPTZInternal } from './devices/panasonicPTZ'
import { HyperdeckDevice, DeviceOptionsHyperdeckInternal } from './devices/hyperdeck'
import { DoOnTime } from './doOnTime'
import { TCPSendDevice, DeviceOptionsTCPSendInternal } from './devices/tcpSend'
import { PharosDevice, DeviceOptionsPharosInternal } from './devices/pharos'
import { OSCMessageDevice, DeviceOptionsOSCInternal } from './devices/osc'
import { DeviceContainer } from './devices/deviceContainer'
import { MemUsageReport, threadedClass, ThreadedClass, ThreadedClassManager } from 'threadedclass'
import { AsyncResolver } from './AsyncResolver'
import { HTTPWatcherDevice, DeviceOptionsHTTPWatcherInternal } from './devices/httpWatcher'
import { QuantelDevice, DeviceOptionsQuantelInternal } from './devices/quantel'
import { SisyfosMessageDevice, DeviceOptionsSisyfosInternal } from './devices/sisyfos'
import { SingularLiveDevice, DeviceOptionsSingularLiveInternal } from './devices/singularLive'
import { VMixDevice, DeviceOptionsVMixInternal } from './devices/vmix'
import { OBSDevice, DeviceOptionsOBSInternal } from './devices/obs'

import { VizMSEDevice, DeviceOptionsVizMSEInternal } from './devices/vizMSE'
import PQueue from 'p-queue'
import * as PAll from 'p-all'
import PTimeout from 'p-timeout'
import { ShotokuDevice, DeviceOptionsShotokuInternal } from './devices/shotoku'
import { endTrace, FinishedTrace, startTrace } from './lib'
import { TelemetricsDevice } from './devices/telemetrics'

export { DeviceContainer }
export { CommandWithContext }

export const LOOKAHEADTIME = 5000 // Will look ahead this far into the future
export const PREPARETIME = 2000 // Will prepare commands this time before the event is to happen
export const MINTRIGGERTIME = 10 // Minimum time between triggers
export const MINTIMEUNIT = 1 // Minimum unit of time

/** When resolving and the timeline has repeating objects, only resolve this far into the future */
const RESOLVE_LIMIT_TIME = 10000

export type TimelineTriggerTimeResult = Array<{ id: string; time: number }>

export { Device } from './devices/device'

export interface ConductorOptions {
	// devices: {
	// 	[deviceName: string]: DeviceOptions
	// },
	getCurrentTime?: () => number
	autoInit?: boolean
	multiThreadedResolver?: boolean
	useCacheWhenResolving?: boolean

	/** When set, some optimizations are made, intended to only run in production */
	optimizeForProduction?: boolean
	/** When set, resolving is done early, to account for the time it takes to resolve the timeline. */
	proActiveResolve?: boolean
	/** If set, multiplies the estimated resolve time (default: 1) */
	estimateResolveTimeMultiplier?: number
}
interface TimelineCallback {
	time: number
	id: string
	callBack?: string
	callBackStopped?: string
	callBackData: any
	startTime: number
}
type TimelineCallbacks = { [key: string]: TimelineCallback }
const CALLBACK_WAIT_TIME = 50
interface CallbackInstance {
	playing: boolean | undefined

	playChanged: boolean
	playTime?: number | null | undefined
	playCallback?: QueueCallback

	endChanged: boolean
	endTime?: number | null | undefined
	endCallback?: QueueCallback
}
interface QueueCallback {
	type: 'start' | 'stop'
	time: number
	instanceId: string
	callBack: string
	callBackData: any
}
export interface StatReport {
	reason?: string
	timelineStartResolve: number
	timelineResolved: number
	stateHandled: number
	done: number
	timelineSize: number
	timelineSizeOld: number
	estimatedResolveTime: number
}

export type ConductorEvents = {
	error: [...args: any[]]
	debug: [...args: any[]]
	info: [...args: any[]]
	warning: [...args: any[]]

	setTimelineTriggerTime: [r: TimelineTriggerTimeResult]
	timelineCallback: [time: number, instanceId: string, callback: string, callbackData: any]
	resolveDone: [timelineHash: string, duration: number]
	statReport: [report: StatReport]
	timeTrace: [trace: FinishedTrace]
}

/**
 * The Conductor class serves as the main class for interacting. It contains
 * methods for setting mappings, timelines and adding/removing devices. It keeps
 * track of when to resolve the timeline and updates the devices with new states.
 */
export class Conductor extends EventEmitter<ConductorEvents> {
	private _logDebug = false
	private _timeline: TSRTimeline = []
	private _timelineSize: number | undefined = undefined
	private _mappings: Mappings = {}

	private _options: ConductorOptions

	private devices = new Map<string, DeviceContainer<DeviceOptionsBase<any>>>()

	private _getCurrentTime?: () => number

	private _nextResolveTime = 0
	private _resolvedStates: {
		resolvedStates: ResolvedStates | null
		resolveTime: number
	} = {
		resolvedStates: null,
		resolveTime: 0,
	}
	private _resolveTimelineTrigger: NodeJS.Timer | undefined
	private _isInitialized = false
	private _doOnTime: DoOnTime
	private _multiThreadedResolver = false
	private _useCacheWhenResolving = false
	private _estimateResolveTimeMultiplier = 1

	private _callbackInstances = new Map<string, CallbackInstance>() // key = instanceId
	private _triggerSendStartStopCallbacksTimeout: NodeJS.Timer | null = null
	private _sentCallbacks: TimelineCallbacks = {}

	private _actionQueue: PQueue = new PQueue({
		concurrency: 1,
	})

	private _statMeasureStart = 0
	private _statMeasureReason = ''
	private _statReports: StatReport[] = []

	private _resolver!: ThreadedClass<AsyncResolver>

	private _interval: NodeJS.Timer
	private _timelineHash: string | undefined
	private activationId: string | undefined

	constructor(options: ConductorOptions = {}) {
		super()
		this._options = options

		this._multiThreadedResolver = !!options.multiThreadedResolver
		this._useCacheWhenResolving = !!options.useCacheWhenResolving
		this._estimateResolveTimeMultiplier = options.estimateResolveTimeMultiplier || 1

		if (options.getCurrentTime) this._getCurrentTime = options.getCurrentTime

		this._interval = setInterval(() => {
			if (this.timeline) {
				this._resolveTimeline()
			}
		}, 2500)
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		})
		this._doOnTime.on('error', (e) => this.emit('error', e))
		// this._doOnTime.on('callback', (...args) => {
		// 	this.emit('timelineCallback', ...args)
		// })

		if (options.autoInit) {
			this.init().catch((e) => {
				this.emit('error', 'Error during auto-init: ', e)
			})
		}
	}
	/**
	 * Initializates the resolver, with optional multithreading
	 */
	public async init(): Promise<void> {
		this._resolver = await threadedClass<AsyncResolver, typeof AsyncResolver>(
			'../dist/AsyncResolver.js',
			'AsyncResolver',
			[
				(r) => {
					this.emit('setTimelineTriggerTime', r)
				},
			],
			{
				threadUsage: this._multiThreadedResolver ? 1 : 0,
				autoRestart: true,
				disableMultithreading: !this._multiThreadedResolver,
				instanceName: 'resolver',
			}
		)

		this._isInitialized = true
		this.resetResolver()
	}
	/**
	 * Returns a nice, synchronized time.
	 */
	public getCurrentTime() {
		if (this._getCurrentTime) {
			return this._getCurrentTime()
		} else {
			return Date.now()
		}
	}
	/**
	 * Returns the mappings
	 */
	get mapping(): Mappings {
		return this._mappings
	}
	/**
	 * Returns the current timeline
	 */
	get timeline(): TSRTimeline {
		return this._timeline
	}
	/**
	 * Sets a new timeline and resets the resolver.
	 */
	setTimelineAndMappings(timeline: TSRTimeline, mappings?: Mappings) {
		this.statStartMeasure('timeline received')
		this._timeline = timeline
		this._timelineSize = undefined // reset the cache
		if (mappings) this._mappings = mappings

		// We've got a new timeline, anything could've happened at this point
		// Highest priority right now is to determine if any commands have to be sent RIGHT NOW
		// After that, we'll move further ahead in time, creating commands ready for scheduling

		this.resetResolver()
	}
	get timelineHash(): string | undefined {
		return this._timelineHash
	}
	set timelineHash(hash: string | undefined) {
		this._timelineHash = hash
	}
	get logDebug(): boolean {
		return this._logDebug
	}
	set logDebug(val: boolean) {
		this._logDebug = val

		ThreadedClassManager.debug = this._logDebug
	}
	get estimateResolveTimeMultiplier(): number {
		return this._estimateResolveTimeMultiplier
	}
	set estimateResolveTimeMultiplier(value: number) {
		this._estimateResolveTimeMultiplier = value
	}

	public getDevices(includeUninitialized = false): Array<DeviceContainer<DeviceOptionsBase<any>>> {
		if (includeUninitialized) {
			return Array.from(this.devices.values())
		} else {
			return Array.from(this.devices.values()).filter((device) => device.initialized === true)
		}
	}
	public getDevice(
		deviceId: string,
		includeUninitialized = false
	): DeviceContainer<DeviceOptionsBase<any>> | undefined {
		if (includeUninitialized) {
			return this.devices.get(deviceId)
		} else {
			const device = this.devices.get(deviceId)
			if (device?.initialized === true) {
				return device
			} else {
				return undefined
			}
		}
	}

	/**
	 * Adds a device that can be referenced by the timeline and mappings.
	 * NOTE: use this with caution! if a device fails to initialise (i.e. because the hardware is turned off) this may never resolve. It is preferred to use createDevice and initDevice separately for this reason.
	 * @param deviceId Id used by the mappings to reference the device.
	 * @param deviceOptions The options used to initalize the device
	 * @returns A promise that resolves with the created device, or rejects with an error message.
	 */
	public async addDevice(
		deviceId: string,
		deviceOptions: DeviceOptionsAnyInternal,
		activeRundownPlaylistId?: string
	): Promise<DeviceContainer<DeviceOptionsBase<any>>> {
		const newDevice = await this.createDevice(deviceId, deviceOptions)

		try {
			// Temporary listening to events, these are removed after the devide has been initiated.
			const instanceId = newDevice.instanceId
			const onDeviceInfo = (...args: DeviceEvents['info']) => {
				this.emit('info', instanceId, ...args)
			}
			const onDeviceWarning = (...args: DeviceEvents['warning']) => {
				this.emit('warning', instanceId, ...args)
			}
			const onDeviceError = (...args: DeviceEvents['error']) => {
				this.emit('error', instanceId, ...args)
			}
			const onDeviceDebug = (...args: DeviceEvents['debug']) => {
				this.emit('debug', instanceId, ...args)
			}

			newDevice.device.on('info', onDeviceInfo).catch(console.error)
			newDevice.device.on('warning', onDeviceWarning).catch(console.error)
			newDevice.device.on('error', onDeviceError).catch(console.error)
			newDevice.device.on('debug', onDeviceDebug).catch(console.error)

			const device = await this.initDevice(deviceId, deviceOptions, activeRundownPlaylistId)

			// Remove listeners, expect consumer to subscribe to them now.
			newDevice.device.removeListener('info', onDeviceInfo).catch(console.error)
			newDevice.device.removeListener('warning', onDeviceWarning).catch(console.error)
			newDevice.device.removeListener('error', onDeviceError).catch(console.error)
			newDevice.device.removeListener('debug', onDeviceDebug).catch(console.error)

			return device
		} catch (e) {
			if (newDevice) {
				try {
					await newDevice.terminate()
				} catch (e) {
					this.emit('error', `Cleanup failed of aborted device "${newDevice.deviceId}": ${e}`)
				}
			}
			this.devices.delete(deviceId)
			this.emit('error', 'conductor.addDevice', e)
			return Promise.reject(e)
		}
	}
	/**
	 * Creates an uninitialised device that can be referenced by the timeline and mappings.
	 * @param deviceId Id used by the mappings to reference the device.
	 * @param deviceOptions The options used to initalize the device
	 * @returns A promise that resolves with the created device, or rejects with an error message.
	 */
	public async createDevice(
		deviceId: string,
		deviceOptions: DeviceOptionsAnyInternal
	): Promise<DeviceContainer<DeviceOptionsBase<any>>> {
		let newDevice: DeviceContainer<DeviceOptionsBase<any>> | undefined
		try {
			if (this.devices.has(deviceId)) {
				throw new Error(`Device "${deviceId}" already exists when creating device`)
			}

			const threadedClassOptions = {
				threadUsage: deviceOptions.threadUsage || 1,
				autoRestart: false,
				disableMultithreading: !deviceOptions.isMultiThreaded,
				instanceName: deviceId,
			}

			const getCurrentTime = () => {
				return this.getCurrentTime()
			}

			if (deviceOptions.type === DeviceType.ABSTRACT) {
				newDevice = await DeviceContainer.create<DeviceOptionsAbstractInternal, typeof AbstractDevice>(
					'../../dist/devices/abstract.js',
					'AbstractDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					{
						threadUsage: deviceOptions.isMultiThreaded ? 0.1 : 0,
						autoRestart: false,
						disableMultithreading: !deviceOptions.isMultiThreaded,
						instanceName: deviceId,
					}
				)
			} else if (deviceOptions.type === DeviceType.CASPARCG) {
				// Add CasparCG device:
				newDevice = await DeviceContainer.create<DeviceOptionsCasparCGInternal, typeof CasparCGDevice>(
					'../../dist/devices/casparCG.js',
					'CasparCGDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.ATEM) {
				newDevice = await DeviceContainer.create<DeviceOptionsAtemInternal, typeof AtemDevice>(
					'../../dist/devices/atem.js',
					'AtemDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.HTTPSEND) {
				newDevice = await DeviceContainer.create<DeviceOptionsHTTPSendInternal, typeof HTTPSendDevice>(
					'../../dist/devices/httpSend.js',
					'HTTPSendDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.HTTPWATCHER) {
				newDevice = await DeviceContainer.create<DeviceOptionsHTTPWatcherInternal, typeof HTTPWatcherDevice>(
					'../../dist/devices/httpWatcher.js',
					'HTTPWatcherDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.LAWO) {
				newDevice = await DeviceContainer.create<DeviceOptionsLawoInternal, typeof LawoDevice>(
					'../../dist/devices/lawo.js',
					'LawoDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.TCPSEND) {
				newDevice = await DeviceContainer.create<DeviceOptionsTCPSendInternal, typeof TCPSendDevice>(
					'../../dist/devices/tcpSend.js',
					'TCPSendDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.PANASONIC_PTZ) {
				newDevice = await DeviceContainer.create<DeviceOptionsPanasonicPTZInternal, typeof PanasonicPtzDevice>(
					'../../dist/devices/panasonicPTZ.js',
					'PanasonicPtzDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.HYPERDECK) {
				newDevice = await DeviceContainer.create<DeviceOptionsHyperdeckInternal, typeof HyperdeckDevice>(
					'../../dist/devices/hyperdeck.js',
					'HyperdeckDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.PHAROS) {
				newDevice = await DeviceContainer.create<DeviceOptionsPharosInternal, typeof PharosDevice>(
					'../../dist/devices/pharos.js',
					'PharosDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.OSC) {
				newDevice = await DeviceContainer.create<DeviceOptionsOSCInternal, typeof OSCMessageDevice>(
					'../../dist/devices/osc.js',
					'OSCMessageDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.QUANTEL) {
				newDevice = await DeviceContainer.create<DeviceOptionsQuantelInternal, typeof QuantelDevice>(
					'../../dist/devices/quantel.js',
					'QuantelDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.SHOTOKU) {
				newDevice = await DeviceContainer.create<DeviceOptionsShotokuInternal, typeof ShotokuDevice>(
					'../../dist/devices/shotoku.js',
					'ShotokuDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.SISYFOS) {
				newDevice = await DeviceContainer.create<DeviceOptionsSisyfosInternal, typeof SisyfosMessageDevice>(
					'../../dist/devices/sisyfos.js',
					'SisyfosMessageDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.VIZMSE) {
				newDevice = await DeviceContainer.create<DeviceOptionsVizMSEInternal, typeof VizMSEDevice>(
					'../../dist/devices/vizMSE.js',
					'VizMSEDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.SINGULAR_LIVE) {
				newDevice = await DeviceContainer.create<DeviceOptionsSingularLiveInternal, typeof SingularLiveDevice>(
					'../../dist/devices/singularLive.js',
					'SingularLiveDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.VMIX) {
				newDevice = await DeviceContainer.create<DeviceOptionsVMixInternal, typeof VMixDevice>(
					'../../dist/devices/vmix.js',
					'VMixDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.OBS) {
				newDevice = await DeviceContainer.create<DeviceOptionsOBSInternal, typeof OBSDevice>(
					'../../dist/devices/obs.js',
					'OBSDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.TELEMETRICS) {
				newDevice = await DeviceContainer.create<DeviceOptionsTelemetrics, typeof TelemetricsDevice>(
					'../../dist/devices/telemetrics.js',
					'TelemetricsDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else {
				// @ts-ignore deviceOptions.type is of type "never"
				const type: any = deviceOptions.type
				return Promise.reject(`No matching device type for "${type}" ("${DeviceType[type]}") found in conductor`)
			}

			if (!newDevice) {
				const type: any = deviceOptions.type
				return Promise.reject(`No device could be created for "${type}" ("${DeviceType[type]}")`)
			}

			newDevice.device.on('resetResolver', () => this.resetResolver()).catch(console.error)

			// Double check that it hasnt been created while we were busy waiting
			if (this.devices.has(deviceId)) {
				throw new Error(`Device "${deviceId}" already exists when creating device`)
			}
			this.devices.set(deviceId, newDevice)

			return newDevice
		} catch (e) {
			if (newDevice) {
				try {
					await newDevice.terminate()
				} catch (e) {
					this.emit('error', `Cleanup failed of aborted device "${newDevice.deviceId}": ${e}`)
				}
			}
			this.devices.delete(deviceId)
			this.emit('error', 'conductor.createDevice', e)
			return Promise.reject(e)
		}
	}
	/**
	 * Initialises an existing device that can be referenced by the timeline and mappings.
	 * @param deviceId Id used by the mappings to reference the device.
	 * @param deviceOptions The options used to initalize the device
	 * @returns A promise that resolves with the initialised device, or rejects with an error message.
	 */
	public async initDevice(
		deviceId: string,
		deviceOptions: DeviceOptionsAnyInternal,
		activeRundownPlaylistId?: string
	): Promise<DeviceContainer<DeviceOptionsBase<any>>> {
		const newDevice = this.devices.get(deviceId)

		if (!newDevice) {
			throw new Error('Could not find device ' + deviceId + ', has it been created?')
		}

		if (newDevice.initialized === true) {
			throw new Error('Device ' + deviceId + ' is already initialized!')
		}

		this.emit(
			'info',
			`Initializing device ${newDevice.deviceId} (${newDevice.instanceId}) of type ${DeviceType[deviceOptions.type]}...`
		)

		await newDevice.init(deviceOptions.options, activeRundownPlaylistId)

		await newDevice.reloadProps() // because the device name might have changed after init

		this.emit('info', `Device ${newDevice.deviceId} (${newDevice.instanceId}) initialized!`)

		return newDevice
	}
	/**
	 * Safely remove a device
	 * @param deviceId The id of the device to be removed
	 */
	public async removeDevice(deviceId: string): Promise<void> {
		const device = this.devices.get(deviceId)
		if (device) {
			try {
				await device.device.terminate()
			} catch (e) {
				// An error while terminating is probably not that important, since we'll kill the instance anyway
				this.emit('warning', 'Error when terminating device', e)
			}
			await device.terminate()
			this.devices.delete(deviceId)
		} else {
			return Promise.reject('No device found')
		}
	}
	/**
	 * Remove all devices
	 */
	public async destroy(): Promise<void> {
		clearTimeout(this._interval)

		if (this._triggerSendStartStopCallbacksTimeout) clearTimeout(this._triggerSendStartStopCallbacksTimeout)

		await this._mapAllDevices(true, async (d) => this.removeDevice(d.deviceId))
	}
	/**
	 * Resets the resolve-time, so that the resolving will happen for the point-in time NOW
	 * next time
	 */
	public resetResolver() {
		// reset the resolver through the action queue to make sure it is reset after any currently running timelineResolves
		this._actionQueue
			.add(async () => {
				this._nextResolveTime = 0 // This will cause _resolveTimeline() to generate the state for NOW
				this._resolvedStates = {
					resolvedStates: null,
					resolveTime: 0,
				}
			})
			.catch(() => {
				this.emit('error', 'Failed to reset the resolvedStates, timeline may not be updated appropriately!')
			})

		this._triggerResolveTimeline()
	}
	/**
	 * Send a makeReady-trigger to all devices
	 */
	public async devicesMakeReady(okToDestroyStuff?: boolean, activationId?: string): Promise<void> {
		this.activationId = activationId
		this.emit(
			'debug',
			`devicesMakeReady, ${okToDestroyStuff ? 'okToDestroyStuff' : 'undefined'}, ${
				activationId ? activationId : 'undefined'
			}`
		)
		await this._actionQueue.add(async () => {
			await this._mapAllDevices(false, async (d) =>
				PTimeout(
					(async () => {
						const trace = startTrace('conductor:makeReady:' + d.deviceId)
						await d.device.makeReady(okToDestroyStuff, activationId)
						this.emit('timeTrace', endTrace(trace))
					})(),
					10000,
					`makeReady for "${d.deviceId}" timed out`
				)
			)

			this._triggerResolveTimeline()
		})
	}
	/**
	 * Send a standDown-trigger to all devices
	 */
	public async devicesStandDown(okToDestroyStuff?: boolean): Promise<void> {
		this.activationId = undefined
		this.emit('debug', `devicesStandDown, ${okToDestroyStuff ? 'okToDestroyStuff' : 'undefined'}`)
		await this._actionQueue.add(async () => {
			await this._mapAllDevices(false, async (d) =>
				PTimeout(
					(async () => {
						const trace = startTrace('conductor:standDown:' + d.deviceId)
						await d.device.standDown(okToDestroyStuff)
						this.emit('timeTrace', endTrace(trace))
					})(),
					10000,
					`standDown for "${d.deviceId}" timed out`
				)
			)
		})
	}

	public async getThreadsMemoryUsage(): Promise<{ [childId: string]: MemUsageReport }> {
		return ThreadedClassManager.getThreadsMemoryUsage()
	}

	private async _mapAllDevices<T>(
		includeUninitialized: boolean,
		fcn: (d: DeviceContainer<DeviceOptionsBase<any>>) => Promise<T>
	): Promise<T[]> {
		return PAll(
			this.getDevices(true)
				.filter((d) => includeUninitialized || d.initialized === true)
				.map((d) => async () => fcn(d)),
			{
				stopOnError: false,
			}
		)
	}

	/**
	 * This is the main resolve-loop.
	 */
	private _triggerResolveTimeline(timeUntilTrigger?: number) {
		// this.emit('info', '_triggerResolveTimeline', timeUntilTrigger)

		if (this._resolveTimelineTrigger) {
			clearTimeout(this._resolveTimelineTrigger)
			delete this._resolveTimelineTrigger
		}

		if (timeUntilTrigger) {
			// resolve at a later stage
			this._resolveTimelineTrigger = setTimeout(() => {
				this._resolveTimeline()
			}, timeUntilTrigger)
		} else {
			// resolve right away:
			this._resolveTimeline()
		}
	}
	/**
	 * Resolves the timeline for the next resolve-time, generates the commands and passes on the commands.
	 */
	private _resolveTimeline() {
		// this adds it to a queue, make sure it never runs more than once at a time:
		this._actionQueue
			.add(async () => {
				return this._resolveTimelineInner()
					.then((nextResolveTime) => {
						this._nextResolveTime = nextResolveTime || 0
					})
					.catch((e) => {
						this.emit('error', 'Caught error in _resolveTimelineInner' + e)
					})
			})
			.catch((e) => {
				this.emit('error', 'Caught error in _resolveTimeline.then' + e)
			})
	}
	private async _resolveTimelineInner(): Promise<number | undefined> {
		const trace = startTrace('conductor:resolveTimeline')
		if (!this._isInitialized) {
			this.emit('warning', 'TSR is not initialized yet')
			return undefined
		}

		let nextResolveTime = 0
		let timeUntilNextResolve = LOOKAHEADTIME
		const startTime = Date.now()

		const statMeasureStart: number = this._statMeasureStart
		let statTimeStateHandled = -1
		let statTimeTimelineStartResolve = -1
		let statTimeTimelineResolved = -1
		let estimatedResolveTime = -1

		try {
			/** The point in time this function is run. ( ie "right now") */
			const now = this.getCurrentTime()
			/** The point in time we're targeting. (This can be in the future) */
			let resolveTime: number = this._nextResolveTime

			estimatedResolveTime = this.estimateResolveTime()

			if (
				resolveTime === 0 || // About to be resolved ASAP
				resolveTime < now + estimatedResolveTime // We're late
			) {
				resolveTime = now + estimatedResolveTime
				this.emitWhenActive(
					'debug',
					`resolveTimeline ${resolveTime} (${resolveTime - now} from now) (${estimatedResolveTime}) ---------`
				)
			} else {
				this.emitWhenActive(
					'debug',
					`resolveTimeline ${resolveTime} (${resolveTime - now} from now) -----------------------------`
				)

				if (resolveTime > now + LOOKAHEADTIME) {
					// If the resolveTime is too far ahead, we'd rather wait and resolve it later.
					this.emitWhenActive('debug', 'Too far ahead (' + resolveTime + ')')
					this._triggerResolveTimeline(LOOKAHEADTIME)
					return undefined
				}
			}

			// Let all initialized devices know that a new state is about to come in.
			// This is done so that they can clear future commands a bit earlier, possibly avoiding double or conflicting commands
			// const pPrepareForHandleStates = this._mapAllDevices(async (device: DeviceContainer) => {
			// 	await device.device.prepareForHandleState(resolveTime)
			// }).catch(error => {
			// 	this.emit('error', error)
			// })
			// TODO - the PAll way of doing this provokes https://github.com/nrkno/tv-automation-state-timeline-resolver/pull/139
			// The doOnTime calls fire before this, meaning we cleanup the state for a time we have already sent commands for
			const pPrepareForHandleStates: Promise<unknown> = Promise.all(
				Array.from(this.devices.values())
					.filter((d) => d.initialized === true)
					.map(async (device: DeviceContainer<DeviceOptionsBase<any>>): Promise<void> => {
						await device.device.prepareForHandleState(resolveTime)
					})
			).catch((error) => {
				this.emit('error', error)
			})

			const applyRecursively = (o: TimelineObject, func: (o: TimelineObject) => void) => {
				func(o)

				if (o.isGroup) {
					_.each(o.children || [], (child: TimelineObject) => {
						applyRecursively(child, func)
					})
				}
			}

			statTimeTimelineStartResolve = Date.now()
			const timeline: TSRTimeline = this.timeline

			// To prevent trying to transfer circular references over IPC we remove
			// any references to the parent property:
			const deleteParent = (o: TimelineObject) => {
				if ('parent' in o) {
					delete o['parent']
				}
			}
			_.each(timeline, (o) => applyRecursively(o, deleteParent))

			// Determine if we can use the pre-resolved timeline:
			let resolvedStates: ResolvedStates
			if (
				this._resolvedStates.resolvedStates &&
				resolveTime >= this._resolvedStates.resolveTime &&
				resolveTime < this._resolvedStates.resolveTime + RESOLVE_LIMIT_TIME
			) {
				// Yes, we can use the previously resolved timeline:
				resolvedStates = this._resolvedStates.resolvedStates
			} else {
				// No, we need to resolve the timeline again:
				const o = await this._resolver.resolveTimeline(
					resolveTime,
					timeline,
					resolveTime + RESOLVE_LIMIT_TIME,
					this._useCacheWhenResolving
				)
				resolvedStates = o.resolvedStates

				this._resolvedStates.resolvedStates = resolvedStates
				this._resolvedStates.resolveTime = resolveTime

				// Apply changes to fixed objects (set "now" triggers to an actual time):
				// This gets persisted on this.timeline, so we only have to do this once
				const nowIdsTime: { [id: string]: number } = {}
				_.each(o.objectsFixed, (o) => (nowIdsTime[o.id] = o.time))
				const fixNow = (o: TimelineObject) => {
					if (nowIdsTime[o.id]) {
						if (!_.isArray(o.enable)) {
							o.enable.start = nowIdsTime[o.id]
						}
					}
				}
				_.each(timeline, (o) => applyRecursively(o, fixNow))
			}

			const tlState = Resolver.getState(resolvedStates, resolveTime)
			await pPrepareForHandleStates

			statTimeTimelineResolved = Date.now()

			if (this.getCurrentTime() > resolveTime) {
				this.emit(
					'warning',
					`Resolver is ${
						this.getCurrentTime() - resolveTime
					} ms late (estimatedResolveTime was ${estimatedResolveTime})`
				)
			}

			const layersPerDevice = this.filterLayersPerDevice(
				tlState.layers,
				Array.from(this.devices.values()).filter((d) => d.initialized === true)
			)

			// Push state to the right device:
			await this._mapAllDevices(false, async (device: DeviceContainer<DeviceOptionsBase<any>>): Promise<void> => {
				if (this._options.optimizeForProduction) {
					// Don't send any state to the abstract device, since it doesn't do anything anyway
					if (device.deviceType === DeviceType.ABSTRACT) return
				}

				// The subState contains only the parts of the state relevant to that device:
				const subState: TimelineState = {
					time: tlState.time,
					layers: layersPerDevice[device.deviceId] || {},
					nextEvents: [],
				}

				// Pass along the state to the device, it will generate its commands and execute them:
				try {
					await device.device.handleState(removeParentFromState(subState), this._mappings)
				} catch (e) {
					this.emit('error', 'Error in device "' + device.deviceId + '"' + e + ' ' + (e as Error).stack)
				}
			})

			statTimeStateHandled = Date.now()

			// Now that we've handled this point in time, it's time to determine what the next point in time is:
			let nextEventTime: number | null = null
			_.each(tlState.nextEvents, (event) => {
				if (event.time && event.time > now && (!nextEventTime || event.time < nextEventTime)) {
					nextEventTime = event.time
				}
			})

			const nowPostExec = this.getCurrentTime()
			if (nextEventTime) {
				timeUntilNextResolve = Math.max(
					MINTRIGGERTIME, // At minimum, we should wait this time
					Math.min(
						LOOKAHEADTIME, // We should wait maximum this time, because we might have deferred a resolving this far ahead
						RESOLVE_LIMIT_TIME, // We should wait maximum this time, because we've only resolved repeating objects this far
						nextEventTime - nowPostExec - PREPARETIME
					)
				)
				// resolve at nextEventTime next time:
				nextResolveTime = Math.min(tlState.time + LOOKAHEADTIME, nextEventTime)
			} else {
				// there's nothing ahead in the timeline,
				// Tell the devices that the future is clear:
				await this._mapAllDevices(true, async (device: DeviceContainer<DeviceOptionsBase<any>>) => {
					try {
						await device.device.clearFuture(tlState.time)
					} catch (e) {
						this.emit(
							'error',
							'Error in device "' + device.deviceId + '", clearFuture: ' + e + ' ' + (e as Error).stack
						)
					}
				})

				// resolve at this time then next time (or later):
				nextResolveTime = Math.min(tlState.time)
			}

			// Special function: send callback to Core
			this._doOnTime.clearQueueNowAndAfter(tlState.time)

			const activeObjects: TimelineCallbacks = {}
			_.each(tlState.layers, (instance: ResolvedTimelineObjectInstance) => {
				try {
					if (instance.content.callBack || instance.content.callBackStopped) {
						const callBackId =
							instance.id +
							instance.content.callBack +
							instance.content.callBackStopped +
							instance.instance.start +
							JSON.stringify(instance.content.callBackData)
						activeObjects[callBackId] = {
							time: instance.instance.start || 0,
							id: instance.id,
							callBack: instance.content.callBack,
							callBackStopped: instance.content.callBackStopped,
							callBackData: instance.content.callBackData,
							startTime: instance.instance.start,
						}
					}
				} catch (e) {
					this.emit('error', `callback to core, obj "${instance.id}"`, e)
				}
			})

			this._doOnTime.queue(
				tlState.time,
				undefined,
				(sentCallbacksNew) => {
					this._diffStateForCallbacks(sentCallbacksNew)
				},
				activeObjects
			)

			const resolveDuration = Date.now() - startTime
			// Special / hack: report back, for latency statitics:
			if (this._timelineHash) {
				this.emit('resolveDone', this._timelineHash, resolveDuration)
			}

			this.emitWhenActive(
				'debug',
				'resolveTimeline at time ' + resolveTime + ' done in ' + resolveDuration + 'ms (size: ' + timeline.length + ')'
			)
		} catch (e) {
			this.emit('error', 'resolveTimeline' + e + '\nStack: ' + (e as Error).stack)
		}

		// Report time taken to resolve
		this.emit('timeTrace', endTrace(trace))
		this.statReport(statMeasureStart, {
			timelineStartResolve: statTimeTimelineStartResolve,
			timelineSize: this.getTimelineSize(),
			timelineSizeOld: this._timeline.length,
			timelineResolved: statTimeTimelineResolved,
			stateHandled: statTimeStateHandled,
			done: Date.now(),
			estimatedResolveTime: estimatedResolveTime,
		})

		// Try to trigger the next resolval
		try {
			this._triggerResolveTimeline(timeUntilNextResolve)
		} catch (e) {
			this.emit('error', 'triggerResolveTimeline', e)
		}
		return nextResolveTime
	}
	getTimelineSize(): number {
		if (this._timelineSize === undefined) {
			// Update the cache:

			this._timelineSize = this.getTimelineSizeInner(this._timeline)
		}
		return this._timelineSize
	}
	private getTimelineSizeInner(timelineObjects: TimelineObject[]): number {
		let size = 0
		size += timelineObjects.length
		for (const obj of timelineObjects) {
			if (obj.children) {
				size += this.getTimelineSizeInner(obj.children)
			}
			if (obj.keyframes) {
				size += obj.keyframes.length
			}
		}
		return size
	}
	/**
	 * Returns a time estimate for the resolval duration based on the amount of
	 * objects on the timeline. If the proActiveResolve option is falsy this
	 * returns 0.
	 */
	estimateResolveTime(): number {
		if (this._options.proActiveResolve) {
			const objectCount = this.getTimelineSize()
			return Conductor.calculateResolveTime(objectCount, this._estimateResolveTimeMultiplier)
		} else {
			return 0
		}
	}
	/** Calculates the estimated time it'll take to resolve a timeline of a certain size */
	static calculateResolveTime(timelineSize: number, multiplier: number): number {
		// Note: The LEVEL should really be a dynamic value, to reflect the actual performance of the hardware this is running on.

		const BASE_VALUE = 0
		const LEVEL = 250

		const EXPONENT = 0.7
		const MIN_VALUE = 20
		const MAX_VALUE = 200

		const sizeFactor = Math.pow(timelineSize / LEVEL, EXPONENT) * LEVEL * 0.5 // a pretty nice-looking graph that levels out when objectCount is larger
		return (
			multiplier *
			Math.max(
				MIN_VALUE,
				Math.min(
					MAX_VALUE,
					Math.floor(
						BASE_VALUE + sizeFactor // add ms for every object (ish) in timeline
					)
				)
			)
		)
	}

	private _diffStateForCallbacks(activeObjects: TimelineCallbacks) {
		const sentCallbacks: TimelineCallbacks = this._sentCallbacks
		const time = this.getCurrentTime()

		// clear callbacks scheduled after the current tlState
		_.each(sentCallbacks, (o: TimelineCallback, callbackId: string) => {
			if (o.time >= time) {
				delete sentCallbacks[callbackId]
			}
		})
		// Send callbacks for started objects
		_.each(activeObjects, (cb, callBackId) => {
			if (cb.callBack && cb.startTime) {
				if (!sentCallbacks[callBackId]) {
					// Object has started playing
					this._queueCallback(true, {
						type: 'start',
						time: cb.startTime,
						instanceId: cb.id,
						callBack: cb.callBack,
						callBackData: cb.callBackData,
					})
				} else {
					// callback already sent, do nothing
				}
			}
		})
		// Send callbacks for stopped objects
		_.each(sentCallbacks, (cb, callBackId: string) => {
			if (cb.callBackStopped && !activeObjects[callBackId]) {
				// Object has stopped playing
				this._queueCallback(false, {
					type: 'stop',
					time: time,
					instanceId: cb.id,
					callBack: cb.callBackStopped,
					callBackData: cb.callBackData,
				})
			}
		})
		this._sentCallbacks = activeObjects
	}
	private _queueCallback(playing: boolean, cb: QueueCallback): void {
		let o: CallbackInstance

		if (this._callbackInstances.has(cb.instanceId)) {
			o = this._callbackInstances.get(cb.instanceId)!
		} else {
			o = {
				playing: undefined,
				playChanged: false,
				endChanged: false,
			}
			this._callbackInstances.set(cb.instanceId, o)
		}

		if (o.playing !== playing) {
			this.emitWhenActive('debug', `_queueCallback ${playing ? 'playing' : 'stopping'} instance ${cb.instanceId}`)

			if (playing) {
				if (o.endChanged && o.endTime && Math.abs(cb.time - o.endTime) < CALLBACK_WAIT_TIME) {
					// Too little time has passed since last time. Annihilate that event instead:

					o.playing = playing
					o.endTime = undefined
					o.endCallback = undefined
					o.endChanged = false
				} else {
					o.playing = playing
					o.playChanged = true

					o.playTime = cb.time
					o.playCallback = cb
				}
			} else {
				if (o.playChanged && o.playTime && Math.abs(cb.time - o.playTime) < CALLBACK_WAIT_TIME) {
					// Too little time has passed since last time. Annihilate that event instead:

					o.playing = playing
					o.playTime = undefined
					o.playCallback = undefined
					o.playChanged = false
				} else {
					o.playing = playing
					o.endChanged = true

					o.endTime = cb.time
					o.endCallback = cb
				}
			}
		} else {
			this.emit(
				'warning',
				`_queueCallback ${playing ? 'playing' : 'stopping'} instance ${cb.instanceId} already playing/stopped`
			)
		}

		this._triggerSendStartStopCallbacks()
	}
	private _triggerSendStartStopCallbacks() {
		if (!this._triggerSendStartStopCallbacksTimeout) {
			this._triggerSendStartStopCallbacksTimeout = setTimeout(() => {
				this._triggerSendStartStopCallbacksTimeout = null
				this._sendStartStopCallbacks()
			}, CALLBACK_WAIT_TIME)
		}
	}
	private _sendStartStopCallbacks() {
		const now = this.getCurrentTime()

		let haveThingsToSendLater = false

		const callbacks: QueueCallback[] = []

		for (const [instanceId, o] of this._callbackInstances.entries()) {
			if (o.endChanged && o.endTime && o.endCallback) {
				if (o.endTime < now - CALLBACK_WAIT_TIME) {
					callbacks.push(o.endCallback)
					o.endChanged = false
				} else {
					haveThingsToSendLater = true
				}
			}

			if (o.playChanged && o.playTime && o.playCallback) {
				if (o.playTime < now - CALLBACK_WAIT_TIME) {
					callbacks.push(o.playCallback)
					o.playChanged = false
				} else {
					haveThingsToSendLater = true
				}
			}

			if (!haveThingsToSendLater && !o.playChanged && !o.endChanged) {
				this._callbackInstances.delete(instanceId)
			}
		}

		// Sort the callbacks:
		const callbacksArray = Object.values(callbacks).sort((a, b) => {
			if (a.type === 'start' && b.type !== 'start') return 1
			if (a.type !== 'start' && b.type === 'start') return -1

			if ((a.time || 0) > (b.time || 0)) return 1
			if ((a.time || 0) < (b.time || 0)) return -1

			return 0
		})

		// emit callbacks
		_.each(callbacksArray, (cb) => {
			this.emit('timelineCallback', cb.time, cb.instanceId, cb.callBack, cb.callBackData)
		})

		if (haveThingsToSendLater) {
			this._triggerSendStartStopCallbacks()
		}
	}

	private statStartMeasure(reason: string) {
		// Start a measure of response times

		if (!this._statMeasureStart) {
			this._statMeasureStart = Date.now()
			this._statMeasureReason = reason
		}
	}
	private statReport(startTime: number, report: StatReport) {
		// Check if the report is from the start of a measuring
		if (this._statMeasureStart && this._statMeasureStart === startTime) {
			// Save the report:
			const reportDuration: StatReport = {
				reason: this._statMeasureReason,
				timelineStartResolve: report.timelineStartResolve - startTime,
				timelineResolved: report.timelineResolved - startTime,
				stateHandled: report.stateHandled - startTime,
				done: report.done - startTime,
				timelineSize: report.timelineSize,
				timelineSizeOld: report.timelineSizeOld,
				estimatedResolveTime: report.estimatedResolveTime,
			}
			this._statReports.push(reportDuration)
			this._statMeasureStart = 0
			this._statMeasureReason = ''

			this.emit('debug', 'statReport', JSON.stringify(reportDuration))
			this.emit('statReport', reportDuration)
		}
	}
	/**
	 * Split the state into substates that are relevant for each device
	 */
	private filterLayersPerDevice(layers: TimelineState['layers'], devices: DeviceContainer<DeviceOptionsBase<any>>[]) {
		const filteredStates: { [deviceId: string]: { [layerId: string]: ResolvedTimelineObjectInstance } } = {}

		const deviceIdAndTypes: { [idAndTyoe: string]: string } = {}

		_.each(devices, (device) => {
			deviceIdAndTypes[device.deviceId + '__' + device.deviceType] = device.deviceId
		})
		_.each(layers, (o: ResolvedTimelineObjectInstance, layerId: string) => {
			const oExt: ResolvedTimelineObjectInstanceExtended = o
			let mapping: Mapping = this._mappings[o.layer + '']
			if (!mapping && oExt.isLookahead && oExt.lookaheadForLayer) {
				mapping = this._mappings[oExt.lookaheadForLayer]
			}
			if (mapping) {
				const deviceIdAndType = mapping.deviceId + '__' + mapping.device

				if (deviceIdAndTypes[deviceIdAndType]) {
					if (!filteredStates[mapping.deviceId]) {
						filteredStates[mapping.deviceId] = {}
					}
					filteredStates[mapping.deviceId][layerId] = o
				}
			}
		})
		return filteredStates
	}
	/**
	 * Only emits the event when there is an active rundownPlaylist.
	 * This is used to reduce unnesessary logging
	 */
	private emitWhenActive(eventType: keyof ConductorEvents, ...args: any[]): void {
		if (this.activationId) {
			this.emit(eventType, ...args)
		}
	}
}
export type DeviceOptionsAnyInternal =
	| DeviceOptionsAbstractInternal
	| DeviceOptionsCasparCGInternal
	| DeviceOptionsAtemInternal
	| DeviceOptionsLawoInternal
	| DeviceOptionsHTTPSendInternal
	| DeviceOptionsHTTPWatcherInternal
	| DeviceOptionsPanasonicPTZInternal
	| DeviceOptionsTCPSendInternal
	| DeviceOptionsHyperdeckInternal
	| DeviceOptionsPharosInternal
	| DeviceOptionsOBSInternal
	| DeviceOptionsOSCInternal
	| DeviceOptionsSisyfosInternal
	| DeviceOptionsQuantelInternal
	| DeviceOptionsSingularLiveInternal
	| DeviceOptionsVMixInternal
	| DeviceOptionsShotokuInternal
	| DeviceOptionsVizMSEInternal
	| DeviceOptionsTelemetrics

function removeParentFromState(o: TimelineState): TimelineState {
	for (const key in o) {
		if (key === 'parent') {
			delete o['parent']
		} else if (typeof o[key] === 'object') {
			o[key] = removeParentFromState(o[key])
		}
	}
	return o
}
