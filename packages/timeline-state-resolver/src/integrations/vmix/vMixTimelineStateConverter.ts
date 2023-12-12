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
import { VMixInput, VMixStateExtended } from './vMixStateDiffer'
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

export class VMixTimelineStateConverter {
	constructor(
		private readonly getDefaultState: () => VMixStateExtended,
		private readonly getDefaultInputState: (num: number) => VMixInput
	) {}

	getVMixStateFromTimelineState(
		state: Timeline.TimelineState<TSRTimelineContent>,
		mappings: Mappings
	): VMixStateExtended {
		const deviceState = this.getDefaultState()

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
				const inputState = this.getDefaultInputState(0)
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
}
