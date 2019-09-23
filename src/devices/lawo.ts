import * as _ from 'underscore'

import {
	DeviceWithState,
	CommandWithContext,
	DeviceStatus,
	StatusCode
} from './device'
import {
	DeviceType,
	DeviceOptions,
	TimelineContentTypeLawo,
	MappingLawo,
	TimelineObjLawoSource,
	TimelineObjLawoAny,
	TimelineObjLawoEmberProperty,
	EmberValueTypes,
	EmberTypes
} from '../types/src'
import {
	TimelineState, ResolvedTimelineObjectInstance
} from 'superfly-timeline'
import {
	DeviceTree,
	Ember
} from 'emberplus'
import { DoOnTime, SendMode } from '../doOnTime'
import { getDiff } from '../lib'

export interface LawoOptions extends DeviceOptions { // TODO - this doesnt match what the other ones do
	options?: {
		commandReceiver?: CommandReceiver
		host?: string
		port?: number
		sourcesPath?: string
		rampMotorFunctionPath?: string
	}
}
export type CommandReceiver = (time: number, cmd: LawoCommand, context: CommandContext, timelineObjId: string) => Promise<any>
// export type EmberPlusValue = boolean | number | string | {type: EmberTypes, value: EmberValueTypes}

export interface LawoState {
	[path: string]: LawoStateNode
}

export interface LawoStateNode {
	type: TimelineContentTypeLawo
	value: EmberValueTypes
	valueType: EmberTypes
	key: string
	identifier: string
	transitionDuration?: number
	triggerValue: string
	priority: number
	/** Reference to the original timeline object: */
	timelineObjId: string
}
export interface LawoCommand {
	path: string
	value: EmberValueTypes
	valueType: EmberTypes
	key: string
	identifier: string
	type: TimelineContentTypeLawo
	transitionDuration?: number
	priority: number
}
export interface LawoCommandWithContext {
	cmd: LawoCommand
	context: CommandContext
	timelineObjId: string
}
type CommandContext = string
/**
 * This is a wrapper for a Lawo sound mixer
 *
 * It controls mutes and fades over Ember Plus.
 */
export class LawoDevice extends DeviceWithState<TimelineState> {
	private _doOnTime: DoOnTime
	private _lawo: DeviceTree

	private _savedNodes = []
	private _lastSentValue: { [path: string]: number } = {}

	private _connected: boolean = false

