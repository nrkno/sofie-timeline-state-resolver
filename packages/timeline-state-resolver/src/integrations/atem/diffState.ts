import { Diff } from 'atem-state'
import { DeepComplete } from 'atem-state/dist/util'
import { Mapping, SomeMappingAtem, MappingAtemType, Mappings } from 'timeline-state-resolver-types'

/**
  Returns an option object to be passed into AtemState.diffStates().
  Based on the mappings, these options enables/disables certain areas-of-interest in the diff atem state.
*/
export function createDiffOptions(mappings: Mappings<SomeMappingAtem>): DeepComplete<Diff.SectionsToDiff> {
	const auxMappings: number[] = []
	const audioOutputs: number[] = []
	const colorGenerators: number[] = []

	for (const mapping of Object.values<Mapping<SomeMappingAtem>>(mappings)) {
		if (mapping.options.mappingType === MappingAtemType.Auxilliary) {
			auxMappings.push(mapping.options.index)
		} else if (mapping.options.mappingType === MappingAtemType.AudioChannel) {
			audioOutputs.push(mapping.options.index)
		} else if (mapping.options.mappingType === MappingAtemType.ColorGenerator) {
			colorGenerators.push(mapping.options.index)
		}
	}

	const audioOutputsObj: DeepComplete<Record<number | 'default', Diff.DiffFairlightAudioRoutingOutput | undefined>> = {
		default: undefined,
	}
	for (const audioOutput of audioOutputs) {
		audioOutputsObj[audioOutput] = {
			name: false,
			sourceId: true,
		}
	}

	// Manually construct the tree of what to diff, to match the previous version of atem-state.
	// Future: this should be computed from the mappings
	return {
		colorGenerators: colorGenerators,
		settings: {
			multiviewer: undefined,
		},
		macros: {
			player: { player: true },
		},
		media: {
			players: {
				source: true,
				status: true,
			},
		},
		video: {
			auxiliaries: auxMappings,
			downstreamKeyers: {
				sources: true,
				onAir: true,
				properties: true,
				mask: true,
			},
			mixEffects: {
				programPreview: true,
				transitionStatus: true,
				transitionProperties: true,
				transitionSettings: {
					dip: false,
					DVE: false,
					mix: true,
					stinger: true,
					wipe: true,
				},
				upstreamKeyers: {
					sources: true,
					onAir: true,
					type: true,
					mask: true,
					flyKeyframes: 'all',
					flyProperties: true,
					dveSettings: true,
					chromaSettings: false,
					advancedChromaSettings: false,
					lumaSettings: true,
					patternSettings: true,
				},
			},
			superSources: {
				boxes: 'all',
				border: true,
				properties: true,
			},
		},
		audio: {
			classic: undefined,
			fairlight: {
				inputs: undefined,
				masterOutput: undefined,
				monitorOutput: undefined,
				crossfade: undefined,
				audioRouting: {
					sources: undefined,
					outputs: audioOutputsObj,
				},
			},
		},
	}
}
