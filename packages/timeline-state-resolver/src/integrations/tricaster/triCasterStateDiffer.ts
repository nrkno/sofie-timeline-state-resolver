import {
	TriCasterLayer,
	TriCasterKeyer,
	TriCasterTransition,
	TriCasterMixEffect,
	TriCasterKeyerName,
	TriCasterLayerName,
	TriCasterInputName,
	TriCasterAudioChannelName,
	TriCasterMixEffectName,
	TriCasterSourceName,
	TriCasterDelegateName,
	TriCasterMixOutputName,
	TriCasterAudioChannel,
	TriCasterInput,
} from 'timeline-state-resolver-types'
import {
	TriCasterCommand,
	CommandName,
	TriCasterCommandWithContext,
	TriCasterGenericCommandName,
	TriCasterGenericCommand,
} from './triCasterCommands'
import { ExternalStateConverter } from './externalStateConverter'
import { TimelineStateConverter } from './timelineStateConverter'
import { TriCasterInfo } from './triCasterConnection'
import _ = require('underscore')

const BLACK_INPUT = 'black'

export type RequiredDeep<T> = T extends object
	? {
			[K in keyof T]-?: RequiredDeep<T[K]>
	  }
	: T

type CommandGeneratorFunction<T, K> = (args: {
	value: Readonly<T> // @todo: for safety wrap into NonNullable with TS 4.9
	oldValue: Readonly<T> | undefined
	state: Readonly<K>
	oldState: Readonly<K> | undefined
	target: string
}) => TriCasterCommand[] | null

type CommandGeneratorValue<T, K> =
	| CommandGenerator<T>
	| CommandGeneratorFunction<T, K>
	| TriCasterGenericCommandName<T>
	| null

type CommandGenerator<T> = {
	[K in keyof RequiredDeep<T>]: RequiredDeep<T>[K] extends object
		? CommandGeneratorValue<RequiredDeep<T>[K], RequiredDeep<T>>
		:
				| TriCasterGenericCommandName<RequiredDeep<T>[K]>
				| CommandGeneratorFunction<RequiredDeep<T>[K], RequiredDeep<T>>
				| null
} & { $target?: string }

export interface TriCasterState {
	mixEffects: Record<TriCasterMixEffectName, TriCasterMixEffectState>
	audioChannels: Record<TriCasterAudioChannelName, TriCasterAudioChannelState>
	inputs: Record<TriCasterInputName, TriCasterInputState>
	isRecording: boolean
	isStreaming: boolean
	outputs: Record<TriCasterMixOutputName, TriCasterMixOutputState>
}

export type TriCasterMixEffectState = TriCasterMixEffect & { isInEffectMode?: boolean }

export type CompleteTriCasterMixEffectState = RequiredDeep<Omit<TriCasterMixEffectState, 'layers' | 'previewInput'>> &
	Pick<TriCasterMixEffect, 'layers' | 'previewInput'>

export type TriCasterLayerState = TriCasterLayer
export type TriCasterKeyerState = TriCasterKeyer

export type CompleteTriCasterState = RequiredDeep<Omit<TriCasterState, 'mixEffects' | 'inputs'>> & {
	mixEffects: Record<TriCasterMixEffectName, CompleteTriCasterMixEffectState>
	inputs: Record<TriCasterInputName, CompleteTriCasterInputState>
}

export type TriCasterAudioChannelState = TriCasterAudioChannel
export type TriCasterInputState = TriCasterInput

export type CompleteTriCasterInputState = RequiredDeep<Omit<TriCasterInputState, 'videoSource'>> &
	Pick<TriCasterInputState, 'videoSource'>

export interface TriCasterMixOutputState {
	source?: string
}

type TriCasterStateDifferOptions = TriCasterInfo

export class TriCasterStateDiffer {
	private readonly inputCount: number
	private readonly meNames: TriCasterMixEffectName[]
	private readonly dskNames: TriCasterKeyerName[]
	private readonly layerNames: TriCasterLayerName[] = ['a', 'b', 'c', 'd']
	private readonly inputNames: TriCasterInputName[]
	private readonly audioChannelNames: TriCasterAudioChannelName[]
	private readonly mixOutputNames: TriCasterMixOutputName[]

	private readonly commandGenerator: CommandGenerator<TriCasterState>

