import {
	VMixCommand,
	VMixLayers,
	VMixInputType,
	VMixTransform,
	VMixTransition,
	VMixTransitionType,
	VMixLayer,
} from 'timeline-state-resolver-types'
import { CommandContext, VMixStateCommandWithContext } from './vMixCommands'
import _ = require('underscore')
import { VMixInputHandler } from './VMixInputHandler'

/** Prefix of media input added by TSR. Only those with this prefix can be removed by this implementation */
export const TSR_INPUT_PREFIX = 'TSR_MEDIA_'

export interface VMixStateExtended {
	/**
	 * The state of vMix (as far as we know) as reported by vMix **+
	 * our expectations based on the commands we've set**.
	 */
	reportedState: VMixState
	outputs: VMixOutputsState
	inputLayers: { [key: string]: string }
	runningScripts: string[]
}

export interface VMixState {
	version: string
	edition: string // TODO: Enuum, need list of available editions: Trial
	existingInputs: { [key: string]: VMixInput }
	existingInputsAudio: { [key: string]: VMixInputAudio }
	inputsAddedByUs: { [key: string]: VMixInput }
	inputsAddedByUsAudio: { [key: string]: VMixInputAudio }
	overlays: Array<VMixOverlay | undefined>
	mixes: Array<VMixMix | undefined>
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

interface VMixOutputsState {
	External2: VMixOutput | undefined

	'2': VMixOutput | undefined
	'3': VMixOutput | undefined
	'4': VMixOutput | undefined

	Fullscreen: VMixOutput | undefined
	Fullscreen2: VMixOutput | undefined
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
	transform?: VMixTransform
	layers?: VMixLayers
	listFilePaths?: string[]
	restart?: boolean
	url?: string
	index?: number
}

export interface VMixInputAudio {
	number?: number
	muted?: boolean
	volume?: number
	balance?: number
	fade?: number
	solo?: boolean
	audioBuses?: string
	audioAuto?: boolean
}

export interface VMixOutput {
	source: 'Preview' | 'Program' | 'MultiView' | 'Input'
	input?: number | string
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

interface PreAndPostTransitionCommands {
	preTransitionCommands: Array<VMixStateCommandWithContext>
	postTransitionCommands: Array<VMixStateCommandWithContext>
}

export class VMixStateDiffer {
	private inputHandler: VMixInputHandler

	constructor(
		private readonly getCurrentTime: () => number,
		private readonly queueNow: (commands: VMixStateCommandWithContext[]) => void
	) {
		this.inputHandler = new VMixInputHandler({
			getCurrentTime: this.getCurrentTime,
			addToQueue: this.queueNow,
		})
	}

	getCommandsToAchieveState(time: number, oldVMixState: VMixStateExtended, newVMixState: VMixStateExtended) {
		let commands: Array<VMixStateCommandWithContext> = []

		const inputCommands = this._resolveInputsState(oldVMixState, newVMixState)
		commands = commands.concat(inputCommands.preTransitionCommands)
		commands = commands.concat(this._resolveMixState(oldVMixState, newVMixState))
		commands = commands.concat(this._resolveOverlaysState(oldVMixState, newVMixState))
		commands = commands.concat(inputCommands.postTransitionCommands)
		commands = commands.concat(this._resolveInputsAudioState(oldVMixState, newVMixState))
		commands = commands.concat(this._resolveRecordingState(oldVMixState.reportedState, newVMixState.reportedState))
		commands = commands.concat(this._resolveStreamingState(oldVMixState.reportedState, newVMixState.reportedState))
		commands = commands.concat(this._resolveExternalState(oldVMixState.reportedState, newVMixState.reportedState))
		commands = commands.concat(this._resolveOutputsState(oldVMixState, newVMixState))
		commands = commands.concat(
			this._resolveAddedByUsInputsRemovalState(time, oldVMixState.reportedState, newVMixState.reportedState)
		)
		commands = commands.concat(this._resolveScriptsState(oldVMixState, newVMixState))

		return commands
	}

