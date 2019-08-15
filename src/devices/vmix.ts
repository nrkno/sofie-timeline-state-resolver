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
import {
	MappingVMix,
	TimelineContentTypeVMix,
	TimelineObjVMixInput,
	VMixCommand,
	VMixTransitionType,
	TimelineObjVMixPreview,
	TimelineObjVMixAudio,
	TimelineObjVMixFader,
	TimelineObjVMixAddInput,
	TimelineObjVMixPlayInput,
	TimelineObjVMixPauseInput,
	TimelineObjVMixRestartInput,
	TimelineObjVMixSetPosition,
	TimelineObjVMixSetInputName,
	TimelineObjVMixSetOutput,
	TimelineObjVMixOverlayInputIn,
	TimelineObjVMixPlayClip,
	TimelineObjVMixStopClip,
	VMixInputType,
	TimelineObjVMixClipToProgram
} from '../types/src/vmix'

export interface VMixStateCommand {
	command: VMixCommand
	context: CommandContext
	name?: string
	input?: string | number
	value?: string | number
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
export class VMixDevice extends DeviceWithState<VMixStateExtended> {

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
				this.setState({ ...this._getDefaultState(), ...{ reportedState: this._vmix.state } }, time)
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
		let oldState: VMixStateExtended = (this.getStateBefore(this.getCurrentTime()) || { state: this._getDefaultState() }).state
		oldState.reportedState = newState
		this.setState(oldState, Date.now())
	}

	private _getDefaultState (): VMixStateExtended {
		return {
			reportedState: {
				version: '22.0.0.67',
				edition: 'Trial',
				inputs: [],
				overlays: [],
				preview: undefined,
				active: undefined,
				fadeToBlack: false,
				faderPosition: undefined,
				transitions: [],
				recording: false,
				external: false,
				streaming: false,
				playlist: false,
				multiCorder: false,
				fullscreen: false,
				audio: []
			},
			outputs: [
				{
					name: '2',
					output: ''
				},
				{
					name: '3',
					output: ''
				},
				{
					name: '4',
					output: ''
				},
				{
					name: 'External2',
					output: ''
				},
				{
					name: 'Fullscreen',
					output: ''
				},
				{
					name: 'Fullscreen2',
					output: ''
				}
			]
		}
	}

