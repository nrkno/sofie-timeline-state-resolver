import * as _ from 'underscore'
import * as path from 'path'
import {
	DeviceWithState,
	CommandWithContext,
	DeviceStatus,
	StatusCode
} from './device'
import {
	DeviceType,
	DeviceOptionsVMix,
	VMixOptions,
	VMixCommandContent
} from '../types/src'
import { DoOnTime, SendMode } from '../doOnTime'

import {
	TimelineState
} from 'superfly-timeline'
import { VMix, VMixStateCommand } from './vmixAPI'
import {
	MappingVMix,
	TimelineContentTypeVMix,
	VMixCommand,
	VMixTransitionType,
	TimelineObjVMixProgram,
	TimelineObjVMixPreview,
	TimelineObjVMixAudio,
	TimelineObjVMixFader,
	TimelineObjVMixOutput,
	// TimelineObjVMixRestartInput,
	// TimelineObjVMixSetPosition,
	// TimelineObjVMixSetInputName,
	// TimelineObjVMixOverlayInputIn,
	// TimelineObjVMixPlayClip,
	// TimelineObjVMixStopClip,
	VMixInputType,
	TimelineObjVMixRecording,
	TimelineObjVMixStreaming,
	TimelineObjVMixExternal,
	TimelineObjVMixFadeToBlack,
	TimelineObjVMixOverlay,
	TimelineObjVMixMedia
	// TimelineObjVMixOverlayInputByNameIn,
	// TimelineObjVMixOverlayInputOut,
	// TimelineObjVMixOverlayInputOFF
} from '../types/src/vmix'

