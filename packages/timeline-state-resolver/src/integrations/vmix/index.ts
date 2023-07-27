import * as _ from 'underscore'
import * as path from 'path'
import * as deepMerge from 'deepmerge'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode } from './../../devices/device'
import { DoOnTime, SendMode } from '../../devices/doOnTime'

import { VMix, VMixStateCommand } from './connection'
import {
	DeviceType,
	DeviceOptionsVMix,
	VMixOptions,
	Mappings,
	TimelineContentTypeVMix,
	VMixCommand,
	VMixTransition,
	VMixTransitionType,
	VMixInputType,
	VMixTransform,
	VMixInputOverlays,
	MappingVmixType,
	SomeMappingVmix,
	Timeline,
	TSRTimelineContent,
	Mapping,
	ActionExecutionResult,
	ActionExecutionResultCode,
	OpenPresetPayload,
	SavePresetPayload,
	VmixActions,
} from 'timeline-state-resolver-types'
import { t } from '../../lib'

/**
 * Default time, in milliseconds, for when we should poll vMix to query its actual state.
 */
const DEFAULT_VMIX_POLL_INTERVAL = 10 * 1000

export interface DeviceOptionsVMixInternal extends DeviceOptionsVMix {
	commandReceiver?: CommandReceiver
}
export type CommandReceiver = (
	time: number,
	cmd: VMixStateCommandWithContext,
	context: CommandContext,
	timelineObjId: string
) => Promise<any>
/*interface Command {
	commandName: 'added' | 'changed' | 'removed'
	content: VMixCommandContent
	context: CommandContext
	timelineObjId: string
	layer: string
}*/
export enum CommandContext {
	None = 'none',
	Retry = 'retry',
}
export interface VMixStateCommandWithContext {
	command: VMixStateCommand
	context: CommandContext
	timelineId: string
}

const mappingPriority: { [k in MappingVmixType]: number } = {
	[MappingVmixType.Program]: 0,
	[MappingVmixType.Preview]: 1,
	[MappingVmixType.Input]: 2, // order of Input and AudioChannel matters because of the way layers are sorted
	[MappingVmixType.AudioChannel]: 3,
	[MappingVmixType.Output]: 4,
	[MappingVmixType.Overlay]: 5,
	[MappingVmixType.Recording]: 6,
	[MappingVmixType.Streaming]: 7,
	[MappingVmixType.External]: 8,
	[MappingVmixType.FadeToBlack]: 9,
	[MappingVmixType.Fader]: 10,
	[MappingVmixType.Script]: 11,
}

/**
 * This is a VMixDevice, it sends commands when it feels like it
 */
export class VMixDevice extends DeviceWithState<VMixStateExtended, DeviceOptionsVMixInternal> {
	private _doOnTime: DoOnTime

	private _commandReceiver: CommandReceiver
	private _vmix: VMix
	private _connected = false
	private _initialized = false
	private _pollTimeout: NodeJS.Timeout
	private _pollTime: number | null = null
	private _retryTimeout: NodeJS.Timeout

