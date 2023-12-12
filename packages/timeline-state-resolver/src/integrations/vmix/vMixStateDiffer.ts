import {
	VMixCommand,
	VMixInputOverlays,
	VMixInputType,
	VMixTransform,
	VMixTransition,
	VMixTransitionType,
} from 'timeline-state-resolver-types'
import { CommandContext, VMixStateCommandWithContext } from './vMixCommands'
import _ = require('underscore')
import path = require('node:path')

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

export class VMixStateDiffer {
	constructor(
		private readonly getFixedInputsCount: () => number,
		private readonly queueNow: (commands: VMixStateCommandWithContext[]) => void
	) {}

	getCommandsToAchieveState(oldVMixState: VMixStateExtended, newVMixState: VMixStateExtended) {
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

	getDefaultState(): VMixStateExtended {
		return {
			reportedState: {
				version: '',
				edition: '',
				fixedInputsCount: 0,
				inputs: this._getDefaultInputsState(this.getFixedInputsCount()),
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

	getDefaultInputState(num: number): VMixInput {
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
			defaultInputs[i] = this.getDefaultInputState(i)
		}
		return defaultInputs
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
						input: this._getFilename(input.name),
						value: input.name,
					},
					context: CommandContext.None,
					timelineId: '',
				})
				this.queueNow(addCommands)
			}
			const oldInput = oldVMixState.reportedState.inputs[key] || this.getDefaultInputState(0) // or {} but we assume that a new input has all parameters default

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
			if (oldOverlay?.input !== overlay.input) {
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

	private _getFilename(filePath: string) {
		return path.basename(filePath)
	}
}
