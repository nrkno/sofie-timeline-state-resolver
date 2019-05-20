import * as _ from 'underscore'
import {
	TimelineState,
	ResolvedTimelineObjectInstance,
	ResolvedStates
} from 'superfly-timeline'

import { DeviceClassOptions } from './devices/device'
import { CasparCGDevice } from './devices/casparCG'
import { AbstractDevice } from './devices/abstract'
import { HttpSendDevice } from './devices/httpSend'
import {
	Mappings,
	Mapping,
	DeviceType,
	DeviceOptions,
	ResolvedTimelineObjectInstanceExtended,
	TSRTimeline
} from './types/src'
import { AtemDevice } from './devices/atem'
import { EventEmitter } from 'events'
import { LawoDevice } from './devices/lawo'
import { PanasonicPtzDevice } from './devices/panasonicPTZ'
import { HyperdeckDevice } from './devices/hyperdeck'
import { DoOnTime } from './doOnTime'
import { PharosDevice } from './devices/pharos'
import { OSCMessageDevice } from './devices/osc'
import { DeviceContainer } from './devices/deviceContainer'

export { DeviceContainer }
import { threadedClass, ThreadedClass } from 'threadedclass'
import { AsyncResolver } from './AsyncResolver'
import { HttpWatcherDevice } from './devices/httpWatcher'

export const LOOKAHEADTIME = 5000 // Will look ahead this far into the future
export const PREPARETIME = 2000 // Will prepare commands this time before the event is to happen
export const MINTRIGGERTIME = 10 // Minimum time between triggers
export const MINTIMEUNIT = 1 // Minimum unit of time

const RESOLVE_LIMIT_TIME = 10000

export const DEFAULT_PREPARATION_TIME = 20 // When resolving "now", move this far into the future, to account for computation times

export type TimelineTriggerTimeResult = Array<{id: string, time: number}>

export { Device } from './devices/device'
// export interface Device {}

export interface ConductorOptions {
	// devices: {
	// 	[deviceName: string]: DeviceOptions
	// },
	initializeAsClear?: boolean // don't do any initial checks with devices to determine state, instead assume that everything is clear, black and quiet
	getCurrentTime?: () => number
	autoInit?: boolean
	multiThreadedResolver?: boolean
	proActiveResolve?: boolean
}
interface TimelineCallback {
	time: number
	id: string
	callBack?: string
	callBackStopped?: string
	callBackData: any
}
type TimelineCallbacks = {[key: string]: TimelineCallback}
interface QueueCallback {
	type: 'start' | 'stop'
	time: number | null | undefined
	id: string
	callBack: string
	callBackData: any
}
interface StatReport {
	reason?: string
	timelineStartResolve: number
	timelineResolved: number
	stateHandled: number,
	done: number,
}

/**
 * The Conductor class serves as the main class for interacting. It contains
 * methods for setting mappings, timelines and adding/removing devices. It keeps
 * track of when to resolve the timeline and updates the devices with new states.
 */
export class Conductor extends EventEmitter {

	private _logDebug: boolean = false
	private _timeline: TSRTimeline = []
	private _mapping: Mappings = {}

	private _options: ConductorOptions

	private devices: {[deviceId: string]: DeviceContainer} = {}

	private _getCurrentTime?: () => number

	private _nextResolveTime: number = 0
	private _resolvedStates: {
		resolvedStates: ResolvedStates | null,
		resolveTime: number
	} = {
		resolvedStates: null,
		resolveTime: 0
	}
	private _resolveTimelineTrigger: NodeJS.Timer
	private _isInitialized: boolean = false
	private _doOnTime: DoOnTime
	private _multiThreadedResolver: boolean = false

	private _queuedCallbacks: QueueCallback[] = []
	private _triggerSendStartStopCallbacksTimeout: NodeJS.Timer | null = null
	private _sentCallbacks: TimelineCallbacks = {}

	private _statMeasureStart: number = 0
	private _statMeasureReason: string = ''
	private _statReports: StatReport[] = []

	private _resolveTimelineRunning: boolean = false
	private _resolveTimelineOnQueue: boolean = false

