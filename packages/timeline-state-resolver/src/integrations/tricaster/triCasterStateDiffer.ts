import {
	TriCasterLayer,
	TriCasterKeyer,
	TriCasterKeyerName,
	TriCasterLayerName,
	TriCasterInputName,
	TriCasterAudioChannelName,
	TriCasterMixEffectName,
	TriCasterMatrixOutputName,
	TriCasterSourceName,
	TriCasterMixOutputName,
	TriCasterAudioChannel,
	TriCasterInput,
	TriCasterMixEffectInEffectMode,
	TriCasterMixEffectWithPreview,
	TriCasterMixEffectInMixMode,
	SomeMappingTricaster,
	MappingTricasterType,
	Mappings,
	Mapping,
} from 'timeline-state-resolver-types'
import {
	TriCasterCommand,
	CommandName,
	TriCasterCommandWithContext,
	TriCasterGenericCommandName,
	TriCasterGenericCommand,
} from './triCasterCommands'
import { TriCasterShortcutStateConverter } from './triCasterShortcutStateConverter'
import { TriCasterTimelineStateConverter } from './triCasterTimelineStateConverter'
import { TriCasterInfo } from './triCasterConnection'
import _ = require('underscore')

const BLACK_INPUT = 'black'
const DEFAULT_TRANSITION_DURATION = 1 // in seconds
const A_ROW_SUFFIX = '_a' // the Program row
const B_ROW_SUFFIX = '_b' // the Preview row
const MATRIX_OUTPUTS_COUNT = 8 // @todo: hardcoded for now; only a few models have this feature; how to query for it?
const DEFAULT_TEMPORAL_PRIORITY = 0

export type RequiredDeep<T> = T extends object
	? {
			[K in keyof T]-?: RequiredDeep<T[K]>
	  }
	: T

export type RequireDeepExcept<T, K extends keyof T> = RequiredDeep<Omit<T, K>> & Pick<T, K>

type CommandGeneratorFunction<T, K extends keyof T> = (args: {
	entry: Readonly<NonNullable<WithContext<T[K]>>>
	oldEntry: Readonly<WithContext<T[K]>> | undefined
	state: Readonly<NonNullable<WithContext<T>>>
	oldState: Readonly<WithContext<T>> | undefined
	target: string
}) => TriCasterCommandWithContext[] | null

type CommandGeneratorValue<T, K extends keyof T> =
	| CommandGenerator<T[K]>
	| CommandGeneratorFunction<T, K>
	| TriCasterGenericCommandName<T[K]>
	| null

type CommandGenerator<T> = {
	[K in keyof T]-?: RequiredDeep<T>[K] extends object
		? CommandGeneratorValue<T, K>
		: TriCasterGenericCommandName<T[K]> | CommandGeneratorFunction<NonNullable<T>, K> | null
} & { $target?: string }

export interface TriCasterState {
	mixEffects: Record<TriCasterMixEffectName, TriCasterMixEffectState>
	audioChannels: Record<TriCasterAudioChannelName, TriCasterAudioChannelState>
	inputs: Record<TriCasterInputName, TriCasterInputState>
	isRecording: boolean
	isStreaming: boolean
	mixOutputs: Record<TriCasterMixOutputName, TriCasterMixOutputState>
	matrixOutputs: Record<TriCasterMatrixOutputName, TriCasterMatrixOutputState>
}

export interface StateEntry<T extends any[] | string | number | boolean> {
	value: T
	timelineObjId?: string
	temporalPriority?: number
}

export type WithContext<T> = T extends any[] | string | number | boolean
	? StateEntry<T>
	: {
			[K in keyof T]: WithContext<T[K]>
	  }

export type TriCasterMixEffectState = Partial<
	Omit<TriCasterMixEffectWithPreview & TriCasterMixEffectInEffectMode, 'transitionEffect'> & TriCasterMixEffectInMixMode
> & { isInEffectMode?: boolean }

export type CompleteTriCasterMixEffectState = RequiredDeep<Omit<TriCasterMixEffectState, 'layers' | 'previewInput'>> &
	Pick<TriCasterMixEffectInEffectMode, 'layers'> &
	Partial<Pick<TriCasterMixEffectWithPreview, 'previewInput'>>

