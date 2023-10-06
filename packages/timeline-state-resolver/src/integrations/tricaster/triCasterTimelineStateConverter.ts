import {
	SomeMappingTricaster,
	MappingTricasterType,
	MappingTricasterME,
	MappingTricasterDSK,
	MappingTricasterAUDIOCHANNEL,
	MappingTricasterMIXOUTPUT,
	MappingTricasterMATRIXOUTPUT,
	MappingTricasterINPUT,
	TriCasterAudioChannelName,
	TriCasterMixEffectName,
	TriCasterMixOutputName,
	TriCasterInputName,
	Timeline,
	TSRTimelineContent,
	TriCasterMatrixOutputName,
	Mapping,
} from 'timeline-state-resolver-types'
import * as _ from 'underscore'
import { isStateEntry, MappingsTriCaster, TriCasterState, WithContext } from './triCasterStateDiffer'
import {
	isTimelineObjTriCaster,
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
		private readonly getDefaultState: (mappings: MappingsTriCaster) => WithContext<TriCasterState>,
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
	): WithContext<TriCasterState> {
		const resultState = this.getDefaultState(newMappings)
		const sortedLayers = this.sortLayers(timelineState)

		for (const { tlObject, layerName } of sortedLayers) {
			const mapping: Mapping<SomeMappingTricaster> | undefined = newMappings[layerName]
			if (!mapping) {
				continue
			}
			switch (mapping.options.mappingType) {
				case MappingTricasterType.ME:
					this.applyMixEffectState(resultState, tlObject, mapping.options)
					break
				case MappingTricasterType.DSK:
					this.applyDskState(resultState, tlObject, mapping.options)
					break
				case MappingTricasterType.INPUT:
					this.applyInputState(resultState, tlObject, mapping.options)
					break
				case MappingTricasterType.AUDIOCHANNEL:
					this.applyAudioChannelState(resultState, tlObject, mapping.options)
					break
				case MappingTricasterType.MIXOUTPUT:
					this.applyMixOutputState(resultState, tlObject, mapping.options)
					break
				case MappingTricasterType.MATRIXOUTPUT:
					this.applyMatrixOutputState(resultState, tlObject, mapping.options)
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
		resultState: WithContext<TriCasterState>,
		tlObject: Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>,
		mapping: MappingTricasterME
	) {
		const mixEffects = resultState.mixEffects
		if (!isTimelineObjTriCasterME(tlObject.content) || !this.meNames.has(mapping.name as TriCasterMixEffectName)) return
		this.deepApplyToExtendedState(mixEffects[mapping.name], tlObject.content.me, tlObject)
		const mixEffect = tlObject.content.me
		if ('layers' in mixEffect && Object.keys(mixEffect.layers ?? []).length) {
			mixEffects[mapping.name].isInEffectMode = { value: true }
		}
	}

	private applyDskState(
		resultState: WithContext<TriCasterState>,
		tlObject: Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>,
		mapping: MappingTricasterDSK
	) {
		const mainKeyers = resultState.mixEffects['main']
		if (!isTimelineObjTriCasterDSK(tlObject.content) || !mainKeyers) {
			return
		}
		this.deepApplyToExtendedState(mainKeyers[mapping.name], tlObject.content.keyer, tlObject)
	}

	private applyInputState(
		resultState: WithContext<TriCasterState>,
		tlObject: Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>,
		mapping: MappingTricasterINPUT
	) {
		const inputs = resultState.inputs
		if (!isTimelineObjTriCasterInput(tlObject.content) || !this.inputNames.has(mapping.name as TriCasterInputName))
			return
		this.deepApplyToExtendedState(inputs[mapping.name], tlObject.content.input, tlObject)
	}

	private applyAudioChannelState(
		resultState: WithContext<TriCasterState>,
		tlObject: Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>,
		mapping: MappingTricasterAUDIOCHANNEL
	) {
		const audioChannels = resultState.audioChannels
		if (
			!isTimelineObjTriCasterAudioChannel(tlObject.content) ||
			!this.audioChannelNames.has(mapping.name as TriCasterAudioChannelName)
		)
			return
		this.deepApplyToExtendedState(audioChannels[mapping.name], tlObject.content.audioChannel, tlObject)
	}

	private applyMixOutputState(
		resultState: WithContext<TriCasterState>,
		tlObject: Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>,
		mapping: MappingTricasterMIXOUTPUT
	) {
		if (
			!isTimelineObjTriCasterMixOutput(tlObject.content) ||
			!this.mixOutputNames.has(mapping.name as TriCasterMixOutputName)
		)
			return
		resultState.mixOutputs[mapping.name] = {
			source: {
				value: tlObject.content.source,
				timelineObjId: tlObject.id,
				temporalPriority: tlObject.content.temporalPriority,
			},
			meClean:
				tlObject.content.meClean !== undefined
					? {
							value: tlObject.content.meClean,
							timelineObjId: tlObject.id,
							temporalPriority: tlObject.content.temporalPriority,
					  }
					: resultState.mixOutputs[mapping.name]?.meClean,
		}
	}

	private applyMatrixOutputState(
		resultState: WithContext<TriCasterState>,
		tlObject: Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>,
		mapping: MappingTricasterMATRIXOUTPUT
	) {
		if (
			!isTimelineObjTriCasterMatrixOutput(tlObject.content) ||
			!this.matrixOutputNames.has(mapping.name as TriCasterMatrixOutputName)
		)
			return

		resultState.matrixOutputs[mapping.name] = {
			source: {
				value: tlObject.content.source,
				timelineObjId: tlObject.id,
				temporalPriority: tlObject.content.temporalPriority,
			},
		}
	}

	/**
	 * Deeply applies primitive properties from `source` to existing properties of `target` (in place)
	 */
	private deepApplyToExtendedState<T>(
		target: WithContext<T>,
		source: DeepPartial<T>,
		timelineObject: Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>
	): void {
		if (!isTimelineObjTriCaster(timelineObject.content)) return

		let key: keyof T
		for (key in source) {
			const sourceValue = source[key]
			if (typeof target !== 'object' || !(key in target) || sourceValue === undefined || sourceValue === null) continue

			const targetEntry = target[key as keyof WithContext<T>]
			if (isStateEntry(targetEntry)) {
				targetEntry.value = sourceValue
				targetEntry.timelineObjId = timelineObject.id
				targetEntry.temporalPriority = timelineObject.content.temporalPriority
			} else if (targetEntry && typeof targetEntry === 'object') {
				this.deepApplyToExtendedState(targetEntry as WithContext<T[keyof T]>, sourceValue as T[keyof T], timelineObject)
			}
		}
	}
}
