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
	MappingVMixType,
	MappingVMixAny,
	Timeline,
	TSRTimelineContent,
	MappingVMixInput,
	TimelineContentVMixInput,
} from 'timeline-state-resolver-types'

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
type CommandContext = any
export interface VMixStateCommandWithContext {
	command: VMixStateCommand
	context: CommandContext
	timelineId: string
}

/** Prefix of media input added by TSR. Only those with this prefix can be removed by this implementation */
export const TSR_INPUT_PREFIX = 'TSR_MEDIA_'
/** (ms) */
const PLAY_TIME_PRECISION = 150

/**
 * This is a VMixDevice, it sends commands when it feels like it
 */
export class VMixDevice extends DeviceWithState<VMixStateExtended, DeviceOptionsVMixInternal> {
	private _doOnTime: DoOnTime

	private _commandReceiver: CommandReceiver
	private _vmix: VMix
	private _connected = false
	private _initialized = false

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
		this._vmix = new VMix(() => this.getCurrentTime())
		this._vmix.on('connected', () => {
			const time = this.getCurrentTime()
			let state = this._getDefaultState()
			state = deepMerge<VMixStateExtended>(state, { reportedState: this._vmix.state })
			this.setState(state, time)
			this._initialized = true
			this._setConnected(true)
			this.emit('resetResolver')
		})
		this._vmix.on('disconnected', () => {
			this._setConnected(false)
		})
		this._vmix.on('error', (e) => this.emit('error', 'VMix', e))
		this._vmix.on('stateChanged', (state) => this._onVMixStateChanged(state))
		this._vmix.on('debug', (...args) => this.emitDebug(...args))

		return this._vmix.connect(options)
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
		oldState.reportedState = newState
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

	private _getDefaultState(): VMixStateExtended {
		return {
			reportedState: {
				version: '',
				edition: '',
				fixedInputsCount: 0,
				inputs: {},
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
				recording: undefined,
				external: undefined,
				streaming: undefined,
				playlist: false,
				multiCorder: false,
				fullscreen: false,
				audio: [],
			},
			outputs: {
				'2': undefined,
				'3': undefined,
				'4': undefined,
				External2: undefined,
				Fullscreen: undefined,
				Fullscreen2: undefined,
			},
			inputLayers: {},
		}
	}

	private _fillStateWithMappingsDefaults(state: VMixStateExtended, mappings: Mappings) {
		for (const mapping of Object.values(mappings) as MappingVMixAny[]) {
			switch (mapping.mappingType) {
				case MappingVMixType.Input:
					if (mapping.index) {
						state.reportedState.inputs[mapping.index] = this._getDefaultInputState(0)
					}
					break
				case MappingVMixType.AudioChannel:
					if (mapping.index) {
						state.reportedState.inputs[mapping.index] = this._getDefaultInputState(0)
					}
					break
				case MappingVMixType.Recording:
					state.reportedState.recording = false
					break
				case MappingVMixType.Streaming:
					state.reportedState.streaming = false
					break
				case MappingVMixType.External:
					state.reportedState.external = false
					break
				case MappingVMixType.Output:
					state.outputs[mapping.index] = { source: 'Program' }
					break
			}
		}
		return state
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
		const oldState: VMixStateExtended = (this.getStateBefore(previousStateTime) || { state: this._getDefaultState() })
			.state

		const newVMixState = this.convertStateToVMix(newState, newMappings)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)

