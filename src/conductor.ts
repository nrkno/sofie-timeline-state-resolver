import * as _ from 'underscore'
import { Resolver,
	TimelineObject,
	TimelineState,
	TimelineResolvedObject,
	TriggerType
} from 'superfly-timeline'
let clone = require('fast-clone')

import { Device } from './devices/device'
import { CasparCGDevice } from './devices/casparCG'
import { AbstractDevice } from './devices/abstract'
import { HttpSendDevice } from './devices/httpSend'
import {
	Mappings,
	Mapping,
	DeviceType,
	DeviceOptions,
	TimelineResolvedObjectExtended
} from './types/src'
import { AtemDevice } from './devices/atem'
import { EventEmitter } from 'events'
import { LawoDevice } from './devices/lawo'
import { PanasonicPtzDevice } from './devices/panasonicPTZ'
import { HyperdeckDevice } from './devices/hyperdeck'
import { DoOnTime } from './doOnTime'
import { PharosDevice } from './devices/pharos'
import { OSCMessageDevice } from './devices/osc'
import { threadedClass, ThreadedClass } from 'threadedclass'

const LOOKAHEADTIME = 5000 // Will look ahead this far into the future
const PREPARETIME = 2000 // Will prepare commands this time before the event is to happen
const MINTRIGGERTIME = 10 // Minimum time between triggers
const MINTIMEUNIT = 1 // Minimum unit of time

export interface TimelineContentObject extends TimelineObject {
	// roId: string
}
export { TriggerType }

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
	isMultihreaded?: boolean
}
interface TimelineCallback {
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
/**
 * The main class that serves to interface with all functionality.
 */
export class Conductor extends EventEmitter {

	private _logDebug: boolean = false
	private _timeline: Array<TimelineContentObject> = []
	private _mapping: Mappings = {}

	private _options: ConductorOptions

	private devices: {[deviceId: string]: ThreadedClass<Device>} = {}

	private _getCurrentTime?: () => number

	private _nextResolveTime: number = 0
	private _resolveTimelineTrigger: NodeJS.Timer
	private _isInitialized: boolean = false
	private _doOnTime: DoOnTime
	private isMultiThreaded = false

	private _queuedCallbacks: QueueCallback[] = []
	private _triggerSendStartStopCallbacksTimeout: NodeJS.Timer | null = null
	private _sentCallbacks: TimelineCallbacks = {}