	handleState (newState: TimelineState) {
		if (!this._initialized) { // before it's initialized don't do anything
			this.emit('info', 'VMix not initialized yet')
			return
		}

		let previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		let oldState: VMixStateExtended = (this.getStateBefore(previousStateTime) || { state: this._getDefaultState() }).state

		let newAbstractState = this.convertStateToVMix(newState, oldState)

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
	convertStateToVMix (state: TimelineState, oldState: VMixStateExtended): VMixStateExtended {
		if (!this._initialized) throw Error('convertStateToVMix cannot be used before inititialized')

		let deviceState = JSON.parse(JSON.stringify(oldState)) as VMixStateExtended

		// Sort layer based on Layer name
		const sortedLayers = _.map(state.layers, (tlObject, layerName) => ({ layerName, tlObject }))
			.sort((a,b) => a.layerName.localeCompare(b.layerName))

		_.each(sortedLayers, ({ tlObject, layerName }) => {
			let mapping = this.getMapping()[layerName] as MappingVMix

			console.log(mapping) // TODO: Use this later

			if (tlObject.content) {
				switch (tlObject.content.type) {
					case TimelineContentTypeVMix.INPUT:
						let vmixTlInput = tlObject as any as TimelineObjVMixInput
						this.switchToInput(Number(vmixTlInput.content.input), deviceState, vmixTlInput.content.transition)
						break
					case TimelineContentTypeVMix.PREVIEW:
						let vmixTlPreview = tlObject as any as TimelineObjVMixPreview
						if (vmixTlPreview.content.input) deviceState.reportedState.preview = vmixTlPreview.content.input
						break
					case TimelineContentTypeVMix.AUDIO:
						let vmixTlAudio = tlObject as any as TimelineObjVMixAudio
						deviceState.reportedState.inputs = this.modifyInput(deviceState.reportedState.inputs, {
							number: Number(vmixTlAudio.content.input),
							volume: vmixTlAudio.content.volume
						})
						break
					case TimelineContentTypeVMix.FADER:
						let vmixTlFader = tlObject as any as TimelineObjVMixFader
						deviceState.reportedState.faderPosition = vmixTlFader.content.position
						break
					case TimelineContentTypeVMix.START_RECORDING:
						deviceState.reportedState.recording = true
						break
					case TimelineContentTypeVMix.STOP_RECORDING:
						deviceState.reportedState.recording = false
						break
					case TimelineContentTypeVMix.START_STREAMING:
						deviceState.reportedState.streaming = true
						break
					case TimelineContentTypeVMix.STOP_STREAMING:
						deviceState.reportedState.streaming = false
						break
					case TimelineContentTypeVMix.FADE_TO_BLACK:
						deviceState.reportedState.fadeToBlack = true
						break
					case TimelineContentTypeVMix.ADD_INPUT:
						let tlObjectAddInput = tlObject as any as TimelineObjVMixAddInput
						if (!this.inputExists(tlObjectAddInput.content.filePath, tlObjectAddInput.content.mediaType, deviceState)) {
							this._vmix.addInput(`${tlObjectAddInput.content.mediaType}|${tlObjectAddInput.content.filePath}`)
						}
						break
					case TimelineContentTypeVMix.PLAY_INPUT:
						let tlObjectPlayInput = tlObject as any as TimelineObjVMixPlayInput
						deviceState.reportedState.inputs = this.modifyInput(deviceState.reportedState.inputs, {
							number: Number(tlObjectPlayInput.content.input),
							state: 'Running'
						})
						break
					case TimelineContentTypeVMix.PAUSE_INPUT:
						let tlObjectPauseInput = tlObject as any as TimelineObjVMixPauseInput
						deviceState.reportedState.inputs = this.modifyInput(deviceState.reportedState.inputs, {
							number: Number(tlObjectPauseInput.content.input),
							state: 'Paused'
						})
						break
					case TimelineContentTypeVMix.RESTART_INPUT:
						let tlObjectRestartInput = tlObject as any as TimelineObjVMixRestartInput
						deviceState.reportedState.inputs = this.modifyInput(deviceState.reportedState.inputs, {
							number: Number(tlObjectRestartInput.content.input),
							position: 0
						})
						break
					case TimelineContentTypeVMix.SET_POSITION:
						let tlObjSetPosition = tlObject as any as TimelineObjVMixSetPosition
						deviceState.reportedState.inputs = this.modifyInput(deviceState.reportedState.inputs, {
							number: Number(tlObjSetPosition.content.input),
							position: tlObjSetPosition.content.position
						})
						break
					case TimelineContentTypeVMix.SET_INPUT_NAME:
						let tlObjSetInputName = tlObject as any as TimelineObjVMixSetInputName
						deviceState.reportedState.inputs = this.modifyInput(deviceState.reportedState.inputs, {
							number: Number(tlObjSetInputName.content.input),
							name: tlObjSetInputName.content.name
						})
						break
					case TimelineContentTypeVMix.SET_OUTPUT:
						let tlObjSetOutput = tlObject as any as TimelineObjVMixSetOutput
						let outputIndex = deviceState.outputs.findIndex(output => output.name === tlObjSetOutput.content.name)
						if (outputIndex !== -1) {
							deviceState.outputs[outputIndex].output = tlObjSetOutput.content.output
						}
						break
					case TimelineContentTypeVMix.START_EXTERNAL:
						deviceState.reportedState.external = true
						break
					case TimelineContentTypeVMix.STOP_EXTERNAL:
						deviceState.reportedState.external = false
						break
					case TimelineContentTypeVMix.OVERLAY_INPUT_IN:
						let tlObjOverlayInputIn = tlObject as any as TimelineObjVMixOverlayInputIn
						let overlayInIndex = deviceState.reportedState.overlays.findIndex(overlay => overlay.number === tlObjOverlayInputIn.content.overlay)
						if (overlayInIndex !== -1) {
							deviceState.reportedState.overlays[overlayInIndex].input = tlObjOverlayInputIn.content.input
						}
						break
					case TimelineContentTypeVMix.OVERLAY_INPUT_OUT:
						let tlObjOverlayInputOut = tlObject as any as TimelineObjVMixOverlayInputIn
						let overlayOutIndex = deviceState.reportedState.overlays.findIndex(overlay => overlay.number === tlObjOverlayInputOut.content.overlay)
						if (overlayOutIndex !== -1) {
							deviceState.reportedState.overlays[overlayOutIndex].input = '__OUT__'
						}
						break
					case TimelineContentTypeVMix.OVERLAY_INPUT_OFF:
						let tlObjOverlayInputOff = tlObject as any as TimelineObjVMixOverlayInputIn
						let overlayOffIndex = deviceState.reportedState.overlays.findIndex(overlay => overlay.number === tlObjOverlayInputOff.content.overlay)
						if (overlayOffIndex !== -1) {
							deviceState.reportedState.overlays[overlayOffIndex].input = '__OFF__'
						}
						break
					case TimelineContentTypeVMix.PLAY_CLIP:
						let tlObjPlayClip = tlObject as any as TimelineObjVMixPlayClip
						if (this.inputExists(tlObjPlayClip.content.clipName, 'Video', deviceState)) {
							let inputIndexPlayClip = deviceState.reportedState.inputs.findIndex(input => input.title === tlObjPlayClip.content.clipName)
							if (inputIndexPlayClip !== -1) {
								deviceState.reportedState.inputs[inputIndexPlayClip].state = 'Running'
								deviceState.reportedState.inputs[inputIndexPlayClip].position = 0
							}
						} else {
							let combinedInput = (tlObjPlayClip.content.mediaDirectory.indexOf('\\') !== -1) ?
								`Video|${tlObjPlayClip.content.mediaDirectory}\\${tlObjPlayClip.content.clipName}` :
								`Video|${tlObjPlayClip.content.mediaDirectory}/${tlObjPlayClip.content.clipName}`
							this._vmix.addInput(combinedInput)
						}
						break
					case TimelineContentTypeVMix.STOP_CLIP:
						let tlObjStopClip = tlObject as any as TimelineObjVMixStopClip
						let inputIndexStopClip = deviceState.reportedState.inputs.findIndex(input => input.title === tlObjStopClip.content.clipName)
						if (inputIndexStopClip !== -1) {
							deviceState.reportedState.inputs[inputIndexStopClip].state = 'Paused'
							deviceState.reportedState.inputs[inputIndexStopClip].position = 0
						}
						break
					case TimelineContentTypeVMix.CLIP_TO_PROGRAM:
						let tlObjClipToProgram = tlObject as any as TimelineObjVMixClipToProgram
						if (this.inputExists(tlObjClipToProgram.content.clipName, 'Video', deviceState)) {
							let inputIndex = deviceState.reportedState.inputs.findIndex(input => input.title === tlObjClipToProgram.content.clipName)
							if (inputIndex !== -1) {
								let inputNumber = deviceState.reportedState.inputs[inputIndex].number
								if (inputNumber) {
									this.switchToInput(inputNumber, deviceState, tlObjClipToProgram.content.transition)
								}
							}
						}
				}
			}
		})
		return deviceState
	}
	inputExists (name: string, mediaType: VMixInputType, deviceState: VMixStateExtended) {
		return deviceState.reportedState.inputs.filter(input => {
			if (input.title) {
				let match = name.match(/[ \w-]+?(?=\.).(\w)+(?:$|\n)/g)
				if (match) {
					if (match[0] === input.title && input.type && input.type === mediaType) {
						return true
					}
				}
			}

			return false
		}).length !== 0
	}
	modifyInput (inputs: VMixInput[], newInput: VMixInput): VMixInput[] {
		let index = inputs.findIndex(input => input.number === newInput.number)

		if (index !== -1) {
			inputs[index] = { ...inputs[index], ...newInput }
		}

		return inputs
	}
	switchToInput (input: number, deviceState: VMixStateExtended, transition?: VMixTransition) {
		let available = deviceState.reportedState.inputs.filter(inp =>
			inp.number === input
		).length !== 0
		if (available) {
			deviceState.reportedState.active = input.toString()
			if (transition) {
				deviceState.reportedState.transitions = [] // TODO: Preserve transitions
				deviceState.reportedState.transitions.push({
					effect: transition.effect,
					duration: transition.duration,
					number: transition.number
				})
			}
		}
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
	private _diffStates (oldVMixState: VMixStateExtended, newVMixState: VMixStateExtended): Array<VMixStateCommand> {
		let commands: Array<VMixStateCommand> = []

		if (newVMixState.reportedState.active !== undefined) {
			if (!_.isEqual(oldVMixState.reportedState.transitions, newVMixState.reportedState.transitions)) {
				_.difference(newVMixState.reportedState.transitions, oldVMixState.reportedState.transitions)
				.forEach(transition => {
					if (oldVMixState.reportedState.active !== newVMixState.reportedState.active) {
						commands.push({
							command: VMixCommand.PREVIEW_INPUT,
							input: newVMixState.reportedState.active ? newVMixState.reportedState.active : '1',
							context: null,
							timelineId: ''
						})
						newVMixState.reportedState.fadeToBlack = false
					}

					commands.push({
						command: VMixCommand.TRANSITION_EFFECT,
						value: transition.effect,
						input: transition.number,
						context: null,
						timelineId: ''
					})

					commands.push({
						command: VMixCommand.TRANSITION_DURATION,
						value: transition.duration,
						input: transition.number,
						context: null,
						timelineId: ''
					})

					if (oldVMixState.reportedState.active !== newVMixState.reportedState.active) {
						commands.push({
							command: VMixCommand.TRANSITION,
							input: transition.number,
							context: null,
							timelineId: ''
						})
					}
				})
			} else {
				if (oldVMixState.reportedState.active !== newVMixState.reportedState.active) {
					commands.push({
						command: VMixCommand.ACTIVE_INPUT,
						input: newVMixState.reportedState.active,
						context: null,
						timelineId: ''
					})
					newVMixState.reportedState.fadeToBlack = false
				}
			}
		}

		if (newVMixState.reportedState.preview !== undefined) {
			if (oldVMixState.reportedState.preview !== newVMixState.reportedState.preview) {
				commands.push({
					command: VMixCommand.PREVIEW_INPUT,
					input: newVMixState.reportedState.preview,
					context: null,
					timelineId: ''
				})
				newVMixState.reportedState.fadeToBlack = false
			}
		}

		if (!_.isEqual(oldVMixState.reportedState.inputs, newVMixState.reportedState.inputs)) {
			_.difference(newVMixState.reportedState.inputs, oldVMixState.reportedState.inputs)
			.forEach(input => {
				if (input.number) {
					let oldInput = oldVMixState.reportedState.inputs.filter(inp => inp.number === input.number)[0]
					if (oldInput) {
						if (oldInput.position !== input.position) {
							commands.push({
								command: VMixCommand.SET_POSITION,
								input: input.number,
								value: input.position,
								context: null,
								timelineId: ''
							})
						}

						if (oldInput.state !== input.state) {
							if (input.state === 'Running') {
								commands.push({
									command: VMixCommand.PLAY_INPUT,
									input: input.number,
									context: null,
									timelineId: ''
								})
							} else if (input.state === 'Paused') {
								commands.push({
									command: VMixCommand.PAUSE_INPUT,
									input: input.number,
									context: null,
									timelineId: ''
								})
							}
						}

						if (oldInput.volume !== input.volume) {
							commands.push({
								command: VMixCommand.AUDIO,
								input: input.number.toString(),
								value: input.volume,
								context: null,
								timelineId: ''
							})
						}

						if (oldInput.name !== input.name) {
							commands.push({
								command: VMixCommand.SET_INPUT_NAME,
								input: input.number.toString(),
								value: input.name,
								context: null,
								timelineId: ''
							})
						}
					}
				}
			})
		}

		if (!_.isEqual(oldVMixState.reportedState.overlays, newVMixState.reportedState.overlays)) {
			_.difference(newVMixState.reportedState.overlays, oldVMixState.reportedState.overlays)
			.forEach(overlay => {
				let oldOverlay = oldVMixState.reportedState.overlays.findIndex(ovr => ovr.number === overlay.number)
				if (oldOverlay !== -1) {
					if (oldVMixState.reportedState.overlays[oldOverlay].input !== overlay.input) {
						if (overlay.input === '__OUT__') {
							commands.push({
								command: VMixCommand.OVERLAY_INPUT_OUT,
								value: overlay.number,
								context: null,
								timelineId: ''
							})
						} else if (overlay.input === '__OFF__') {
							commands.push({
								command: VMixCommand.OVERLAY_INPUT_OFF,
								value: overlay.number,
								context: null,
								timelineId: ''
							})
						} else {
							commands.push({
								command: VMixCommand.OVERLAY_INPUT_IN,
								value: overlay.number,
								input: overlay.input,
								context: null,
								timelineId: ''
							})
						}
					}
				}
			})
		}

		// Only set fader bar position if no other transitions are happening
		if (newVMixState.reportedState.preview === undefined && newVMixState.reportedState.active === undefined) {
			if (newVMixState.reportedState.faderPosition !== undefined) {
				commands.push({
					command: VMixCommand.FADER,
					value: newVMixState.reportedState.faderPosition,
					context: null,
					timelineId: ''
				})
				newVMixState.reportedState.active = undefined
				newVMixState.reportedState.preview = undefined
				newVMixState.reportedState.fadeToBlack = false
			}
		}

		if (oldVMixState.reportedState.recording !== newVMixState.reportedState.recording) {
			if (newVMixState.reportedState.recording) {
				commands.push({
					command: VMixCommand.START_RECORDING,
					context: null,
					timelineId: ''
				})
			} else {
				commands.push({
					command: VMixCommand.STOP_RECORDING,
					context: null,
					timelineId: ''
				})
			}
		}

		if (oldVMixState.reportedState.streaming !== newVMixState.reportedState.streaming) {
			if (newVMixState.reportedState.streaming) {
				commands.push({
					command: VMixCommand.START_STREAMING,
					context: null,
					timelineId: ''
				})
			} else {
				commands.push({
					command: VMixCommand.STOP_STREAMING,
					context: null,
					timelineId: ''
				})
			}
		}

		if (oldVMixState.reportedState.fadeToBlack !== newVMixState.reportedState.fadeToBlack) {
			if (newVMixState.reportedState.fadeToBlack) {
				commands.push({
					command: VMixCommand.FADE_TO_BLACK,
					context: null,
					timelineId: ''
				})
			}
		}

		if (oldVMixState.reportedState.external !== newVMixState.reportedState.external) {
			if (newVMixState.reportedState.external) {
				commands.push({
					command: VMixCommand.START_EXTERNAL,
					context: null,
					timelineId: ''
				})
			} else {
				commands.push({
					command: VMixCommand.STOP_EXTERNAL,
					context: null,
					timelineId: ''
				})
			}
		}

		if (!_.isEqual(oldVMixState.outputs, newVMixState.outputs)) {
			_.difference(newVMixState.outputs, oldVMixState.outputs)
			.forEach(output => {
				commands.push({
					command: VMixCommand.SET_OUPUT,
					name: output.name,
					value: 'Input',
					input: output.output,
					context: null,
					timelineId: ''
				})
			})
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

export class VMixStateExtended {
	reportedState: VMixState
	outputs: VMixOutput[]
}

export class VMixState {
	version: string
	edition: string // TODO: Enuum, need list of available editions: Trial
	inputs: VMixInput[]
	overlays: VMixOverlays[]
	preview: string | undefined
	active: string | undefined
	fadeToBlack: boolean
	faderPosition?: number
	transitions: VMixTransition[]
	recording: boolean
	external: boolean
	streaming: boolean
	playlist: boolean
	multiCorder: boolean
	fullscreen: boolean
	audio: VMixAudioChannel[]
}

export interface VMixInput {
	key?: string
	number?: number
	type?: VMixInputType
	title?: string
	name?: string
	state?: 'Paused' | 'Running' | 'Completed',
	position?: number
	duration?: number
	loop?: boolean
	muted?: boolean
	volume?: number // 0 - 100
	balance?: number
	solo?: boolean
	audiobusses?: string
	meterF1?: number
	meterF2?: number
	content?: string
}

export interface VMixOverlays {
	number: number
	input: string
}

export interface VMixTransition {
	number: 1 | 2 | 3 | 4
	effect: VMixTransitionType
	duration: number
}

export interface VMixAudioChannel {
	volume: number
	muted: Boolean
	meterF1: number
	meterF2: number
	headphonesVolume: number
}

export interface VMixOutput {
	name: '2' | '3' | '4' | 'External2' | 'Fullscreen' | 'Fullscreen2'
	output: string
}
