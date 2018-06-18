import * as _ from 'underscore'
import { Device, DeviceOptions } from './device'
import { DeviceType, MappingLawo, Mappings } from './mapping'

import { TimelineState, TimelineResolvedObject } from 'superfly-timeline'
import { DeviceTree, Ember } from 'emberplus'
import { DoOnTime } from '../doOnTime'

/*
	This is a wrapper for an "Abstract" device

	An abstract device is just a test-device that doesn't really do anything, but can be used
	as a preliminary mock
*/
export interface LawoOptions extends DeviceOptions {
	options?: {
		commandReceiver?: (time: number, cmd) => void,
		host?: string,
		port?: number
	}
}
export enum TimelineContentTypeLawo { //  Lawo-state
	LAWO = 'lawo' // a general content type, possibly to be replaced by specific ones later?
}
interface TimelineLawoObject extends TimelineResolvedObject {
	content: {
		type: TimelineContentTypeLawo,
		value: LawoStateNodeAttr
	}
}
export enum EmberPlusValueType {
	REAL 	= 'real',
	INT 	= 'int',
	BOOLEAN = 'boolean',
	STRING 	= 'string'
}
export interface EmberPlusValue {
	type: EmberPlusValueType,
	value: EmberPlusValueBase
}
export type EmberPlusValueBase = boolean | number | string
export interface EmberPlusValueReal extends EmberPlusValue {
	type: EmberPlusValueType.REAL,
	value: number
}
export interface EmberPlusValueInt extends EmberPlusValue {
	type: EmberPlusValueType.INT,
	value: number
}
export interface EmberPlusValueBoolean extends EmberPlusValue {
	type: EmberPlusValueType.BOOLEAN,
	value: boolean
}
export interface EmberPlusValueString extends EmberPlusValue {
	type: EmberPlusValueType.STRING,
	value: string
}

export interface LawoState {
	[path: string]: LawoStateNodeAttr
}
// export interface LawoStateNode {
// 	[attrName: string]: EmberPlusValue
// }

export type LawoStateNodeAttr = EmberPlusValue | LawoStateNodeAttrTransition
export interface LawoStateNodeAttrTransition {
	value: EmberPlusValue
	transitionDuration: number
}
export interface LawoCommand {
	path: string,
	value: EmberPlusValueBase,
	type: EmberPlusValueType,
	transitionDuration?: number
}
export class LawoDevice extends Device {
	private _doOnTime: DoOnTime
	private _device: DeviceTree

	private _savedNodes = []

	private _commandReceiver: (time: number, cmd: LawoCommand) => void

