import {
	MappingTriCaster,
	MappingTriCasterType,
	MappingTriCasterMixEffect,
	MappingTriCasterDownStreamKeyer,
	MappingTriCasterAudioChannel,
	MappingTriCasterMixOutput,
	TriCasterAudioChannelName,
	TriCasterMixEffectName,
	TriCasterMixOutputName,
	MappingTriCasterInput,
	TriCasterInputName,
	Timeline,
	TSRTimelineContent,
	TriCasterMatrixOutputName,
	MappingTriCasterMatrixOutput,
} from 'timeline-state-resolver-types'
import * as _ from 'underscore'
import { MappingsTriCaster, TriCasterState } from './triCasterStateDiffer'
import {
	isTimelineObjTriCasterAudioChannel,
	isTimelineObjTriCasterDSK,
	isTimelineObjTriCasterInput,
	isTimelineObjTriCasterMatrixOutput,
	isTimelineObjTriCasterME,
	isTimelineObjTriCasterMixOutput,
} from './types'

type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] }

export class TriCasterTimelineStateConverter {
	private meNames: Set<TriCasterMixEffectName>
	private inputNames: Set<TriCasterInputName>
	private audioChannelNames: Set<TriCasterAudioChannelName>
	private mixOutputNames: Set<TriCasterMixOutputName>
	private matrixOutputNames: Set<TriCasterMatrixOutputName>

	constructor(
		private readonly getDefaultState: (mappings: MappingsTriCaster) => TriCasterState,
		resourceNames: {
			mixEffects: TriCasterMixEffectName[]
			inputs: TriCasterInputName[]
			audioChannels: TriCasterAudioChannelName[]
			mixOutputs: TriCasterMixOutputName[]
			matrixOutputs: TriCasterMatrixOutputName[]
		}
	) {
		this.meNames = new Set(resourceNames.mixEffects)
		this.inputNames = new Set(resourceNames.inputs)
		this.audioChannelNames = new Set(resourceNames.audioChannels)
		this.mixOutputNames = new Set(resourceNames.mixOutputs)
		this.matrixOutputNames = new Set(resourceNames.matrixOutputs)
	}

	getTriCasterStateFromTimelineState(
		timelineState: Timeline.TimelineState<TSRTimelineContent>,
		newMappings: MappingsTriCaster
	): TriCasterState {
		const resultState = this.getDefaultState(newMappings)
		const sortedLayers = this.sortLayers(timelineState)

		for (const { tlObject, layerName } of Object.values(sortedLayers)) {
			const mapping: MappingTriCaster | undefined = newMappings[layerName]
			if (!mapping) {
				continue
			}
			switch (mapping.mappingType) {
				case MappingTriCasterType.ME:
					this.applyMixEffectState(resultState, tlObject, mapping)
					break
				case MappingTriCasterType.DSK:
					this.applyDskState(resultState, tlObject, mapping)
					break
				case MappingTriCasterType.INPUT:
					this.applyInputState(resultState, tlObject, mapping)
					break
				case MappingTriCasterType.AUDIO_CHANNEL:
					this.applyAudioChannelState(resultState, tlObject, mapping)
					break
				case MappingTriCasterType.MIX_OUTPUT:
					this.applyMixOutputState(resultState, tlObject, mapping)
					break
				case MappingTriCasterType.MATRIX_OUTPUT:
					this.applyMatrixOutputState(resultState, tlObject, mapping)
					break
			}
		}

		return resultState
	}

	private sortLayers(state: Timeline.TimelineState<TSRTimelineContent>) {
		return _.map(state.layers, (tlObject, layerName) => ({
			layerName,
			tlObject: tlObject,
		})).sort((a, b) => a.layerName.localeCompare(b.layerName))
	}

	private applyMixEffectState(
		resultState: TriCasterState,
		tlObject: Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>,
		mapping: MappingTriCasterMixEffect
	) {
		const mixEffects = resultState.mixEffects
		if (!isTimelineObjTriCasterME(tlObject.content) || !this.meNames.has(mapping.name)) return
		this.deepApply(mixEffects[mapping.name], tlObject.content.me)
		const mixEffect = tlObject.content.me
		if ('layers' in mixEffect && Object.keys(mixEffect.layers ?? []).length) {
			mixEffects[mapping.name].isInEffectMode = true
		}
	}

	private applyDskState(
		resultState: TriCasterState,
		tlObject: Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>,
		mapping: MappingTriCasterDownStreamKeyer
	) {
		const mainKeyers = resultState.mixEffects['main']
		if (!isTimelineObjTriCasterDSK(tlObject.content) || !mainKeyers) {
			return
		}
		this.deepApply(mainKeyers[mapping.name], tlObject.content.keyer)
	}

	private applyInputState(
		resultState: TriCasterState,
		tlObject: Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>,
		mapping: MappingTriCasterInput
	) {
		const inputs = resultState.inputs
		if (!isTimelineObjTriCasterInput(tlObject.content) || !this.inputNames.has(mapping.name)) return
		this.deepApply(inputs[mapping.name], tlObject.content.input)
	}

	private applyAudioChannelState(
		resultState: TriCasterState,
		tlObject: Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>,
		mapping: MappingTriCasterAudioChannel
	) {
		const audioChannels = resultState.audioChannels
		if (!isTimelineObjTriCasterAudioChannel(tlObject.content) || !this.audioChannelNames.has(mapping.name)) return
		this.deepApply(audioChannels[mapping.name], tlObject.content.audioChannel)
	}

	private applyMixOutputState(
		resultState: TriCasterState,
		tlObject: Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>,
		mapping: MappingTriCasterMixOutput
	) {
		if (!isTimelineObjTriCasterMixOutput(tlObject.content) || !this.mixOutputNames.has(mapping.name)) return
		resultState.mixOutputs[mapping.name] = { source: tlObject.content.source }
	}

	private applyMatrixOutputState(
		resultState: TriCasterState,
		tlObject: Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>,
		mapping: MappingTriCasterMatrixOutput
	) {
		if (!isTimelineObjTriCasterMatrixOutput(tlObject.content) || !this.matrixOutputNames.has(mapping.name)) return
		resultState.matrixOutputs[mapping.name] = { source: tlObject.content.source }
	}

	/**
	 * Deeply applies primitive properties from `source` to existing properties of `target` (in place)
	 */
	private deepApply<T>(target: T, source: DeepPartial<T>): void {
		let key: keyof T
		for (key in target) {
			if (source[key] === undefined) {
				continue
			}
			const t = target[key]
			if (typeof t === 'object') {
				this.deepApply(t, source[key] as DeepPartial<typeof t>)
			} else {
				target[key] = source[key] as typeof t
			}
		}
	}
}
