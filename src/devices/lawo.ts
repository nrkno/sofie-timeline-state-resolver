import * as _ from 'underscore'

import {
	DeviceWithState,
	DeviceOptions,
	CommandWithContext,
	DeviceStatus,
	StatusCode
} from './device'
import {
	DeviceType,
	Mappings
} from '../types/mapping'
import {
	TimelineContentTypeLawo,
	MappingLawo
} from '../types/lawo'
import {
	TimelineState,
	TimelineResolvedObject
} from 'superfly-timeline'
import {
	DeviceTree,
	Ember
} from 'emberplus'
import { DoOnTime } from '../doOnTime'
import { getDiff } from '../lib'

/*
	This is a wrapper for an "Abstract" device

	An abstract device is just a test-device that doesn't really do anything, but can be used
	as a preliminary mock
*/
export interface LawoOptions extends DeviceOptions { // TODO - this doesnt match what the other ones do
	options?: {
		commandReceiver?: (time: number, cmd) => Promise<any>,
		host?: string,
		port?: number,
		sourcesPath?: string,
		rampMotorFunctionPath?: string
	}
}
export interface TimelineObjLawo extends TimelineResolvedObject {
	content: {
		type: TimelineContentTypeLawo,
		attributes: {
			[key: string]: {
				[attr: string]: any
				triggerValue: string // only used for trigging new command sent
			}
		}
	}
}
export interface TimelineObjLawoSource extends TimelineObjLawo {
	content: {
		type: TimelineContentTypeLawo,
		attributes: {
			'Fader/Motor dB Value': {
				value: number,
				transitionDuration?: number,
				triggerValue: string // only used for trigging new command sent
			}
		}
	}
}
export type EmberPlusValue = boolean | number | string

export interface LawoState {
	[path: string]: LawoStateNode
}

export interface LawoStateNode {
	type: TimelineContentTypeLawo
	value: EmberPlusValue,
	key: string,
	identifier: string,
	transitionDuration?: number,
	triggerValue: string
}
export interface LawoCommand {
	path: string,
	value: EmberPlusValue,
	key: string,
	identifier: string,
	type: TimelineContentTypeLawo,
	transitionDuration?: number
}
export interface LawoCommandWithContext {
	cmd: LawoCommand,
	context: CommandContext
}
type CommandContext = string
export class LawoDevice extends DeviceWithState<TimelineState> {
	private _doOnTime: DoOnTime
	private _lawo: DeviceTree

	private _savedNodes = []

	private _connected: boolean = false

	private _commandReceiver: (time: number, cmd: LawoCommand, context: CommandContext) => Promise<any>
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
		this._doOnTime.on('error', e => this.emit('error', e))