		const commandsToAchieveState: Array<any> = this._diffStates(oldState, newVMixState, newState.time)

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
		await this._vmix.dispose()
		return Promise.resolve(true)
	}

	getStatus(): DeviceStatus {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
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

	get canConnect(): boolean {
		return false
	}

	get connected(): boolean {
		return false
	}

	convertStateToVMix(state: Timeline.TimelineState<TSRTimelineContent>, mappings: Mappings): VMixStateExtended {
		if (!this._initialized) throw Error('convertStateToVMix cannot be used before inititialized')

		const deviceState = this._fillStateWithMappingsDefaults(this._getDefaultState(), mappings)

		// Sort layer based on Mapping type (to make sure audio is after inputs) and Layer name
		const sortedLayers = _.sortBy(
			_.map(state.layers, (tlObject, layerName) => ({
				layerName,
				tlObject,
				mapping: mappings[layerName] as MappingVMixAny,
			})).sort((a, b) => a.layerName.localeCompare(b.layerName)),
			(o) => o.mapping.mappingType
		)

		_.each(sortedLayers, ({ tlObject, layerName, mapping }) => {
			const content = tlObject.content

			if (mapping && content.deviceType === DeviceType.VMIX) {
				switch (mapping.mappingType) {
					case MappingVMixType.Program:
						if (content.type === TimelineContentTypeVMix.PROGRAM) {
							const mixProgram = (mapping.index || 1) - 1
							if (content.input !== undefined) {
								this.switchToInput(content.input, deviceState, mixProgram, content.transition)
							} else if (content.inputLayer) {
								this.switchToInput(content.inputLayer, deviceState, mixProgram, content.transition, true)
							}
						}
						break
					case MappingVMixType.Preview:
						if (content.type === TimelineContentTypeVMix.PREVIEW) {
							const mixPreview = (mapping.index || 1) - 1
							if (content.input) deviceState.reportedState.mixes[mixPreview].preview = content.input
						}
						break
					case MappingVMixType.AudioChannel:
						if (content.type === TimelineContentTypeVMix.AUDIO) {
							const vmixTlAudioPicked = _.pick(content, 'volume', 'balance', 'audioAuto', 'audioBuses', 'muted', 'fade')
							if (mapping.index) {
								deviceState.reportedState.inputs = this.modifyInput(deviceState, vmixTlAudioPicked, {
									key: mapping.index,
								})
							} else if (mapping.inputLayer) {
								deviceState.reportedState.inputs = this.modifyInput(deviceState, vmixTlAudioPicked, {
									layer: mapping.inputLayer,
								})
							}
						}
						break
					case MappingVMixType.Fader:
						if (content.type === TimelineContentTypeVMix.FADER) {
							deviceState.reportedState.faderPosition = content.position
						}
						break
					case MappingVMixType.Recording:
						if (content.type === TimelineContentTypeVMix.RECORDING) {
							deviceState.reportedState.recording = content.on
						}
						break
					case MappingVMixType.Streaming:
						if (content.type === TimelineContentTypeVMix.STREAMING) {
							deviceState.reportedState.streaming = content.on
						}
						break
					case MappingVMixType.External:
						if (content.type === TimelineContentTypeVMix.EXTERNAL) {
							deviceState.reportedState.external = content.on
						}
						break
					case MappingVMixType.FadeToBlack:
						if (content.type === TimelineContentTypeVMix.FADE_TO_BLACK) {
							deviceState.reportedState.fadeToBlack = content.on
						}
						break
					case MappingVMixType.Input:
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
									name: typeof content.filePath === 'number' ? undefined : content.filePath,
									playTime: tlObject.instance.originalStart || tlObject.instance.start,
								},
								{
									key: this._getInputKey(mapping, content),
								},
								layerName
							)
						}
						break
					case MappingVMixType.Output:
						if (content.type === TimelineContentTypeVMix.OUTPUT) {
							deviceState.outputs[mapping.index] = {
								source: content.source,
								input: content.input,
							}
						}
						break
					case MappingVMixType.Overlay:
						if (content.type === TimelineContentTypeVMix.OVERLAY) {
							const overlayIndex = mapping.index - 1
							deviceState.reportedState.overlays[overlayIndex].input = content.input
						}
						break
				}
			}
		})
		return deviceState
	}

	private _getInputKey(mapping: MappingVMixInput, content: TimelineContentVMixInput): string | number | undefined {
		return (
			mapping.index || (typeof content.filePath === 'number' ? content.filePath : TSR_INPUT_PREFIX + content.filePath)
		)
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
		const { inputs } = deviceState.reportedState
		const newInputPicked = _.pick(newInput, (x) => !_.isUndefined(x))
		let inputKey: string | number | undefined
		if (input.layer) {
			inputKey = deviceState.inputLayers[input.layer]
		} else {
			inputKey = input.key
		}
		if (!inputKey) return inputs
		if (inputKey in inputs) {
			inputs[inputKey] = deepMerge(inputs[inputKey], newInputPicked)
		} else {
			const inputState = this._getDefaultInputState(0)
			inputs[inputKey] = deepMerge(inputState, newInputPicked)
		}
		if (layerName) {
			deviceState.inputLayers[layerName] = inputKey as string
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
			const oldMixState = oldVMixState.reportedState.mixes[i]
			const newMixState = newVMixState.reportedState.mixes[i]
			if (newMixState.program !== undefined) {
				let nextInput = newMixState.program
				let changeOnLayer = false
				if (newMixState.layerToProgram) {
					nextInput = newVMixState.inputLayers[newMixState.program]
					changeOnLayer =
						newVMixState.inputLayers[newMixState.program] !== oldVMixState.inputLayers[newMixState.program]
				}
				if (oldMixState.program !== newMixState.program || changeOnLayer) {
					commands.push({
						command: {
							command: VMixCommand.TRANSITION,
							effect: changeOnLayer ? VMixTransitionType.Cut : newMixState.transition.effect,
							input: nextInput,
							duration: changeOnLayer ? 0 : newMixState.transition.duration,
							mix: i,
						},
						context: null,
						timelineId: '',
					})
				}
			}

			if (
				oldMixState.program === newMixState.program && // if we're not switching what is on program, because it could break a transition
				newMixState.preview !== undefined &&
				newMixState.preview !== oldMixState.preview
			) {
				commands.push({
					command: {
						command: VMixCommand.PREVIEW_INPUT,
						input: newMixState.preview,
						mix: i,
					},
					context: null,
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
					context: null,
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
				context: null,
				timelineId: '',
			})
		}
		return commands
	}

	private _resolveInputsState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended,
		newStateTime: number
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
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
					context: null,
					timelineId: '',
				})
				addCommands.push({
					command: {
						command: VMixCommand.SET_INPUT_NAME,
						input: this.getFilename(input.name),
						value: key,
					},
					context: null,
					timelineId: '',
				})
				this._addToQueue(addCommands, this.getCurrentTime())
			}
			const oldInput = oldVMixState.reportedState.inputs[key] || this._getDefaultInputState(0) // or {} but we assume that a new input has all parameters default
			if (input.playing === false && oldInput.playing !== input.playing) {
				commands.push({
					command: {
						command: VMixCommand.PAUSE_INPUT,
						input: key,
					},
					context: null,
					timelineId: '',
				})
			}

			const seekOffset = input.playTime ? newStateTime - input.playTime : 0
			if (
				oldInput.position !== input.position ||
				(oldInput.playing !== input.playing && input.playing && Math.abs(seekOffset) > PLAY_TIME_PRECISION)
			) {
				commands.push({
					command: {
						command: VMixCommand.SET_POSITION,
						input: key,
						value: input.position !== undefined ? Math.max(seekOffset + input.position, 0) : 0,
					},
					context: null,
					timelineId: '',
				})
			}
			if (input.loop !== undefined && oldInput.loop !== input.loop) {
				if (input.loop) {
					commands.push({
						command: {
							command: VMixCommand.LOOP_ON,
							input: key,
						},
						context: null,
						timelineId: '',
					})
				} else {
					commands.push({
						command: {
							command: VMixCommand.LOOP_OFF,
							input: key,
						},
						context: null,
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
					context: null,
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
					context: null,
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
					context: null,
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
						context: null,
						timelineId: '',
					})
				} else {
					commands.push({
						command: {
							command: VMixCommand.AUDIO_AUTO_ON,
							input: key,
						},
						context: null,
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
						context: null,
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
						context: null,
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
					context: null,
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
						context: null,
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
						context: null,
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
						context: null,
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
						context: null,
						timelineId: '',
					})
				}
			}
			if (input.overlays !== undefined && !_.isEqual(oldInput.overlays, input.overlays)) {
				for (const index of Object.keys(input.overlays)) {
					if (input.overlays[index] !== oldInput.overlays?.[index]) {
						commands.push({
							command: {
								command: VMixCommand.SET_INPUT_OVERLAY,
								input: key,
								value: this._useTsrInputIfPresent(newVMixState, input.overlays[index]),
								index: Number(index),
							},
							context: null,
							timelineId: '',
						})
					}
				}
				for (const index of Object.keys(oldInput.overlays || {})) {
					if (!input.overlays?.[index]) {
						commands.push({
							command: {
								command: VMixCommand.SET_INPUT_OVERLAY,
								input: key,
								value: '',
								index: Number(index),
							},
							context: null,
							timelineId: '',
						})
					}
				}
			}
			if (input.playing !== undefined && oldInput.playing !== input.playing && input.playing) {
				commands.push({
					command: {
						command: VMixCommand.PLAY_INPUT,
						input: key,
					},
					context: null,
					timelineId: '',
				})
			}
		})
		return commands
	}

	private _useTsrInputIfPresent(state: VMixStateExtended, name: string | number): string | number {
		if (typeof name === 'number') return name
		const possibleName = TSR_INPUT_PREFIX + name
		return state.reportedState.inputs[possibleName] ? possibleName : name
	}

	private _resolveInputsRemovalState(
		oldVMixState: VMixState,
		newVMixState: VMixState
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		_.difference(Object.keys(oldVMixState.inputs), Object.keys(newVMixState.inputs)).forEach((input) => {
			if (oldVMixState.inputs[input].type === undefined || !input.startsWith(TSR_INPUT_PREFIX)) return
			// TODO: either schedule this command for later or make the timeline object long enough to prevent removing while transitioning
			commands.push({
				command: {
					command: VMixCommand.REMOVE_INPUT,
					input: input,
				},
				context: null,
				timelineId: '',
			})
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
						context: null,
						timelineId: '',
					})
				} else {
					commands.push({
						command: {
							command: VMixCommand.OVERLAY_INPUT_IN,
							input: overlay.input,
							value: overlay.number,
						},
						context: null,
						timelineId: '',
					})
				}
			}
		})
		return commands
	}

	private _resolveRecordingState(oldVMixState: VMixState, newVMixState: VMixState): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		if (newVMixState.recording !== undefined && oldVMixState.recording !== newVMixState.recording) {
			if (newVMixState.recording) {
				commands.push({
					command: {
						command: VMixCommand.START_RECORDING,
					},
					context: null,
					timelineId: '',
				})
			} else {
				commands.push({
					command: {
						command: VMixCommand.STOP_RECORDING,
					},
					context: null,
					timelineId: '',
				})
			}
		}
		return commands
	}

	private _resolveStreamingState(oldVMixState: VMixState, newVMixState: VMixState): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		if (newVMixState.streaming !== undefined && oldVMixState.streaming !== newVMixState.streaming) {
			if (newVMixState.streaming) {
				commands.push({
					command: {
						command: VMixCommand.START_STREAMING,
					},
					context: null,
					timelineId: '',
				})
			} else {
				commands.push({
					command: {
						command: VMixCommand.STOP_STREAMING,
					},
					context: null,
					timelineId: '',
				})
			}
		}
		return commands
	}

	private _resolveExternalState(oldVMixState: VMixState, newVMixState: VMixState): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		if (newVMixState.external !== undefined && oldVMixState.external !== newVMixState.external) {
			if (newVMixState.external) {
				commands.push({
					command: {
						command: VMixCommand.START_EXTERNAL,
					},
					context: null,
					timelineId: '',
				})
			} else {
				commands.push({
					command: {
						command: VMixCommand.STOP_EXTERNAL,
					},
					context: null,
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
		for (const [name, output] of Object.entries(newVMixState.outputs)) {
			const nameKey = name as keyof VMixStateExtended['outputs']
			const oldOutput = nameKey in oldVMixState.outputs ? oldVMixState.outputs[nameKey] : undefined
			if (output !== undefined && !_.isEqual(output, oldOutput)) {
				const value = output.source === 'Program' ? 'Output' : output.source
				commands.push({
					command: {
						command: VMixCommand.SET_OUPUT,
						value,
						input: output.source === 'Input' ? output.input : undefined,
						name,
					},
					context: null,
					timelineId: '',
				})
			}
		}
		return commands
	}

	private _diffStates(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended,
		newStateTime: number
	): Array<VMixStateCommandWithContext> {
		return [
			...this._resolveInputsState(oldVMixState, newVMixState, newStateTime),
			...this._resolveMixState(oldVMixState, newVMixState),
			...this._resolveOverlaysState(oldVMixState, newVMixState),
			...this._resolveRecordingState(oldVMixState.reportedState, newVMixState.reportedState),
			...this._resolveStreamingState(oldVMixState.reportedState, newVMixState.reportedState),
			...this._resolveExternalState(oldVMixState.reportedState, newVMixState.reportedState),
			...this._resolveOutputsState(oldVMixState, newVMixState),
			...this._resolveInputsRemovalState(oldVMixState.reportedState, newVMixState.reportedState),
		]
	}

	private async _defaultCommandReceiver(
		_time: number,
		cmd: VMixStateCommandWithContext,
		context: CommandContext,
		timelineObjId: string
	): Promise<any> {
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
}

interface VMixOutput {
	source: 'Preview' | 'Program' | 'MultiView' | 'Input'
	input?: number | string
}

export interface VMixStateExtended {
	reportedState: VMixState
	outputs: {
		External2: VMixOutput | undefined

		'2': VMixOutput | undefined
		'3': VMixOutput | undefined
		'4': VMixOutput | undefined

		Fullscreen: VMixOutput | undefined
		Fullscreen2: VMixOutput | undefined
	}
	inputLayers: { [key: string]: string }
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
	recording: boolean | undefined
	external: boolean | undefined
	streaming: boolean | undefined
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
	/** Like with CasparCG State, this is the timestamp this media has started playing */
	playTime?: number
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
