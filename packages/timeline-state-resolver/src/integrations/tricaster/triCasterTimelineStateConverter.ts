import { TimelineState } from 'superfly-timeline'
import {
	Mappings,
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
} from 'timeline-state-resolver-types'
import * as _ from 'underscore'
import { TriCasterState } from './triCasterStateDiffer'

type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] }

export class TriCasterTimelineStateConverter {
	private meNames: Set<TriCasterMixEffectName>
	private inputNames: Set<TriCasterInputName>
	private audioChannelNames: Set<TriCasterAudioChannelName>
	private mixOutputNames: Set<TriCasterMixOutputName>
	private matrixOutputNames: Set<TriCasterMatrixOutputName>

	constructor(
		private readonly getDefaultState: () => TriCasterState,
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
		newMappings: Mappings,
		deviceId: string
	): TriCasterState {
		const resultState = this.getDefaultState()
		const sortedLayers = this.sortLayers(timelineState)

		_.each(sortedLayers, ({ tlObject, layerName }) => {
			const mapping = newMappings[layerName] as MappingTriCaster | undefined
			if (!mapping || mapping.deviceId !== deviceId) {
				return
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
		})

		return resultState
	}

	private sortLayers(state: TimelineState) {
		return _.map(state.layers, (tlObject, layerName) => ({
			layerName,
			tlObject: tlObject as unknown as TSRTimelineObjBase,
		})).sort((a, b) => a.layerName.localeCompare(b.layerName))
	}

	private applyMixEffectState(
		resultState: TriCasterState,
		tlObject: TSRTimelineObjBase,
		mapping: MappingTriCasterMixEffect
	) {
		const mixEffects = resultState.mixEffects
		if (!isTimelineObjTriCasterME(tlObject) || !this.meNames.has(mapping.name)) return
		this.deepApply(mixEffects[mapping.name], tlObject.content.me)
		const mixEffect = tlObject.content.me
		if ('layers' in mixEffect && Object.keys(mixEffect.layers ?? []).length) {
			mixEffects[mapping.name].isInEffectMode = true
		}
	}

	private applyDskState(
		resultState: TriCasterState,
		tlObject: TSRTimelineObjBase,
		mapping: MappingTriCasterDownStreamKeyer
	) {
		const mainKeyers = resultState.mixEffects['main']
		if (!isTimelineObjTriCasterDSK(tlObject) || !mainKeyers) {
			return
		}
		this.deepApply(mainKeyers[mapping.name], tlObject.content.keyer)
	}

	private applyInputState(resultState: TriCasterState, tlObject: TSRTimelineObjBase, mapping: MappingTriCasterInput) {
		const inputs = resultState.inputs
		if (!isTimelineObjTriCasterInput(tlObject) || !this.inputNames.has(mapping.name)) return
		this.deepApply(inputs[mapping.name], tlObject.content.input)
	}

	private applyAudioChannelState(
		resultState: TriCasterState,
		tlObject: TSRTimelineObjBase,
		mapping: MappingTriCasterAudioChannel
	) {
		const audioChannels = resultState.audioChannels
		if (!isTimelineObjTriCasterAudioChannel(tlObject) || !this.audioChannelNames.has(mapping.name)) return
		this.deepApply(audioChannels[mapping.name], tlObject.content.audioChannel)
	}

	private applyMixOutputState(
		resultState: TriCasterState,
		tlObject: TSRTimelineObjBase,
		mapping: MappingTriCasterMixOutput
	) {
		if (!isTimelineObjTriCasterMixOutput(tlObject) || !this.mixOutputNames.has(mapping.name)) return
		resultState.mixOutputs[mapping.name] = { source: tlObject.content.source }
	}

	private applyMatrixOutputState(
		resultState: TriCasterState,
		tlObject: TSRTimelineObjBase,
		mapping: MappingTriCasterMatrixOutput
	) {
		if (!isTimelineObjTriCasterMatrixOutput(tlObject) || !this.matrixOutputNames.has(mapping.name)) return
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
