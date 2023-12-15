import {
	DeviceType,
	Mapping,
	MappingVmixType,
	Mappings,
	SomeMappingVmix,
	TSRTimelineContent,
	Timeline,
	TimelineContentTypeVMix,
	VMixTransition,
	VMixTransitionType,
} from 'timeline-state-resolver-types'
import { TSR_INPUT_PREFIX, VMixInput, VMixState, VMixStateExtended } from './VMixStateDiffer'
import * as deepMerge from 'deepmerge'
import _ = require('underscore')

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

export type MappingsVmix = Mappings<SomeMappingVmix>

export class VMixTimelineStateConverter {
	constructor(
		private readonly getDefaultState: () => VMixStateExtended,
		private readonly getDefaultInputState: (inputIndex: number | string | undefined) => VMixInput
	) {}

	getVMixStateFromTimelineState(
		state: Timeline.TimelineState<TSRTimelineContent>,
		mappings: MappingsVmix
	): VMixStateExtended {
		const deviceState = this._fillStateWithMappingsDefaults(this.getDefaultState(), mappings)

		// Sort layer based on Mapping type (to make sure audio is after inputs) and Layer name
		const sortedLayers = _.sortBy(
			_.map(state.layers, (tlObject, layerName) => ({
				layerName,
				tlObject,
				mapping: mappings[layerName],
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
								this._switchToInput(content.input, deviceState, mixProgram, content.transition)
							} else if (content.inputLayer) {
								this._switchToInput(content.inputLayer, deviceState, mixProgram, content.transition, true)
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
								deviceState.reportedState = this._modifyInput(deviceState, vmixTlAudioPicked, {
									key: mapping.options.index,
								})
							} else if (mapping.options.inputLayer) {
								deviceState.reportedState = this._modifyInput(deviceState, vmixTlAudioPicked, {
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
							deviceState.reportedState = this._modifyInput(
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

								{ key: mapping.options.index, filePath: content.filePath },
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

	private _modifyInput(
		deviceState: VMixStateExtended,
		newInput: VMixInput,
		input: { key?: string | number; layer?: string; filePath?: string },
		layerName?: string
	): VMixState {
		let inputs = deviceState.reportedState.existingInputs
		const newInputPicked = _.pick(newInput, (x) => !_.isUndefined(x))
		let inputKey: string | number | undefined
		if (input.layer) {
			inputKey = deviceState.inputLayers[input.layer]
			inputs = deviceState.reportedState.inputsAddedByUs
		} else if (input.filePath) {
			inputKey = TSR_INPUT_PREFIX + input.filePath
			inputs = deviceState.reportedState.inputsAddedByUs
		} else {
			inputKey = input.key
		}
		if (inputKey) {
			inputs[inputKey] = deepMerge(inputs[inputKey] ?? this.getDefaultInputState(inputKey), newInputPicked)
			if (layerName) {
				deviceState.inputLayers[layerName] = inputKey as string
			}
		}
		return deviceState.reportedState
	}

	private _switchToInput(
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

	private _fillStateWithMappingsDefaults(state: VMixStateExtended, mappings: MappingsVmix) {
		for (const mapping of Object.values<Mapping<SomeMappingVmix>>(mappings)) {
			switch (mapping.options.mappingType) {
				case MappingVmixType.Input:
					if (mapping.options.index) {
						state.reportedState.existingInputs[mapping.options.index] = this.getDefaultInputState(mapping.options.index)
					}
					break
				case MappingVmixType.AudioChannel:
					if (mapping.options.index) {
						state.reportedState.existingInputs[mapping.options.index] = this.getDefaultInputState(mapping.options.index)
					}
					break
				case MappingVmixType.Recording:
					state.reportedState.recording = false
					break
				case MappingVmixType.Streaming:
					state.reportedState.streaming = false
					break
				case MappingVmixType.External:
					state.reportedState.external = false
					break
				case MappingVmixType.Output:
					state.outputs[mapping.options.index] = { source: 'Program' }
					break
			}
		}
		return state
	}
}
