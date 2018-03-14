import * as _ from 'underscore'
import { Resolver, TimelineObject, TimelineState } from 'superfly-timeline'

import { Device, DeviceCommand, DeviceCommandContainer } from './devices/device'
import { CasparCGDevice } from './devices/casparCG'

const LOOKAHEADTIME = 5000

export interface TimelineContentObject extends TimelineObject {}

export interface Mapping {
	[layerName: string]: {
		device: string,
		[key: string]: any
	}
}

export interface Device {}

export interface ConductorOptions {
	devices: {
		[deviceName: string]: {
			type: DeviceTypes.CASPARCG
		}
	},
	initializeAsClear: true // don't do any initial checks with devices to determine state, instead assume that everything is clear, black and quiet
}

export enum DeviceTypes {
	CASPARCG = 0
}

/**
 * The main class that serves to interface with all functionality.
 */
export class Conductor {

	private _timeline: Array<TimelineContentObject>
	private _mapping: Mapping

	private _options: ConductorOptions

	private devices: {[deviceName: string]: Device} = {}

	private _timer: Timer

	constructor (options: ConductorOptions) {

		this._options = options

		this._timer = setInterval(() => {
			if (this.timeline) {
				this._resolveTimeline()
			}
		}, 2500)

	}

	/**
	 * Initializes the devices that were passed as options.
	 */
	public init (): Promise<any> {
		return this._initializeDevices()
	}

	/**
	 * Returns a nice, synchronized time.
	 */
	public getCurrentTime () {
		// TODO: Implement time sync, NTP procedure etc...
		return Date.now() / 1000
	}

	get mapping (): Mapping {
		return this._mapping
	}
	set mapping (mapping: Mapping) {
		// Set mapping
		// re-resolve timeline
		this._mapping = mapping

		if (this._timeline) {
			this._resolveTimeline()
		}
	}

	get timeline (): Array<TimelineContentObject> {
		return this._timeline
	}
	set timeline (timeline: Array<TimelineContentObject>) {
		// Set the updated timeline (will cause the timeline to re-resolve, and send appropriate commands)
		this._timeline = timeline
		this._resolveTimeline()
	}

	/**
	 * Sets up the devices as they were passed to the constructor via the options object.
	 * @todo: allow for runtime reconfiguration of devices.
	 */
	private _initializeDevices (): Promise<any> {

		const ps: Array<Promise<any>> = []

		_.each(this._options.devices, (deviceOptions, deviceId) => {
			if (deviceOptions.type == DeviceTypes.CASPARCG) {
				// Add CasparCG device:

				this.devices[deviceId] = new CasparCGDevice(deviceId, this._mapping, {
					// TODO: Add options
				}) as Device

				ps.push(this.devices[deviceId].init())

			}
		})

		return Promise.all(ps)

	}

	/**
	 * Resolves the timeline for the next few seconds, generates the commands and passes off the commands.
	 */
	private _resolveTimeline () {

		const now = this.getCurrentTime()

		const timelineWindow = Resolver.getTimelineInWindow(this.timeline, now, now + LOOKAHEADTIME)

		// Step 1: Filter out some interesting points in time:
		const nextEvents = Resolver.getNextEvents(timelineWindow, now, 10)
		const timesToEvaluate = [{ time: now }]

		_.each(nextEvents, (evt) => {
			timesToEvaluate.push({ time: evt.time })
		})

		// Step 2: evaluate the points in time (do we have to send any commands?)
		const statesToSolve: Array<TimelineState> = []
		const deviceCommands: Array<DeviceCommandContainer> = []
		let prevstate: TimelineState

		_.each(timesToEvaluate, (time) => {
			let tlAroundTime = Resolver.getState(this.timeline, time.time)
			statesToSolve.push(tlAroundTime)
		})

		_.each(statesToSolve, (state: TimelineState) => {
			_.each(this.devices, (device) => {
				let deviceId = device.deviceId
				let commands

				if (prevstate) {
					commands = device.generateCommandsAgainstState(state, prevstate)
				}
				else {
					commands = device.generateCommandsAgainstState(state)
				}

				if (commands) {
					let deviceCommandContainer = _.find(deviceCommands, (commandContainer) => deviceId === commandContainer.deviceId)
					if (deviceCommandContainer) {
						deviceCommandContainer.commands.push(commands)
					} else {
						deviceCommands.push({
							deviceId,
							commands: [commands]
						})
					}
				}

				prevstate = state
			})
		})

		// Then we should distribute out the commands to the different devices
		// and let them handle it.
		this.sendCommandsToDevices(deviceCommands)

	}

	/**
	 * Takes in the commands generated through the _resolveTimeline() function and passes it to the devices.
	 * @param commandsInTime
	 */
	private sendCommandsToDevices (commandsInTime: Array<DeviceCommandContainer>) {
		_.each(commandsInTime, (commandContainer: DeviceCommandContainer) => {
			const device = this.devices[commandContainer.deviceId]

			if (device) {
				device.handleCommands(commandContainer)
			}
		})
	}
}