export type TriCasterLayerState = TriCasterLayer
export type TriCasterKeyerState = TriCasterKeyer

export type CompleteTriCasterState = RequiredDeep<Omit<TriCasterState, 'mixEffects' | 'inputs'>> & {
	mixEffects: Record<TriCasterMixEffectName, CompleteTriCasterMixEffectState>
	inputs: Record<TriCasterInputName, CompleteTriCasterInputState>
}

export type TriCasterAudioChannelState = TriCasterAudioChannel
export type TriCasterInputState = TriCasterInput

export type CompleteTriCasterInputState = RequireDeepExcept<TriCasterInputState, 'videoSource'>

export interface TriCasterMixOutputState {
	source?: string
	meClean?: boolean
}

export interface TriCasterMatrixOutputState {
	source?: string
}

type TriCasterStateDifferOptions = TriCasterInfo

interface TriCasterControlledResourceNames {
	mixEffects: Set<TriCasterMixEffectName>
	inputs: Set<TriCasterInputName>
	audioChannels: Set<TriCasterAudioChannelName>
	mixOutputs: Set<TriCasterMixOutputName>
	matrixOutputs: Set<TriCasterMatrixOutputName>
}
export type MappingsTriCaster = Mappings<SomeMappingTricaster>

export class TriCasterStateDiffer {
	private readonly inputCount: number
	private readonly meNames: TriCasterMixEffectName[]
	private readonly dskNames: TriCasterKeyerName[]
	private readonly layerNames: TriCasterLayerName[] = ['a', 'b', 'c', 'd']
	private readonly inputNames: TriCasterInputName[]
	private readonly audioChannelNames: TriCasterAudioChannelName[]
	private readonly mixOutputNames: TriCasterMixOutputName[]
	private readonly matrixOutputNames: TriCasterMatrixOutputName[]

	private readonly commandGenerator: CommandGenerator<TriCasterState>

	public readonly timelineStateConverter: TriCasterTimelineStateConverter
	public readonly shortcutStateConverter: TriCasterShortcutStateConverter

	constructor(options: TriCasterStateDifferOptions) {
		this.inputCount = options.inputCount
		this.meNames = ['main', ...fillArray<TriCasterMixEffectName>(options.meCount, (i) => `v${i + 1}`)]
		this.dskNames = fillArray<TriCasterKeyerName>(options.dskCount, (i) => `dsk${i + 1}`)

		this.inputNames = fillArray<TriCasterInputName>(this.inputCount, (i) => `input${i + 1}`)
		const extraAudioChannelNames: TriCasterAudioChannelName[] = [
			...fillArray<TriCasterSourceName>(options.ddrCount, (i) => `ddr${i + 1}`),
			'sound',
			'master',
		]
		this.audioChannelNames = [...extraAudioChannelNames, ...this.inputNames]
		this.mixOutputNames = fillArray<TriCasterMixOutputName>(options.outputCount, (i) => `mix${i + 1}`)
		this.matrixOutputNames = fillArray<TriCasterMatrixOutputName>(MATRIX_OUTPUTS_COUNT, (i) => `out${i + 1}`)
		this.commandGenerator = this.getGenerator()

		const resourceNames = {
			mixEffects: this.meNames,
			inputs: this.inputNames,
			audioChannels: this.audioChannelNames,
			layers: this.layerNames,
			keyers: this.dskNames,
			mixOutputs: this.mixOutputNames,
			matrixOutputs: this.matrixOutputNames,
		}

		this.timelineStateConverter = new TriCasterTimelineStateConverter(
			(mappings) => this.getDefaultState(mappings),
			resourceNames
		)
		this.shortcutStateConverter = new TriCasterShortcutStateConverter(resourceNames)
	}