	private _commandReceiver: CommandReceiver
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
		}, SendMode.BURST, this._deviceOptions)
		this.handleDoOnTime(this._doOnTime, 'Lawo')

		this._lawo = new DeviceTree(host, port)
		this._lawo.on('error', (e) => {
			if (
				(e.message + '').match(/econnrefused/i) ||
				(e.message + '').match(/disconnected/i)
			) {
				this._setConnected(false)
			} else {
				this.emit('error', 'Lawo.Emberplus', e)
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
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState (newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	/**
	 * Handles a state such that the device will reflect that state at the given time.
	 * @param newState
	 */
	handleState (newState: TimelineState) {
		// Convert timeline states to device states
		let previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		let oldState: TimelineState = (this.getStateBefore(previousStateTime) || { state: { time: 0, layers: {}, nextEvents: [] } }).state

		let oldLawoState = this.convertStateToLawo(oldState)
		let newLawoState = this.convertStateToLawo(newState)

		// generate commands to transition to new state
		let commandsToAchieveState: Array<LawoCommandWithContext> = this._diffStates(oldLawoState, newLawoState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newState, newState.time)
	}
	/**
	 * Clear any scheduled commands after this time
	 * @param clearAfterTime
	 */
	clearFuture (clearAfterTime: number) {
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	/**
	 * Safely disconnect from physical device such that this instance of the class
	 * can be garbage collected.
	 */
	terminate () {
		this._doOnTime.dispose()

		// @todo: Implement lawo dispose function upstream
		try {
			this._lawo.disconnect()
			this._lawo.removeAllListeners('error')
			this._lawo.removeAllListeners('connected')
			this._lawo.removeAllListeners('disconnected')

		} catch (e) {
			this.emit('error', 'Lawo.terminate', e)
		}
		return Promise.resolve(true)
	}
	get canConnect (): boolean {
		return true
	}
	get connected (): boolean {
		return this._connected
	}
	/**
	 * Converts a timeline state into a device state.
	 * @param state
	 */
	convertStateToLawo (state: TimelineState): LawoState {
		const lawoState: LawoState = {}

		_.each(state.layers, (tlObject: ResolvedTimelineObjectInstance, layerName: string) => {
			const lawoObj = tlObject as any as TimelineObjLawoAny

			const mapping: MappingLawo | undefined = this.getMapping()[layerName] as MappingLawo
			if (mapping && mapping.identifier && mapping.device === DeviceType.LAWO) {

				if (lawoObj.content.type === TimelineContentTypeLawo.SOURCE) {
					let tlObjectSource: TimelineObjLawoSource = lawoObj as TimelineObjLawoSource

					const fader: TimelineObjLawoSource['content']['Fader/Motor dB Value'] = tlObjectSource.content['Fader/Motor dB Value']

					lawoState[this._sourceNodeAttributePath(mapping.identifier, 'Fader/Motor dB Value')] = {
						type: tlObjectSource.content.type,
						key: 'Fader/Motor dB Value',
						identifier: mapping.identifier,
						value: fader.value,
						valueType: EmberTypes.REAL,
						transitionDuration: fader.transitionDuration,
						triggerValue: fader.triggerValue || '',
						priority: mapping.priority || 0,
						timelineObjId: tlObject.id
					}

				} else if (lawoObj.content.type === TimelineContentTypeLawo.EMBER_PROPERTY) {
					let tlObjectSource: TimelineObjLawoEmberProperty = lawoObj as TimelineObjLawoEmberProperty

					lawoState[mapping.identifier] = {
						type: tlObjectSource.content.type,
						key: '',
						identifier: mapping.identifier,
						value: tlObjectSource.content.value,
						valueType: mapping.emberType || EmberTypes.REAL,
						triggerValue: '',
						priority: mapping.priority || 0,
						timelineObjId: tlObject.id
					}

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

	getStatus (): DeviceStatus {
		let statusCode = StatusCode.GOOD
		let messages: Array<string> = []

		if (!this._connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		}

		return {
			statusCode: statusCode,
			messages: messages
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
			this._doOnTime.queue(time, undefined, (cmd: LawoCommandWithContext) => {
				return this._commandReceiver(time, cmd.cmd, cmd.context, cmd.timelineObjId)
			}, cmd)
		})
	}
	/**
	 * Generates commands to transition from one device state to another.
	 * @param oldLawoState The assumed device state
	 * @param newLawoState The desired device state
	 */
	private _diffStates (oldLawoState: LawoState, newLawoState: LawoState): Array<LawoCommandWithContext> {

		let commands: Array<LawoCommandWithContext> = []

		_.each(newLawoState, (newNode: LawoStateNode, path: string) => {
			let oldValue: LawoStateNode = oldLawoState[path] || null
			let diff = getDiff(
				_.omit(newNode, 'timelineObjId'),
				_.omit(oldValue, 'timelineObjId')
			)
			if (diff) {
				// It's a plain value:
				commands.push({
					cmd: {
						path: path,
						type: newNode.type,
						key: newNode.key,
						identifier: newNode.identifier,
						value: newNode.value,
						valueType: newNode.valueType,
						transitionDuration: newNode.transitionDuration,
						priority: newNode.priority
					},
					context: diff,
					timelineObjId: newNode.timelineObjId
				})
			}
		})
		commands.sort((a, b) => {
			if (a.cmd.priority < b.cmd.priority) return 1
			if (a.cmd.priority > b.cmd.priority) return -1

			if (a.cmd.path > b.cmd.path) return 1
			if (a.cmd.path < b.cmd.path) return -1

			return 0
		})
		return commands
	}

	/**
	 * Gets an ember node based on its path
	 * @param path
	 */
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
					this.emit('error', 'Lawo path error', e)
					reject(e)
				})

			}
		})
	}

	/**
	 * Returns an attribute path
	 * @param identifier
	 * @param attributePath
	 */
	private _sourceNodeAttributePath (identifier: string, attributePath: string): string {
		return _.compact([
			this._sourcesPath,
			identifier,
			attributePath.replace('/', '.')
		]).join('.')
	}

	private async _defaultCommandReceiver (_time: number, command: LawoCommand, context: CommandContext, timelineObjId: string): Promise<any> {
		const cwc: CommandWithContext = {
			context: context,
			command: command,
			timelineObjId: timelineObjId
		}
		this.emit('debug', cwc)

		const startSend = this.getCurrentTime()
		this._lastSentValue[command.path] = startSend

		try {
			if (command.key === 'Fader/Motor dB Value') {	// fader level

				if (command.transitionDuration && command.transitionDuration >= 500) {	// with timed fader movement
					try {
						const res = await this._lawo.invokeFunction(
							new Ember.QualifiedFunction(this._rampMotorFunctionPath),
							[
								command.identifier,
								new Ember.ParameterContents(command.value, 'real'),
								new Ember.ParameterContents(command.transitionDuration / 1000, 'real')
							]
						)
						this.emit('debug', `Ember function result (${timelineObjId}): ${JSON.stringify(res)}`)
					} catch (e) {
						if (e.result && e.result.indexOf(6) > -1 && this._lastSentValue[command.path] < startSend) {
							// Lawo rejected the command, so ensure the value gets set
							this.emit('info', `Ember function result (${timelineObjId}) was 6, running a direct setValue now`)
							await this.setValueWrapper(command, timelineObjId, EmberTypes.REAL)
						} else {
							if (e.success === false) { // @todo: QualifiedFunction Fader/Motor cannot handle too short durations or small value changes
								this.emit('info', `Ember function result (${timelineObjId}): ${JSON.stringify(e)}`)
							}
							this.emit('error', `Lawo: Ember function command error (${timelineObjId})`, e)
							throw e
						}
					}

				} else { // withouth timed fader movement
					await this.setValueWrapper(command, timelineObjId, EmberTypes.REAL)
				}
			} else {
				await this.setValueWrapper(command, timelineObjId)
			}
		} catch (error) {
			this.emit('commandError', error, cwc)
		}

	}
	private async setValueWrapper (command: LawoCommand, timelineObjId: string, valueType?: EmberTypes) {
		try {
			const node: any = await this._getNodeByPath(command.path)

			if (typeof command.value === 'number' && command.value % 1 === 0) {
				command.value += 0.01
			}

			const res = await this._lawo.setValueWithHacksaw(node, new Ember.ParameterContents(command.value, valueType || command.valueType))

			this.emit('debug', `Ember result (${timelineObjId}): ${JSON.stringify(res)}`)
		} catch (e) {
			this.emit('error', `Lawo: Ember setvalue error (${timelineObjId})`, e)
			throw e
		}
	}

	private _connectionChanged () {
		this.emit('connectionChanged', this.getStatus())
	}
}
