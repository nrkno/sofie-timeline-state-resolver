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
	VMixOptions,
	VMixCommandContent
} from '../types/src'
import { DoOnTime, SendMode } from '../doOnTime'
// import * as request from 'request'

import {
	TimelineState
} from 'superfly-timeline'
import { VMix } from './vmixAPI'
import { MappingVMix, TimelineContentTypeVMix, TimelineObjVMixInput, VMixCommand, VMixTransitionType } from '../types/src/vmix'

export interface VMixStateCommand {
	command: VMixCommand
	context: CommandContext
	input?: string
	value?: string
	timelineId: string
}

export interface VMixDeviceOptions extends DeviceOptions {
	options?: {
		commandReceiver?: CommandReceiver
	}
}
export type CommandReceiver = (time: number, cmd: VMixStateCommand, context: CommandContext, timelineObjId: string) => Promise<any>
/*interface Command {
	commandName: 'added' | 'changed' | 'removed'
	content: VMixCommandContent
	context: CommandContext
	timelineObjId: string
	layer: string
}*/
type CommandContext = any

/**
 * This is a VMixDevice, it sends commands when it feels like it
 */
export class VMixDevice extends DeviceWithState<VMixState> {

	private _makeReadyCommands: VMixCommandContent[]
	private _doOnTime: DoOnTime

	private _commandReceiver: CommandReceiver
	private _vmix: VMix
	private _connected: boolean = false
	private _initialized: boolean = false