	getDefaultState(): VMixStateExtended {
		return {
			reportedState: {
				version: '',
				edition: '',
				existingInputs: {},
				existingInputsAudio: {},
				inputsAddedByUs: {},
				inputsAddedByUsAudio: {},
				overlays: [],
				mixes: [],
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
			runningScripts: [],
		}
	}

	getDefaultInputState(inputNumber: number | string | undefined): VMixInput {
		return {
			number: Number(inputNumber) || undefined,
			position: 0,
			loop: false,
			playing: false,
			transform: {
				zoom: 1,
				panX: 0,
				panY: 0,
				alpha: 255,
			},
			layers: {},
		}
	}

	getDefaultInputAudioState(inputNumber: number | string | undefined): VMixInputAudio {
		return {
			number: Number(inputNumber) || undefined,
			muted: true,
			volume: 100,
			balance: 0,
			fade: 0,
			audioBuses: 'M',
			audioAuto: true,
		}
	}

	private _resolveMixState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		newVMixState.reportedState.mixes.forEach((_mix, i) => {
			/**
			 * It is *not* guaranteed to have all mixes present in the vMix state because it's a sparse array.
			 */
			const oldMixState = oldVMixState.reportedState.mixes[i]
			const newMixState = newVMixState.reportedState.mixes[i]
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
		})
		// Only set fader bar position if no other transitions are happening
		if (oldVMixState.reportedState.mixes[0]?.program === newVMixState.reportedState.mixes[0]?.program) {
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
	): PreAndPostTransitionCommands {
		const preTransitionCommands: Array<VMixStateCommandWithContext> = []
		const postTransitionCommands: Array<VMixStateCommandWithContext> = []
		_.map(newVMixState.reportedState.existingInputs, (input, key) =>
			this._resolveExistingInputState(oldVMixState.reportedState.existingInputs[key], input, key, oldVMixState)
		).forEach((commands) => {
			preTransitionCommands.push(...commands.preTransitionCommands)
			postTransitionCommands.push(...commands.postTransitionCommands)
		})
		_.map(newVMixState.reportedState.inputsAddedByUs, (input, key) =>
			this._resolveAddedByUsInputState(oldVMixState.reportedState.inputsAddedByUs[key], input, key, oldVMixState)
		).forEach((commands) => {
			preTransitionCommands.push(...commands.preTransitionCommands)
			postTransitionCommands.push(...commands.postTransitionCommands)
		})
		return { preTransitionCommands, postTransitionCommands }
	}

	private _resolveExistingInputState(
		oldInput: VMixInput | undefined,
		input: VMixInput,
		key: string,
		oldVMixState: VMixStateExtended
	): PreAndPostTransitionCommands {
		oldInput ??= {} // if we just started controlling it (e.g. due to mappings change), we don't know anything about the input

		return this._resolveInputState(oldVMixState, oldInput, input, key)
	}

	private _resolveInputState(oldVMixState: VMixStateExtended, oldInput: VMixInput, input: VMixInput, key: string) {
		if (input.name === undefined) {
			input.name = key
		}
		const preTransitionCommands: Array<VMixStateCommandWithContext> = []
		const postTransitionCommands: Array<VMixStateCommandWithContext> = []
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
		if (input.layers !== undefined && !_.isEqual(oldInput.layers, input.layers)) {
			for (const [indexString, layer] of Object.entries<VMixLayer>(input.layers as Record<string, VMixLayer>)) {
				const index = Number(indexString)
				const oldLayer = oldInput.layers?.[index]
				if (layer.input !== oldLayer?.input) {
					commands.push({
						command: {
							command: VMixCommand.SET_LAYER_INPUT,
							input: key,
							value: layer.input,
							index,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				}
				if (layer.panX !== undefined && layer.panX !== oldLayer?.panX) {
					commands.push({
						command: {
							command: VMixCommand.SET_LAYER_PAN_X,
							input: key,
							value: layer.panX,
							index,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				}
				if (layer.panY !== undefined && layer.panY !== oldLayer?.panY) {
					commands.push({
						command: {
							command: VMixCommand.SET_LAYER_PAN_Y,
							input: key,
							value: layer.panY,
							index,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				}
				if (layer.zoom !== undefined && layer.zoom !== oldLayer?.zoom) {
					commands.push({
						command: {
							command: VMixCommand.SET_LAYER_ZOOM,
							input: key,
							value: layer.zoom,
							index,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				}
				if (
					(layer.cropLeft !== undefined ||
						layer.cropTop !== undefined ||
						layer.cropRight !== undefined ||
						layer.cropBottom !== undefined) &&
					(layer.cropLeft !== oldLayer?.cropLeft ||
						layer.cropTop !== oldLayer?.cropTop ||
						layer.cropRight !== oldLayer?.cropRight ||
						layer.cropBottom !== oldLayer?.cropBottom)
				) {
					commands.push({
						command: {
							command: VMixCommand.SET_LAYER_CROP,
							input: key,
							cropLeft: layer.cropLeft ?? 0,
							cropTop: layer.cropTop ?? 0,
							cropRight: layer.cropRight ?? 1,
							cropBottom: layer.cropBottom ?? 1,
							index,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				}
			}
			for (const index of Object.keys(oldInput.layers ?? {})) {
				if (!input.layers?.[index]) {
					commands.push({
						command: {
							command: VMixCommand.SET_LAYER_INPUT,
							input: key,
							value: '',
							index: Number(index),
						},
						context: CommandContext.None,
						timelineId: '',
					})
				}
			}
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
		if (input.url !== undefined && oldInput.url !== input.url) {
			commands.push({
				command: {
					command: VMixCommand.BROWSER_NAVIGATE,
					input: key,
					value: input.url,
				},
				context: CommandContext.None,
				timelineId: '',
			})
		}
		if (input.index !== undefined && oldInput.index !== input.index) {
			commands.push({
				command: {
					command: VMixCommand.SELECT_INDEX,
					input: key,
					value: input.index,
				},
				context: CommandContext.None,
				timelineId: '',
			})
		}
		return { preTransitionCommands, postTransitionCommands }
	}

	private _resolveInputsAudioState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): ConcatArray<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		for (const [key, input] of Object.entries<VMixInputAudio>(newVMixState.reportedState.existingInputsAudio)) {
			this._resolveInputAudioState(
				oldVMixState.reportedState.existingInputsAudio[key] ?? {}, // if we just started controlling it (e.g. due to mappings change), we don't know anything about the input
				input,
				commands,
				key
			)
		}
		for (const [key, input] of Object.entries<VMixInputAudio>(newVMixState.reportedState.inputsAddedByUsAudio)) {
			this._resolveInputAudioState(
				oldVMixState.reportedState.inputsAddedByUsAudio[key] ?? this.getDefaultInputAudioState(key), // we assume that a new input has all parameters default
				input,
				commands,
				key
			)
		}
		return commands
	}

	private _resolveInputAudioState(
		oldInput: VMixInputAudio,
		input: VMixInputAudio,
		commands: VMixStateCommandWithContext[],
		key: string
	) {
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
			const oldBuses = (oldInput.audioBuses || 'M,A,B,C,D,E,F,G').split(',').filter((x) => x)
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
	}

	private _resolveAddedByUsInputState(
		oldInput: VMixInput | undefined,
		input: VMixInput,
		key: string,
		oldVMixState: VMixStateExtended
	): PreAndPostTransitionCommands {
		if (input.name === undefined) {
			input.name = key
		}
		if (oldInput == null && input.type !== undefined) {
			this.inputHandler.addInput(key, input.type, input.name)
		}

		oldInput ??= this.getDefaultInputState(0) // or {} but we assume that a new input has all parameters default

		return this._resolveInputState(oldVMixState, oldInput, input, key)
	}

	private _resolveAddedByUsInputsRemovalState(
		time: number,
		oldVMixState: VMixState,
		newVMixState: VMixState
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		_.difference(Object.keys(oldVMixState.inputsAddedByUs), Object.keys(newVMixState.inputsAddedByUs)).forEach(
			(input) => {
				this.inputHandler.removeInput(time, input)
			}
		)
		return commands
	}

	private _resolveOverlaysState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		newVMixState.reportedState.overlays.forEach((overlay, index) => {
			const oldOverlay = oldVMixState.reportedState.overlays[index]
			if (overlay != null && (oldOverlay == null || oldOverlay?.input !== overlay.input)) {
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

	private _resolveRecordingState(oldVMixState: VMixState, newVMixState: VMixState): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		if (newVMixState.recording != null && oldVMixState.recording !== newVMixState.recording) {
			if (newVMixState.recording) {
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

	private _resolveStreamingState(oldVMixState: VMixState, newVMixState: VMixState): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		if (newVMixState.streaming != null && oldVMixState.streaming !== newVMixState.streaming) {
			if (newVMixState.streaming) {
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

	private _resolveExternalState(oldVMixState: VMixState, newVMixState: VMixState): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		if (newVMixState.external != null && oldVMixState.external !== newVMixState.external) {
			if (newVMixState.external) {
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
		for (const [name, output] of Object.entries<VMixOutput | undefined>({ ...newVMixState.outputs })) {
			const nameKey = name as keyof VMixStateExtended['outputs']
			const oldOutput = nameKey in oldVMixState.outputs ? oldVMixState.outputs[nameKey] : undefined
			if (output != null && !_.isEqual(output, oldOutput)) {
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
		}
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

	/**
	 * Checks if TSR thinks an input is currently in-use.
	 * Not guaranteed to align with reality.
	 */
	private _isInUse(state: VMixStateExtended, input: VMixInput): boolean {
		for (const mix of state.reportedState.mixes) {
			if (mix == null) continue
			if (mix.program === input.number || mix.program === input.name) {
				// The input is in program in some mix, so stop the search and return true.
				return true
			}

			if (typeof mix.program === 'undefined') continue

			const pgmInput =
				state.reportedState.existingInputs[mix.program] ??
				(state.reportedState.inputsAddedByUs[mix.program] as VMixInput | undefined)
			if (!pgmInput || !pgmInput.layers) continue

			for (const layer of Object.keys(pgmInput.layers)) {
				const layerInput = pgmInput.layers[layer as unknown as keyof VMixLayers]
				if (layerInput.input === input.name || layerInput.input === input.number) {
					// Input is in program as a layer of a Multi View of something else that is in program,
					// so stop the search and return true.
					return true
				}
			}
		}

		for (const overlay of state.reportedState.overlays) {
			if (overlay == null) continue
			if (overlay.input === input.name || overlay.input === input.number) {
				// Input is in program as an overlay (DSK),
				// so stop the search and return true.
				return true
			}
		}

		for (const output of Object.values<VMixOutput | undefined>({ ...state.outputs })) {
			if (output == null) continue
			if (output.input === input.name || output.input === input.number) {
				// Input might not technically be in PGM, but it's being used by an output,
				// so stop the search and return true.
				return true
			}
		}

		return false
	}
}
