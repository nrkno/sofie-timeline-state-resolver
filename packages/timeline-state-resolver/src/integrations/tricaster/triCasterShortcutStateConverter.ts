import {
	TriCasterAudioChannelName,
	TriCasterDelegateName,
	TriCasterInputName,
	TriCasterKeyerName,
	TriCasterLayerName,
	TriCasterMatrixOutputName,
	TriCasterMixEffectName,
	TriCasterMixOutputName,
} from 'timeline-state-resolver-types'
import { ElementCompact, xml2js } from 'xml-js'
import {
	fillRecord,
	TriCasterMixEffectState,
	TriCasterAudioChannelState,
	TriCasterInputState,
	TriCasterKeyerState,
	TriCasterLayerState,
	TriCasterOutputState,
	TriCasterState,
	ExtendedState,
	wrapInExtendedState,
} from './triCasterStateDiffer'
import { CommandName, TriCasterGenericCommandName } from './triCasterCommands'

type ShortcutStates = {
	[key: string]: string | number
}

export class TriCasterShortcutStateConverter {
	constructor(
		private readonly resourceNames: {
			mixEffects: TriCasterMixEffectName[]
			inputs: TriCasterInputName[]
			audioChannels: TriCasterAudioChannelName[]
			layers: TriCasterLayerName[]
			keyers: TriCasterKeyerName[]
			mixOutputs: TriCasterMixOutputName[]
			matrixOutputs: TriCasterMatrixOutputName[]
		}
	) {}

	getTriCasterStateFromShortcutState(shortcutStatesXml: string): ExtendedState<TriCasterState> {
		const parsedStates = xml2js(shortcutStatesXml, { compact: true }) as ElementCompact
		const shortcutStateElement = parsedStates.shortcut_states?.shortcut_state as ElementCompact | ElementCompact[]
		const shortcutStates = this.extractShortcutStates(shortcutStateElement)

		return {
			mixEffects: this.parseMixEffectsState(shortcutStates),
			inputs: this.parseInputsState(),
			mixOutputs: this.parseMixOutputsState(shortcutStates),
			matrixOutputs: this.parseMatrixOutputsState(shortcutStates),
			audioChannels: this.parseAudioChannelsState(shortcutStates),
			isRecording: { value: this.parseNumber(shortcutStates, [], CommandName.RECORD_TOGGLE) === 1 },
			isStreaming: { value: this.parseNumber(shortcutStates, [], CommandName.STREAMING_TOGGLE) === 1 },
		}
	}

	private extractShortcutStates(shortcutState: ElementCompact | ElementCompact[]): ShortcutStates {
		if (Array.isArray(shortcutState)) {
			const shortcutStatesRecord = shortcutState.reduce<ShortcutStates>((accumulator, newValue) => {
				const name = newValue._attributes?.name
				const value = newValue._attributes?.value
				if (name !== undefined && value !== undefined) {
					accumulator[name] = value
				}
				return accumulator
			}, {})
			return shortcutStatesRecord
		}
		if (typeof shortcutState === 'object') {
			const name = shortcutState._attributes?.name
			const value = shortcutState._attributes?.value
			if (name !== undefined && value !== undefined) {
				return { [name]: value }
			}
		}
		throw new Error('Shortcut state parsing error')
	}

	private parseMixEffectsState(
		shortcutStates: ShortcutStates
	): ExtendedState<Record<TriCasterMixEffectName, TriCasterMixEffectState>> {
		return fillRecord(
			this.resourceNames.mixEffects,
			(mixEffectName): ExtendedState<TriCasterMixEffectState> => ({
				...wrapInExtendedState({
					programInput: this.parseString(
						shortcutStates,
						[`${mixEffectName}_a`],
						CommandName.ROW_NAMED_INPUT
					)?.toLowerCase(),
					previewInput: this.parseString(
						shortcutStates,
						[`${mixEffectName}_b`],
						CommandName.ROW_NAMED_INPUT
					)?.toLowerCase(),
					delegates: this.parseDelegate(shortcutStates, mixEffectName + CommandName.DELEGATE),
				}),
				...{
					layers: this.parseLayersState(shortcutStates, mixEffectName),
					keyers: this.parseKeyersState(shortcutStates, mixEffectName),
				},
			})
		)
	}