export interface DeviceOptionsVMixInternal extends DeviceOptionsVMix {
	options: (
		DeviceOptionsVMix['options'] &
		{ commandReceiver?: CommandReceiver }
	)
}
export type CommandReceiver = (time: number, cmd: VMixStateCommandWithContext, context: CommandContext, timelineObjId: string) => Promise<any>
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

	constructor (deviceId: string, deviceOptions: DeviceOptionsVMixInternal, options) {
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
		this.setState(oldState, this.getCurrentTime())
	}

	private _getDefaultInputsState (count: number): { [key: string]: VMixInput } {
		const defaultInputs: { [key: string]: VMixInput } = {}
		for (let i = 1; i <= count; i++) {
			defaultInputs[i] = {
				number: count + 1,
				muted: true,
				volume: 100,
				balance: 0,
				solo: false,
				audioBusses: 'M',
				audioAuto: true
			}
		}
		return defaultInputs
	}

	private _getDefaultState (): VMixStateExtended {
		const defaultInputsCount = 16 // TODO: obtain inputs count from API or from blueprints(?)

		return {
			reportedState: {
				version: '',
				edition: '',
				inputs: this._getDefaultInputsState(defaultInputsCount),
				media: {},
				overlays: _.map([1,2,3,4,5,6], num => {
					return {
						number: num,
						input: undefined
					}
				}),
				mixes: _.map([1,2,3,4], num => {
					return {
						number: num,
						program: undefined,
						preview: undefined,
						transition: { effect: VMixTransitionType.Cut, duration: 0 }}
				}),
				fadeToBlack: false,
				faderPosition: 0,
				transitions: [],
				recording: false,
				external: false,
				streaming: false,
				playlist: false,
				multiCorder: false,
				fullscreen: false,
				audio: []
			},
			outputs: {
				'2': { source: 'Program' },
				'3': { source: 'Program' },
				'4': { source: 'Program' },
				'External2': { source: 'Program' },
				'Fullscreen': { source: 'Program' },
				'Fullscreen2': { source: 'Program' }
			}
		}
	}

	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState (newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}

	handleState (newState: TimelineState) {
		if (!this._initialized) { // before it's initialized don't do anything
			this.emit('info', 'VMix not initialized yet')
			return
		}

		let previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		let oldState: VMixStateExtended = (this.getStateBefore(previousStateTime) || { state: this._getDefaultState() }).state

		let newVMixState = this.convertStateToVMix(newState)

		let commandsToAchieveState: Array<any> = this._diffStates(oldState, newVMixState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)

		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newVMixState, newState.time)
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
	convertStateToVMix (state: TimelineState): VMixStateExtended {
		if (!this._initialized) throw Error('convertStateToVMix cannot be used before inititialized')

		let deviceState = this._getDefaultState()

		// Sort layer based on Layer name
		const sortedLayers = _.map(state.layers, (tlObject, layerName) => ({ layerName, tlObject }))
			.sort((a,b) => a.layerName.localeCompare(b.layerName))

		_.each(sortedLayers, ({ tlObject, layerName }) => {
			let mapping = this.getMapping()[layerName] as MappingVMix

			console.log(mapping) // TODO: Use this later

			if (tlObject.content) {
				switch (tlObject.content.type) {
					case TimelineContentTypeVMix.PROGRAM:
						let vmixTlProgram = tlObject as any as TimelineObjVMixProgram
						let mixProgram = (vmixTlProgram.content.mix || 1) - 1
						this.switchToInput(vmixTlProgram.content.input, deviceState, mixProgram, vmixTlProgram.content.transition)
						break
					case TimelineContentTypeVMix.PREVIEW:
						let vmixTlPreview = tlObject as any as TimelineObjVMixPreview
						let mixPreview = (vmixTlPreview.content.mix || 1) - 1
						if (vmixTlPreview.content.input) deviceState.reportedState.mixes[mixPreview].preview = vmixTlPreview.content.input
						break
					case TimelineContentTypeVMix.AUDIO:
						let vmixTlAudio = tlObject as any as TimelineObjVMixAudio
						let vmixTlAudioPicked = _.pick(vmixTlAudio.content, 'input', 'volume', 'balance', 'solo', 'audioAuto', 'audioBusses', 'muted')
						deviceState.reportedState.inputs = this.modifyInput(deviceState.reportedState.inputs, vmixTlAudioPicked, vmixTlAudio.content.input)
						break
					case TimelineContentTypeVMix.FADER:
						let vmixTlFader = tlObject as any as TimelineObjVMixFader
						deviceState.reportedState.faderPosition = vmixTlFader.content.position
						break
					case TimelineContentTypeVMix.RECORDING:
						let vmixTlRecording = tlObject as any as TimelineObjVMixRecording
						deviceState.reportedState.recording = vmixTlRecording.content.on
						break
					case TimelineContentTypeVMix.STREAMING:
						let vmixTlStreaming = tlObject as any as TimelineObjVMixStreaming
						deviceState.reportedState.streaming = vmixTlStreaming.content.on
						break
					case TimelineContentTypeVMix.EXTERNAL:
						let vmixTlExternal = tlObject as any as TimelineObjVMixExternal
						deviceState.reportedState.external = vmixTlExternal.content.on
						break
					case TimelineContentTypeVMix.FADE_TO_BLACK:
						let vmixTlFTB = tlObject as any as TimelineObjVMixFadeToBlack
						deviceState.reportedState.fadeToBlack = vmixTlFTB.content.on
						break
					case TimelineContentTypeVMix.MEDIA:
						let vmixTlMedia = tlObject as any as TimelineObjVMixMedia
						deviceState.reportedState.media = this.modifyMedia(deviceState.reportedState.media, {
							name: this.getFilename(vmixTlMedia.content.filePath),
							type: 'Video', // TODO: add other types
							filePath: vmixTlMedia.content.filePath,
							playing: vmixTlMedia.content.playing,
							loop: vmixTlMedia.content.loop,
							seek: vmixTlMedia.content.seek
						})
						break
					/*
					case TimelineContentTypeVMix.RESTART_INPUT:
						let tlObjectRestartInput = tlObject as any as TimelineObjVMixRestartInput
						deviceState.reportedState.inputs = this.modifyInput(deviceState.reportedState.inputs, {
							number: Number(tlObjectRestartInput.content.input),
							position: 0
						})
						break
					case TimelineContentTypeVMix.SET_INPUT_NAME:
						let tlObjSetInputName = tlObject as any as TimelineObjVMixSetInputName
						deviceState.reportedState.inputs = this.modifyInput(deviceState.reportedState.inputs, {
							number: Number(tlObjSetInputName.content.input),
							name: tlObjSetInputName.content.name
						})
						break
					*/
					case TimelineContentTypeVMix.OUTPUT:
						let tlObjSetOutput = tlObject as any as TimelineObjVMixOutput
						deviceState.outputs[tlObjSetOutput.content.name] = {
							source: tlObjSetOutput.content.source,
							input: tlObjSetOutput.content.input
						}
						break
					case TimelineContentTypeVMix.OVERLAY:
						let tlObjOverlayInputIn = tlObject as any as TimelineObjVMixOverlay
						let overlayIndex = tlObjOverlayInputIn.content.overlay - 1
						deviceState.reportedState.overlays[overlayIndex].input = tlObjOverlayInputIn.content.input
						break
					/*
					case TimelineContentTypeVMix.PLAY_CLIP:
						let tlObjPlayClip = tlObject as any as TimelineObjVMixPlayClip
						let fileTypePlay: VMixInputType = 'Video'
						if (tlObjPlayClip.content.clipName.match(/.*\.(tif|tiff|gif|jpeg|jpg|jif|jfif|jp2|jpx|jk2|j2c|png)/g)) {
							fileTypePlay = 'Image'
						}
						if (this.inputExists(tlObjPlayClip.content.clipName, fileTypePlay, deviceState)) {
							let inputIndexPlayClip = deviceState.reportedState.inputs.findIndex(input => input.title === tlObjPlayClip.content.clipName)
							if (inputIndexPlayClip !== -1) {
								deviceState.reportedState.inputs[inputIndexPlayClip].state = 'Running'
								deviceState.reportedState.inputs[inputIndexPlayClip].position = 0
							}
						} else {
							let combinedInput = (tlObjPlayClip.content.mediaDirectory.indexOf('\\') !== -1) ?
								`${fileTypePlay}|${tlObjPlayClip.content.mediaDirectory}\\${tlObjPlayClip.content.clipName}` :
								`${fileTypePlay}|${tlObjPlayClip.content.mediaDirectory}/${tlObjPlayClip.content.clipName}`
							this._vmix.addInput(combinedInput)

							deviceState.reportedState.inputs.push({
								title: tlObjPlayClip.content.clipName,
								state: 'Running',
								position: 0
							})
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
						let fileTypeProgram: VMixInputType = 'Video'
						if (tlObjClipToProgram.content.clipName.match(/.*\.(tif|tiff|gif|jpeg|jpg|jif|jfif|jp2|jpx|jk2|j2c|png)/g)) {
							fileTypeProgram = 'Image'
						}
						if (this.inputExists(tlObjClipToProgram.content.clipName, fileTypeProgram, deviceState)) {
							this.switchToSource(tlObjClipToProgram.content.clipName, deviceState, tlObjClipToProgram.content.transition)
						}
						break
					case TimelineContentTypeVMix.CAMERA_ACTIVE:
						let tlObjCameraActive = tlObject as any as TimelineObjVMixCameraActive
						if (this.inputExists(tlObjCameraActive.content.camera, 'Capture', deviceState)) {
							this.switchToSource(tlObjCameraActive.content.camera, deviceState, tlObjCameraActive.content.transition)
						}
						break
					case TimelineContentTypeVMix.OVERLAY_INPUT_BY_NAME_IN:
						let tlObjOverlayInputByNameIn = tlObject as any as TimelineObjVMixOverlayInputByNameIn
						let overlayByNameInIndex = deviceState.reportedState.inputs.findIndex(input => input.title === tlObjOverlayInputByNameIn.content.inputName)
						if (overlayByNameInIndex !== -1) {
							let overlayIndex = deviceState.reportedState.overlays.findIndex(overlay => overlay.number === tlObjOverlayInputByNameIn.content.overlay)
							if (overlayIndex !== -1) {
								let input = deviceState.reportedState.inputs[overlayByNameInIndex].number
								if (input !== undefined) deviceState.reportedState.overlays[overlayIndex].input = input.toString()
							}
						} else {
							let combinedInput = (tlObjOverlayInputByNameIn.content.mediaDirectory.indexOf('\\') !== -1) ?
							`Video|${tlObjOverlayInputByNameIn.content.mediaDirectory}\\${tlObjOverlayInputByNameIn.content.inputName}` :
							`Video|${tlObjOverlayInputByNameIn.content.mediaDirectory}/${tlObjOverlayInputByNameIn.content.inputName}`
							this._vmix.addInput(combinedInput)

							deviceState.reportedState.inputs.push({
								title: tlObjOverlayInputByNameIn.content.inputName
							})
							let overlayIndex = deviceState.reportedState.overlays.findIndex(overlay => overlay.number === tlObjOverlayInputByNameIn.content.overlay)
							if (overlayIndex !== -1) {
								deviceState.reportedState.overlays[overlayIndex].input = deviceState.reportedState.inputs.length.toString()
							}
						}
						break
					*/
				}
			}
		})
		return deviceState
	}

	getFilename (filePath: string) {
		return path.basename(filePath)
	}

	/* inputExists (name: string, mediaType: VMixInputType, deviceState: VMixStateExtended, file?: boolean) {
		return deviceState.reportedState.inputs.filter(input => {
			if (input.title) {
				if (file) {
					let match = name.match(/[ \w-]+?(?=\.).(\w)+(?:$|\n)/g)
					if (match) {
						if (match[0] === input.title && input.type && input.type === mediaType) {
							return input
						}
					}
				} else {
					if (name === input.title && input.type && input.type === mediaType) {
						return input
					}
				}
			}

			return
		}).length !== 0
	} */

	modifyInput (inputs: { [key: string]: VMixInput }, newInput: VMixInput, input: string | number): { [key: string]: VMixInput } {
		if (input in inputs) {
			inputs[input] = { ...inputs[input], ...newInput }
		} else {
			inputs[input] = newInput
		}
		return inputs
	}

	modifyMedia (inputs: { [key: string]: VMixMedia }, newInput: VMixMedia): { [key: string]: VMixMedia } {
		if (newInput.filePath in inputs) {
			inputs[newInput.filePath] = { ...inputs[newInput.filePath], ...newInput }
		} else {
			inputs[newInput.filePath] = newInput
		}
		return inputs
	}

	switchToInput (input: number | string, deviceState: VMixStateExtended, mix: number, transition?: VMixTransition) {
		// let available = deviceState.reportedState.inputs.filter(inp =>
		// 	inp.number === input
		// ).length !== 0
		let mixState = deviceState.reportedState.mixes[mix]
		if (
		// available &&
			(
				mixState.program === undefined ||
				mixState.program !== input // mixing numeric and string input names can be dangerous
			)
		) {
			mixState.preview = mixState.program
			mixState.program = input

			mixState.transition = transition || { effect: VMixTransitionType.Cut, duration: 0 }
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
	private _addToQueue (commandsToAchieveState: Array<VMixStateCommandWithContext>, time: number) {
		_.each(commandsToAchieveState, (cmd: VMixStateCommandWithContext) => {

			// add the new commands to the queue:
			this._doOnTime.queue(time, undefined, (cmd: VMixStateCommandWithContext) => {
				return this._commandReceiver(time, cmd, cmd.context, cmd.timelineId)
			}, cmd)
		})
	}
	private _diffStates (oldVMixState: VMixStateExtended, newVMixState: VMixStateExtended): Array<VMixStateCommandWithContext> {
		let commands: Array<VMixStateCommandWithContext> = []

		for (let i = 0; i < 4; i++) {
			let oldMixState = oldVMixState.reportedState.mixes[i]
			let newMixState = newVMixState.reportedState.mixes[i]
			if (newMixState.program !== undefined) {
				if (oldMixState.program !== newMixState.program) {
					commands.push({
						command: {
							command: VMixCommand.TRANSITION,
							effect: newMixState.transition.effect,
							input: newMixState.program,
							duration: newMixState.transition.duration,
							mix: i
						},
						context: null,
						timelineId: ''
					})
				}
			}

			if (
				oldMixState.program === newMixState.program && // if we're not switching what is on program
				newMixState.preview !== undefined &&
				newMixState.preview !== oldMixState.preview
			) {
				commands.push({
					command: {
						command: VMixCommand.PREVIEW_INPUT,
						input: newMixState.preview,
						mix: i
					},
					context: null,
					timelineId: ''
				})
			}
		}

		if (!_.isEqual(oldVMixState.reportedState.inputs, newVMixState.reportedState.inputs)) {
			_.each(newVMixState.reportedState.inputs, (input, key) => {
				let oldInput = oldVMixState.reportedState.inputs[key] || {}
				if (oldInput.position !== input.position) {
					commands.push({
						command: {
							command: VMixCommand.SET_POSITION,
							input: key,
							value: input.position ? input.position : 0
						},
						context: null,
						timelineId: ''
					})
				}

				/* if (oldInput.state !== input.state) {
					if (input.state === 'Running') {
						commands.push({
							command: {
								command: VMixCommand.PLAY_INPUT,
								input: input.number
							},
							context: null,
							timelineId: ''
						})
					} else if (input.state === 'Paused') {
						commands.push({
							command: {
								command: VMixCommand.PAUSE_INPUT,
								input: input.number
							},
							context: null,
							timelineId: ''
						})
					}
				} */

				if (oldInput.volume !== input.volume && input.volume && !isNaN(input.volume)) {
					commands.push({
						command: {
							command: VMixCommand.AUDIO_VOLUME,
							input: key,
							value: input.volume
						},
						context: null,
						timelineId: ''
					})
				}

				/* if (oldInput.name !== input.name && input.name) {
					commands.push({
						command: {
							command: VMixCommand.SET_INPUT_NAME,
							input: key,
							value: input.name
						},
						context: null,
						timelineId: ''
					})
				} */
			
			})
		}

		if (!_.isEqual(oldVMixState.reportedState.media, newVMixState.reportedState.media)) {
			_.each(newVMixState.reportedState.media, input => {
				if (!_.has(oldVMixState.reportedState.media, input.filePath)) {
					this._vmix.addInput(`Video|${input.filePath}`).then().catch()
				}
				let oldInput = oldVMixState.reportedState.media[input.filePath] || {}
				console.log(oldInput.playing, input.playing)
				if (oldInput.playing !== input.playing) {
					if (input.playing) {
						commands.push({
							command: {
								command: VMixCommand.PLAY_INPUT,
								input: input.name
							},
							context: null,
							timelineId: ''
						})
					} else {
						commands.push({
							command: {
								command: VMixCommand.PAUSE_INPUT,
								input: input.name
							},
							context: null,
							timelineId: ''
						})
					}
				}
				if (oldInput.seek !== input.seek) {
					commands.push({
						command: {
							command: VMixCommand.SET_POSITION,
							input: input.name,
							value: input.seek ? input.seek : 0 // is this correct?
						},
						context: null,
						timelineId: ''
					})
				}
			})
			_.difference(Object.keys(oldVMixState.reportedState.media), Object.keys(newVMixState.reportedState.media))
			.forEach(input => {
				console.log('remove', input)
				commands.push({
					command: {
						command: VMixCommand.REMOVE_INPUT,
						input: oldVMixState.reportedState.media[input].name
					},
					context: null,
					timelineId: ''
				})
			})
		}

		if (!_.isEqual(oldVMixState.reportedState.overlays, newVMixState.reportedState.overlays)) {
			_.each(newVMixState.reportedState.overlays, (overlay, index) => {
				let oldOverlay = oldVMixState.reportedState.overlays[index]
				if (oldOverlay.input !== overlay.input) {
					if (overlay.input === undefined) {
						commands.push({
							command: {
								command: VMixCommand.OVERLAY_INPUT_OUT,
								value: overlay.number
							},
							context: null,
							timelineId: ''
						})
					} else {
						commands.push({
							command: {
								command: VMixCommand.OVERLAY_INPUT_IN,
								input: overlay.input,
								value: overlay.number
							},
							context: null,
							timelineId: ''
						})
					} // else {
					// 	this.emit('debug', `VMIX: Unknown overlay.input: "${overlay.input}"`)
					// }
				}
			})
		}

		// Only set fader bar position if no other transitions are happening
		if (oldVMixState.reportedState.mixes[0].program === newVMixState.reportedState.mixes[0].program) {
			if (newVMixState.reportedState.faderPosition !== oldVMixState.reportedState.faderPosition) {
				commands.push({
					command: {
						command: VMixCommand.FADER,
						value: newVMixState.reportedState.faderPosition || 0
					},
					context: null,
					timelineId: ''
				})
				// newVMixState.reportedState.program = undefined
				// newVMixState.reportedState.preview = undefined
				newVMixState.reportedState.fadeToBlack = false
			}
		}

		if (oldVMixState.reportedState.recording !== newVMixState.reportedState.recording) {
			if (newVMixState.reportedState.recording) {
				commands.push({
					command: {
						command: VMixCommand.START_RECORDING
					},
					context: null,
					timelineId: ''
				})
			} else {
				commands.push({
					command: {
						command: VMixCommand.STOP_RECORDING
					},
					context: null,
					timelineId: ''
				})
			}
		}

		if (oldVMixState.reportedState.streaming !== newVMixState.reportedState.streaming) {
			if (newVMixState.reportedState.streaming) {
				commands.push({
					command: {
						command: VMixCommand.START_STREAMING
					},
					context: null,
					timelineId: ''
				})
			} else {
				commands.push({
					command: {
						command: VMixCommand.STOP_STREAMING
					},
					context: null,
					timelineId: ''
				})
			}
		}

		if (oldVMixState.reportedState.fadeToBlack !== newVMixState.reportedState.fadeToBlack) {
			// Danger: Fade to black is toggled, we can't explicitly say that we want it on or off
			commands.push({
				command: {
					command: VMixCommand.FADE_TO_BLACK
				},
				context: null,
				timelineId: ''
			})
		}

		if (oldVMixState.reportedState.external !== newVMixState.reportedState.external) {
			if (newVMixState.reportedState.external) {
				commands.push({
					command: {
						command: VMixCommand.START_EXTERNAL
					},
					context: null,
					timelineId: ''
				})
			} else {
				commands.push({
					command: {
						command: VMixCommand.STOP_EXTERNAL
					},
					context: null,
					timelineId: ''
				})
			}
		}

		if (!_.isEqual(oldVMixState.outputs, newVMixState.outputs)) {
			_.map(newVMixState.outputs, (output, name) => {
				if (!_.isEqual(output, oldVMixState.outputs[name])) {
					let value = output.source === 'Program' ? 'Output' : output.source
					commands.push({
						command: {
							command: VMixCommand.SET_OUPUT,
							value,
							input: output.input,
							name
						},
						context: null,
						timelineId: ''
					})
				}
			})
		}

		return commands
	}
	private _defaultCommandReceiver (_time: number, cmd: VMixStateCommandWithContext, context: CommandContext, timelineObjId: string): Promise<any> {

		let cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId
		}
		this.emit('debug', cwc)

		return this._vmix.sendCommand(cmd.command)
		.catch(error => {
			this.emit('commandError', error, cwc)
		})
	}
}

