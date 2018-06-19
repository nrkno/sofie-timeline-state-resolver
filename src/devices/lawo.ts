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
		commandReceiver?: (time: number, cmd) => Promise<any>,
		host?: string,
		port?: number,
		sourcesPath?: string,
		rampMotorFunctionPath?: string
	}
}
export enum TimelineContentTypeLawo { //  Lawo-state
	SOURCE = 'lawosource' // a general content type, possibly to be replaced by specific ones later?
}
interface TimelineObjLawoSource extends TimelineResolvedObject {
	content: {
		type: TimelineContentTypeLawo,
		attributes: {
			'Fader/Motor dB Value': {
				value: number,
				transitionDuration?: number
			}
		}
	}
}
export enum EmberPlusValueType {
	REAL 	= 'real',
	INT 	= 'int',
	BOOLEAN = 'boolean',
	STRING 	= 'string'
}
export interface LawoSourceAttribute {
	value: number,
	transitionDuration?: number,
}
export type EmberPlusValue = boolean | number | string

export interface LawoState {
	[path: string]: LawoStateNodeAttr
}

export interface LawoStateNodeAttr {
	type: TimelineContentTypeLawo
	value: EmberPlusValue,
	key: string,
	identifier: string,
	transitionDuration?: number
}
export interface LawoCommand {
	path: string,
	value: EmberPlusValue,
	key: string,
	identifier: string,
	type: TimelineContentTypeLawo,
	transitionDuration?: number
}
export class LawoDevice extends Device {
	private _doOnTime: DoOnTime
	private _device: DeviceTree

	private _savedNodes = []

	private _commandReceiver: (time: number, cmd: LawoCommand) => Promise<any>
	private _sourcesPath: string
	private _rampMotorFunctionPath: string

	constructor (deviceId: string, deviceOptions: LawoOptions, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) {
				this._commandReceiver = deviceOptions.options.commandReceiver
			} else {
				this._commandReceiver = this._defaultCommandReceiver
			}
			if (deviceOptions.options.sourcesPath) {
				this._sourcesPath = deviceOptions.options.sourcesPath
			}
			if (deviceOptions.options.rampMotorFunctionPath) {
				this._rampMotorFunctionPath = deviceOptions.options.rampMotorFunctionPath
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
		this._doOnTime.on('error', e => this.emit(e))

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
	}
	get connected (): boolean {
		return false
	}
	convertStateToLawo (state: TimelineState): LawoState {
		// convert the timeline state into something we can use
		const lawoState: LawoState = {}

		_.each(state.LLayers, (tlObject: TimelineObjLawoSource, layerName: string) => {
			const mapping: MappingLawo | undefined = this.mapping[layerName] as MappingLawo
			if (mapping && mapping.identifier && mapping.device === DeviceType.LAWO) {

				if (tlObject.content.type === TimelineContentTypeLawo.SOURCE) {
					_.each(tlObject.content.attributes, (value, key) => {
						lawoState[this._sourceNodeAttributePath(mapping.identifier, key)] = {
							type: tlObject.content.type,
							key: key,
							identifier: mapping.identifier,
							value: value.value,
							transitionDuration: value.transitionDuration
						}
					})
				}
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
				return this._commandReceiver(time, cmd)
			}, cmd)
		})
	}
	private _diffStates (oldLawoState: LawoState, newLawoState: LawoState): Array<LawoCommand> {

		let commands: Array<LawoCommand> = []

		let addCommand = (path, newValue: LawoStateNodeAttr) => {
			// It's a plain value:
			commands.push({
				path: path,
				type: newValue.type,
				key: newValue.key,
				identifier: newValue.identifier,
				value: newValue.value,
				transitionDuration: newValue.transitionDuration
			})
		}

		_.each(newLawoState, (newValue: LawoStateNodeAttr, path: string) => {
			let oldValue: LawoStateNodeAttr = oldLawoState[path] || null
			if (!_.isEqual(newValue, oldValue)) {
				addCommand(path, newValue)
			}
		})
		return commands
	}

	private async _getNodeByPath (path: string): Promise<Ember.Node> {
		return new Promise((resolve, reject) => {
			if (this._savedNodes[path] !== undefined) {
				resolve(this._savedNodes[path])
			} else {
				this._device.getNodeByPath(path)
				.then((node) => {
					this._savedNodes[path] = node
					resolve(node)
				})
				.catch((e) => {
					this.emit('error', `Path error: ${e.toString()}`)
					reject(e)
				})

			}
		})
	}

	private _sourceNodeAttributePath (identifier: string, attributePath: string): string {
		return `${this._sourcesPath}.${identifier}.${attributePath.replace('/', '.')}`
	}

	// @ts-ignore no-unused-vars
	private _defaultCommandReceiver (time: number, command: LawoCommand): Promise<any> {
		if (command.key === 'Fader/Motor dB Value') {	// fader level
			if (command.transitionDuration && command.transitionDuration > 0) {	// with timed fader movement
				return this._device.invokeFunction(new Ember.QualifiedFunction(this._rampMotorFunctionPath), [command.identifier, new Ember.ParameterContents(command.value, 'real'), new Ember.ParameterContents(command.transitionDuration / 1000, 'real')])
				.then((res) => this.emit('info', `Ember function result: ${JSON.stringify(res)}`))
					.catch((e) => {
						this.emit('error', `Ember function command error: ${e.toString()}`)
					})

			} else { // withouth timed fader movement
				return this._getNodeByPath(command.path)
				.then((node: any) => {
					this._device.setValue(node, new Ember.ParameterContents(command.value, 'real'))
					.then((res) => this.emit('info', `Ember result: ${JSON.stringify(res)}`))
					.catch((e) => console.log(e))
				})
				.catch((e) => {
					this.emit('error', `Ember command error: ${e.toString()}`)
				})
			}
		}
	}
}