	constructor(deviceId: string, deviceOptions: DeviceOptionsVMixInternal, getCurrentTime: () => Promise<number>) {
		super(deviceId, deviceOptions, getCurrentTime)
		if (deviceOptions.options) {
			if (deviceOptions.commandReceiver) this._commandReceiver = deviceOptions.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver.bind(this)
		}
		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.IN_ORDER,
			this._deviceOptions
		)
		this._doOnTime.on('error', (e) => this.emit('error', 'VMix.doOnTime', e))
		this._doOnTime.on('slowCommand', (msg) => this.emit('slowCommand', this.deviceName + ': ' + msg))
		this._doOnTime.on('slowSentCommand', (info) => this.emit('slowSentCommand', info))
		this._doOnTime.on('slowFulfilledCommand', (info) => this.emit('slowFulfilledCommand', info))
	}
	async init(options: VMixOptions): Promise<boolean> {
		this._vmix = new VMix(options.host, options.port, false)
		this._vmix.on('connected', () => {
			// We are not resetting the state at this point and waiting for the state to arrive. Otherwise, we risk
			// going back and forth on reconnections
			this._setConnected(true)
			this._vmix.requestVMixState().catch((e) => this.emit('error', 'VMix init', e))
		})
		this._vmix.on('disconnected', () => {
			this._setConnected(false)
		})
		this._vmix.on('error', (e) => this.emit('error', 'VMix', e))
		this._vmix.on('stateChanged', (state) => this._onVMixStateChanged(state))
		this._vmix.on('data', (d) => {
			if (d.message !== 'Completed') this.emit('debug', d)
			if (d.command === 'XML' && d.body) {
				this._vmix.parseVMixState(d.body)
				if (!this._initialized) {
					this._initialized = true
					this.emit('connectionChanged', this.getStatus())
					this.emit('resetResolver')
				}
			}
		})
		// this._vmix.on('debug', (...args) => this.emitDebug(...args))

		this._vmix.connect()

		if (typeof options.pollInterval !== 'number' || options.pollInterval > 0) {
			this._pollTime = options.pollInterval ?? DEFAULT_VMIX_POLL_INTERVAL
			this._pollTimeout = setTimeout(() => this._pollVmix(), this._pollTime)
		}

		return true
	}

	private _connectionChanged() {
		this.emit('connectionChanged', this.getStatus())
	}

	private _setConnected(connected: boolean) {
		if (this._connected !== connected) {
			this._connected = connected
			this._connectionChanged()
		}
	}

	private _onVMixStateChanged(newState: VMixState) {
		const time = this.getCurrentTime()
		const oldState: VMixStateExtended = (this.getStateBefore(time) || { state: this._getDefaultState() }).state

		// We can't get all properties from vMix's API.
		// Therefore, all we can do is copy over the last known ones that we sent.
		// This is fragile and intertwined with `parseVMixState` in `connection.ts`.
		for (const key of Object.keys(oldState.reportedState.inputs)) {
			newState.inputs[key].filePath = oldState.reportedState.inputs[key].filePath
			newState.inputs[key].fade = oldState.reportedState.inputs[key].fade
			newState.inputs[key].audioAuto = oldState.reportedState.inputs[key].audioAuto
			newState.inputs[key].restart = oldState.reportedState.inputs[key].restart

			// If we don't do this, then clips will keep seeking back to the start.
			// This is perhaps a bad hack that will come back to haunt us if we start doing more stuff with seeking.
			newState.inputs[key].position = oldState.reportedState.inputs[key].position
		}

		oldState.reportedState = deepMerge<VMixState>(oldState.reportedState, _.omit(newState, 'inputs'))
		oldState.reportedState.inputs = newState.inputs
		this.setState(oldState, time)
	}

	private _getDefaultInputState(num: number): VMixInput {
		return {
			number: num,
			position: 0,
			muted: true,
			loop: false,
			playing: false,
			volume: 100,
			balance: 0,
			fade: 0,
			audioBuses: 'M',
			audioAuto: true,
			transform: {
				zoom: 1,
				panX: 0,
				panY: 0,
				alpha: 255,
			},
			overlays: {},
		}
	}

	private _getDefaultInputsState(count: number): { [key: string]: VMixInput } {
		const defaultInputs: { [key: string]: VMixInput } = {}
		for (let i = 1; i <= count; i++) {
			defaultInputs[i] = this._getDefaultInputState(i)
		}
		return defaultInputs
	}

	private _getDefaultState(): VMixStateExtended {
		return {
			reportedState: {
				version: '',
				edition: '',
				fixedInputsCount: 0,
				inputs: this._getDefaultInputsState(this._vmix.state.fixedInputsCount),
				overlays: _.map([1, 2, 3, 4, 5, 6], (num) => {
					return {
						number: num,
						input: undefined,
					}
				}),
				mixes: _.map([1, 2, 3, 4], (num) => {
					return {
						number: num,
						program: undefined,
						preview: undefined,
						transition: { effect: VMixTransitionType.Cut, duration: 0 },
					}
				}),
				fadeToBlack: false,
				faderPosition: 0,
				recording: false,
				external: false,
				streaming: false,
				playlist: false,
				multiCorder: false,
				fullscreen: false,
				audio: [],
			},
			outputs: {
				'2': { source: 'Program' },
				'3': { source: 'Program' },
				'4': { source: 'Program' },
				External2: { source: 'Program' },
				Fullscreen: { source: 'Program' },
				Fullscreen2: { source: 'Program' },
			},
			inputLayers: {},
			runningScripts: [],
		}
	}

	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime + 0.1)
		this.cleanUpStates(0, newStateTime + 0.1)
	}

	handleState(newState: Timeline.TimelineState<TSRTimelineContent>, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		if (!this._initialized) {
			// before it's initialized don't do anything
			this.emit('warning', 'VMix not initialized yet')
			return
		}

		const previousStateTime = Math.max(this.getCurrentTime() + 0.1, newState.time)
		const oldState: VMixStateExtended = (this.getStateBefore(previousStateTime) ?? { state: this._getDefaultState() })
			.state

		const newVMixState = this.convertStateToVMix(newState, newMappings)

		const commandsToAchieveState = this._diffStates(oldState, newVMixState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)

		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newVMixState, newState.time)
	}

	clearFuture(clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}

	async terminate() {
		this._doOnTime.dispose()

		this._vmix.removeAllListeners()
		this._vmix.disconnect()

		clearTimeout(this._retryTimeout)

		return Promise.resolve(true)
	}

	getStatus(): DeviceStatus {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		} else if (!this._initialized) {
			statusCode = StatusCode.BAD
			messages.push('Not initialized')
		}

		return {
			statusCode: statusCode,
			messages: messages,
			active: this.isActive,
		}
	}

	async makeReady(okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			// do something?
		}
	}

	async executeAction(actionId: string, payload?: Record<string, any> | undefined): Promise<ActionExecutionResult> {
		switch (actionId) {
			case VmixActions.LastPreset:
				return await this._lastPreset()
			case VmixActions.OpenPreset:
				return await this._openPreset(payload as OpenPresetPayload)
			case VmixActions.SavePreset:
				return await this._savePreset(payload as SavePresetPayload)
			default:
				return {
					result: ActionExecutionResultCode.Error,
					response: t('Action "{{actionId}}" not found', { actionId }),
				}
		}
	}

	_checkPresetAction(payload?: any, payloadRequired?: boolean): ActionExecutionResult | undefined {
		if (!this._vmix.connected) {
			return {
				result: ActionExecutionResultCode.Error,
				response: t('Cannot perform VMix action without a connection'),
			}
		}

		if (payloadRequired) {
			if (!payload || typeof payload !== 'object') {
				return {
					result: ActionExecutionResultCode.Error,
					response: t('Action payload is invalid'),
				}
			}

			if (!payload.filename) {
				return {
					result: ActionExecutionResultCode.Error,
					response: t('No preset filename specified'),
				}
			}
		}
		return
	}

	private async _lastPreset() {
		const presetActionCheckResult = this._checkPresetAction()
		if (presetActionCheckResult) return presetActionCheckResult
		await this._vmix.lastPreset()
		return {
			result: ActionExecutionResultCode.Ok,
		}
	}

	private async _openPreset(payload: OpenPresetPayload) {
		const presetActionCheckResult = this._checkPresetAction(payload, true)
		if (presetActionCheckResult) return presetActionCheckResult
		await this._vmix.openPreset(payload.filename)
		return {
			result: ActionExecutionResultCode.Ok,
		}
	}

	private async _savePreset(payload: SavePresetPayload) {
		const presetActionCheckResult = this._checkPresetAction(payload, true)
		if (presetActionCheckResult) return presetActionCheckResult
		await this._vmix.savePreset(payload.filename)
		return {
			result: ActionExecutionResultCode.Ok,
		}
	}

	get canConnect(): boolean {
		return false
	}

	get connected(): boolean {
		return false
	}

	convertStateToVMix(state: Timeline.TimelineState<TSRTimelineContent>, mappings: Mappings): VMixStateExtended {
		if (!this._initialized) throw Error('convertStateToVMix cannot be used before inititialized')

		const deviceState = this._getDefaultState()

		// Sort layer based on Mapping type (to make sure audio is after inputs) and Layer name
		const sortedLayers = _.sortBy(
			_.map(state.layers, (tlObject, layerName) => ({
				layerName,
				tlObject,
				mapping: mappings[layerName] as Mapping<SomeMappingVmix>,
			})).sort((a, b) => a.layerName.localeCompare(b.layerName)),
			(o) => mappingPriority[o.mapping.options.mappingType] ?? Number.POSITIVE_INFINITY
		)

		_.each(sortedLayers, ({ tlObject, layerName, mapping }) => {
			const content = tlObject.content

			if (mapping && content.deviceType === DeviceType.VMIX) {
				switch (mapping.options.mappingType) {
					case MappingVmixType.Program:
						if (content.type === TimelineContentTypeVMix.PROGRAM) {
							const mixProgram = (mapping.options.index || 1) - 1
							if (content.input !== undefined) {
								this.switchToInput(content.input, deviceState, mixProgram, content.transition)
							} else if (content.inputLayer) {
								this.switchToInput(content.inputLayer, deviceState, mixProgram, content.transition, true)
							}
						}
						break
					case MappingVmixType.Preview:
						if (content.type === TimelineContentTypeVMix.PREVIEW) {
							const mixPreview = (mapping.options.index || 1) - 1
							if (content.input) deviceState.reportedState.mixes[mixPreview].preview = content.input
						}
						break
					case MappingVmixType.AudioChannel:
						if (content.type === TimelineContentTypeVMix.AUDIO) {
							const vmixTlAudioPicked = _.pick(content, 'volume', 'balance', 'audioAuto', 'audioBuses', 'muted', 'fade')
							if (mapping.options.index) {
								deviceState.reportedState.inputs = this.modifyInput(deviceState, vmixTlAudioPicked, {
									key: mapping.options.index,
								})
							} else if (mapping.options.inputLayer) {
								deviceState.reportedState.inputs = this.modifyInput(deviceState, vmixTlAudioPicked, {
									layer: mapping.options.inputLayer,
								})
							}
						}
						break
					case MappingVmixType.Fader:
						if (content.type === TimelineContentTypeVMix.FADER) {
							deviceState.reportedState.faderPosition = content.position
						}
						break
					case MappingVmixType.Recording:
						if (content.type === TimelineContentTypeVMix.RECORDING) {
							deviceState.reportedState.recording = content.on
						}
						break
					case MappingVmixType.Streaming:
						if (content.type === TimelineContentTypeVMix.STREAMING) {
							deviceState.reportedState.streaming = content.on
						}
						break
					case MappingVmixType.External:
						if (content.type === TimelineContentTypeVMix.EXTERNAL) {
							deviceState.reportedState.external = content.on
						}
						break
					case MappingVmixType.FadeToBlack:
						if (content.type === TimelineContentTypeVMix.FADE_TO_BLACK) {
							deviceState.reportedState.fadeToBlack = content.on
						}
						break
					case MappingVmixType.Input:
						if (content.type === TimelineContentTypeVMix.INPUT) {
							deviceState.reportedState.inputs = this.modifyInput(
								deviceState,
								{
									type: content.inputType,
									playing: content.playing,
									loop: content.loop,
									position: content.seek,
									transform: content.transform,
									overlays: content.overlays,
									listFilePaths: content.listFilePaths,
									restart: content.restart,
								},

								{ key: mapping.options.index || content.filePath },
								layerName
							)
						}
						break
					case MappingVmixType.Output:
						if (content.type === TimelineContentTypeVMix.OUTPUT) {
							deviceState.outputs[mapping.options.index] = {
								source: content.source,
								input: content.input,
							}
						}
						break
					case MappingVmixType.Overlay:
						if (content.type === TimelineContentTypeVMix.OVERLAY) {
							const overlayIndex = mapping.options.index - 1
							deviceState.reportedState.overlays[overlayIndex].input = content.input
						}
						break
					case MappingVmixType.Script:
						if (content.type === TimelineContentTypeVMix.SCRIPT) {
							deviceState.runningScripts.push(content.name)
						}
						break
				}
			}
		})
		return deviceState
	}

	getFilename(filePath: string) {
		return path.basename(filePath)
	}

	modifyInput(
		deviceState: VMixStateExtended,
		newInput: VMixInput,
		input: { key?: string | number; layer?: string },
		layerName?: string
	): { [key: string]: VMixInput } {
		const inputs = deviceState.reportedState.inputs
		const newInputPicked = _.pick(newInput, (x) => !_.isUndefined(x))
		let inputKey: string | number | undefined
		if (input.layer) {
			inputKey = deviceState.inputLayers[input.layer]
		} else {
			inputKey = input.key!
		}
		if (inputKey) {
			if (inputKey in inputs) {
				inputs[inputKey] = deepMerge(inputs[inputKey], newInputPicked)
			} else {
				const inputState = this._getDefaultInputState(0)
				inputs[inputKey] = deepMerge(inputState, newInputPicked)
			}
			if (layerName) {
				deviceState.inputLayers[layerName] = inputKey as string
			}
		}
		return inputs
	}

	switchToInput(
		input: number | string,
		deviceState: VMixStateExtended,
		mix: number,
		transition?: VMixTransition,
		layerToProgram = false
	) {
		const mixState = deviceState.reportedState.mixes[mix]
		if (
			mixState.program === undefined ||
			mixState.program !== input // mixing numeric and string input names can be dangerous
		) {
			mixState.preview = mixState.program
			mixState.program = input

			mixState.transition = transition || { effect: VMixTransitionType.Cut, duration: 0 }
			mixState.layerToProgram = layerToProgram
		}
	}

	get deviceType() {
		return DeviceType.VMIX
	}

	get deviceName(): string {
		return 'VMix ' + this.deviceId
	}

	get queue() {
		return this._doOnTime.getQueue()
	}

	private _addToQueue(commandsToAchieveState: Array<VMixStateCommandWithContext>, time: number) {
		_.each(commandsToAchieveState, (cmd: VMixStateCommandWithContext) => {
			// add the new commands to the queue:
			this._doOnTime.queue(
				time,
				undefined,
				async (cmd: VMixStateCommandWithContext) => {
					return this._commandReceiver(time, cmd, cmd.context, cmd.timelineId)
				},
				cmd
			)
		})
	}

	private _resolveMixState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		for (let i = 0; i < 4; i++) {
			/**
			 * It is *not* guaranteed to have all 4 mixes present in the vMix state, for reasons unknown.
			 */
			const oldMixState = oldVMixState.reportedState.mixes[i] as VMixMix | undefined
			const newMixState = newVMixState.reportedState.mixes[i] as VMixMix | undefined
			if (newMixState?.program !== undefined) {
				let nextInput = newMixState.program
				let changeOnLayer = false
				if (newMixState.layerToProgram) {
					nextInput = newVMixState.inputLayers[newMixState.program]
					changeOnLayer =
						newVMixState.inputLayers[newMixState.program] !== oldVMixState.inputLayers[newMixState.program]
				}
				if (oldMixState?.program !== newMixState.program || changeOnLayer) {
					commands.push({
						command: {
							command: VMixCommand.TRANSITION,
							effect: changeOnLayer ? VMixTransitionType.Cut : newMixState.transition.effect,
							input: nextInput,
							duration: changeOnLayer ? 0 : newMixState.transition.duration,
							mix: i,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				}
			}

			if (
				oldMixState?.program === newMixState?.program && // if we're not switching what is on program, because it could break a transition
				newMixState?.preview !== undefined &&
				newMixState.preview !== oldMixState?.preview
			) {
				commands.push({
					command: {
						command: VMixCommand.PREVIEW_INPUT,
						input: newMixState.preview,
						mix: i,
					},
					context: CommandContext.None,
					timelineId: '',
				})
			}
		}
		// Only set fader bar position if no other transitions are happening
		if (oldVMixState.reportedState.mixes[0].program === newVMixState.reportedState.mixes[0].program) {
			if (newVMixState.reportedState.faderPosition !== oldVMixState.reportedState.faderPosition) {
				commands.push({
					command: {
						command: VMixCommand.FADER,
						value: newVMixState.reportedState.faderPosition || 0,
					},
					context: CommandContext.None,
					timelineId: '',
				})
				// newVMixState.reportedState.program = undefined
				// newVMixState.reportedState.preview = undefined
				newVMixState.reportedState.fadeToBlack = false
			}
		}
		if (oldVMixState.reportedState.fadeToBlack !== newVMixState.reportedState.fadeToBlack) {
			// Danger: Fade to black is toggled, we can't explicitly say that we want it on or off
			commands.push({
				command: {
					command: VMixCommand.FADE_TO_BLACK,
				},
				context: CommandContext.None,
				timelineId: '',
			})
		}
		return commands
	}

	private _resolveInputsState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): {
		preTransitionCommands: Array<VMixStateCommandWithContext>
		postTransitionCommands: Array<VMixStateCommandWithContext>
	} {
		const preTransitionCommands: Array<VMixStateCommandWithContext> = []
		const postTransitionCommands: Array<VMixStateCommandWithContext> = []
		_.each(newVMixState.reportedState.inputs, (input, key) => {
			if (input.name === undefined) {
				input.name = key
			}
			if (!_.has(oldVMixState.reportedState.inputs, key) && input.type !== undefined) {
				const addCommands: Array<VMixStateCommandWithContext> = []
				addCommands.push({
					command: {
						command: VMixCommand.ADD_INPUT,
						value: `${input.type}|${input.name}`,
					},
					context: CommandContext.None,
					timelineId: '',
				})
				addCommands.push({
					command: {
						command: VMixCommand.SET_INPUT_NAME,
						input: this.getFilename(input.name),
						value: input.name,
					},
					context: CommandContext.None,
					timelineId: '',
				})
				this._addToQueue(addCommands, this.getCurrentTime())
			}
			const oldInput = oldVMixState.reportedState.inputs[key] || this._getDefaultInputState(0) // or {} but we assume that a new input has all parameters default

			/**
			 * If an input is currently on air, then we delay changes to it until after the transition has began.
			 * Note the word "began", instead of "completed".
			 *
			 * This mostly helps in the case of CUT transitions, where in theory everything happens
			 * on the same frame but, in reality, thanks to how vMix processes API commands,
			 * things take place over the course of a few frames.
			 */
			const commands = this._isInUse(oldVMixState, oldInput) ? postTransitionCommands : preTransitionCommands

			// It is important that the operations on listFilePaths happen before most other operations.
			// Consider the case where we want to change the contents of a List input AND set it to playing.
			// If we set it to playing first, it will automatically be forced to stop playing when
			// we dispatch LIST_REMOVE_ALL.
			// So, order of operations matters here.
			if (!_.isEqual(oldInput.listFilePaths, input.listFilePaths)) {
				// vMix has a quirk that we are working around here:
				// When a List input has no items, its Play/Pause button becomes inactive and
				// clicking it does nothing. However, if the List was playing when it was emptied,
				// it'll remain in a playing state. This means that as soon as new content is
				// added to the playlist, it will immediately begin playing. This feels like a
				// bug/mistake/otherwise unwanted behavior in every scenario. To work around this,
				// we automatically dispatch a PAUSE_INPUT command before emptying the playlist,
				// but only if there's no new content being added afterward.
				if (!input.listFilePaths || (Array.isArray(input.listFilePaths) && input.listFilePaths.length <= 0)) {
					commands.push({
						command: {
							command: VMixCommand.PAUSE_INPUT,
							input: input.name,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				}
				commands.push({
					command: {
						command: VMixCommand.LIST_REMOVE_ALL,
						input: input.name,
					},
					context: CommandContext.None,
					timelineId: '',
				})
				if (Array.isArray(input.listFilePaths)) {
					for (const filePath of input.listFilePaths) {
						commands.push({
							command: {
								command: VMixCommand.LIST_ADD,
								input: input.name,
								value: filePath,
							},
							context: CommandContext.None,
							timelineId: '',
						})
					}
				}
			}
			if (input.playing !== undefined && oldInput.playing !== input.playing && !input.playing) {
				commands.push({
					command: {
						command: VMixCommand.PAUSE_INPUT,
						input: input.name,
					},
					context: CommandContext.None,
					timelineId: '',
				})
			}
			if (oldInput.position !== input.position) {
				commands.push({
					command: {
						command: VMixCommand.SET_POSITION,
						input: key,
						value: input.position ? input.position : 0,
					},
					context: CommandContext.None,
					timelineId: '',
				})
			}
			if (input.restart !== undefined && oldInput.restart !== input.restart && input.restart) {
				commands.push({
					command: {
						command: VMixCommand.RESTART_INPUT,
						input: key,
					},
					context: CommandContext.None,
					timelineId: '',
				})
			}
			if (input.loop !== undefined && oldInput.loop !== input.loop) {
				if (input.loop) {
					commands.push({
						command: {
							command: VMixCommand.LOOP_ON,
							input: input.name,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				} else {
					commands.push({
						command: {
							command: VMixCommand.LOOP_OFF,
							input: input.name,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				}
			}
			if (input.muted !== undefined && oldInput.muted !== input.muted && input.muted) {
				commands.push({
					command: {
						command: VMixCommand.AUDIO_OFF,
						input: key,
					},
					context: CommandContext.None,
					timelineId: '',
				})
			}
			if (oldInput.volume !== input.volume && input.volume !== undefined) {
				commands.push({
					command: {
						command: VMixCommand.AUDIO_VOLUME,
						input: key,
						value: input.volume,
						fade: input.fade,
					},
					context: CommandContext.None,
					timelineId: '',
				})
			}
			if (oldInput.balance !== input.balance && input.balance !== undefined) {
				commands.push({
					command: {
						command: VMixCommand.AUDIO_BALANCE,
						input: key,
						value: input.balance,
					},
					context: CommandContext.None,
					timelineId: '',
				})
			}
			if (input.audioAuto !== undefined && oldInput.audioAuto !== input.audioAuto) {
				if (!input.audioAuto) {
					commands.push({
						command: {
							command: VMixCommand.AUDIO_AUTO_OFF,
							input: key,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				} else {
					commands.push({
						command: {
							command: VMixCommand.AUDIO_AUTO_ON,
							input: key,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				}
			}
			if (input.audioBuses !== undefined && oldInput.audioBuses !== input.audioBuses) {
				const oldBuses = (oldInput.audioBuses || '').split(',').filter((x) => x)
				const newBuses = input.audioBuses.split(',').filter((x) => x)
				_.difference(newBuses, oldBuses).forEach((bus) => {
					commands.push({
						command: {
							command: VMixCommand.AUDIO_BUS_ON,
							input: key,
							value: bus,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				})
				_.difference(oldBuses, newBuses).forEach((bus) => {
					commands.push({
						command: {
							command: VMixCommand.AUDIO_BUS_OFF,
							input: key,
							value: bus,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				})
			}
			if (input.muted !== undefined && oldInput.muted !== input.muted && !input.muted) {
				commands.push({
					command: {
						command: VMixCommand.AUDIO_ON,
						input: key,
					},
					context: CommandContext.None,
					timelineId: '',
				})
			}
			if (input.transform !== undefined && !_.isEqual(oldInput.transform, input.transform)) {
				if (oldInput.transform === undefined || input.transform.zoom !== oldInput.transform.zoom) {
					commands.push({
						command: {
							command: VMixCommand.SET_ZOOM,
							input: key,
							value: input.transform.zoom,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				}
				if (oldInput.transform === undefined || input.transform.alpha !== oldInput.transform.alpha) {
					commands.push({
						command: {
							command: VMixCommand.SET_ALPHA,
							input: key,
							value: input.transform.alpha,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				}
				if (oldInput.transform === undefined || input.transform.panX !== oldInput.transform.panX) {
					commands.push({
						command: {
							command: VMixCommand.SET_PAN_X,
							input: key,
							value: input.transform.panX,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				}
				if (oldInput.transform === undefined || input.transform.panY !== oldInput.transform.panY) {
					commands.push({
						command: {
							command: VMixCommand.SET_PAN_Y,
							input: key,
							value: input.transform.panY,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				}
			}
			if (input.overlays !== undefined && !_.isEqual(oldInput.overlays, input.overlays)) {
				Object.keys(input.overlays).forEach((index) => {
					if (input.overlays !== oldInput.overlays?.[index]) {
						commands.push({
							command: {
								command: VMixCommand.SET_INPUT_OVERLAY,
								input: key,
								value: input.overlays![Number(index)],
								index: Number(index),
							},
							context: CommandContext.None,
							timelineId: '',
						})
					}
				})
				Object.keys(oldInput?.overlays || {}).forEach((index) => {
					if (!input.overlays?.[index]) {
						commands.push({
							command: {
								command: VMixCommand.SET_INPUT_OVERLAY,
								input: key,
								value: '',
								index: Number(index),
							},
							context: CommandContext.None,
							timelineId: '',
						})
					}
				})
			}
			if (input.playing !== undefined && oldInput.playing !== input.playing && input.playing) {
				commands.push({
					command: {
						command: VMixCommand.PLAY_INPUT,
						input: input.name,
					},
					context: CommandContext.None,
					timelineId: '',
				})
			}
		})
		return { preTransitionCommands, postTransitionCommands }
	}

	private _resolveInputsRemovalState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		_.difference(
			Object.keys(oldVMixState.reportedState.inputs),
			Object.keys(newVMixState.reportedState.inputs)
		).forEach((input) => {
			if (oldVMixState.reportedState.inputs[input].type !== undefined) {
				// TODO: either schedule this command for later or make the timeline object long enough to prevent removing while transitioning
				commands.push({
					command: {
						command: VMixCommand.REMOVE_INPUT,
						input: oldVMixState.reportedState.inputs[input].name || input,
					},
					context: CommandContext.None,
					timelineId: '',
				})
			}
		})
		return commands
	}

	private _resolveOverlaysState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		_.each(newVMixState.reportedState.overlays, (overlay, index) => {
			const oldOverlay = oldVMixState.reportedState.overlays[index]
			if (oldOverlay.input !== overlay.input) {
				if (overlay.input === undefined) {
					commands.push({
						command: {
							command: VMixCommand.OVERLAY_INPUT_OUT,
							value: overlay.number,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				} else {
					commands.push({
						command: {
							command: VMixCommand.OVERLAY_INPUT_IN,
							input: overlay.input,
							value: overlay.number,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				}
			}
		})
		return commands
	}

	private _resolveRecordingState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		if (oldVMixState.reportedState.recording !== newVMixState.reportedState.recording) {
			if (newVMixState.reportedState.recording) {
				commands.push({
					command: {
						command: VMixCommand.START_RECORDING,
					},
					context: CommandContext.None,
					timelineId: '',
				})
			} else {
				commands.push({
					command: {
						command: VMixCommand.STOP_RECORDING,
					},
					context: CommandContext.None,
					timelineId: '',
				})
			}
		}
		return commands
	}

	private _resolveStreamingState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		if (oldVMixState.reportedState.streaming !== newVMixState.reportedState.streaming) {
			if (newVMixState.reportedState.streaming) {
				commands.push({
					command: {
						command: VMixCommand.START_STREAMING,
					},
					context: CommandContext.None,
					timelineId: '',
				})
			} else {
				commands.push({
					command: {
						command: VMixCommand.STOP_STREAMING,
					},
					context: CommandContext.None,
					timelineId: '',
				})
			}
		}
		return commands
	}

	private _resolveExternalState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		if (oldVMixState.reportedState.external !== newVMixState.reportedState.external) {
			if (newVMixState.reportedState.external) {
				commands.push({
					command: {
						command: VMixCommand.START_EXTERNAL,
					},
					context: CommandContext.None,
					timelineId: '',
				})
			} else {
				commands.push({
					command: {
						command: VMixCommand.STOP_EXTERNAL,
					},
					context: CommandContext.None,
					timelineId: '',
				})
			}
		}
		return commands
	}

	private _resolveOutputsState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		_.map(newVMixState.outputs, (output, name) => {
			const nameKey = name as keyof VMixStateExtended['outputs']
			const oldOutput = nameKey in oldVMixState.outputs ? oldVMixState.outputs[nameKey] : undefined
			if (!_.isEqual(output, oldOutput)) {
				const value = output.source === 'Program' ? 'Output' : output.source
				commands.push({
					command: {
						command: VMixCommand.SET_OUPUT,
						value,
						input: output.input,
						name,
					},
					context: CommandContext.None,
					timelineId: '',
				})
			}
		})
		return commands
	}

	private _resolveScriptsState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		_.map(newVMixState.runningScripts, (name) => {
			const alreadyRunning = oldVMixState.runningScripts.includes(name)
			if (!alreadyRunning) {
				commands.push({
					command: {
						command: VMixCommand.SCRIPT_START,
						value: name,
					},
					context: CommandContext.None,
					timelineId: '',
				})
			}
		})
		_.map(oldVMixState.runningScripts, (name) => {
			const noLongerDesired = !newVMixState.runningScripts.includes(name)
			if (noLongerDesired) {
				commands.push({
					command: {
						command: VMixCommand.SCRIPT_STOP,
						value: name,
					},
					context: CommandContext.None,
					timelineId: '',
				})
			}
		})
		return commands
	}

	private _diffStates(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		let commands: Array<VMixStateCommandWithContext> = []

		const inputCommands = this._resolveInputsState(oldVMixState, newVMixState)
		commands = commands.concat(inputCommands.preTransitionCommands)
		commands = commands.concat(this._resolveMixState(oldVMixState, newVMixState))
		commands = commands.concat(this._resolveOverlaysState(oldVMixState, newVMixState))
		commands = commands.concat(inputCommands.postTransitionCommands)
		commands = commands.concat(this._resolveRecordingState(oldVMixState, newVMixState))
		commands = commands.concat(this._resolveStreamingState(oldVMixState, newVMixState))
		commands = commands.concat(this._resolveExternalState(oldVMixState, newVMixState))
		commands = commands.concat(this._resolveOutputsState(oldVMixState, newVMixState))
		commands = commands.concat(this._resolveInputsRemovalState(oldVMixState, newVMixState))
		commands = commands.concat(this._resolveScriptsState(oldVMixState, newVMixState))

		return commands
	}

	private async _defaultCommandReceiver(
		_time: number,
		cmd: VMixStateCommandWithContext,
		context: CommandContext,
		timelineObjId: string
	): Promise<any> {
		// do not poll or retry while we are sending commands, instead always do it closely after:
		clearTimeout(this._pollTimeout)
		if (this._pollTime) this._pollTimeout = setTimeout(() => this._pollVmix(), this._pollTime)

		const cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId,
		}
		this.emitDebug(cwc)

		return this._vmix.sendCommand(cmd.command).catch((error) => {
			this.emit('commandError', error, cwc)
		})
	}

	/**
	 * Checks if TSR thinks an input is currently in-use.
	 * Not guaranteed to align with reality.
	 */
	private _isInUse(state: VMixStateExtended, input: VMixInput): boolean {
		for (const mix of state.reportedState.mixes) {
			if (mix.program === input.number || mix.program === input.name) {
				// The input is in program in some mix, so stop the search and return true.
				return true
			}

			if (typeof mix.program === 'undefined') continue

			const pgmInput = state.reportedState.inputs[mix.program] as VMixInput | undefined
			if (!pgmInput || !pgmInput.overlays) continue

			for (const layer of Object.keys(pgmInput.overlays)) {
				const layerInput = pgmInput.overlays[layer as unknown as keyof VMixInputOverlays]
				if (layerInput === input.name || layerInput === input.number) {
					// Input is in program as a layer of a Multi View of something else that is in program,
					// so stop the search and return true.
					return true
				}
			}
		}

		for (const overlay of state.reportedState.overlays) {
			if (overlay.input === input.name || overlay.input === input.number) {
				// Input is in program as an overlay (DSK),
				// so stop the search and return true.
				return true
			}
		}

		for (const output of Object.values<VMixOutput>(state.outputs)) {
			if (output.input === input.name || output.input === input.number) {
				// Input might not technically be in PGM, but it's being used by an output,
				// so stop the search and return true.
				return true
			}
		}

		return false
	}

	/**
	 * Polls vMix's XML status endpoint, which will change our tracked state based on the response.
	 */
	private _pollVmix() {
		clearTimeout(this._pollTimeout)
		if (this._pollTime) {
			this._pollTimeout = setTimeout(() => this._pollVmix(), this._pollTime)
		}
		this._vmix.requestVMixState().catch((e) => this.emit('error', 'VMix poll', e))
	}
}

interface VMixOutput {
	source: 'Preview' | 'Program' | 'MultiView' | 'Input'
	input?: number | string
}

export interface VMixStateExtended {
	/**
	 * The state of vMix (as far as we know) as reported by vMix **+
	 * our expectations based on the commands we've set**.
	 */
	reportedState: VMixState
	outputs: {
		External2: VMixOutput

		'2': VMixOutput
		'3': VMixOutput
		'4': VMixOutput

		Fullscreen: VMixOutput
		Fullscreen2: VMixOutput
	}
	inputLayers: { [key: string]: string }
	runningScripts: string[]
}

export interface VMixState {
	version: string
	edition: string // TODO: Enuum, need list of available editions: Trial
	fixedInputsCount: number
	inputs: { [key: string]: VMixInput }
	overlays: VMixOverlay[]
	mixes: VMixMix[]
	fadeToBlack: boolean
	faderPosition?: number
	recording: boolean
	external: boolean
	streaming: boolean
	playlist: boolean
	multiCorder: boolean
	fullscreen: boolean
	audio: VMixAudioChannel[]
}

export interface VMixMix {
	number: number
	program: string | number | undefined
	preview: string | number | undefined
	transition: VMixTransition
	layerToProgram?: boolean
}

export interface VMixInput {
	number?: number
	type?: VMixInputType | string
	name?: string
	filePath?: string
	state?: 'Paused' | 'Running' | 'Completed'
	playing?: boolean
	position?: number
	duration?: number
	loop?: boolean
	muted?: boolean
	volume?: number
	balance?: number
	fade?: number
	solo?: boolean
	audioBuses?: string
	audioAuto?: boolean
	transform?: VMixTransform
	overlays?: VMixInputOverlays
	listFilePaths?: string[]
	restart?: boolean
}

export interface VMixOverlay {
	number: number
	input: string | number | undefined
}

export interface VMixAudioChannel {
	volume: number
	muted: boolean
	meterF1: number
	meterF2: number
	headphonesVolume: number
}