interface VMixOutput {
	source: 'Preview' | 'Program' | 'MultiView' | 'Input'
	input?: number | string
}

export class VMixStateExtended {
	reportedState: VMixState
	outputs: {
		'External2': VMixOutput

		'2': VMixOutput
		'3': VMixOutput
		'4': VMixOutput

		'Fullscreen': VMixOutput
		'Fullscreen2': VMixOutput
	}
}

export class VMixState {
	version: string
	edition: string // TODO: Enuum, need list of available editions: Trial
	inputs: { [key: string]: VMixInput }
	// inputs: { [key:string]: VMixInput }
	media: { [key: string]: VMixMedia }
	overlays: VMixOverlay[]
	mixes: VMixMix[]
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

export interface VMixMix {
	number: number
	program: string | number | undefined
	preview: string | number | undefined
	transition: VMixTransition
}

export interface VMixMedia {
	name: string
	filePath: string
	type: 'Image' | 'Video'
	playing?: boolean
	seek?: number
	loop?: boolean
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
	audioBusses?: string
	audioAuto?: boolean
	// content?: string
}

export interface VMixOverlay {
	number: number
	input: string | number | undefined
}

export interface VMixTransition {
	// number: 1 | 2 | 3 | 4
	effect: VMixTransitionType
	duration: number
}

export interface VMixAudioChannel {
	volume: number
	muted: boolean
	meterF1: number
	meterF2: number
	headphonesVolume: number
}
/*


Sources
    Output (Program)
    preview
    multiview
    ~inputs available~
    ~clips available~
    ~other things available~



External outputs
	**not able to control in API, only switch on/off**
    External

    **able to assign sources, switch on/off**
	External2
	2
	3
	4
	Fullscreen
	Fullscreen2

Overlays
        // fixed, not able to change number
        // any source can be assigned to an overlay
	Overlay 1
	Overlay 2
	Overlay 3
	Overlay 4
	Stinger 1
	Stinger 2



Mapping: "map a timeline layer to something physical"

Mapping: {
    type: 'source' | 'input' | 'output'

    id: "program" | "overlay",
}
MappingSource extends Mapping {
    type: 'source'
    id: "program" | "overlay",
}
MappingOutput extends Mapping {
    type: 'output'
    id: 'External2', '2', '3', '4', 'Fullscreen', 'Fullscreen2'
}


{
    sourceType: "video" | "camera" | others...

    source: "cam1"
    source: "timeline_layer_34"
}

{
    type: "input",

    type: video,
    fileName: "sofie1.mp4"
}

{
    type: "output",
    source: 'output' | 'preview' | 'multiview'...
}

// "I want to play and display a video on Program"
mapping: {
    'program0': {
        type: 'source',
        'id': 'program'
    },
    'media_player0': {
        type: 'input'
    }
},
timeline: [{
    layer: 'media_player0',
    content: {
        type: "input",
        inputType: 'video',
        fileName: "sofie1.mp4"
    }
}, {
    layer: 'program0',
    content: {
        type: "source",
        sourceType: "video",
        sourceLayer: 'media_player0'

    }
}]


// "I want to play and display a video on Program, then cut to the same video again"


// "I want to play and display a camera on Program"
*/
