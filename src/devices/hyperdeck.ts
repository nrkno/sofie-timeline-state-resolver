import * as _ from 'underscore'
import * as underScoreDeepExtend from 'underscore-deep-extend'
import { TimelineState } from 'superfly-timeline'
import {
	DeviceWithState,
	DeviceOptions,
	CommandWithContext,
	DeviceStatus,
	StatusCode
} from './device'
import {
	DeviceType,
	TimelineContentTypeHyperdeck,
	MappingHyperdeck,
	MappingHyperdeckType,
	HyperdeckOptions
} from '../types/src'
import {
	Hyperdeck,
	Commands as HyperdeckCommands,
	TransportStatus
} from 'hyperdeck-connection'
import { DoOnTime } from '../doOnTime'
import { Conductor } from '../conductor'

_.mixin({ deepExtend: underScoreDeepExtend(_) })

function deepExtend<T> (destination: T, ...sources: any[]) {
	// @ts-ignore (mixin)
	return _.deepExtend(destination, ...sources)
}
/**
 * This is a wrapper for the Hyperdeck Device. Commands to any and all hyperdeck devices will be sent through here.
 */
export interface HyperdeckDeviceOptions extends DeviceOptions {
	options?: {
		commandReceiver?: (time: number, cmd) => Promise<any>
	}
}
export interface HyperdeckCommandWithContext {
	command: HyperdeckCommands.AbstractCommand
	context: CommandContext
}

export interface TransportInfoCommandResponseExt /*extends HyperdeckCommands.TransportInfoCommandResponse */ {
	status: TransportStatus
	recordFilename?: string
}

export interface DeviceState {
	notify: HyperdeckCommands.NotifyCommandResponse
	transport: TransportInfoCommandResponseExt
}

type CommandContext = any
export class HyperdeckDevice extends DeviceWithState<DeviceState> {

	private _doOnTime: DoOnTime

	private _hyperdeck: Hyperdeck
	private _initialized: boolean = false
	private _connected: boolean = false
	private _conductor: Conductor

	private _commandReceiver: (time: number, command: HyperdeckCommands.AbstractCommand, context: CommandContext) => Promise<any>