	getDefaultState(mappings: MappingsTriCaster): WithContext<CompleteTriCasterState> {
		const controlledResources = this.getControlledResourcesNames(mappings)
		return wrapStateInContext<CompleteTriCasterState>({
			mixEffects: fillRecord(
				Array.from(controlledResources.mixEffects),
				(meName): CompleteTriCasterMixEffectState => ({
					programInput: BLACK_INPUT,
					previewInput: undefined,
					isInEffectMode: false,
					transitionEffect: 'cut',
					transitionDuration: DEFAULT_TRANSITION_DURATION,
					layers: meName !== 'main' ? fillRecord(this.layerNames, () => this.getDefaultLayerState()) : {},
					keyers: fillRecord(this.dskNames, () => this.getDefaultKeyerState()),
					delegates: ['background'],
				})
			),
			inputs: fillRecord(
				Array.from(controlledResources.inputs),
				(): CompleteTriCasterInputState => ({ videoSource: undefined, videoActAsAlpha: false })
			),
			audioChannels: fillRecord(
				Array.from(controlledResources.audioChannels),
				(): RequiredDeep<TriCasterAudioChannelState> => ({ volume: 0, isMuted: true })
			),
			isRecording: false,
			isStreaming: false,
			mixOutputs: fillRecord(
				Array.from(controlledResources.mixOutputs),
				(): RequiredDeep<TriCasterMixOutputState> => ({ source: 'program', meClean: false })
			),
			matrixOutputs: fillRecord(
				Array.from(controlledResources.matrixOutputs),
				(): RequiredDeep<TriCasterMatrixOutputState> => ({ source: 'mix1' })
			),
		})
	}

	private getControlledResourcesNames(mappings: MappingsTriCaster): TriCasterControlledResourceNames {
		const result: TriCasterControlledResourceNames = {
			mixEffects: new Set(),
			inputs: new Set(),
			audioChannels: new Set(),
			mixOutputs: new Set(),
			matrixOutputs: new Set(),
		}
		for (const mapping of Object.values<Mapping<SomeMappingTricaster>>(mappings)) {
			switch (mapping.options.mappingType) {
				case MappingTricasterType.ME:
					result.mixEffects.add(mapping.options.name as TriCasterMixEffectName)
					break
				case MappingTricasterType.DSK:
					// these require full control of the Main switcher - not ideal, the granularity will probably be improved
					result.mixEffects.add('main')
					break
				case MappingTricasterType.INPUT:
					result.inputs.add(mapping.options.name as TriCasterInputName)
					break
				case MappingTricasterType.AUDIOCHANNEL:
					result.audioChannels.add(mapping.options.name as TriCasterAudioChannelName)
					break
				case MappingTricasterType.MIXOUTPUT:
					result.mixOutputs.add(mapping.options.name as TriCasterMixOutputName)
					break
				case MappingTricasterType.MATRIXOUTPUT:
					result.matrixOutputs.add(mapping.options.name as TriCasterMatrixOutputName)
					break
			}
		}
		return result
	}

	private getDefaultLayerState(): RequiredDeep<TriCasterLayerState> {
		return {
			input: BLACK_INPUT,
			positioningAndCropEnabled: false,
			position: { x: 0, y: 0 },
			scale: { x: 1, y: 1 },
			rotation: { x: 0, y: 0, z: 0 },
			crop: { left: 0, right: 0, up: 0, down: 0 },
			feather: 0,
		}
	}

	private getDefaultKeyerState(): RequiredDeep<TriCasterKeyerState> {
		return {
			onAir: false,
			transitionEffect: 'cut',
			transitionDuration: DEFAULT_TRANSITION_DURATION,
			...this.getDefaultLayerState(),
		}
	}

	getCommandsToAchieveState(
		newState: WithContext<TriCasterState>,
		oldState: WithContext<TriCasterState> | undefined
	): TriCasterCommandWithContext[] {
		const commands: TriCasterCommandWithContext[] = []
		this.recursivelyGenerateCommands<TriCasterState>(commands, this.commandGenerator, newState, oldState, '')
		return commands.sort((a, b) => a.temporalPriority - b.temporalPriority) // is this fast enough? consider bucket sort
	}