	private _resolver: ThreadedClass<AsyncResolver>

	private _interval: NodeJS.Timer

	constructor (options: ConductorOptions = {}) {
		super()
		this._options = options

		this._options = this._options // ts-lint fix: not used

		this._multiThreadedResolver = !!options.multiThreadedResolver

		if (options.getCurrentTime) this._getCurrentTime = options.getCurrentTime

		this._interval = setInterval(() => {
			if (this.timeline) {
				this._resolveTimeline()
			}
		}, 2500)
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		})
		this._doOnTime.on('error', e => this.emit('error', e))
		// this._doOnTime.on('callback', (...args) => {
		// 	this.emit('timelineCallback', ...args)
		// })

		if (options.autoInit) {
			this.init()
			.catch((e) => {
				this.emit('error','Error during auto-init: ', e)
			})
		}

	}
	/**
	 * Initializates the resolver, with optional multithreading
	 */
	public async init (): Promise<void> {
		this._resolver = await threadedClass<AsyncResolver>(
			'../dist/AsyncResolver.js',
			AsyncResolver,
			[],
			{
				threadUsage: this._multiThreadedResolver ? 1 : 0,
				autoRestart: true,
				disableMultithreading: !this._multiThreadedResolver
			}
		)
		await this._resolver.on('setTimelineTriggerTime', (r) => {
			this.emit('setTimelineTriggerTime', r)
		})
		await this._resolver.on('info', (...args) => this.emit('info', 'Resolver', ...args))
		await this._resolver.on('debug', (...args) => this.emit('debug', 'Resolver', ...args))
		await this._resolver.on('error', (...args) => this.emit('error', 'Resolver', ...args))
		await this._resolver.on('warning', (...args) => this.emit('warning', 'Resolver', ...args))

		this._isInitialized = true
		this.resetResolver()
	}
	/**
	 * Returns a nice, synchronized time.
	 */
	public getCurrentTime () {

		if (this._getCurrentTime) {
			// return 0
			return this._getCurrentTime()
		} else {
			return Date.now()
		}
	}
	/**
	 * Returns the mappings
	 */
	get mapping (): Mappings {
		return this._mapping
	}
	/**
	 * Updates the mappings in the Conductor class and all devices and forces
	 * a resolve timeline.
	 * @param mapping The new mappings
	 */
	async setMapping (mapping: Mappings) {
		// Set mapping
		// re-resolve timeline
		this._mapping = mapping

		let ps: Promise<any>[] = []
		_.each(this.devices, (d: DeviceContainer) => {
			// @ts-ignore
			ps.push(d.device.setMapping(mapping))
		})
		await Promise.all(ps)

		if (this._timeline) {
			this._resolveTimeline()
		}
	}
	/**
	 * Returns the current timeline
	 */
	get timeline (): TSRTimeline {
		return this._timeline
	}
	/**
	 * Sets a new timeline and resets the resolver.
	 */
	set timeline (timeline: TSRTimeline) {
		this.statStartMeasure('timeline received')
		this._timeline = timeline

		// We've got a new timeline, anything could've happened at this point
		// Highest priority right now is to determine if any commands have to be sent RIGHT NOW
		// After that, we'll move further ahead in time, creating commands ready for scheduling

		this.resetResolver()

	}
	get logDebug (): boolean {
		return this._logDebug
	}
	set logDebug (val: boolean) {
		this._logDebug = val
	}

	public getDevices (): Array<DeviceContainer> {
		return _.values(this.devices)
	}
	public getDevice (deviceId: string): DeviceContainer {
		return this.devices[deviceId]
	}

	/**
	 * Adds a a device that can be referenced by the timeline and mappings.
	 * @param deviceId Id used by the mappings to reference the device.
	 * @param deviceOptions The options used to initalize the device
	 * @returns A promise that resolves with the created device, or rejects with an error message.
	 */
	public async addDevice (deviceId, deviceOptions: DeviceOptions): Promise<DeviceContainer> {
		try {
			let newDevice: DeviceContainer
			let threadedClassOptions = {
				threadUsage: deviceOptions.threadUsage || 1,
				autoRestart: true,
				disableMultithreading: !deviceOptions.isMultiThreaded
			}

			let options: DeviceClassOptions = {
				getCurrentTime: () => { return this.getCurrentTime() }
			}

			if (deviceOptions.type === DeviceType.ABSTRACT) {
				newDevice = await new DeviceContainer().create<CasparCGDevice>(
					'../../dist/devices/abstract.js',
					AbstractDevice,
					deviceId,
					deviceOptions,
					options,
					{
						threadUsage: deviceOptions.isMultiThreaded ? .1 : 0,
						autoRestart: true,
						disableMultithreading: !deviceOptions.isMultiThreaded
					}
				)
			} else if (deviceOptions.type === DeviceType.CASPARCG) {
				// Add CasparCG device:
				newDevice = await new DeviceContainer().create<CasparCGDevice>(
					'../../dist/devices/casparCG.js',
					CasparCGDevice,
					deviceId,
					deviceOptions,
					options,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.ATEM) {
				newDevice = await new DeviceContainer().create<AtemDevice>(
					'../../dist/devices/atem.js',
					AtemDevice,
					deviceId,
					deviceOptions,
					options,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.HTTPSEND) {
				newDevice = await new DeviceContainer().create<HttpSendDevice>(
					'../../dist/devices/httpSend.js',
					HttpSendDevice,
					deviceId,
					deviceOptions,
					options,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.HTTPWATCHER) {
				newDevice = await new DeviceContainer().create<HttpWatcherDevice>(
					'../../dist/devices/httpWatcher.js',
					HttpWatcherDevice,
					deviceId,
					deviceOptions,
					options,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.LAWO) {
				newDevice = await new DeviceContainer().create<LawoDevice>(
					'../../dist/devices/lawo.js',
					LawoDevice,
					deviceId,
					deviceOptions,
					options,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.PANASONIC_PTZ) {
				newDevice = await new DeviceContainer().create<PanasonicPtzDevice>(
					'../../dist/devices/panasonicPTZ.js',
					PanasonicPtzDevice,
					deviceId,
					deviceOptions,
					options,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.HYPERDECK) {
				newDevice = await new DeviceContainer().create<HyperdeckDevice>(
					'../../dist/devices/hyperdeck.js',
					HyperdeckDevice,
					deviceId,
					deviceOptions,
					options,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.PHAROS) {
				newDevice = await new DeviceContainer().create<PharosDevice>(
					'../../dist/devices/pharos.js',
					PharosDevice,
					deviceId,
					deviceOptions,
					options,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.OSC) {
				newDevice = await new DeviceContainer().create<OSCMessageDevice>(
					'../../dist/devices/osc.js',
					OSCMessageDevice,
					deviceId,
					deviceOptions,
					options,
					threadedClassOptions
				)
			} else {
				return Promise.reject('No matching multithreaded device type for "' +
				deviceOptions.type + '" ("' + DeviceType[deviceOptions.type] + '") found')
			}

			newDevice.device.on('debug', (...e) => {
				if (this.logDebug) {
					this.emit('debug', newDevice.deviceId, ...e)
				}
			}).catch(console.error)

			let deviceName = newDevice.deviceName

			const fixError = (e) => {

				let name = `Device "${deviceName || deviceId}"`
				if (e.reason) e.reason = name + ': ' + e.reason
				if (e.message) e.message = name + ': ' + e.message
				if (e.stack) {
					e.stack += '\nAt device' + name
				}
				if (_.isString(e)) e = name + ': ' + e

				return e
			}
			newDevice.device.on('info',		(e, ...args) => this.emit('info', 		fixError(e), ...args)).catch(console.error)
			newDevice.device.on('warning',	(e, ...args) => this.emit('warning', 	fixError(e), ...args)).catch(console.error)
			newDevice.device.on('error',	(e, ...args) => this.emit('error', 		fixError(e), ...args)).catch(console.error)
			newDevice.device.on('resetResolver', () => this.resetResolver()).catch(console.error)

			this.emit('info', 'Initializing ' + DeviceType[deviceOptions.type] + '...')
			this.devices[deviceId] = newDevice
			// @ts-ignore
			await newDevice.device.setMapping(this.mapping)

			await newDevice.device.init(deviceOptions.options)

			deviceName = newDevice.deviceName
			this.emit('info', (DeviceType[deviceOptions.type] + ' initialized!'))
			return newDevice

		} catch (e) {
			this.emit('error', 'conductor.addDevice', e)
			return Promise.reject(e)
		}
	}
	/**
	 * Safely remove a device
	 * @param deviceId The id of the device to be removed
	 */
	public removeDevice (deviceId: string): Promise<void> {
		let device = this.devices[deviceId]

		if (device) {
			return device.device.terminate()
			.then((res) => {
				if (res) {
					delete this.devices[deviceId]
				}
			})
		} else {
			return Promise.reject('No device found')
		}
	}
	/**
	 * Remove all devices
	 */
	public async destroy (): Promise<void> {

		clearTimeout(this._interval)

		await Promise.all(_.map(_.keys(this.devices), (deviceId: string) => {
			return this.removeDevice(deviceId)
		}))
	}
	/**
	 * Resets the resolve-time, so that the resolving will happen for the point-in time NOW
	 * next time
	 */
	public resetResolver () {

		this._nextResolveTime = 0 // This will cause _resolveTimeline() to generate the state for NOW
		this._resolvedStates = {
			resolvedStates: null,
			resolveTime: 0
		}

		this._triggerResolveTimeline()
	}
	/**
	 * Send a makeReady-trigger to all devices
	 */
	public devicesMakeReady (okToDestroyStuff?: boolean): Promise<void> {
		let p = Promise.resolve()
		_.each(this.devices, (d: DeviceContainer) => {
			p = p.then(async () => {
				return d.device.makeReady(okToDestroyStuff)
			})
		})
		this._resolveTimeline()
		return p
	}
	/**
	 * Send a standDown-trigger to all devices
	 */
	public devicesStandDown (okToDestroyStuff?: boolean): Promise<void> {
		let p = Promise.resolve()
		_.each(this.devices, (d: DeviceContainer) => {
			p = p.then(async () => {
				return d.device.standDown(okToDestroyStuff)
			})
		})
		return p
	}
	/**
	 * This is the main resolve-loop.
	 */
	private _triggerResolveTimeline (timeUntilTrigger?: number) {

		// this.emit('info', '_triggerResolveTimeline', timeUntilTrigger)

		if (this._resolveTimelineTrigger) {
			clearTimeout(this._resolveTimelineTrigger)
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
	private _resolveTimeline () {
		if (this._resolveTimelineRunning) {
			// If a resolve is already running, put in queue to run later:
			this._resolveTimelineOnQueue = true
			return
		}

		this._resolveTimelineRunning = true
		this._resolveTimelineInner()
		.catch(e => {
			this.emit('error', 'Caught error in _resolveTimelineInner' + e)
		})
		.then((nextResolveTime) => {
			this._resolveTimelineRunning = false
			if (this._resolveTimelineOnQueue) {
				// re-run the resolver right away, again

				this._resolveTimelineOnQueue = false
				this._triggerResolveTimeline(0)
			} else {
				this._nextResolveTime = nextResolveTime || 0
			}
		})
		.catch(e => {
			this.emit('error', 'Caught error in _resolveTimeline.then' + e)
		})
	}
	private async _resolveTimelineInner () {
		if (!this._isInitialized) {
			this.emit('warning', 'TSR is not initialized yet')
			return
		}

		let nextResolveTime: number = 0
		let timeUntilNextResolve = LOOKAHEADTIME
		let startTime = Date.now()

		let statMeasureStart: number = this._statMeasureStart
		let statTimeStateHandled: number = 0
		let statTimeTimelineStartResolve: number = 0
		let statTimeTimelineResolved: number = 0

		try {
			const now = this.getCurrentTime()

			if (this._nextResolveTime < now) {
				this._nextResolveTime = now
			}

			let resolveTime: number = this._nextResolveTime

			if (!this._nextResolveTime) {
				let estimatedResolveTime = this.estimateResolveTime()
				resolveTime = now + estimatedResolveTime
				this.emit('info', 'resolveTimeline ' + resolveTime + ' (+' + estimatedResolveTime + ') -----------------------------')
			} else {
				this.emit('info', 'resolveTimeline ' + resolveTime + ' -----------------------------')
			}

			if (resolveTime > now + LOOKAHEADTIME) {
				this.emit('debug', 'Too far ahead (' + resolveTime + ')')
				this._triggerResolveTimeline(LOOKAHEADTIME)
				return
			}

			const fixObject = (o) => {
				if (nowIds[o.id]) o.enable.start = nowIds[o.id]
				delete o['parent']
				if (o.isGroup) {
					if (o.content.objects) {
						_.each(o.content.objects, (child) => {
							fixObject(child)
						})
					}
				}
			}

			statTimeTimelineStartResolve = Date.now()
			const nowIds: {[id: string]: number} = {}
			let timeline: TSRTimeline = this.timeline

			// To prevent trying to transfer multithreaded objects over IPC we remove
			// any references to the parent property:
			_.each(timeline, (o) => {
				fixObject(o)
			})

			let resolvedStates: ResolvedStates
			let objectsFixed: { id: string, time: number}[] = []
			if (
				this._resolvedStates.resolvedStates &&
				this._resolvedStates.resolveTime >= now &&
				this._resolvedStates.resolveTime < now + RESOLVE_LIMIT_TIME
			) {
				resolvedStates = this._resolvedStates.resolvedStates
			} else {
				let o = await this._resolver.resolveTimeline(
					resolveTime,
					this.timeline,
					RESOLVE_LIMIT_TIME
				)
				resolvedStates = o.resolvedStates
				objectsFixed = o.objectsFixed
			}

			let tlState = await this._resolver.getState(
				resolvedStates,
				resolveTime
			)

			// Apply changes to fixed objects (set "now" triggers to an actual time):
			_.each(objectsFixed, (o) => {
				nowIds[o.id] = o.time
			})
			_.each(timeline, (o) => {
				fixObject(o)
			})

			statTimeTimelineResolved = Date.now()

			if (this.getCurrentTime() > resolveTime) {
				this.emit('warn', `Resolver is ${this.getCurrentTime() - resolveTime} ms late`)
			}

			// Split the state into substates that are relevant for each device
			let getFilteredLayers = async (layers: TimelineState['layers'], device: DeviceContainer) => {
				let filteredState = {}
				const deviceId = device.deviceId
				const deviceType = device.deviceType
				_.each(layers, async (o: ResolvedTimelineObjectInstance, layerId: string) => {
					const oExt: ResolvedTimelineObjectInstanceExtended = o

					let mapping: Mapping = this._mapping[o.layer + '']
					if (!mapping && oExt.isLookahead && oExt.lookaheadForLayer) {
						mapping = this._mapping[oExt.lookaheadForLayer]
					}
					if (mapping) {
						if (
							mapping.deviceId === deviceId &&
							mapping.device === deviceType
						) {
							filteredState[layerId] = o
						}
					}
				})
				return filteredState
			}

			// push state to the right device
			let ps: Promise<any>[] = []
			ps = _.map(this.devices, async (device: DeviceContainer) => {
				// The subState contains only the parts of the state relevant to that device
				let subState: TimelineState = {
					time: tlState.time,
					layers: await getFilteredLayers(tlState.layers, device),
					nextEvents: []
				}
				let removeParent = o => {
					for (let key in o) {
						if (key === 'parent') {
							delete o['parent']
						} else if (typeof o[key] === 'object') {
							o[key] = removeParent(o[key])
						}
					}
					return o
				}
				// Pass along the state to the device, it will generate its commands and execute them:
				await device.device.handleState(removeParent(subState))
				.catch(e => {
					this.emit('error', 'Error in device "' + device.deviceId + '"' + e + ' ' + e.stack)
				})
			})
			await Promise.all(ps)

			statTimeStateHandled = Date.now()

			// Now that we've handled this point in time, it's time to determine what the next point in time is:
			let nextEventTime: number | null = null
			_.each(tlState.nextEvents, event => {
				if (
					event.time &&
					event.time > now &&
					(
						!nextEventTime ||
						event.time < nextEventTime
					)
				) {
					nextEventTime = event.time
				}
			})
			// let nextEventTime = await this._resolver.getNextTimelineEvent(timeline, tlState.time)

			const nowPostExec = this.getCurrentTime()
			if (nextEventTime) {

				timeUntilNextResolve = Math.max(MINTRIGGERTIME,
					Math.min(LOOKAHEADTIME,
						(nextEventTime - nowPostExec) - PREPARETIME
					)
				)

				// resolve at nextEventTime next time:
				nextResolveTime = Math.min(tlState.time + LOOKAHEADTIME, nextEventTime)

			} else {
				// there's nothing ahead in the timeline,
				// Tell the devices that the future is clear:
				ps = _.map(this.devices, (device: DeviceContainer) => {
					return device.device.clearFuture(tlState.time)
					.catch((e) => {
						this.emit('error', 'Error in device "' + device.deviceId + '", clearFuture: ' + e + ' ' + e.stack)
					})
				})
				await Promise.all(ps)

				// resolve at this time then next time (or later):
				nextResolveTime = Math.min(tlState.time)
			}

			// Special function: send callback to Core
			let sentCallbacksOld: TimelineCallbacks = this._sentCallbacks
			let sentCallbacksNew: TimelineCallbacks = {}
			this._doOnTime.clearQueueNowAndAfter(tlState.time)

			// clear callbacks scheduled after the current tlState
			_.each(sentCallbacksOld, (o: TimelineCallback, callbackId: string) => {
				if (o.time >= tlState.time) delete sentCallbacksOld[callbackId]
			})
			// schedule callbacks to be executed
			_.each(tlState.layers, (instance: ResolvedTimelineObjectInstance) => {

				try {
					if (instance.content.callBack || instance.content.callBackStopped) {
						let callBackId = (
							instance.id +
							instance.content.callBack +
							instance.content.callBackStopped +
							instance.instance.start +
							JSON.stringify(instance.content.callBackData)
						)
						sentCallbacksNew[callBackId] = {
							time: instance.instance.start || 0,
							id: instance.id,
							callBack: instance.content.callBack,
							callBackStopped: instance.content.callBackStopped,
							callBackData: instance.content.callBackData
						}
						if (instance.content.callBack && instance.instance.start) {
							this._doOnTime.queue(instance.instance.start, () => {
								if (!sentCallbacksOld[callBackId]) {
									// Object has started playing
									this._queueCallback({
										type: 'start',
										time: instance.instance.start,
										id: instance.id,
										callBack: instance.content.callBack,
										callBackData: instance.content.callBackData
									})
								} else {
									// callback already sent, do nothing
								}
							})
						}
					}
				} catch (e) {
					this.emit('error', `callback to core, obj "${instance.id}"`, e)
				}
			})
			_.each(sentCallbacksOld, (cb, callBackId: string) => {
				if (cb.callBackStopped) {
					if (!sentCallbacksNew[callBackId]) {
						// Object has stopped playing
						this._queueCallback({
							type: 'stop',
							time: tlState.time,
							id: cb.id,
							callBack: cb.callBackStopped,
							callBackData: cb.callBackData
						})
					}
				}
			})
			this._sentCallbacks = sentCallbacksNew

			this.emit('info', 'resolveTimeline at time ' + resolveTime + ' done in ' + (Date.now() - startTime) + 'ms (size: ' + this.timeline.length + ')')
		} catch (e) {
			this.emit('error', 'resolveTimeline' + e + '\nStack: ' + e.stack)
		}

		// Report time taken to resolve
		this.statReport(statMeasureStart, {
			timelineStartResolve: statTimeTimelineStartResolve,
			timelineResolved: statTimeTimelineResolved,
			stateHandled: statTimeStateHandled,
			done: Date.now()
		})

		// Try to trigger the next resolval
		try {
			this._triggerResolveTimeline(timeUntilNextResolve)
		} catch (e) {
			this.emit('error', 'triggerResolveTimeline', e)
		}
		return nextResolveTime
	}
	/**
	 * Returns a time estimate for the resolval duration based on the amount of
	 * objects on the timeline. If the proActiveResolve option is falsy this
	 * returns 0.
	 */
	estimateResolveTime (): any {
		if (this._options.proActiveResolve) {
			let objectCount = this.timeline.length

			let sizeFactor = Math.pow(objectCount / 50, 0.5) * 50 // a pretty nice-looking graph that levels out when objectCount is larger
			return (
				Math.min(
					200,
					Math.floor(
						DEFAULT_PREPARATION_TIME +
						sizeFactor * 0.5 // add ms for every object (ish) in timeline
					)
				)
			)
		} else {
			return 0
		}
	}

	private _queueCallback (cb: QueueCallback) {
		this._queuedCallbacks.push(cb)
		this._triggerSendStartStopCallbacks()
	}
	private _triggerSendStartStopCallbacks () {
		if (this._triggerSendStartStopCallbacksTimeout) {
			clearTimeout(this._triggerSendStartStopCallbacksTimeout)
		}
		this._triggerSendStartStopCallbacksTimeout = setTimeout(() => {
			this._triggerSendStartStopCallbacksTimeout = null
			this._sendStartStopCallbacks()
		}, 100)
	}
	private _sendStartStopCallbacks () {
		// Go through the queue and filter out any stops that are immediately followed by a start:
		const startTimes: {[id: string]: number} = {}
		const stopTimes: {[id: string]: number} = {}

		const callbacks: {[id: string]: QueueCallback} = {}
		_.each(this._queuedCallbacks, cb => {
			callbacks[cb.id] = cb

			if (cb.time) {

				if (cb.type === 'start') {
					let prevTime = stopTimes[cb.id]
					if (prevTime) {
						if (Math.abs(prevTime - cb.time) < 50) {
							// Too little time has passed, remove that stop/start
							delete callbacks[cb.id]
						}
					}
					startTimes[cb.id] = cb.time
				} else if (cb.type === 'stop') {
					let prevTime = startTimes[cb.id]
					if (prevTime) {
						if (Math.abs(prevTime - cb.time) < 50) {
							// Too little time has passed, remove that stop/start
							delete callbacks[cb.id]
						}
					}
					stopTimes[cb.id] = cb.time
				}
			}
		})
		this._queuedCallbacks = []

		// sort the callbacks
		let callbacksArray = _.values(callbacks).sort((a, b) => {
			if (a.type === 'start' && b.type !== 'start') return 1
			if (a.type !== 'start' && b.type === 'start') return -1

			if ((a.time || 0) > (b.time || 0)) return 1
			if ((a.time || 0) < (b.time || 0)) return -1

			return 0
		})

		// emit callbacks
		_.each(callbacksArray, cb => {
			this.emit('timelineCallback',
				cb.time,
				cb.id,
				cb.callBack,
				cb.callBackData
			)
		})
	}

	private statStartMeasure (reason: string) {
		// Start a measure of response times

		if (!this._statMeasureStart) {
			this._statMeasureStart = Date.now()
			this._statMeasureReason = reason
		}
	}
	private statReport (
		startTime: number,
		report: StatReport
	) {
		// Check if the report is from the start of a measuring
		if (
			this._statMeasureStart &&
			this._statMeasureStart === startTime
		) {
			// Save the report:
			const reportDuration: StatReport = {
				reason:				this._statMeasureReason,
				timelineStartResolve: report.timelineStartResolve - startTime,
				timelineResolved:	report.timelineResolved - startTime,
				stateHandled: 		report.stateHandled - startTime,
				done: 				report.done - startTime
			}
			this._statReports.push(reportDuration)
			this._statMeasureStart = 0
			this._statMeasureReason = ''

			this.emit('info', 'statReport', JSON.stringify(reportDuration))
		}
	}
}