	public readonly timelineStateConverter: TimelineStateConverter
	public readonly externalStateConverter: ExternalStateConverter

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
		this.commandGenerator = this.getGenerator()

		this.timelineStateConverter = new TimelineStateConverter(
			() => this.getDefaultState(),
			this.meNames,
			this.inputNames,
			this.audioChannelNames,
			this.mixOutputNames
		)
		this.externalStateConverter = new ExternalStateConverter(
			this.meNames,
			this.inputNames,
			this.audioChannelNames,
			this.layerNames,
			this.dskNames,
			this.mixOutputNames
		)
	}

	getDefaultState(): CompleteTriCasterState {
		return {
			mixEffects: fillRecord(
				this.meNames,
				(meName): CompleteTriCasterMixEffectState => ({
					programInput: BLACK_INPUT,
					previewInput: undefined,
					isInEffectMode: false,
					transition: { effect: 'cut', duration: 0 },
					layers: meName !== 'main' ? fillRecord(this.layerNames, () => this.getDefaultLayerState()) : {},
					keyers: fillRecord(this.dskNames, () => this.getDefaultKeyerState()),
					delegates: ['background'],
				})
			),
			inputs: fillRecord(
				this.inputNames,
				(): CompleteTriCasterInputState => ({ videoSource: undefined, videoActAsAlpha: false })
			),
			audioChannels: fillRecord(
				this.audioChannelNames,
				(): RequiredDeep<TriCasterAudioChannelState> => ({ volume: 0, isMuted: true })
			),
			isRecording: false,
			isStreaming: false,
			outputs: fillRecord(this.mixOutputNames, () => ({ source: 'program' })),
		}
	}

	private getDefaultLayerState(): RequiredDeep<TriCasterLayerState> {
		return {
			input: BLACK_INPUT,
			positioningAndCropEnabled: false,
			position: { x: 0, y: 0 },
			scale: { x: 100, y: 100 },
			rotation: { x: 0, y: 0, z: 0 },
			crop: { left: 0, right: 0, up: 0, down: 0 },
			feather: 0,
		}
	}

	private getDefaultKeyerState(): RequiredDeep<TriCasterKeyerState> {
		return {
			onAir: false,
			transition: { effect: 'cut', duration: 0 },
			...this.getDefaultLayerState(),
		}
	}

	getCommandsToAchieveState(newState: TriCasterState, oldState: TriCasterState): TriCasterCommandWithContext[] {
		const commands: TriCasterCommand[] = []
		this.recursivelyGenerateCommands(commands, this.commandGenerator, newState, oldState, '')
		const commandsWithContext: TriCasterCommandWithContext[] = commands.map((command) => ({
			command,
			context: null,
			timelineObjId: '',
		})) // @todo: implement context and timelineObjId tracking
		return commandsWithContext
	}

	private getGenerator(): CommandGenerator<TriCasterState> {
		return {
			mixEffects: fillRecord(this.meNames, (meName) => this.getMixEffectGenerator(meName)),
			inputs: fillRecord(this.inputNames, (inputName) => ({ $target: inputName, ...this.inputCommandGenerator })),
			audioChannels: fillRecord(this.audioChannelNames, (inputName) => ({
				$target: inputName,
				...this.audioCommandGenerator,
			})),
			isRecording: ({ value }) => [{ name: CommandName.RECORD_TOGGLE, value: value ? 1 : 0 }],
			isStreaming: ({ value }) => [{ name: CommandName.STREAMING_TOGGLE, value: value ? 1 : 0 }],
			outputs: fillRecord(this.mixOutputNames, (mixOutputName) => ({
				$target: mixOutputName,
				...this.mixOutputCommandGenerator,
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
	}

	private transitionCommandGenerator: CommandGenerator<TriCasterTransition> = {
		effect: ({ value, target, state }) => {
			const commands: TriCasterCommand[] = []
			if (value === 'cut') {
				return commands
			}
			if (typeof value === 'number') {
				commands.push({ name: CommandName.SELECT_INDEX, target, value })
			} else if (value === 'fade') {
				commands.push({ name: CommandName.SELECT_INDEX, target, value: 1 }) // @todo
			}
			commands.push({ name: CommandName.SPEED, target, value: state.duration })
			return commands
		},
		duration: ({ value, state, oldState, target }) => {
			if (!oldState || state.effect !== oldState.effect) {
				return []
			}
			return [{ name: CommandName.SPEED, target, value }]
		},
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
		transition: this.transitionCommandGenerator,
		...this.layerCommandGenerator,
		input: CommandName.SELECT_NAMED_INPUT,
		onAir: ({ state, target }) => {
			if (state.transition.effect === 'cut') {
				return [{ name: CommandName.TAKE, target }]
			}
			return [{ name: CommandName.AUTO, target }]
		},
	}

	private getMixEffectGenerator(meName: string): CommandGenerator<TriCasterMixEffectState> {
		return {
			$target: meName,
			isInEffectMode: null,
			transition: this.transitionCommandGenerator,
			delegates: this.delegateCommandGenerator,
			keyers: fillRecord(this.dskNames, (name) => ({ $target: name, ...this.keyerCommandGenerator })),
			layers: fillRecord(this.layerNames, (name) => ({
				$target: name,
				...this.layerCommandGenerator,
			})),
			previewInput: this.previewInputCommandGenerator,
			programInput: this.programInputCommandGenerator,
		}
	}

	private delegateCommandGenerator: CommandGeneratorFunction<TriCasterDelegateName[], TriCasterMixEffect> = ({
		value,
		oldValue,
		target,
	}) => {
		value = [...value].sort()
		oldValue = oldValue ? [...oldValue].sort() : []
		if (_.isEqual(value, oldValue)) return null
		const combinedValue = value.map((delegateName) => `${target}_${delegateName}`).join('|')
		return [{ name: CommandName.DELEGATE, target, value: combinedValue }]
	}

	private previewInputCommandGenerator: CommandGeneratorFunction<string, RequiredDeep<TriCasterMixEffectState>> = ({
		value,
		state,
		target,
	}) => {
		if (state.isInEffectMode) return null
		if (state.transition.effect !== 'cut') {
			return null
		}
		return [{ name: CommandName.ROW_NAMED_INPUT, value, target: target + '_b' }]
	}

	private programInputCommandGenerator: CommandGeneratorFunction<string, RequiredDeep<TriCasterMixEffectState>> = ({
		value,
		state,
		target,
	}) => {
		if (state.isInEffectMode) return null
		if (state.transition.effect === 'cut') {
			if (!state.previewInput) {
				return [
					{ name: CommandName.ROW_NAMED_INPUT, value, target: target + '_b' },
					{ name: CommandName.TAKE, target },
				]
			}
			return [{ name: CommandName.ROW_NAMED_INPUT, value, target: target + '_a' }]
		}
		return [
			{ name: CommandName.ROW_NAMED_INPUT, value, target: target + '_b' },
			{ name: CommandName.AUTO, target },
		]
	}

	private recursivelyGenerateCommands<T>(
		commandsOut: TriCasterCommand[],
		rootCommandGenerator: CommandGenerator<T>,
		state: T,
		oldState: T | undefined,
		target: string
	) {
		if (rootCommandGenerator.$target) {
			target += `${target ? '_' : ''}${rootCommandGenerator.$target}`
		}
		let key: keyof CommandGenerator<T> // this is safe only when rootCommandGenerator is exactly of type CommandGenerator<Y>
		for (key in rootCommandGenerator) {
			if (key === '$target') continue
			const generator = rootCommandGenerator[key] as CommandGeneratorValue<T[keyof T], T>
			const value = state[key as keyof T]
			const oldValue = oldState?.[key as keyof T]
			if (value === undefined || value === null) continue
			if (typeof generator === 'function') {
				if (typeof value !== 'object' && value === oldValue) continue
				const generatedCommands = generator({ value, oldValue, state, oldState, target })
				if (!generatedCommands) continue
				commandsOut.push(...generatedCommands) // @todo track timelineObjIds
			} else if (typeof generator === 'string') {
				if (value === oldValue) continue
				// @todo: with TS 4.9 remove `as unknown` below
				// `generator` and `value` pair make a valid command thanks to TriCasterGenericCommandName
				commandsOut.push({ name: generator, value, target } as unknown as TriCasterGenericCommand)
			} else if (generator) {
				this.recursivelyGenerateCommands(commandsOut, generator, value, oldValue, target)
			}
		}
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