	private getGenerator(): CommandGenerator<TriCasterState> {
		return {
			mixEffects: fillRecord(this.meNames, (meName) => this.getMixEffectGenerator(meName)),
			inputs: fillRecord(this.inputNames, (inputName) => ({ $target: inputName, ...this.inputCommandGenerator })),
			audioChannels: fillRecord(this.audioChannelNames, (inputName) => ({
				$target: inputName,
				...this.audioCommandGenerator,
			})),
			isRecording: ({ entry }) => [
				wrapInContext({ name: CommandName.RECORD_TOGGLE, value: entry.value ? 1 : 0 }, entry),
			],
			isStreaming: ({ entry }) => [
				wrapInContext({ name: CommandName.STREAMING_TOGGLE, value: entry.value ? 1 : 0 }, entry),
			],
			mixOutputs: fillRecord(this.mixOutputNames, (mixOutputName) => ({
				$target: mixOutputName,
				...this.mixOutputCommandGenerator,
			})),
			matrixOutputs: fillRecord(this.matrixOutputNames, (matrixOutputName) => ({
				$target: matrixOutputName,
				...this.matrixOutputCommandGenerator,
			})),
		}
	}

	private inputCommandGenerator: CommandGenerator<TriCasterInputState> = {
		videoSource: CommandName.VIDEO_SOURCE,
		videoActAsAlpha: CommandName.VIDEO_ACT_AS_ALPHA,
	}

	private audioCommandGenerator: CommandGenerator<TriCasterAudioChannelState> = {
		volume: CommandName.VOLUME,
		isMuted: CommandName.MUTE,
	}

	private mixOutputCommandGenerator: CommandGenerator<TriCasterMixOutputState> = {
		source: CommandName.OUTPUT_SOURCE,
		meClean: ({ entry, target }) => {
			const outputIndex = Number(target.match(/\d+/)?.[0]) - 1
			return [
				wrapInContext(
					{ name: CommandName.SET_OUTPUT_CONFIG_VIDEO_SOURCE, output_index: outputIndex, me_clean: entry.value },
					entry
				),
			]
		},
	}

	private matrixOutputCommandGenerator: CommandGenerator<TriCasterMatrixOutputState> = {
		source: CommandName.CROSSPOINT_SOURCE,
	}

	private keyerEffectCommandGenerator: CommandGeneratorFunction<TriCasterKeyerState, 'transitionEffect'> =
		this.effectCommandGenerator(CommandName.SELECT_INDEX)

	private mixEffectEffectCommandGenerator: CommandGeneratorFunction<TriCasterMixEffectState, 'transitionEffect'> =
		this.effectCommandGenerator(CommandName.SET_MIX_EFFECT_BIN_INDEX)

	private effectCommandGenerator(
		selectCommand: TriCasterGenericCommandName<number>
	): CommandGeneratorFunction<TriCasterKeyerState | TriCasterMixEffectState, 'transitionEffect'> {
		return ({ entry, target, state }) => {
			if (entry.value === 'cut') {
				return []
			}
			const value = entry.value === 'fade' ? 0 : entry.value
			return [
				wrapInContext({ name: selectCommand, target, value }, entry),
				wrapInContext(
					{ name: CommandName.SPEED, target, value: state.transitionDuration?.value ?? DEFAULT_TRANSITION_DURATION },
					entry
				),
			]
		}
	}

	private durationCommandGenerator: CommandGeneratorFunction<
		TriCasterMixEffectState | TriCasterKeyerState,
		'transitionDuration'
	> = ({ entry, state, oldState, target }) => {
		if (!oldState || state.transitionEffect?.value !== oldState.transitionEffect?.value) {
			return []
		}
		return [wrapInContext({ name: CommandName.SPEED, target, value: entry.value }, entry)]
	}

	private layerCommandGenerator: CommandGenerator<TriCasterLayerState> = {
		position: {
			x: CommandName.POSITION_X,
			y: CommandName.POSITION_Y,
		},
		scale: {
			x: CommandName.SCALE_X,
			y: CommandName.SCALE_Y,
		},
		rotation: {
			x: CommandName.ROTATION_X,
			y: CommandName.ROTATION_Y,
			z: CommandName.ROTATION_Z,
		},
		crop: {
			left: CommandName.CROP_LEFT_VALUE,
			right: CommandName.CROP_RIGHT_VALUE,
			up: CommandName.CROP_UP_VALUE,
			down: CommandName.CROP_DOWN_VALUE,
		},
		feather: CommandName.FEATHER_VALUE,
		positioningAndCropEnabled: CommandName.POSITIONING_AND_CROP_ENABLE,
		input: CommandName.ROW_NAMED_INPUT,
	}

