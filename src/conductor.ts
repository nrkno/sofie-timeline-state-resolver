import * as _ from 'underscore'
import { Resolver,
	TimelineObject,
	TimelineState,
	TimelineResolvedObject,
	TriggerType
} from 'superfly-timeline'

import { Device, DeviceOptions } from './devices/device'
import { CasparCGDevice } from './devices/casparCG'
import { AbstractDevice } from './devices/abstract'
import { Mappings, Mapping, DeviceType } from './devices/mapping'
import { AtemDevice } from './devices/atem'
import { EventEmitter } from 'events'

const LOOKAHEADTIME = 5000 // Will look ahead this far into the future
const PREPARETIME = 2000 // Will prepare commands this time before the event is to happen
const MINTRIGGERTIME = 10 // Minimum time between triggers
const MINTIMEUNIT = 1 // Minimum unit of time

export interface TimelineContentObject extends TimelineObject {}

export interface TimelineTriggerTimeResult {
	time: number,
	objectIds: Array<string>
}

export { Device } from './devices/device'
// export interface Device {}

export interface ConductorOptions {
	devices: {
		[deviceName: string]: DeviceOptions
	},
	initializeAsClear: boolean, // don't do any initial checks with devices to determine state, instead assume that everything is clear, black and quiet
	getCurrentTime: () => number,
	autoInit?: boolean
}
/**
 * The main class that serves to interface with all functionality.
 */
export class Conductor extends EventEmitter {

	private _timeline: Array<TimelineContentObject> = []
	private _mapping: Mappings = {}

	private _options: ConductorOptions

	private devices: {[deviceId: string]: Device} = {}

	private _getCurrentTime?: () => number

	private _nextResolveTime: number = 0
	private _resolveTimelineTrigger: NodeJS.Timer
	private _isInitialized: boolean = false