	constructor (deviceId: string, deviceOptions: VMixDeviceOptions, options) {
		super(deviceId, deviceOptions, options)
		console.log(this._connected)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		}, SendMode.IN_ORDER, this._deviceOptions)
		this._doOnTime.on('error', e => this.emit('error', 'VMix.doOnTime', e))
		this._doOnTime.on('slowCommand', msg => this.emit('slowCommand', this.deviceName + ': ' + msg))
	}
	init (options: VMixOptions): Promise<boolean> {
		return new Promise((resolve, reject) => {
			this._makeReadyCommands = options.makeReadyCommands || []

			this._vmix = new VMix()
			this._vmix.once('connected', () => {
				this._connected = true
				this._initialized = true
				this._connectionChanged()
				resolve(true)
			})
			this._vmix.on('connected', () => {
				let time = this.getCurrentTime()
				this.setState(this._vmix.state, time)
				this._connected = true
				this._initialized = true
				this._connectionChanged()
				this.emit('resetResolver')
			})
			this._vmix.on('disconnected', () => {
				this._connected = false
				this._connectionChanged()
			})
			this._vmix.on('error', (e) => this.emit('error', 'VMix', e))
			this._vmix.on('stateChanged', (state) => this._onVMixStateChanged(state))

			this._vmix.connect(options)
			.catch(e => {
				reject(e)
			})
		})
	}
	private _connectionChanged () {
		this.emit('connectionChanged', this.getStatus())
	}

	private _onVMixStateChanged (newState: VMixState) {
		console.log(newState)
	}

	private _getDefaultState (): VMixState {
		return {
			version: '22.0.0.67',
			edition: 'Trial',
			inputs: [],
			overlays: [],
			preview: undefined,
			active: undefined,
			fadeToBlack: false,
			transitions: [],
			recording: false,
			external: false,
			streaming: false,
			playlist: false,
			multiCorder: false,
			fullscreen: false,
			audio: []
		}
	}

	handleState (newState: TimelineState) {
		if (!this._initialized) { // before it's initialized don't do anything
			this.emit('info', 'VMix not initialized yet')
			return
		}

		let previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		let oldState: VMixState = (this.getStateBefore(previousStateTime) || { state: this._getDefaultState() }).state

		let newAbstractState = this.convertStateToVMix(newState)

		let commandsToAchieveState: Array<any> = this._diffStates(oldState, newAbstractState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)

		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newAbstractState, newState.time)
	}
	clearFuture (clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	terminate () {
		this._doOnTime.dispose()
		return Promise.resolve(true)
	}
	getStatus (): DeviceStatus {
		// Good, since this device has no status, really
		return {
			statusCode: StatusCode.GOOD
		}
	}
	async makeReady (okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff && this._makeReadyCommands && this._makeReadyCommands.length > 0) {
			_.each(this._makeReadyCommands, (cmd: VMixCommandContent) => {
				console.log(cmd)
				// add the new commands to the queue:
				/*this._doOnTime.queue(time, cmd.queueId, (cmd: VMixCommandContent) => {
					return this._commandReceiver(time, cmd, 'makeReady', '')
				}, cmd)*/
			})
		}
	}

	get canConnect (): boolean {
		return false
	}
	get connected (): boolean {
		return false
	}
	convertStateToVMix (state: TimelineState): VMixState {
		if (!this._initialized) throw Error('convertStateToVMix cannot be used before inititialized')
		// Start out with default state:
		const deviceState = this._getDefaultState()

		// Sort layer based on Layer name
		const sortedLayers = _.map(state.layers, (tlObject, layerName) => ({ layerName, tlObject }))
			.sort((a,b) => a.layerName.localeCompare(b.layerName))

		_.each(sortedLayers, ({ tlObject, layerName }) => {
			let mapping = this.getMapping()[layerName] as MappingVMix

			console.log(mapping) // TODO: Use this later

			if (tlObject.content) {
				switch (tlObject.content.type) {
					case TimelineContentTypeVMix.INPUT:
						let vmixTl = tlObject as any as TimelineObjVMixInput
						// TODO: Verify input is available
						// deviceState.active = Number(vmixTl.content.input) || deviceState.active
						if (vmixTl.content.input) deviceState.active = vmixTl.content.input
						if (vmixTl.content.transition) {
							deviceState.transitions = [] // TODO: Preserve transitions
							deviceState.transitions.push({
								number: 4,
								effect: vmixTl.content.transition.type,
								duration: vmixTl.content.transition.duration
							})
						}
						break
				}
			}
		})
		return deviceState
	}
	get deviceType () {
		return DeviceType.VMIX
	}
	get deviceName (): string {
		return 'VMix-Send ' + this.deviceId
	}
	get queue () {
		return this._doOnTime.getQueue()
	}
	private _addToQueue (commandsToAchieveState: Array<VMixStateCommand>, time: number) {
		_.each(commandsToAchieveState, (cmd: VMixStateCommand) => {

			// add the new commands to the queue:
			this._doOnTime.queue(time, undefined, (cmd: VMixStateCommand) => {
				return this._commandReceiver(time, cmd, cmd.context, cmd.timelineId)
			}, cmd)
		})
	}
	private _diffStates (oldVMixState: VMixState, newVMixState: VMixState): Array<VMixStateCommand> {
		let commands: Array<VMixStateCommand> = []

		if (newVMixState.active !== undefined) {
			if (!_.isEqual(oldVMixState.transitions, newVMixState.transitions)) {
				_.difference(newVMixState.transitions, oldVMixState.transitions)
				.forEach(transition => {
					if (oldVMixState.active !== newVMixState.active) {
						commands.push({
							command: VMixCommand.PREVIEW_INPUT,
							input: newVMixState.active ? newVMixState.active.toString() : '1',
							context: null,
							timelineId: ''
						})
					}

					commands.push({
						command: VMixCommand.TRANSITION_EFFECT,
						value: transition.effect,
						context: null,
						timelineId: ''
					})

					commands.push({
						command: VMixCommand.TRANSITION_DURATION,
						value: transition.duration.toString(),
						context: null,
						timelineId: ''
					})

					if (oldVMixState.active !== newVMixState.active) {
						commands.push({
							command: VMixCommand.TRANSITION,
							context: null,
							timelineId: ''
						})
					}
				})
			} else {
				if (oldVMixState.active !== newVMixState.active) {
					commands.push({
						command: VMixCommand.ACTIVE_INPUT,
						input: newVMixState.active.toString(),
						context: null,
						timelineId: ''
					})
				}
			}
		}

		return commands
	}
	private _defaultCommandReceiver (time: number, cmd: VMixStateCommand, context: CommandContext, timelineObjId: string): Promise<any> {
		time = time

		let cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId
		}
		this.emit('debug', cwc)

		return this._vmix.sendCommand(cwc.command)
		.catch(error => {
			this.emit('commandError', error, cwc)
		})
	}
}

export class VMixState {
	version: string
	edition: string // TODO: Enuum, need list of available editions: Trial
	inputs: VMixInput[]
	overlays: VMixOverlays[]
	preview: string | undefined
	active: string | undefined
	fadeToBlack: boolean
	transitions: VMixTransition[]
	recording: boolean
	external: boolean
	streaming: boolean
	playlist: boolean
	multiCorder: boolean
	fullscreen: boolean
	audio: VMixAudioChannel[]
}

interface VMixInput {
	key: string
	number: number
	type: string // TODO: enum of input types, as they may need different treatement in future
	title: string
	name: string
	state: string // TODO: enum of states
	position: number
	duration: number
	loop: boolean
	muted: boolean
	volume: number // 0 - 100
	balance: number
	solo: boolean
	audiobusses: string
	meterF1: number
	meterF2: number
	content: string
}

interface VMixOverlays {
	number: string
	key: string
}

interface VMixTransition {
	number: number
	effect: VMixTransitionType
	duration: number
}

interface VMixAudioChannel {
	volume: number
	muted: Boolean
	meterF1: number
	meterF2: number
	headphonesVolume: number
}
