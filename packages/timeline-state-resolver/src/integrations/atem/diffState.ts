import { Diff } from 'atem-state'
import { DeepComplete } from 'atem-state/dist/util'
import {
	Mapping,
	SomeMappingAtem,
	MappingAtemAuxilliary,
	MappingAtemType,
	MappingAtemAudioChannel,
	Mappings,
} from 'timeline-state-resolver-types'

/**
  Returns an option object to be passed into AtemState.diffStates().
  Based on the mappings, these options enables/disables certain areas-of-interest in the diff atem state.
*/
export function createDiffOptions(mappings: Mappings): DeepComplete<Diff.SectionsToDiff> {
	// Find the auxes that have mappings
	const auxMappings = Object.values<Mapping<unknown>>(mappings)
		.filter(
			(mapping): mapping is Mapping<MappingAtemAuxilliary> =>
				(mapping as Mapping<SomeMappingAtem>).options.mappingType === MappingAtemType.Auxilliary
		)
		.map((mapping) => mapping.options.index)

	// Find the audioOutputs that have mappings
	const audioOutputs = Object.values<Mapping<unknown>>(mappings)
		.filter(
			(mapping): mapping is Mapping<MappingAtemAudioChannel> =>
				(mapping as Mapping<SomeMappingAtem>).options.mappingType === MappingAtemType.Auxilliary
		)
		.map((mapping) => mapping.options.index)
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
		colorGenerators: undefined,
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
					stinger: false,
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