	constructor (options: ConductorOptions) {
		super()
		this._options = options

		if (options.getCurrentTime) this._getCurrentTime = options.getCurrentTime

		setInterval(() => {
			if (this.timeline) {
				this._resolveTimeline()
			}
		}, 2500)

		if (options.autoInit) this.init()

	}
	/**
	 * Initializes the devices that were passed as options.
	 */
	public init (): Promise<void> {
		return this._initializeDevices()
		.then(() => {
			this._isInitialized = true
			this._resetResolver()
		})
	}
	/**
	 * Returns a nice, synchronized time.
	 */
	public getCurrentTime () {

		// TODO: Implement time sync, NTP procedure etc...
		if (this._getCurrentTime) {
			// console.log(this._getCurrentTime)
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
		_.each(this.devices, (device: Device) => {
			device.mapping = this.mapping
		})

		if (this._timeline) {
			this._resolveTimeline()
		}
	}
	get timeline (): Array<TimelineContentObject> {
		return this._timeline
	}
	set timeline (timeline: Array<TimelineContentObject>) {

		this._timeline = timeline
		// We've got a new timeline, anything could've happened at this point
		// Highest priority right now is to determine if any commands have to be sent RIGHT NOW
		// After that, we'll move further ahead in time, creating commands ready for scheduling

		this._resetResolver()

	}

	public getDevices (): Array<Device> {
		return _.values(this.devices)
	}
	public getDevice (deviceId) {
		return this.devices[deviceId]
	}
	public addDevice (deviceId, deviceOptions: DeviceOptions): Promise<any> {
		let newDevice: Device | null = null

		if (deviceOptions.type === DeviceType.ABSTRACT) {
			// Add Abstract device:
			newDevice = new AbstractDevice(deviceId, deviceOptions, {
				// TODO: Add options
				getCurrentTime: () => { return this.getCurrentTime() }
			}) as Device
		} else if (deviceOptions.type === DeviceType.CASPARCG) {
			// Add CasparCG device:
			newDevice = new CasparCGDevice(deviceId, deviceOptions, {
				// TODO: Add options
				getCurrentTime: () => { return this.getCurrentTime() }
			}) as Device
		} else if (deviceOptions.type === DeviceType.ATEM) {
			newDevice = new AtemDevice(deviceId, deviceOptions, {
				// TODO: Add options
				getCurrentTime: () => { return this.getCurrentTime() }
			}) as Device
		}
		if (newDevice) {
			this.devices[deviceId] = newDevice
			newDevice.mapping = this.mapping
			return newDevice.init(deviceOptions.options)
		}
		// if we cannot find a device:
		return new Promise((resolve) => {
			resolve(false)
		})
	}
	public removeDevice (deviceId: string): Promise<boolean> {
		let device = this.devices[deviceId]

		if (device) {
			let ps = device.terminate()
			ps.then((res) => {
				if (res) {
					delete this.devices[deviceId]
				}
			})
			return ps
		} else {
			return new Promise((resolve) => resolve(false))
		}
	}
	public destroy (): Promise<void> {
		return Promise.all(_.map(_.keys(this.devices), (deviceId: string) => {
			this.removeDevice(deviceId)
		}))
		.then(() => {
			return
		})
	}

	/**
	 * Sets up the devices as they were passed to the constructor via the options object.
	 * @todo: allow for runtime reconfiguration of devices.
	 */
	private _initializeDevices (): Promise<any> {
		const ps: Array<Promise<any>> = []
		_.each(this._options.devices, (deviceOptions, deviceId) => {
			ps.push(this.addDevice(deviceId, deviceOptions))
		})

		return Promise.all(ps)
	}
	/**
	 * Resets the resolve-time, so that the resolving will happen for the point-in time NOW
	 * next time
	 */
	private _resetResolver () {

		this._nextResolveTime = 0 // This will cause _resolveTimeline() to generate the state for NOW

		this._triggerResolveTimeline()
	}
	/**
	 * This is the main resolve-loop.
	 */
	private _triggerResolveTimeline (timeUntilTrigger?: number) {

		// console.log('_triggerResolveTimeline', timeUntilTrigger)

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
		if (!this._isInitialized) return
		const now = this.getCurrentTime()
		let resolveTime: number = this._nextResolveTime || now

		// console.log('resolveTimeline -----------------------------')
		// console.log(resolveTime)

		this._fixNowObjects(resolveTime)

		// Generate the state for that time:
		let tlState = Resolver.getState(this.timeline, resolveTime)

		// Split the state into substates that are relevant for each device
		let getFilteredLayers = (layers, device) => {
			let filteredState = {}
			_.each(layers, (o: TimelineResolvedObject, layerId: string) => {
				let mapping: Mapping = this._mapping[o.LLayer + '']
				if (mapping) {
					if (
						mapping.deviceId === device.deviceId &&
						mapping.device === device.deviceType
					) {
						filteredState[layerId] = o
					}
				}
			})
			return filteredState
		}
		_.each(this.devices, (device: Device/*, deviceName: string*/) => {

			// The subState contains only the parts of the state relevant to that device
			let subState: TimelineState = {
				time: tlState.time,
				LLayers: getFilteredLayers(tlState.LLayers, device),
				GLayers: getFilteredLayers(tlState.GLayers, device)
			}
			// Pass along the state to the device, it will generate its commands and execute them:
			device.handleState(subState)
		})

		// Now that we've handled this point in time, it's time to determine what the next point in time is:

		// console.log(tlState.time)
		const timelineWindow = Resolver.getTimelineInWindow(this.timeline, tlState.time, tlState.time + LOOKAHEADTIME)

		const nextEvents = Resolver.getNextEvents(timelineWindow, tlState.time + MINTIMEUNIT, 1)

		let timeUntilNextResolve = LOOKAHEADTIME

		const now2 = this.getCurrentTime()
		if (nextEvents.length) {
			let nextEvent = nextEvents[0]

			// console.log('nextEvent', nextEvent)

			timeUntilNextResolve = Math.max(MINTRIGGERTIME,
				Math.min(LOOKAHEADTIME,
					(nextEvent.time - now2) - PREPARETIME
				)
			)

			// resolve at nextEvent.time next time:
			this._nextResolveTime = nextEvent.time

		} else {
			// there's nothing ahead in the timeline

			// Tell the devices that the future is clear:
			_.each(this.devices, (device: Device) => {
				device.clearFuture(tlState.time)
			})

			// resolve at "now" then next time:
			this._nextResolveTime = 0
		}
		this._triggerResolveTimeline(timeUntilNextResolve)

	}
	private _fixNowObjects (now: number) {
		let objectsFixed: Array<string> = []
		_.each(this.timeline, (o: TimelineContentObject) => {
			if (
				(o.trigger || {}).type === TriggerType.TIME_ABSOLUTE &&
				o.trigger.value === 'now'
			) {
				o.trigger.value = now // set the objects to "now" so that they are resolved correctly right now
				objectsFixed.push(o.id)
			}
		})
		if (objectsFixed.length) {
			let r: TimelineTriggerTimeResult = {
				time: now,
				objectIds: objectsFixed
			}
			this.emit('setTimelineTriggerTime', r)
		}
	}
}