	private keyerCommandGenerator: CommandGenerator<TriCasterKeyerState> = {
		transitionEffect: this.keyerEffectCommandGenerator,
		transitionDuration: this.durationCommandGenerator,
		...this.layerCommandGenerator,
		input: CommandName.SELECT_NAMED_INPUT,
		onAir: ({ state, target, entry }) => {
			if (state.transitionEffect?.value === 'cut') {
				return [wrapInContext({ name: CommandName.VALUE, target, value: entry.value ? 1 : 0 }, entry)]
			}
			// @todo: transitions on keyers are dangerous when mappings change on the fly and
			// an uncontrolled ME becomes controlled (the state might get flipped)
			// fixing it is out of scope for now
			return [wrapInContext({ name: CommandName.AUTO, target }, entry)]
		},
	}

	private getMixEffectGenerator(
		meName: TriCasterMixEffectName
	): CommandGeneratorFunction<TriCasterState['mixEffects'], TriCasterMixEffectName> {
		return ({ entry, oldEntry, target }) => {
			const commands: TriCasterCommandWithContext[] = []
			this.recursivelyGenerateCommands<TriCasterMixEffectState>(
				commands,
				{
					$target: meName,
					isInEffectMode: null,
					transitionEffect: this.mixEffectEffectCommandGenerator,
					transitionDuration: this.durationCommandGenerator,
					delegates: this.delegateCommandGenerator,
					keyers: fillRecord(this.dskNames, (name) => ({ $target: name, ...this.keyerCommandGenerator })),
					layers: null,
					previewInput: !entry.isInEffectMode?.value ? this.previewInputCommandGenerator : null,
					programInput: !entry.isInEffectMode?.value ? this.programInputCommandGenerator : null,
				},
				entry,
				oldEntry,
				target
			)
			if (entry.isInEffectMode?.value && entry.layers) {
				this.recursivelyGenerateCommands<Partial<Record<TriCasterLayerName, TriCasterLayerState>>>(
					commands,
					fillRecord(this.layerNames, (name) => ({
						$target: name,
						...this.layerCommandGenerator,
					})),
					entry.layers,
					entry.isInEffectMode.value !== oldEntry?.isInEffectMode?.value ? undefined : oldEntry?.layers,
					meName
				)
			}
			return commands
		}
	}

	private delegateCommandGenerator: CommandGeneratorFunction<TriCasterMixEffectState, 'delegates'> = ({
		entry,
		oldEntry,
		target,
	}) => {
		const newValue = [...entry.value].sort()
		const oldValue = oldEntry?.value ? [...oldEntry.value].sort() : []
		if (_.isEqual(newValue, oldValue)) return null
		const combinedValue = newValue.map((delegateName) => `${target}_${delegateName}`).join('|')
		return [wrapInContext({ name: CommandName.DELEGATE, target, value: combinedValue }, entry)]
	}

	private previewInputCommandGenerator: CommandGeneratorFunction<TriCasterMixEffectState, 'previewInput'> = ({
		entry,
		state,
		target,
	}) => {
		if (state.transitionEffect?.value !== 'cut') {
			return null
		}
		return [
			wrapInContext({ name: CommandName.ROW_NAMED_INPUT, value: entry.value, target: target + B_ROW_SUFFIX }, entry),
		]
	}

	private programInputCommandGenerator: CommandGeneratorFunction<TriCasterMixEffectState, 'programInput'> = ({
		entry,
		state,
		target,
	}) => {
		if (state.transitionEffect?.value === 'cut') {
			if (!state.previewInput?.value) {
				return [
					wrapInContext(
						{ name: CommandName.ROW_NAMED_INPUT, value: entry.value, target: target + B_ROW_SUFFIX },
						entry
					),
					wrapInContext({ name: CommandName.TAKE, target }, entry),
				]
			}
			return [
				wrapInContext({ name: CommandName.ROW_NAMED_INPUT, value: entry.value, target: target + A_ROW_SUFFIX }, entry),
			]
		}
		return [
			wrapInContext({ name: CommandName.ROW_NAMED_INPUT, value: entry.value, target: target + B_ROW_SUFFIX }, entry),
			wrapInContext({ name: CommandName.AUTO, target }, entry),
		]
	}