		this._lawo = new DeviceTree(host, port)
		this._lawo.on('error', (e) => {
			if (
				(e.message + '').match(/econnrefused/i) ||
				(e.message + '').match(/disconnected/i)
			) {
				this._setConnected(false)
			} else {
				this.emit('error', e)
			}
		})
		this._lawo.on('connected', () => {
			this._setConnected(true)
		})
		this._lawo.on('disconnected', () => {
			this._setConnected(false)
		})
	}

	/**
	 * Initiates the connection with Lawo
	 */
	init (): Promise<boolean> {
		return new Promise((resolve, reject) => {
			let fail = (e) => reject(e)
			try {
				this._lawo.once('error', fail)
				this._lawo.connect()	// default timeout = 2
				.then(() => {
					this._lawo.removeListener('error', fail)
					resolve(true)
				})
				.catch((e) => {
					this._lawo.removeListener('error', fail)
					reject(e)
				})
			} catch (e) {
				this._lawo.removeListener('error', fail)
				reject(e)
			}
		})
	}
	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified
		let oldState: TimelineState = (this.getStateBefore(newState.time) || { state: { time: 0, LLayers: {}, GLayers: {} } }).state

		let oldLawoState = this.convertStateToLawo(oldState)
		let newLawoState = this.convertStateToLawo(newState)

		let commandsToAchieveState: Array<LawoCommandWithContext> = this._diffStates(oldLawoState, newLawoState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newState.time)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newState, newState.time)
	}
	clearFuture (clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	terminate () {
		this._doOnTime.dispose()

		// @todo: Implement lawo dispose function upstream
		try {
			this._lawo.disconnect()
			this._lawo.removeAllListeners('error')
			this._lawo.removeAllListeners('connected')
			this._lawo.removeAllListeners('disconnected')

		} catch (e) {
			this.emit('error', e)
		}
		return Promise.resolve(true)
	}
	get canConnect (): boolean {
		return true
	}
	get connected (): boolean {
		return this._connected
	}
	convertStateToLawo (state: TimelineState): LawoState {
		// convert the timeline state into something we can use
		const lawoState: LawoState = {}

		_.each(state.LLayers, (tlObject: TimelineObjLawo, layerName: string) => {
			const mapping: MappingLawo | undefined = this.mapping[layerName] as MappingLawo
			if (mapping && mapping.identifier && mapping.device === DeviceType.LAWO) {

				if (tlObject.content.type === TimelineContentTypeLawo.SOURCE) {
					let tlObjectSource = tlObject as TimelineObjLawoSource
					_.each(tlObjectSource.content.attributes, (value, key) => {
						lawoState[this._sourceNodeAttributePath(mapping.identifier, key)] = {
							type: tlObjectSource.content.type,
							key: key,
							identifier: mapping.identifier,
							value: value.value,
							transitionDuration: value.transitionDuration,
							triggerValue: value.triggerValue
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
	getStatus (): DeviceStatus {
		return {
			statusCode: this._connected ? StatusCode.GOOD : StatusCode.BAD
		}
	}
	private _setConnected (connected: boolean) {
		if (this._connected !== connected) {
			this._connected = connected
			this._connectionChanged()
		}
	}
	private _addToQueue (commandsToAchieveState: Array<LawoCommandWithContext>, time: number) {
		_.each(commandsToAchieveState, (cmd: LawoCommandWithContext) => {

			// add the new commands to the queue:
			this._doOnTime.queue(time, (cmd: LawoCommandWithContext) => {
				return this._commandReceiver(time, cmd.cmd, cmd.context)
			}, cmd)
		})
	}
	private _diffStates (oldLawoState: LawoState, newLawoState: LawoState): Array<LawoCommandWithContext> {

		let commands: Array<LawoCommandWithContext> = []

		// let addCommand = (path, newNode: LawoStateNode) => {
		// }

		_.each(newLawoState, (newNode: LawoStateNode, path: string) => {
			let oldValue: LawoStateNode = oldLawoState[path] || null
			let diff = getDiff(newNode, oldValue)
			// if (!_.isEqual(newNode, oldValue)) {
			if (diff) {
				// addCommand(path, newNode)

				// It's a plain value:
				commands.push({
					cmd: {
						path: path,
						type: newNode.type,
						key: newNode.key,
						identifier: newNode.identifier,
						value: newNode.value,
						transitionDuration: newNode.transitionDuration
					},
					context: diff
				})
			}
		})
		return commands
	}

	private async _getNodeByPath (path: string): Promise<Ember.Node> {
		return new Promise((resolve, reject) => {
			if (this._savedNodes[path] !== undefined) {
				resolve(this._savedNodes[path])
			} else {
				this._lawo.getNodeByPath(path)
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
		return _.compact([
			this._sourcesPath,
			identifier,
			attributePath.replace('/', '.')
		]).join('.')
	}

	// @ts-ignore no-unused-vars
	private _defaultCommandReceiver (time: number, command: LawoCommand, context: CommandContext): Promise<any> {
		if (command.key === 'Fader/Motor dB Value') {	// fader level
			let cwc: CommandWithContext = {
				context: context,
				command: command
			}
			this.emit('debug', cwc)
			if (command.transitionDuration && command.transitionDuration > 0) {	// with timed fader movement
				return this._lawo.invokeFunction(new Ember.QualifiedFunction(this._rampMotorFunctionPath), [command.identifier, new Ember.ParameterContents(command.value, 'real'), new Ember.ParameterContents(command.transitionDuration / 1000, 'real')])
				.then((res) => {
					this.emit('debug', `Ember function result: ${JSON.stringify(res)}`)
				})
					.catch((e) => {
						if (e.success === false) { // @todo: QualifiedFunction Fader/Motor cannot handle too short durations or small value changes
							this.emit('command', command)
							this.emit('info', `Ember function result: ${JSON.stringify(e)}`)
						} else {
							this.emit('error', `Ember function command error: ${e.toString()}`)
						}
					})

			} else { // withouth timed fader movement
				return this._getNodeByPath(command.path)
				.then((node: any) => {
					this._lawo.setValue(node, new Ember.ParameterContents(command.value, 'real'))
					.then((res) => {
						this.emit('debug', `Ember result: ${JSON.stringify(res)}`)
					})
					.catch((e) => console.log(e))
				})
				.catch((e) => {
					this.emit('error', `Ember command error: ${e.toString()}`)
				})
			}
		} else {
			// this.emit('error', `Ember command error: ${e.toString()}`)
			return Promise.reject(`Lawo: Unsupported command.key: "${command.key}"`)
		}
	}
	private _connectionChanged () {
		this.emit('connectionChanged', this.getStatus())
	}
}