	constructor (deviceId: string, deviceOptions: LawoOptions, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) {
				this._commandReceiver = deviceOptions.options.commandReceiver
			} else {
				this._commandReceiver = this._defaultCommandReceiver
			}
		}
		let host = (
			deviceOptions.options && deviceOptions.options.host
			? deviceOptions.options.host :
			null
		)
		let port = (
			deviceOptions.options && deviceOptions.options.port ?
			deviceOptions.options.port :
			null
		)
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		})

		this._device = new DeviceTree(host, port)
		this._device.on('error', (e) => {
			if (
				(e.message + '').match(/econnrefused/i) ||
				(e.message + '').match(/disconnected/i)
			) {
				this.emit('connectionChanged', false)
			} else {
				this.emit('error', e)
			}
		})
		this._device.on('connected', () => {
			this.emit('connectionChanged', true)
		})
	}

	/**
	 * Initiates the connection with Lawo
	 */
	init (): Promise<boolean> {
		return new Promise((resolve, reject) => {
			let fail = (e) => reject(e)
			try {
				this._device.once('error', fail)
				this._device.connect()	// default timeout = 2
				.then(() => {
					this._device.removeListener('error', fail)
					resolve(true)
				})
				.catch((e) => {
					this._device.removeListener('error', fail)
					reject(e)
				})
			} catch (e) {
				this._device.removeListener('error', fail)
				reject(e)
			}
		})
	}
	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified
		let oldState: TimelineState = this.getStateBefore(newState.time) || { time: 0, LLayers: {}, GLayers: {} }

		let oldLawoState = this.convertStateToLawo(oldState)
		let newLawoState = this.convertStateToLawo(newState)

		let commandsToAchieveState: Array<LawoCommand> = this._diffStates(oldLawoState, newLawoState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueAfter(newState.time)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newState)
	}
	clearFuture (clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
		// this._queue = _.reject(this._queue, (q) => { return q.time > clearAfterTime })
	}
	get connected (): boolean {
		return false
	}
	convertStateToLawo (state: TimelineState): LawoState {
		// convert the timeline state into something we can use
		const lawoState: LawoState = {}

		_.each(state.LLayers, (tlObject: TimelineLawoObject, layerName: string) => {
			const mapping: MappingLawo | undefined = this.mapping[layerName] as MappingLawo
			if (mapping && mapping.path && mapping.device === DeviceType.LAWO) {

				if (tlObject.content.type === TimelineContentTypeLawo.LAWO) {
					let path = mapping.path.join('/')
					lawoState[path] = tlObject.content.value
				}
			}
		})
		// Apply default states defined in mappings
		_.each(this.mapping, (mapping: MappingLawo) => {
			if (mapping && mapping.path && mapping.device === DeviceType.LAWO && mapping.default) {

				let path = mapping.path.join('/')
				lawoState[path] = lawoState[path] || mapping.default
			}
		})

		return lawoState
	}
	get deviceType () {
		return DeviceType.LAWO
	}
	get deviceName (): string {
		return 'Lawo ' + this.deviceId
	}
	get queue () {
		return this._doOnTime.getQueue()
	}

	set mapping (mappings: Mappings) {
		super.mapping = mappings
	}
	get mapping () {
		return super.mapping
	}
	private _addToQueue (commandsToAchieveState: Array<LawoCommand>, time: number) {
		_.each(commandsToAchieveState, (cmd: LawoCommand) => {

			// add the new commands to the queue:
			this._doOnTime.queue(time, (cmd: LawoCommand) => {
				this._commandReceiver(time, cmd)
			}, cmd)
		})
	}
	private _diffStates (oldLawoState: LawoState, newLawoState: LawoState): Array<LawoCommand> {

		let commands: Array<LawoCommand> = []

		let addCommand = (path, newValue: LawoStateNodeAttr) => {
			if (_.has(newValue,'transitionDuration')) {
				// it's a Transition:
				let transition = newValue as LawoStateNodeAttrTransition
				commands.push({
					path,
					type: transition.value.type,
					value: transition.value.value,
					transitionDuration: transition.transitionDuration
				})
			} else {
				// It's a plain value:
				let value = newValue as EmberPlusValue
				commands.push({
					path,
					type: value.type,
					value: value.value
				})
			}
		}
		_.each(newLawoState, (newValue: EmberPlusValue, path: string) => {
			let oldValue: LawoStateNodeAttr = oldLawoState[path] || null
			if (!_.isEqual(newValue, oldValue)) {
				addCommand(path, newValue)
			}
		})
		// Removed attributes:
		_.each(oldLawoState, (oldValue: EmberPlusValue, path: string) => {
			let newValue = newLawoState[path] || {}

			if (!newValue) {
				addCommand(path, oldValue)
			}
		})
		return commands
	}

	private async _getNodeByPath (path: string): Ember.Node {
		return new Promise((resolve) => {
			if (this._savedNodes[path] !== undefined) {
				resolve(this._savedNodes[path])
			} else {
				this._device.getNodeByPath(path)
				.then((node) => {
					this._savedNodes[path] = node
					resolve(node)
				})
				.catch((e) => this.emit('error', `Path error: ${e.toString()}`))

			}
		})
	}

	// @ts-ignore no-unused-vars
	private _defaultCommandReceiver (time: number, command: LawoCommand) {
		this.emit('info', `Ember command: ${JSON.stringify(command)}`)

		// if (command.transitionDuration && command.attribute === 'Motor dB Value') { // I don't think we can transition any other values
		// 	const source = this._sourceNames[command.path.substr(4, 1)] // theoretically speaking anyway
		// 	if (!source) return // maybe warn user?
		// 	const faderRamp = new Ember.QualifiedFunction([1, 2, 2])
		// 	this._device.invokeFunction(faderRamp, { source, value: command.value, duration: command.transitionDuration })
		// } else {

		// TODO: this._mappingToAttributes is dependent of this.mappings, which we should not have any dependencies to at this point

		this._getNodeByPath(command.path)
			.then((node: any) => {
				this._device.setValue(node, new Ember.ParameterContents(command.value, 'real'))
				.then((res) => this.emit('info', `Ember result: ${JSON.stringify(res)}`))
				.catch((e) => console.log(e))
			})
			.catch((e) => this.emit('error', `Ember command error: ${e.toString()}`))
	}
}