	constructor (deviceId: string, deviceOptions: HyperdeckDeviceOptions, options, conductor: Conductor) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		})
		this._doOnTime.on('error', e => this.emit('error', 'doOnTime', e))
		this._conductor = conductor
	}

	/**
	 * Initiates the connection with the Hyperdeck through the hyperdeck-connection lib.
	 */
	init (options: HyperdeckOptions): Promise<boolean> {
		return new Promise((resolve/*, reject*/) => {
			let firstConnect = true

			this._hyperdeck = new Hyperdeck()
			this._hyperdeck.connect(options.host, options.port)
			this._hyperdeck.on('connected', () => {
				return this._queryCurrentState().then(state => {
					this.setState(state, this.getCurrentTime())
					if (firstConnect) {
						firstConnect = false
						this._initialized = true
						resolve(true)
					}
					this._connected = true
					this._connectionChanged()
					this._conductor.resetResolver()
				})
			})
			this._hyperdeck.on('disconnected', () => {
				this._connected = false
				this._connectionChanged()
			})
			this._hyperdeck.on('error', (e) => this.emit('error', 'Hyperdeck', e))
		})
	}
	terminate (): Promise<boolean> {
		this._doOnTime.dispose()

		return new Promise((resolve) => {
			// TODO: implement dispose function in hyperdeck-connection
			// this._hyperdeck.dispose()
			// .then(() => {
			// resolve(true)
			// })
			resolve(true)
		})
	}

	makeReady (okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			this._doOnTime.clearQueueNowAndAfter(this.getCurrentTime())

			// TODO - could this being slow/offline be a problem?
			return this._queryCurrentState().then(state => {
				this.setState(state, this.getCurrentTime())
			})
		}
		return Promise.resolve()
	}

	handleState (newState: TimelineState) {
		if (!this._initialized) {
			// before it's initialized don't do anything
			this.emit('info', 'Hyperdeck not initialized yet')
			return
		}
		let oldState: DeviceState = (this.getStateBefore(newState.time) || { state: this._getDefaultState() }).state

		let oldHyperdeckState = oldState
		let newHyperdeckState = this.convertStateToHyperdeck(newState)

		let commandsToAchieveState: Array<HyperdeckCommandWithContext> = this._diffStates(oldHyperdeckState, newHyperdeckState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newState.time)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newHyperdeckState, newState.time)
	}
	clearFuture (clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	get canConnect (): boolean {
		return true
	}
	get connected (): boolean {
		return this._connected
	}
	convertStateToHyperdeck (state: TimelineState): DeviceState {
		if (!this._initialized) throw Error('convertStateToHyperdeck cannot be used before inititialized')

		// Convert the timeline state into something we can use easier:
		const deviceState = this._getDefaultState()

		const sortedLayers = _.map(state.LLayers, (tlObject, layerName) => ({ layerName, tlObject }))
			.sort((a, b) => a.layerName.localeCompare(b.layerName))

		_.each(sortedLayers, ({ tlObject, layerName }) => {
			const content = tlObject.resolved || tlObject.content
			const mapping = this.mapping[layerName] as MappingHyperdeck // tslint:disable-line

			if (mapping) {
				switch (mapping.mappingType) {
					case MappingHyperdeckType.TRANSPORT:
						if (content.type === TimelineContentTypeHyperdeck.TRANSPORT) {
							if (deviceState.transport) {
								deepExtend(deviceState.transport, content.attributes)
							} else {
								deviceState.transport = content.attributes
							}
						}
						break
				}
			}
		})

		return deviceState
	}
	get deviceType () {
		return DeviceType.HYPERDECK
	}
	get deviceName (): string {
		return 'Hyperdeck ' + this.deviceId
	}
	get queue () {
		return this._doOnTime.getQueue()
	}
	getStatus (): DeviceStatus {
		// TODO: add status check here, to set warning if we've set it to record, but it's not
		return {
			statusCode: this._connected ? StatusCode.GOOD : StatusCode.BAD
		}
	}
	private _addToQueue (commandsToAchieveState: Array<HyperdeckCommandWithContext>, time: number) {
		_.each(commandsToAchieveState, (cmd: HyperdeckCommandWithContext) => {

			// add the new commands to the queue:
			this._doOnTime.queue(time, (cmd: HyperdeckCommandWithContext) => {
				return this._commandReceiver(time, cmd.command, cmd.context)
			}, cmd)
		})
	}

	private _diffStates (oldHyperdeckState: DeviceState, newHyperdeckState: DeviceState): Array<HyperdeckCommandWithContext> {

		const commandsToAchieveState: HyperdeckCommandWithContext[] = []

		if (oldHyperdeckState.notify && newHyperdeckState.notify) {
			const notifyCmd = new HyperdeckCommands.NotifySetCommand()
			let hasChange = false

			const keys = _.unique(_.keys(oldHyperdeckState.notify).concat(_.keys(newHyperdeckState.notify)))
			for (let k of keys) {
				if (oldHyperdeckState.notify[k] !== newHyperdeckState.notify[k]) {
					hasChange = true
					notifyCmd[k] = newHyperdeckState.notify[k]
				}
			}

			if (hasChange) {
				commandsToAchieveState.push({
					command: notifyCmd,
					context: {
						oldState: oldHyperdeckState.notify,
						newState: newHyperdeckState.notify
					}
				})
			}
		} else {
			this.emit('error', 'diffStates missing notify object', oldHyperdeckState.notify, newHyperdeckState.notify)
		}

		if (oldHyperdeckState.transport && newHyperdeckState.transport) {
			switch (newHyperdeckState.transport.status) {
				case TransportStatus.RECORD:
					// TODO - sometimes we can loose track of the filename (eg on reconnect).
					// should we split the record when recovering from that? (it might loose some frames)
					const filenameChanged = oldHyperdeckState.transport.recordFilename !== undefined &&
						oldHyperdeckState.transport.recordFilename !== newHyperdeckState.transport.recordFilename

					if (oldHyperdeckState.transport.status !== newHyperdeckState.transport.status) { // Start recording
						commandsToAchieveState.push({
							command: new HyperdeckCommands.RecordCommand(newHyperdeckState.transport.recordFilename),
							context: {
								oldState: oldHyperdeckState.transport,
								newState: newHyperdeckState.transport
							}
						})
					} else if (filenameChanged) { // Split recording
						commandsToAchieveState.push({
							command: new HyperdeckCommands.StopCommand(),
							context: {
								oldState: oldHyperdeckState.transport,
								newState: newHyperdeckState.transport
							}
						})
						commandsToAchieveState.push({
							command: new HyperdeckCommands.RecordCommand(newHyperdeckState.transport.recordFilename),
							context: {
								oldState: oldHyperdeckState.transport,
								newState: newHyperdeckState.transport
							}
						})
					} // else continue recording

					break
				default:
					// TODO - warn
					// for now we are assuming they want a stop. that could be conditional later on
					if (oldHyperdeckState.transport.status === TransportStatus.RECORD) {
						commandsToAchieveState.push({
							command: new HyperdeckCommands.StopCommand(),
							context: {
								oldState: oldHyperdeckState.transport,
								newState: newHyperdeckState.transport
							}
						})
					}
					break
			}

		} else {
			this.emit('error', 'diffStates missing transport object', oldHyperdeckState.transport, newHyperdeckState.transport)
		}

		return commandsToAchieveState
	}

	private async _queryCurrentState (): Promise<DeviceState> {
		if (!this._connected) return this._getDefaultState()

		const notify = this._hyperdeck.sendCommand(new HyperdeckCommands.NotifyGetCommand())
		const transport = this._hyperdeck.sendCommand(new HyperdeckCommands.TransportInfoCommand())

		const notifyRes = await notify
		const transportRes = await transport

		const res: DeviceState = {
			notify: notifyRes,
			transport: transportRes
		}
		return res
	}

	private _getDefaultState (): DeviceState {
		const res: DeviceState = {
			notify: { // TODO - this notify block will want configuring per device or will the state lib always want it the same?
				remote: false,
				transport: false,
				slot: false,
				configuration: false,
				droppedFrames: false
			},
			transport: {
				status: TransportStatus.PREVIEW
			}
		}

		return res
	}

	private _defaultCommandReceiver (_time: number, command: HyperdeckCommands.AbstractCommand, context: CommandContext): Promise<any> {
		let cwc: CommandWithContext = {
			context: context,
			command: command
		}
		this.emit('debug', cwc)

		return this._hyperdeck.sendCommand(command)
	}
	private _connectionChanged () {
		this.emit('connectionChanged', this.getStatus())
	}
}
