import { TimelineState } from 'superfly-timeline'
import {
	MappingTriCaster,
	MappingTriCasterType,
	TSRTimelineObjBase,
	isTimelineObjTriCasterAudioChannel,
	isTimelineObjTriCasterDSK,
	isTimelineObjTriCasterME,
	isTimelineObjTriCasterMixOutput,
	MappingTriCasterMixEffect,
	MappingTriCasterDownStreamKeyer,
	MappingTriCasterAudioChannel,
	MappingTriCasterMixOutput,
	TriCasterAudioChannelName,
	TriCasterMixEffectName,
	TriCasterMixOutputName,
	MappingTriCasterInput,
	isTimelineObjTriCasterInput,
	TriCasterInputName,
	isTimelineObjTriCasterMatrixOutput,
	TriCasterMatrixOutputName,
	MappingTriCasterMatrixOutput,
	TimelineObjTriCasterBase,
} from 'timeline-state-resolver-types'
import * as _ from 'underscore'
import {
	ExtendedState,
	isEntry,
	MappingsTriCaster,
	TriCasterAudioChannelState,
	TriCasterInputState,
	TriCasterMixEffectState,
	TriCasterState,
} from './triCasterStateDiffer'

type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] }

export class TriCasterTimelineStateConverter {
	private meNames: Set<TriCasterMixEffectName>
	private inputNames: Set<TriCasterInputName>
	private audioChannelNames: Set<TriCasterAudioChannelName>
	private mixOutputNames: Set<TriCasterMixOutputName>
	private matrixOutputNames: Set<TriCasterMatrixOutputName>

	constructor(
		private readonly getDefaultState: (mappings: MappingsTriCaster) => ExtendedState<TriCasterState>,
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
		timelineState: TimelineState,
		newMappings: MappingsTriCaster
	): ExtendedState<TriCasterState> {
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

	private sortLayers(state: TimelineState) {
		return _.map(state.layers, (tlObject, layerName) => ({
			layerName,
			tlObject: tlObject as unknown as TSRTimelineObjBase,
		})).sort((a, b) => a.layerName.localeCompare(b.layerName))
	}

	private applyMixEffectState(
		resultState: ExtendedState<TriCasterState>,
		tlObject: TSRTimelineObjBase,
		mapping: MappingTriCasterMixEffect
	) {
		const mixEffects = resultState.mixEffects
		if (!isTimelineObjTriCasterME(tlObject) || !this.meNames.has(mapping.name)) return
		this.deepApplyToExtendedState<TriCasterMixEffectState>(mixEffects[mapping.name], tlObject.content.me, tlObject)
		const mixEffect = tlObject.content.me
		if ('layers' in mixEffect && Object.keys(mixEffect.layers ?? []).length) {
			mixEffects[mapping.name].isInEffectMode = { value: true }
		}
	}

	private applyDskState(
		resultState: ExtendedState<TriCasterState>,
		tlObject: TSRTimelineObjBase,
		mapping: MappingTriCasterDownStreamKeyer
	) {
		const mainKeyers = resultState.mixEffects['main']
		if (!isTimelineObjTriCasterDSK(tlObject) || !mainKeyers) {
			return
		}
		this.deepApplyToExtendedState(mainKeyers[mapping.name], tlObject.content.keyer, tlObject)
	}

	private applyInputState(
		resultState: ExtendedState<TriCasterState>,
		tlObject: TSRTimelineObjBase,
		mapping: MappingTriCasterInput
	) {
		const inputs = resultState.inputs
		if (!isTimelineObjTriCasterInput(tlObject) || !this.inputNames.has(mapping.name)) return
		this.deepApplyToExtendedState<TriCasterInputState>(inputs[mapping.name], tlObject.content.input, tlObject)
	}

	private applyAudioChannelState(
		resultState: ExtendedState<TriCasterState>,
		tlObject: TSRTimelineObjBase,
		mapping: MappingTriCasterAudioChannel
	) {
		const audioChannels = resultState.audioChannels
		if (!isTimelineObjTriCasterAudioChannel(tlObject) || !this.audioChannelNames.has(mapping.name)) return
		this.deepApplyToExtendedState<TriCasterAudioChannelState>(
			audioChannels[mapping.name],
			tlObject.content.audioChannel,
			tlObject
		)
	}

	private applyMixOutputState(
		resultState: ExtendedState<TriCasterState>,
		tlObject: TSRTimelineObjBase,
		mapping: MappingTriCasterMixOutput
	) {
		if (!isTimelineObjTriCasterMixOutput(tlObject) || !this.mixOutputNames.has(mapping.name)) return
		resultState.mixOutputs[mapping.name] = {
			source: {
				value: tlObject.content.source,
				timelineObjectId: tlObject.id,
				temporalPriority: tlObject.content.temporalPriority,
			},
		}
	}

	private applyMatrixOutputState(
		resultState: ExtendedState<TriCasterState>,
		tlObject: TSRTimelineObjBase,
		mapping: MappingTriCasterMatrixOutput
	) {
		if (!isTimelineObjTriCasterMatrixOutput(tlObject) || !this.matrixOutputNames.has(mapping.name)) return
		resultState.matrixOutputs[mapping.name] = {
			source: {
				value: tlObject.content.source,
				timelineObjectId: tlObject.id,
				temporalPriority: tlObject.content.temporalPriority,
			},
		}
	}

	/**
	 * Deeply applies primitive properties from `source` to existing properties of `target` (in place)
	 */
	private deepApplyToExtendedState<T>(
		target: ExtendedState<T>,
		source: DeepPartial<T>,
		timelineObject: TimelineObjTriCasterBase
	): void {
		let key: keyof T
		for (key in source) {
			if (typeof target !== 'object' || !(key in target)) {
				continue
			}

			const t = target[key as keyof ExtendedState<T>]
			if (typeof t === 'object' && !isEntry(t)) {
				// @ts-ignore
				this.deepApplyToExtendedState(t, source[key] as DeepPartial<typeof t>, timelineObject)
			} else {
				// @ts-ignore
				target[key] = {
					value: source[key] as typeof t,
					timelineObjectId: timelineObject.id,
					temporalPriority: timelineObject.content.temporalPriority,
				}
			}
		}
	}
}