	private recursivelyGenerateCommands<T>(
		commandsOut: TriCasterCommandWithContext[],
		rootCommandGenerator: CommandGenerator<T>,
		state: WithContext<T>,
		oldState: WithContext<T> | undefined,
		target: string
	) {
		if (rootCommandGenerator.$target) {
			target += `${target ? '_' : ''}${rootCommandGenerator.$target}`
		}
		let key: keyof CommandGenerator<T> // this is safe only when rootCommandGenerator is exactly of type CommandGenerator<Y>
		for (key in rootCommandGenerator) {
			if (key === '$target') continue
			const generator = rootCommandGenerator[key] as CommandGeneratorValue<T, typeof key>
			const entry = state[key as keyof WithContext<T>]
			const oldEntry = oldState?.[key as keyof WithContext<T>]
			if (this.isEmpty(entry)) continue
			if (typeof generator === 'function') {
				if (this.isEqual(entry, oldEntry)) continue
				const generatedCommands = generator({
					entry: entry as NonNullable<WithContext<T[keyof T]>>,
					oldEntry: oldEntry as WithContext<T[keyof T]>,
					state: state as NonNullable<WithContext<T>>,
					oldState,
					target,
				})
				if (!generatedCommands) continue
				commandsOut.push(...generatedCommands)
			} else if (typeof generator === 'string') {
				if (!isStateEntry(entry) || this.isEqual(entry, oldEntry)) continue
				commandsOut.push(
					wrapInContext({ name: generator, value: entry.value, target } as TriCasterGenericCommand, entry)
				)
			} else if (generator) {
				this.recursivelyGenerateCommands(
					commandsOut,
					generator,
					entry as WithContext<T[keyof T]>,
					oldEntry as WithContext<T[keyof T]>,
					target
				)
			}
		}
	}

	private isEqual<T>(
		entry: WithContext<T>[keyof WithContext<T>],
		oldEntry: WithContext<T>[keyof WithContext<T>] | undefined
	) {
		return isStateEntry(entry) && isStateEntry(oldEntry) && entry.value === oldEntry.value
	}

	private isEmpty<T>(entry: WithContext<T>[keyof WithContext<T>]) {
		return (
			entry === undefined ||
			entry === null ||
			(isStateEntry(entry) && (entry.value === undefined || entry.value === null))
		)
	}
}

function fillArray<T>(length: number, mapFn: (index: number) => T): T[]
function fillArray<T>(length: number, value: T): T[]
function fillArray<T>(length: number, valueOrMapFn: T | ((index: number) => T)): T[] {
	return valueOrMapFn instanceof Function
		? Array.from({ length }, (_, i) => valueOrMapFn(i))
		: new Array(length).fill(valueOrMapFn)
}

export function fillRecord<T extends string, U>(keys: T[], mapFn: (key: T) => U): Record<T, U>
export function fillRecord<T extends string, U>(keys: T[], value: U): Record<T, U>
export function fillRecord<T extends string, U>(keys: T[], valueOrMapFn: U | ((key: T) => U)): Record<T, U> {
	return keys.reduce((accumulator, key) => {
		accumulator[key] = valueOrMapFn instanceof Function ? valueOrMapFn(key) : valueOrMapFn
		return accumulator
	}, {} as Record<T, U>)
}

export function wrapStateInContext<T extends object>(state: T): WithContext<T> {
	if (_.isObject(state) && !_.isArray(state)) {
		return _.mapObject(state, (value) => wrapStateInContext(value)) as WithContext<T>
	}
	return { value: state } as WithContext<T>
}

export function wrapInContext(command: TriCasterCommand, entry: StateEntry<any>): TriCasterCommandWithContext {
	return {
		command,
		context: '',
		timelineObjId: entry.timelineObjId ?? '',
		temporalPriority: entry.temporalPriority ?? DEFAULT_TEMPORAL_PRIORITY,
	}
}

export function isStateEntry(
	possibleEntry: WithContext<any> | WithContext<any>[keyof WithContext<any>]
): possibleEntry is StateEntry<any> {
	return possibleEntry && typeof possibleEntry === 'object' && 'value' in possibleEntry
}
