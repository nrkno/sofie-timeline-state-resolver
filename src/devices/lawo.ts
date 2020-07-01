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
	TimelineObjLawoEmberRetrigger,
	DeviceOptionsLawo,
	LawoCommand,
	SetLawoValueFn,
	LawoOptions,
	LawoDeviceMode,
	ContentTimelineObjLawoSource,
	MappingLawoType
} from '../types/src'
import {
	TimelineState, ResolvedTimelineObjectInstance
} from 'superfly-timeline'
import { DoOnTime, SendMode } from '../doOnTime'
import { getDiff } from '../lib'
import {
	EmberClient,
	Types as EmberTypes,
	Model as EmberModel
} from 'emberplus-connection'

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
	value: EmberTypes.EmberValue
	valueType: EmberModel.ParameterType
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
/**
 * This is a wrapper for a Lawo sound mixer
 *
 * It controls mutes and fades over Ember Plus.
 */
export class LawoDevice extends DeviceWithState<TimelineState> implements IDevice {
	private _doOnTime: DoOnTime
	private _lawo: EmberClient

	private _lastSentValue: { [path: string]: number } = {}

	private _connected: boolean = false

	private _commandReceiver: CommandReceiver
	private _sourcesPath: string
	private _rampMotorFunctionPath: string
	private _dbPropertyName: string
	private _setValueFn: SetLawoValueFn
	private _faderIntervalTime: number
	private _faderThreshold: number