	constructor (options: ConductorOptions = {}) {
		super()
		this._options = options

		this._options = this._options // ts-lint fix: not used

		if (options.isMultihreaded) {
			this.isMultiThreaded = options.isMultihreaded
		}

		if (options.getCurrentTime) this._getCurrentTime = options.getCurrentTime

		setInterval(() => {
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
	 * Initialization, TODO, maybe do something here?
	 */
	public init (): Promise<void> {
		this._isInitialized = true
		this.resetResolver()

		return Promise.resolve()
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
	get mapping (): Mappings {
		return this._mapping
	}
	set mapping (mapping: Mappings) {
		// Set mapping
		// re-resolve timeline
		this._mapping = mapping
		_.each(this.devices, (device: ThreadedClass<Device>) => {
			// @ts-ignore
			device.mapping = mapping
		})

		if (this._timeline) {
			this._resolveTimeline()
		}
	}
	get timeline (): Array<TimelineContentObject | TimelineResolvedObjectExtended> {
		return this._timeline
	}
	set timeline (timeline: Array<TimelineContentObject | TimelineResolvedObjectExtended>) {

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

	public getDevices (): Array<ThreadedClass<Device>> {
		return _.values(this.devices)
	}
	public getDevice (deviceId: string): ThreadedClass<Device> {
		return this.devices[deviceId]
	}

	/**
	 * Adds a a device that can be referenced by the timeline and mappings.
	 * @param deviceId Id used by the mappings to reference the device.
	 * @returns A promise that resolves with the created device, or rejects with an error message.
	 */
	public async addDevice (deviceId, deviceOptions: DeviceOptions): Promise<ThreadedClass<Device>> {
		try {
			let newDevice: ThreadedClass<Device>
			let threadedClassOptions = {
				threadUsage: deviceOptions.threadUsage || 1,
				autoRestart: true,
				disableMultithreading: !this.isMultiThreaded
			}

			let options = {
				getCurrentTime: () => { return this.getCurrentTime() }
			}

			// if (this.isMultiThreaded) {
			if (deviceOptions.type === DeviceType.ABSTRACT) {
				newDevice = await threadedClass<AbstractDevice>(
					'../dist/devices/abstract.js',
					AbstractDevice,
					[ deviceId, deviceOptions, options ],
					{
						threadUsage: this.isMultiThreaded ? .1 : 0,
						autoRestart: true,
						disableMultithreading: !this.isMultiThreaded
					}
				)
			} else if (deviceOptions.type === DeviceType.CASPARCG) {
				// Add CasparCG device:
				newDevice = await threadedClass<CasparCGDevice>(
					'../dist/devices/casparCG.js',
					CasparCGDevice,
					[ deviceId, deviceOptions, options ],
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.ATEM) {
				newDevice = await threadedClass<AtemDevice>(
					'../dist/devices/atem.js',
					AtemDevice,
					[ deviceId, deviceOptions, options ],
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.HTTPSEND) {
				newDevice = await threadedClass<HttpSendDevice>(
					'../dist/devices/httpSend.js',
					HttpSendDevice,
					[ deviceId, deviceOptions, options ],
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.LAWO) {
				newDevice = await threadedClass<LawoDevice>(
					'../dist/devices/lawo.js',
					LawoDevice,
					[ deviceId, deviceOptions, options ],
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.PANASONIC_PTZ) {
				newDevice = await threadedClass<PanasonicPtzDevice>(
					'../dist/devices/panasonicPTZ.js',
					PanasonicPtzDevice,
					[ deviceId, deviceOptions, options ],
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.HYPERDECK) {
				newDevice = await threadedClass<HyperdeckDevice>(
					'../dist/devices/hyperdeck.js',
					HyperdeckDevice,
					[ deviceId, deviceOptions, options ],
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.PHAROS) {
				newDevice = await threadedClass<PharosDevice>(
					'../dist/devices/pharos.js',
					PharosDevice,
					[ deviceId, deviceOptions, options ],
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.OSC) {
				newDevice = await threadedClass<OSCMessageDevice>(
					'../dist/devices/osc.js',
					OSCMessageDevice,
					[ deviceId, deviceOptions, options ],
					threadedClassOptions
				)
			} else {
				return Promise.reject('No matching multithreaded device type for "' +
				deviceOptions.type + '" ("' + DeviceType[deviceOptions.type] + '") found')
			}

			newDevice.on('debug', (...e) => {
				if (this.logDebug) {
					this.emit('debug', newDevice.deviceId, ...e)
				}
			}).catch(() => null)
			newDevice.on('info',	(e) => this.emit('info', 	e)).catch(() => null)
			newDevice.on('warning',	(e) => this.emit('warning', e)).catch(() => null)
			newDevice.on('error',	(e) => this.emit('error', 	e)).catch(() => null)
			newDevice.on('resetResolver', () => this.resetResolver()).catch(() => null)

			this.emit('info', 'Initializing ' + DeviceType[deviceOptions.type] + '...')
			this.devices[deviceId] = newDevice
			// @ts-ignore
			newDevice.mapping = this.mapping

			return (newDevice).init(deviceOptions.options)
			.then(() => {
				this.emit('info', (DeviceType[deviceOptions.type] + ' initialized!'))
				return newDevice
			})
		} catch (e) {
			this.emit('error', 'conductor.addDevice', e)
			return Promise.reject(e)
		}
	}
	public removeDevice (deviceId: string): Promise<void> {
		let device = this.devices[deviceId]

		if (device) {
			return (device).terminate()
			.then((res) => {
				if (res) {
					delete this.devices[deviceId]
				}
			})
		} else {
			return Promise.reject('No device found')
		}
	}
	public destroy (): Promise<void> {
		return Promise.all(_.map(_.keys(this.devices), (deviceId: string) => {
			return this.removeDevice(deviceId)
		}))
		.then(() => {
			return
		})
	}
	// 	return Promise.all(ps)
	// }
	/**
	 * Resets the resolve-time, so that the resolving will happen for the point-in time NOW
	 * next time
	 */
	public resetResolver () {

		this._nextResolveTime = 0 // This will cause _resolveTimeline() to generate the state for NOW

		this._triggerResolveTimeline()
	}
	/**
	 * Send a makeReady-trigger to all devices
	 */
	public devicesMakeReady (okToDestroyStuff?: boolean): Promise<void> {
		let p = Promise.resolve()
		_.each(this.devices, (device: ThreadedClass<Device>) => {
			p = p.then(async () => {
				return device.makeReady(okToDestroyStuff)
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
		_.each(this.devices, (device: ThreadedClass<Device>) => {
			p = p.then(async () => {
				return device.standDown(okToDestroyStuff)
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
		let timeUntilNextResolve = LOOKAHEADTIME
		let startTime = Date.now()
		try {

			if (!this._isInitialized) {
				this.emit('warning', 'TSR is not initialized yet')
				return
			}
			const now = this.getCurrentTime()
			let resolveTime: number = this._nextResolveTime || now

			this.emit('debug', 'resolveTimeline ' + resolveTime + ' -----------------------------')

			if (resolveTime > now + LOOKAHEADTIME) {
				this.emit('debug', 'Too far ahead (' + resolveTime + ')')
				this._triggerResolveTimeline(LOOKAHEADTIME)
				return
			}

			this._fixNowObjects(resolveTime)

			let timeline = this.timeline
			_.each(timeline, (o) => {
				delete o['parent']
				if (o.isGroup) {
					if (o.content.objects) {
						_.each(o.content.objects, (o2) => {
							delete o2['parent']
						})
					}
				}
			})
			// @ts-ignore
			// this.emit('info', 'timeline', JSON.stringify(timeline, ' ', 2))

			// this.emit('info', 'EVENTS: ', JSON.stringify(Resolver.getNextEvents(clone(timeline), resolveTime, 100).map(e => {
			// 	return {
			// 		time: e.time,
			// 		id: e.obj.id,
			// 		type: e.type,
			// 		layer: e.obj.LLayer
			// 	}
			// })))

			// Generate the state for that time:
			let tlState = Resolver.getState(clone(timeline), resolveTime)

			_.each(tlState.LLayers, (obj) => {
				delete obj['parent']
			})
			_.each(tlState.GLayers, (obj) => {
				delete obj['parent']
			})
			// @ts-ignore
			// this.emit('info', 'tlState', JSON.stringify(tlState.LLayers,' ', 2))

			// Split the state into substates that are relevant for each device
			let getFilteredLayers = async (layers: TimelineState['LLayers'], device: ThreadedClass<Device>) => {
				let filteredState = {}
				const deviceId = await device.deviceId
				const deviceType = await device.deviceType
				_.each(layers, async (o: TimelineResolvedObject, layerId: string) => {
					const oExt: TimelineResolvedObjectExtended = o
					let mapping: Mapping = this._mapping[o.LLayer + '']
					if (!mapping && oExt.originalLLayer) {
						mapping = this._mapping[oExt.originalLLayer]
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
			_.each(this.devices, async (device: ThreadedClass<Device>/*, deviceName: string*/) => {

				// The subState contains only the parts of the state relevant to that device
				let subState: TimelineState = {
					time: tlState.time,
					LLayers: await getFilteredLayers(tlState.LLayers, device),
					GLayers: await getFilteredLayers(tlState.GLayers, device)
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
				// this.emit('info', 'State of device ' + device.deviceName, tlState.LLayers )
				// Pass along the state to the device, it will generate its commands and execute them:
				device.handleState(removeParent(subState))
				.catch(e => {
					this.emit('error', 'Error in device "' + device.deviceId + '"' + e + ' ' + e.stack)
				})
			})

			// Now that we've handled this point in time, it's time to determine what the next point in time is:

			// this.emit('debug', tlState.time)
			const timelineWindow = Resolver.getTimelineInWindow(timeline, tlState.time, tlState.time + LOOKAHEADTIME)

			const nextEvents = Resolver.getNextEvents(timelineWindow, tlState.time + MINTIMEUNIT, 1)

			const now2 = this.getCurrentTime()
			if (nextEvents.length) {
				let nextEvent = nextEvents[0]

				// this.emit('debug', 'nextEvent', nextEvent)

				timeUntilNextResolve = Math.max(MINTRIGGERTIME,
					Math.min(LOOKAHEADTIME,
						(nextEvent.time - now2) - PREPARETIME
					)
				)

				// this.emit('debug', 'timeUntilNextResolve', timeUntilNextResolve)

				// resolve at nextEvent.time next time:
				this._nextResolveTime = Math.min(tlState.time + LOOKAHEADTIME, nextEvent.time)

			} else {
				// there's nothing ahead in the timeline
				// this.emit('debug', 'no next events')

				// Tell the devices that the future is clear:
				_.each(this.devices, (device: ThreadedClass<Device>) => {
					Promise.resolve(device.clearFuture(tlState.time)).catch(() => null)
				})

				// resolve at "now" then next time:
				this._nextResolveTime = 0
			}
			// Special function: send callback to Core
			let sentCallbacksOld: TimelineCallbacks = this._sentCallbacks
			let sentCallbacksNew: TimelineCallbacks = {}
			this._doOnTime.clearQueueNowAndAfter(tlState.time)
			_.each(tlState.GLayers, (o: TimelineResolvedObject) => {
				try {
					if (o.content.callBack || o.content.callBackStopped) {
						let callBackId = (
							o.id +
							o.content.callBack +
							o.content.callBackStopped +
							o.resolved.startTime +
							JSON.stringify(o.content.callBackData)
						)
						sentCallbacksNew[callBackId] = {
							id: o.id,
							callBack: o.content.callBack,
							callBackStopped: o.content.callBackStopped,
							callBackData: o.content.callBackData
						}
						if (o.content.callBack) {
							this._doOnTime.queue(o.resolved.startTime, () => {
								if (!sentCallbacksOld[callBackId]) {
									// Object has started playing
									this._queueCallback({
										type: 'start',
										time: o.resolved.startTime,
										id: o.id,
										callBack: o.content.callBack,
										callBackData: o.content.callBackData
									})
								} else {
									// callback already sent, do nothing
									// this.emit('debug', 'callback already sent', callBackId)
								}
							})
						}
					}
				} catch (e) {
					this.emit('error', `callback to core, obj "${o.id}"`, e)
				}
			})
			_.each(sentCallbacksOld, (cb, callBackId: string) => {
				if (cb.callBackStopped) {
					if (!sentCallbacksNew[callBackId]) {
						// Object has stopped playing
						this._queueCallback({
							type: 'start',
							time: tlState.time,
							id: cb.id,
							callBack: cb.callBackStopped,
							callBackData: cb.callBackData
						})
					}
				}
			})
			this._sentCallbacks = sentCallbacksNew

			this.emit('info', 'resolveTimeline at time ' + resolveTime + ' done in ' + (Date.now() - startTime) + 'ms')
		} catch (e) {
			this.emit('error', 'resolveTimeline' + e)
		}

		try {
			// this.emit('info', 'this._nextResolveTime', this._nextResolveTime)
			this._triggerResolveTimeline(timeUntilNextResolve)
		} catch (e) {
			this.emit('error', 'triggerResolveTimeline', e)
		}
	}

	private _fixNowObjects (now: number) {
		let objectsFixed: Array<{
			id: string,
			time: number
		}> = []

		let setObjectTime = (o: TimelineContentObject, time: number) => {
			o.trigger.value = time // set the objects to "now" so that they are resolved correctly temporarily
			objectsFixed.push({
				id: o.id,
				time: time
			})
		}

		let timeline = this.timeline
		// First: fix the ones on the first level (i e not in groups), because they are easy:
		_.each(timeline, (o: TimelineContentObject) => {
			if (
				(o.trigger || {}).type === TriggerType.TIME_ABSOLUTE &&
				o.trigger.value === 'now'
			) {
				setObjectTime(o, now)
			}
		})

		// Then, resolve the timeline to be able to set "now" inside groups, relative to parents:
		let dontIterateAgain
		let wouldLikeToIterateAgain
		let tl
		let tld
		let fixObjects = (objs, parentObject?: TimelineContentObject) => {

			_.each(objs, (o: TimelineContentObject) => {
				if (
					(o.trigger || {}).type === TriggerType.TIME_ABSOLUTE &&
					o.trigger.value === 'now'
				) {
					// find parent, and set relative to that
					if (parentObject) {
						let developedParent = _.findWhere(tld.groups, { id: parentObject.id })
						if (developedParent && developedParent['resolved'].startTime) {
							dontIterateAgain = false
							setObjectTime(o, now - developedParent['resolved'].startTime)
						} else {
							// the parent isn't found, it's probably not resolved (yet), try iterating once more:
							wouldLikeToIterateAgain = true
						}
					} else {
						// no parent object
						dontIterateAgain = false
						setObjectTime(o, now)
					}
				}
				if (o.isGroup && o.content.objects) {
					fixObjects(o.content.objects, o)
				}
			})

		}

		for (let i = 0; i < 10; i++) {
			wouldLikeToIterateAgain = false
			dontIterateAgain = true

			tl = Resolver.getTimelineInWindow(timeline)
			tld = Resolver.developTimelineAroundTime(tl, now)
			fixObjects(timeline)
			if (!wouldLikeToIterateAgain && dontIterateAgain) break
		}

		// fixObjects(this.timeline, 0)

		// this.emit('info', 'objectsFixed', objectsFixed)

		if (objectsFixed.length) {
			let r: TimelineTriggerTimeResult = objectsFixed
			// this.emit('info', 'setTimelineTriggerTime', r)
			this.emit('setTimelineTriggerTime', r)
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

		let callbacksArray = _.values(callbacks).sort((a, b) => {
			if (a.type === 'start' && b.type !== 'start') return 1
			if (a.type !== 'start' && b.type === 'start') return -1

			if ((a.time || 0) > (b.time || 0)) return 1
			if ((a.time || 0) < (b.time || 0)) return -1

			return 0
		})

		_.each(callbacksArray, cb => {
			this.emit('timelineCallback',
				cb.time,
				cb.id,
				cb.callBack,
				cb.callBackData
			)
		})
	}
}