	private parseLayersState(
		shortcutStates: ShortcutStates,
		mixEffectName: string
	): ExtendedState<Record<TriCasterLayerName, TriCasterLayerState>> {
		return fillRecord(
			this.resourceNames.layers,
			(layerName): ExtendedState<TriCasterLayerState> =>
				wrapInExtendedState({
					input: this.parseString(shortcutStates, [mixEffectName, layerName], CommandName.ROW_NAMED_INPUT),
				})
		)
	}

	private parseKeyersState(
		shortcutStates: ShortcutStates,
		mixEffectName: string
	): ExtendedState<Record<TriCasterKeyerName, TriCasterKeyerState>> {
		return fillRecord(
			this.resourceNames.keyers,
			(keyerName): ExtendedState<TriCasterKeyerState> =>
				wrapInExtendedState({
					input: this.parseString(shortcutStates, [mixEffectName, keyerName], CommandName.SELECT_NAMED_INPUT),
					onAir: this.parseNumber(shortcutStates, [mixEffectName, keyerName], CommandName.VALUE) !== 0,
				})
		)
	}

	private parseInputsState(): ExtendedState<Record<TriCasterInputName, TriCasterInputState>> {
		return fillRecord(
			this.resourceNames.inputs,
			(): ExtendedState<TriCasterInputState> =>
				wrapInExtendedState({
					videoSource: undefined,
				})
		)
	}

	private parseMixOutputsState(
		shortcutStates: ShortcutStates
	): ExtendedState<Record<TriCasterMixOutputName, TriCasterOutputState>> {
		return fillRecord(
			this.resourceNames.mixOutputs,
			(mixOutputName): ExtendedState<TriCasterOutputState> =>
				wrapInExtendedState({
					source: this.parseString(shortcutStates, [mixOutputName], CommandName.OUTPUT_SOURCE)?.toLowerCase(),
				})
		)
	}

	private parseMatrixOutputsState(
		shortcutStates: ShortcutStates
	): ExtendedState<Record<TriCasterMatrixOutputName, TriCasterOutputState>> {
		return fillRecord(
			this.resourceNames.matrixOutputs,
			(matrixOutputName): ExtendedState<TriCasterOutputState> => ({
				source: wrapInExtendedState(
					this.parseString(shortcutStates, [matrixOutputName], CommandName.CROSSPOINT_SOURCE)?.toLowerCase()
				),
			})
		)
	}

	private parseAudioChannelsState(
		shortcutStates: ShortcutStates
	): ExtendedState<Record<TriCasterAudioChannelName, TriCasterAudioChannelState>> {
		return fillRecord(
			this.resourceNames.audioChannels,
			(audioChannelName): ExtendedState<TriCasterAudioChannelState> =>
				wrapInExtendedState({
					volume: this.parseNumber(shortcutStates, [audioChannelName], CommandName.VOLUME),
					isMuted: this.parseBoolean(shortcutStates, [audioChannelName], CommandName.MUTE),
				})
		)
	}

	private parseString(
		shortcutStates: ShortcutStates,
		shortcutTarget: string[],
		command: TriCasterGenericCommandName<string>
	): string | undefined {
		const value = shortcutStates[this.joinShortcutName(shortcutTarget, command)]
		return value?.toString()
	}

	private parseNumber(
		shortcutStates: ShortcutStates,
		shortcutTarget: string[],
		command: TriCasterGenericCommandName<number>
	): number | undefined {
		const value = shortcutStates[this.joinShortcutName(shortcutTarget, command)]
		if (value === undefined) return undefined
		return typeof value === 'number' ? value : parseFloat(value)
	}

	private parseBoolean(
		shortcutStates: ShortcutStates,
		shortcutTarget: string[],
		command: TriCasterGenericCommandName<boolean>
	): boolean | undefined {
		const value = shortcutStates[this.joinShortcutName(shortcutTarget, command)]
		return value?.toString()?.toLowerCase() === 'true'
	}

	private joinShortcutName(shortcutTarget: string[], command: string): string {
		return shortcutTarget.join('_') + command
	}

	private parseDelegate(shortcutStates: ShortcutStates, name: string): TriCasterDelegateName[] | undefined {
		const value = shortcutStates[name]
		if (typeof value !== 'string') return undefined
		return value?.split('|').map((delegate) => delegate.split('_')[1] as TriCasterDelegateName)
	}
}