	private transitions: { [address: string]: {
		started: number,
		tlObjId: string
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

			if (deviceOptions.options.faderInterval) {
				this._faderIntervalTime = deviceOptions.options.faderInterval
			}

			switch (deviceOptions.options.deviceMode) {
				case LawoDeviceMode.Ruby:
					this._sourcesPath = 'Ruby.Sources'
					this._dbPropertyName = 'Fader.Motor dB Value'
					this._rampMotorFunctionPath = 'Ruby.Functions.RampMotorFader'
					break
				case LawoDeviceMode.RubyManualRamp:
					this._sourcesPath = 'Ruby.Sources'
					this._dbPropertyName = 'Fader.Motor dB Value'
					this._faderThreshold = -60
					break
				case LawoDeviceMode.MC2:
					this._sourcesPath = 'Channels.Inputs'
					this._dbPropertyName = 'Fader.Fader Level'
					this._faderThreshold = -90
					break
				case LawoDeviceMode.R3lay:
					this._sourcesPath = 'R3LAYVRX4.Ex.Sources'
					this._dbPropertyName = 'Active.Amplification'
					this._faderThreshold = -60
					break
				case LawoDeviceMode.Manual:
				default:
					this._sourcesPath = deviceOptions.options.sourcesPath || ''
					this._dbPropertyName = deviceOptions.options.dbPropertyName || ''
					this._rampMotorFunctionPath = deviceOptions.options.dbPropertyName || ''
					this._faderThreshold = deviceOptions.options.faderThreshold || -60
			}
		}
		let host = (
			deviceOptions.options && deviceOptions.options.host
			? deviceOptions.options.host :
			undefined
		)
		let port = (
			deviceOptions.options && deviceOptions.options.port ?
			deviceOptions.options.port :
			undefined
		)
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		}, SendMode.BURST, this._deviceOptions)
		this.handleDoOnTime(this._doOnTime, 'Lawo')

		this._lawo = new EmberClient(host || '', port)
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
		// this._lawo.on('warn', (w) => {
		// 	this.emit('debug', 'Warning: Lawo.Emberplus', w)
		// })
		let firstConnection = true
		this._lawo.on('connected', async () => {
			this._setConnected(true)

			if (firstConnection) {
				try {
					const req = await this._lawo.getDirectory(this._lawo.tree)
					await req.response
				} catch (e) {
					this.emit('error', 'Error while expanding root', e)
				}
			}
			firstConnection = false
		})
		this._lawo.on('disconnected', () => {
			this._setConnected(false)
		})
	}

	/**
	 * Initiates the connection with Lawo
	 */
	async init (_initOptions: LawoOptions): Promise<boolean> {
		const err = await this._lawo.connect()
		if (err) this.emit('error', 'Lawo initialization', err)
		return true // device is usable, lib will handle connection
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
			this._lawo.disconnect().then(() => {
				this._lawo.discard()
			}).catch(() => null) // fail silently
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
		const attrName = this._rampMotorFunctionPath || !this._dbPropertyName ? 'Fader.Motor dB Value' : this._dbPropertyName

		const newFaders: Array<{ attrPath: string, node: LawoStateNode, priority: number }> = []
		const pushFader = (identifier: string, fader: ContentTimelineObjLawoSource, mapping: MappingLawo, tlObjId: string, priority = 0) => {
			newFaders.push({
				attrPath: this._sourceNodeAttributePath(identifier, attrName),
				priority,
				node: {
					type: TimelineContentTypeLawo.SOURCE,
					key: 'fader',
					identifier: identifier,
					value: fader.faderValue,
					valueType: EmberModel.ParameterType.Real,
					transitionDuration: fader.transitionDuration,
					priority: mapping.priority || 0,
					timelineObjId: tlObjId
				}
			})
		}

		_.each(state.layers, (tlObject: ResolvedTimelineObjectInstance, layerName: string) => {
			// for every layer
			const lawoObj = tlObject as any as TimelineObjLawoAny

			const mapping: MappingLawo | undefined = this.getMapping()[layerName] as MappingLawo

			if (mapping && mapping.device === DeviceType.LAWO) {
				// Mapping is for Lawo

				if (mapping.mappingType === MappingLawoType.SOURCES && lawoObj.content.type === TimelineContentTypeLawo.SOURCES) {
					// mapping implies a composite of sources
					for (const fader of lawoObj.content.sources) {
						// for every mapping in the composite
						const sourceMapping: MappingLawo | undefined = this.getMapping()[fader.mappingName] as MappingLawo

						if (!sourceMapping || !sourceMapping.identifier || sourceMapping.mappingType !== MappingLawoType.SOURCE) continue
						// mapped mapping is a source mapping

						pushFader(sourceMapping.identifier, fader, sourceMapping, tlObject.id, lawoObj.content.overridePriority)
					}
				} else if (mapping.identifier && lawoObj.content.type === TimelineContentTypeLawo.SOURCE) {
					// mapping is for a source
					let tlObjectSource: TimelineObjLawoSource = lawoObj as TimelineObjLawoSource
					let fader: ContentTimelineObjLawoSource = tlObjectSource.content
					const priority = tlObjectSource.content.overridePriority
					// TODO - next breaking change, remove deprecated tlObject typings "Fader/Motor dB Value"
					if ('Fader/Motor dB Value' in tlObjectSource.content) {
						fader = {
							faderValue: tlObjectSource.content['Fader/Motor dB Value'].value,
							transitionDuration: tlObjectSource.content['Fader/Motor dB Value'].transitionDuration
						}
					}
					pushFader(mapping.identifier, fader, mapping, tlObject.id, priority)

				} else if (mapping.identifier && lawoObj.content.type === TimelineContentTypeLawo.EMBER_PROPERTY) {
					// mapping is a property to set
					let tlObjectSource: TimelineObjLawoEmberProperty = lawoObj as TimelineObjLawoEmberProperty

					lawoState.nodes[mapping.identifier] = {
						type: tlObjectSource.content.type,
						key: '',
						identifier: mapping.identifier,
						value: tlObjectSource.content.value,
						valueType: mapping.emberType || EmberModel.ParameterType.Real,
						priority: mapping.priority || 0,
						timelineObjId: tlObject.id
					}

				} else if (lawoObj.content.type === TimelineContentTypeLawo.TRIGGER_VALUE) {
					// mapping is a trigger value (will resend all commands to the Lawo to enforce state when changed)
					let tlObjectSource: TimelineObjLawoEmberRetrigger = lawoObj as TimelineObjLawoEmberRetrigger

					lawoState.triggerValue = tlObjectSource.content.triggerValue
				}
			}

		})

		newFaders.sort((a, b) => a.priority - b.priority)
		// layers are sorted by priority
		for (const newFader of newFaders) {
			lawoState.nodes[newFader.attrPath] = newFader.node
		}
		// highest priority source has been written to lawoState

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
	/**
	 * Add commands to queue, to be executed at the right time
	 */
	private _addToQueue (commandsToAchieveState: Array<LawoCommandWithContext>, time: number) {
		_.each(commandsToAchieveState, (cmd: LawoCommandWithContext) => {

			// add the new commands to the queue:
			this._doOnTime.queue(time, undefined, (cmd: LawoCommandWithContext) => {
				return this._commandReceiver(time, cmd.cmd, cmd.context, cmd.timelineObjId)
			}, cmd)
		})
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
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
			if (diff || (newNode.key === 'fader' && isRetrigger)) {
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
	private async _getNodeByPath (path: string): Promise<EmberModel.NumberedTreeNode<EmberModel.EmberElement>> {
		const node = await this._lawo.getElementByPath(path) as EmberModel.NumberedTreeNode<EmberModel.EmberElement>
		return node
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
			attributePath
		]).join('.')
	}

	private async _defaultCommandReceiver (_time: number, command: LawoCommand, context: CommandContext, timelineObjId: string): Promise<any> {
		const cwc: CommandWithContext = {
			context: context,
			command: command,
			timelineObjId: timelineObjId
		}
		this.emit('debug', cwc)

		// save start time of command
		const startSend = this.getCurrentTime()
		this._lastSentValue[command.path] = startSend

		try {
			if (command.key === 'fader' && command.transitionDuration && command.transitionDuration >= 0) {	// fader level
				// TODO - Lawo result 6 code is based on time - difference ratio, certain ratios we may want to run a manual fade?
				if (!this._rampMotorFunctionPath || (command.transitionDuration < 500 && this._faderIntervalTime < 250)) {
					// add the fade to the fade object, such that we can fade the signal using the fader
					if (!command.from) { // @todo: see if we can query the lawo first
						const node = await this._getNodeByPath(command.path) as EmberModel.NumberedTreeNode<EmberModel.Parameter>
						if (node) {
							if (node.contents.factor) {
								command.from = (node.contents.value as number) / (node.contents.factor || 1)
							} else {
								command.from = node.contents.value
							}
							if (command.from === command.value) return
						} else {
							throw new Error('Node ' + command.path + ' was not found')
						}
					}

					this.transitions[command.path] = {
						...command,
						tlObjId: timelineObjId,
						started: this.getCurrentTime()
					}

					if (!this.transitionInterval) this.transitionInterval = setInterval(() => this.runAnimation(), this._faderIntervalTime || 75)
				} else if (command.transitionDuration >= 500) { // Motor Ramp in Lawo cannot handle too short durations
					const fn = await this._lawo.getElementByPath(this._rampMotorFunctionPath)
					if (!fn) throw new Error('Function path not found')
					if (fn.contents.type !== EmberModel.ElementType.Function) throw new Error('Node at specified path for function is not a function')
					const req = await this._lawo.invoke(
						fn as EmberModel.NumberedTreeNode<EmberModel.EmberFunction>,
						{ type: EmberModel.ParameterType.String, value: command.identifier },
						{ type: EmberModel.ParameterType.Real, value: command.value },
						{ type: EmberModel.ParameterType.Real, value: command.transitionDuration / 1000 }
					)
					this.emit('debug', `Ember function invoked (${timelineObjId})`)
					const res = await req.response
					this.emit('debug', `Ember function result (${timelineObjId}): ${(JSON.stringify(res))}`, res)
					if (res && res.success === false) {
						if (res.result && res.result[0].value === 6 && this._lastSentValue[command.path] <= startSend) { // result 6 and no new command fired for this path in meantime
							// Lawo rejected the command, so ensure the value gets set
							this.emit('info', `Ember function result (${timelineObjId}) was 6, running a direct setValue now`)
							await this._setValueFn(command, timelineObjId)
						} else {
							this.emit('error', `Lawo: Ember function success false (${timelineObjId}, ${command.identifier})`, new Error('Lawo Result ' + res.result![0].value))
						}
					}
				} else { // withouth timed fader movement
					await this._setValueFn(command, timelineObjId)
				}
			} else {
				await this._setValueFn(command, timelineObjId)
			}
		} catch (error) {
			this.emit('commandError', error, cwc)
		}

	}
	private async setValueWrapper (command: LawoCommand, timelineObjId: string, logResult = true) {
		try {
			const node = await this._getNodeByPath(command.path) as EmberModel.NumberedTreeNode<EmberModel.Parameter>

			const value = node.contents.factor ? command.value as number * node.contents.factor : command.value

			const req = await this._lawo.setValue(node, value, logResult)
			if (logResult) {
				const res = await req.response
				this.emit('debug', `Ember result (${timelineObjId}): ${(res && res.contents.value)}`, { command, res: res && res.contents })
			} else if (!req.sentOk) {
				this.emit('error', 'SetValue no logResult', new Error(`Ember req (${timelineObjId}) for "${command.path}" to "${value}" failed`))
			}
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
				this._setValueFn(transition, transition.tlObjId).catch(() => null)
			}
		}

		for (const addr in this.transitions) {
			const transition = this.transitions[addr]

			const from = this._faderThreshold ? Math.max(this._faderThreshold, transition.from as number) : transition.from as number
			const to = this._faderThreshold ? Math.max(this._faderThreshold, transition.value as number) : transition.value as number

			const p = (this.getCurrentTime() - transition.started) / transition.transitionDuration!

			const v = from + p * (to - from) // should this have easing?

			this._setValueFn({ ...transition, value: v }, transition.tlObjId, false).catch(() => null)
		}

		if (Object.keys(this.transitions).length === 0) {
			clearInterval(this.transitionInterval!)
			this.transitionInterval = undefined
		}
	}
}
