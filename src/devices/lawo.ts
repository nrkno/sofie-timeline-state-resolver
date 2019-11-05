import * as _ from 'underscore'

import {
	DeviceWithState,
	CommandWithContext,
	DeviceStatus,
	StatusCode,
	IDevice
} from './device'
import {
	DeviceType,
	TimelineContentTypeLawo,
	MappingLawo,
	TimelineObjLawoSource,
	TimelineObjLawoAny,
	TimelineObjLawoEmberProperty,
	EmberValueTypes,
	EmberTypes,
	TimelineObjLawoEmberRetrigger,
	DeviceOptionsLawo,
	LawoCommand,
	SetLawoValueFn,
	LawoOptions
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

export interface DeviceOptionsLawoInternal extends DeviceOptionsLawo {
	options: (
		DeviceOptionsLawo['options'] &
		{ commandReceiver?: CommandReceiver }
	)
}
export type CommandReceiver = (time: number, cmd: LawoCommand, context: CommandContext, timelineObjId: string) => Promise<any>

// export type EmberPlusValue = boolean | number | string | {type: EmberTypes, value: EmberValueTypes}

export interface LawoState {
	nodes: {
		[path: string]: LawoStateNode
	},
	triggerValue?: string
}

export interface LawoStateNode {
	type: TimelineContentTypeLawo
	value: EmberValueTypes
	valueType: EmberTypes
	key: string
	identifier: string
	transitionDuration?: number
	priority: number
	/** Reference to the original timeline object: */
	timelineObjId: string
}

export interface LawoCommandWithContext {
	cmd: LawoCommand
	context: CommandContext
	timelineObjId: string
}
type CommandContext = string
const FADER_THRESHOLD = -90 // below this value the channel is considered muted
/**
 * This is a wrapper for a Lawo sound mixer
 *
 * It controls mutes and fades over Ember Plus.
 */
export class LawoDevice extends DeviceWithState<TimelineState> implements IDevice {
	private _doOnTime: DoOnTime
	private _lawo: DeviceTree

	private _savedNodes = []
	private _lastSentValue: { [path: string]: number } = {}

	private _connected: boolean = false

	private _commandReceiver: CommandReceiver
	private _sourcesPath: string
	private _rampMotorFunctionPath: string
	private _dbPropertyName: string
	private _setValueFn: SetLawoValueFn
	private _faderIntervalTime: number

	private transitions: { [address: string]: {
		started: number
	} & LawoCommand } = {}
	private transitionInterval: NodeJS.Timer | undefined

	constructor (deviceId: string, deviceOptions: DeviceOptionsLawoInternal, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) {
				this._commandReceiver = deviceOptions.options.commandReceiver
			} else {
				this._commandReceiver = this._defaultCommandReceiver
			}
			if (deviceOptions.options.setValueFn) {
				this._setValueFn = deviceOptions.options.setValueFn
			} else {
				this._setValueFn = this.setValueWrapper
			}
			if (deviceOptions.options.sourcesPath) {
				this._sourcesPath = deviceOptions.options.sourcesPath
			}
			if (deviceOptions.options.rampMotorFunctionPath) {
				this._rampMotorFunctionPath = deviceOptions.options.rampMotorFunctionPath
			}
			if (deviceOptions.options.dbPropertyName) {
				this._dbPropertyName = deviceOptions.options.dbPropertyName
			}
			if (deviceOptions.options.faderInterval) {
				this._faderIntervalTime = deviceOptions.options.faderInterval
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
	init (_initOptions: LawoOptions): Promise<boolean> {
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
		if (this.transitionInterval) clearInterval(this.transitionInterval)

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
		const lawoState: LawoState = {
			nodes: {}
		}

		_.each(state.layers, (tlObject: ResolvedTimelineObjectInstance, layerName: string) => {
			const lawoObj = tlObject as any as TimelineObjLawoAny

			const mapping: MappingLawo | undefined = this.getMapping()[layerName] as MappingLawo
			if (mapping && mapping.device === DeviceType.LAWO) {

				if (mapping.identifier && lawoObj.content.type === TimelineContentTypeLawo.SOURCE) {
					let tlObjectSource: TimelineObjLawoSource = lawoObj as TimelineObjLawoSource

					const fader: TimelineObjLawoSource['content']['Fader/Motor dB Value'] = tlObjectSource.content['Fader/Motor dB Value']
					const attrName = this._rampMotorFunctionPath || !this._dbPropertyName ? 'Fader/Motor dB Value' : this._dbPropertyName

					lawoState.nodes[this._sourceNodeAttributePath(mapping.identifier, attrName)] = {
						type: tlObjectSource.content.type,
						key: 'Fader/Motor dB Value',
						identifier: mapping.identifier,
						value: fader.value,
						valueType: EmberTypes.REAL,
						transitionDuration: fader.transitionDuration,
						priority: mapping.priority || 0,
						timelineObjId: tlObject.id
					}

				} else if (mapping.identifier && lawoObj.content.type === TimelineContentTypeLawo.EMBER_PROPERTY) {
					let tlObjectSource: TimelineObjLawoEmberProperty = lawoObj as TimelineObjLawoEmberProperty

					lawoState.nodes[mapping.identifier] = {
						type: tlObjectSource.content.type,
						key: '',
						identifier: mapping.identifier,
						value: tlObjectSource.content.value,
						valueType: mapping.emberType || EmberTypes.REAL,
						priority: mapping.priority || 0,
						timelineObjId: tlObject.id
					}

				} else if (lawoObj.content.type === TimelineContentTypeLawo.TRIGGER_VALUE) {
					let tlObjectSource: TimelineObjLawoEmberRetrigger = lawoObj as TimelineObjLawoEmberRetrigger

					lawoState.triggerValue = tlObjectSource.content.triggerValue
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
		let isRetrigger = newLawoState.triggerValue && newLawoState.triggerValue !== oldLawoState.triggerValue

		_.each(newLawoState.nodes, (newNode: LawoStateNode, path: string) => {
			let oldValue: LawoStateNode = oldLawoState.nodes[path] || null
			let diff = getDiff(
				_.omit(newNode, 'timelineObjId'),
				_.omit(oldValue, 'timelineObjId')
			)
			if (diff || (newNode.key === 'Fader/Motor dB Value' && isRetrigger)) {
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
					context: diff || `triggerValue: "${newLawoState.triggerValue}"`,
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
			if (command.key === 'Fader/Motor dB Value' && command.transitionDuration && command.transitionDuration >= 0) {	// fader level
				// this.emit('debug', cwc)

				if (!this._rampMotorFunctionPath) {
					// add the fade to the fade object, such that we can fade the signal using the fader
					if (!command.from) { // @todo: see if we can query the lawo first
						const node = await this._getNodeByPath(command.path)
						if (node) {
							if (node.contents.value === command.value) return
							command.from = node.contents.value
						} else {
							await this._setValueFn(command, timelineObjId)
							return
						}
					}

					this.transitions[command.path] = {
						...command,
						started: this.getCurrentTime()
					}

					if (!this.transitionInterval) this.transitionInterval = setInterval(() => this.runAnimation(), this._faderIntervalTime || 75)
				} else if (command.transitionDuration >= 500) { // Motor Ramp in Lawo cannot handle too short durations
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
							await this._setValueFn(command, timelineObjId, EmberTypes.REAL)
						} else {
							if (e.success === false) { // @todo: QualifiedFunction Fader/Motor cannot handle too short durations or small value changes
								this.emit('info', `Ember function result (${timelineObjId}): ${JSON.stringify(e)}`)
							}
							this.emit('error', `Lawo: Ember function command error (${timelineObjId})`, e)
							throw e
						}
					}

				} else { // withouth timed fader movement
					await this._setValueFn(command, timelineObjId, EmberTypes.REAL)
				}
			} else {
				await this._setValueFn(command, timelineObjId)
			}
		} catch (error) {
			this.emit('commandError', error, cwc)
		}

	}
	private async setValueWrapper (command: LawoCommand, timelineObjId: string, valueType?: EmberTypes) {
		try {
			const node: any = await this._getNodeByPath(command.path)

			if (valueType === EmberTypes.REAL && command.value as number % 1 === 0) {
				(command.value as number) += .01
			}

			const res = await this._lawo.setValueWithHacksaw(node, new Ember.ParameterContents(command.value, valueType || command.valueType))

			this.emit('debug', `Ember result (${timelineObjId}): ${JSON.stringify(res)}`)
		} catch (e) {
			this.emit('error', `Lawo: Error in setValue (${timelineObjId})`, e)
			throw e
		}
	}
	private _connectionChanged () {
		this.emit('connectionChanged', this.getStatus())
	}
	private runAnimation (): void {
		for (const addr in this.transitions) {
			const transition = this.transitions[addr]
			// delete old transitions
			if (transition.started + transition.transitionDuration! < this.getCurrentTime()) {
				delete this.transitions[addr]

				// assert correct finished value:
				this._setValueFn(transition, '').catch(() => null)
			}
		}

		for (const addr in this.transitions) {
			const transition = this.transitions[addr]

			const from = Math.max(FADER_THRESHOLD, transition.from as number)
			const to = Math.max(FADER_THRESHOLD, transition.value as number)

			const p = (this.getCurrentTime() - transition.started) / transition.transitionDuration!

			const v = from + p * (to - from) // should this have easing?

			this._setValueFn({ ...transition, value: v }, '').catch(() => null)
		}

		if (Object.keys(this.transitions).length === 0) {
			clearInterval(this.transitionInterval!)
			this.transitionInterval = undefined
		}
	}
}
