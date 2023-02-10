import { Mapping } from './mapping'
import { DeviceType, TimelineDatastoreReferencesContent, TSRTimelineObjBase } from '.'

export type TriCasterMixEffectName = 'main' | `v${number}`
export type TriCasterKeyerName = `dsk${number}`
export type TriCasterInputName = `input${number}`
export type TriCasterSourceName = TriCasterInputName | `ddr${number}` | `bfr${number}` | 'black'
export type TriCasterAudioChannelName = TriCasterSourceName | 'sound' | 'master'
export type TriCasterLayerName = 'a' | 'b' | 'c' | 'd'
export type TriCasterDelegateName = 'background' | TriCasterKeyerName
export type TriCasterMixOutputName = `mix${number}`
export type TriCasterMixOutputSource =
	| TriCasterSourceName
	| TriCasterMixEffectName
	| 'program'
	| 'preview'
	| 'program_clean'
	| 'me_program'
	| 'me_preview'

interface MappingTriCasterBase extends Mapping {
	device: DeviceType.TRICASTER
	mappingType: MappingTriCasterType
}

export interface MappingTriCasterMixEffect extends MappingTriCasterBase {
	mappingType: MappingTriCasterType.ME
	name: TriCasterMixEffectName
}

export interface MappingTriCasterDownStreamKeyer extends MappingTriCasterBase {
	mappingType: MappingTriCasterType.DSK
	name: TriCasterKeyerName
}

export interface MappingTriCasterInput extends MappingTriCasterBase {
	mappingType: MappingTriCasterType.INPUT
	name: TriCasterInputName
}

export interface MappingTriCasterAudioChannel extends MappingTriCasterBase {
	mappingType: MappingTriCasterType.AUDIO_CHANNEL
	name: TriCasterAudioChannelName
}

export interface MappingTriCasterMixOutput extends MappingTriCasterBase {
	mappingType: MappingTriCasterType.MIX_OUTPUT
	name: TriCasterMixOutputName
}

export enum MappingTriCasterType {
	ME = 'ME',
	DSK = 'DSK',
	INPUT = 'INPUT',
	AUDIO_CHANNEL = 'AUDIO_CHANNEL',
	MIX_OUTPUT = 'MIX_OUTPUT',
}

export type MappingTriCaster =
	| MappingTriCasterMixEffect
	| MappingTriCasterDownStreamKeyer
	| MappingTriCasterInput
	| MappingTriCasterAudioChannel
	| MappingTriCasterMixOutput

export interface TriCasterOptions {
	host: string
	port: number
}

export enum TimelineContentTypeTriCaster {
	ME = 'ME',
	DSK = 'DSK',
	INPUT = 'INPUT',
	AUDIO_CHANNEL = 'AUDIO_CHANNEL',
	MIX_OUTPUT = 'MIX_OUTPUT',
}

export type TimelineObjTriCasterAny =
	| TimelineObjTriCasterME
	| TimelineObjTriCasterDSK
	| TimelineObjTriCasterInput
	| TimelineObjTriCasterAudioChannel
	| TimelineObjTriCasterMixOutput

export interface TimelineObjTriCasterBase extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.TRICASTER
		type: TimelineContentTypeTriCaster
	} & TimelineDatastoreReferencesContent
}

interface TriCasterMixEffectBase {
	transition?: TriCasterTransition

	keyers?: Record<TriCasterKeyerName, TriCasterKeyer>

	/** Default: 'background' */
	delegates?: TriCasterDelegateName[]
}

export interface TriCasterMixEffectInMixMode extends TriCasterMixEffectBase {
	programInput?: string
}

export interface TriCasterMixEffectWithPreview extends TriCasterMixEffectInMixMode {
	previewInput?: string

	transition?: { effect: 'cut'; duration: 0 }
}

export interface TriCasterMixEffectInEffectMode extends TriCasterMixEffectBase {
	/** Use only in conjunction with effects that use M/E rows as layers (e.g. LiveSets) */
	layers?: Partial<Record<TriCasterLayerName, TriCasterLayer>>

	transition?: { effect: number; duration: 0 }
}

export type TriCasterMixEffect =
	| TriCasterMixEffectInEffectMode
	| TriCasterMixEffectWithPreview
	| TriCasterMixEffectInMixMode

export interface TimelineObjTriCasterME extends TimelineObjTriCasterBase {
	content: {
		deviceType: DeviceType.TRICASTER
		type: TimelineContentTypeTriCaster.ME

		me: TriCasterMixEffect
	} & TimelineDatastoreReferencesContent
}

export function isTimelineObjTriCasterME(timelineObject: TSRTimelineObjBase): timelineObject is TimelineObjTriCasterME {
	return isTimelineObjTriCaster(timelineObject) && timelineObject.content.type === TimelineContentTypeTriCaster.ME
}

export function isTimelineObjTriCaster(timelineObject: TSRTimelineObjBase): timelineObject is TimelineObjTriCasterBase {
	return timelineObject.content.deviceType === DeviceType.TRICASTER
}

/**
 * Convenience object for the keyers in the Main M/E
 */
export interface TimelineObjTriCasterDSK extends TimelineObjTriCasterBase {
	content: {
		deviceType: DeviceType.TRICASTER
		type: TimelineContentTypeTriCaster.DSK

		keyer: TriCasterKeyer
	} & TimelineDatastoreReferencesContent
}

export function isTimelineObjTriCasterDSK(
	timelineObject: TSRTimelineObjBase
): timelineObject is TimelineObjTriCasterDSK {
	return isTimelineObjTriCaster(timelineObject) && timelineObject.content.type === TimelineContentTypeTriCaster.DSK
}

export interface TriCasterInput {
	videoActAsAlpha?: boolean
	videoSource?: string
}

export interface TimelineObjTriCasterInput extends TimelineObjTriCasterBase {
	content: {
		deviceType: DeviceType.TRICASTER
		type: TimelineContentTypeTriCaster.INPUT

		input: TriCasterInput
	} & TimelineDatastoreReferencesContent
}

export function isTimelineObjTriCasterInput(
	timelineObject: TSRTimelineObjBase
): timelineObject is TimelineObjTriCasterInput {
	return isTimelineObjTriCaster(timelineObject) && timelineObject.content.type === TimelineContentTypeTriCaster.INPUT
}

export interface TriCasterAudioChannel {
	isMuted?: boolean
	/**
	 * Volume (dB)
	 * Default: 0
	 */
	volume?: number
}

export interface TimelineObjTriCasterAudioChannel extends TimelineObjTriCasterBase {
	content: {
		deviceType: DeviceType.TRICASTER
		type: TimelineContentTypeTriCaster.AUDIO_CHANNEL

		audioChannel: TriCasterAudioChannel
	} & TimelineDatastoreReferencesContent
}

export function isTimelineObjTriCasterAudioChannel(
	timelineObject: TSRTimelineObjBase
): timelineObject is TimelineObjTriCasterAudioChannel {
	return (
		isTimelineObjTriCaster(timelineObject) && timelineObject.content.type === TimelineContentTypeTriCaster.AUDIO_CHANNEL
	)
}

export interface TimelineObjTriCasterMixOutput extends TimelineObjTriCasterBase {
	content: {
		deviceType: DeviceType.TRICASTER
		type: TimelineContentTypeTriCaster.MIX_OUTPUT

		/**
		 * Any of the named Inputs, Media Players and Buffers ('INPUTn', 'DDRn', 'BFRn') e.g. 'INPUT12' or
		 * any of the MEs ('Vn') e.g. 'V1' or
		 * or 'Program', 'Preview', 'program_clean', 'me_program', 'me_preview'
		 */
		source: TriCasterMixOutputSource
	} & TimelineDatastoreReferencesContent
}

export function isTimelineObjTriCasterMixOutput(
	timelineObject: TSRTimelineObjBase
): timelineObject is TimelineObjTriCasterMixOutput {
	return (
		isTimelineObjTriCaster(timelineObject) && timelineObject.content.type === TimelineContentTypeTriCaster.MIX_OUTPUT
	)
}

export type TriCasterTransitionEffect = 'cut' | 'fade' | number

export interface TriCasterTransition {
	effect: TriCasterTransitionEffect
	/** Duration in seconds, applicable to effects other than 'cut' */
	duration: number
}

/**
 * Properties of a layer in effect mode (as opposed to transition mode)
 * Value ranges in this type adhere to the API and may differ from the GUI
 */
export interface TriCasterLayer {
	input?: string
	/**
	 * Enables position, scale, rotation, crop and feather, but it's weird,
	 * so setting it to false while any of said properties are defined may
	 * lead to unwanted behaviour
	 */
	positioningAndCropEnabled?: boolean
	position?: {
		/**
		 * Horizontal translation
		 * Default: 0.0 (center)
		 * Frame width: 3.555... (-3.555 is fully off-screen to the left at scale=1.0)
		 */
		x: number
		/**
		 * Vertical translation
		 * Default: 0.0 (center)
		 * Frame height: 2.0 (-2.0 is fully off-screen to the top at scale=1.0)
		 */
		y: number
	}
	scale?: {
		/**
		 * Horizontal scale factor
		 * Default: 1.0; Range: 0.0 to 5.0
		 */
		x: number
		/**
		 * Vertical scale factor
		 * Default: 1.0; Range: 0.0 to 5.0
		 */
		y: number
	}
	rotation?: {
		/**
		 * X-axis rotation (degrees)
		 * Default: 0.0; Range: -1440.0 to 1440.0
		 */
		x: number
		/**
		 * Y-axis rotation (degrees)
		 * Default: 0.0; Range: -1440.0 to 1440.0
		 */
		y: number
		/**
		 * Z-axis rotation (perpendicular to screen plane) (degrees)
		 * Default: 0.0; Range: -1440.0 to 1440.0
		 */
		z: number
	}
	crop?: {
		/**
		 * Crop left (percentage)
		 * Default: 0.0 (center); Range: 0.0 to 100.0
		 */
		left: number
		/**
		 * Crop right (percentage)
		 * Default: 0.0 (center); Range: 0.0 to 100.0
		 */
		right: number
		/**
		 * Crop up (from the top, hence called "Bottom" in the UI) (percentage)
		 * Default: 0.0 (center); Range: 0.0 to 100.0
		 */
		up: number
		/**
		 * Crop down (from the top, hence called "Top" in the UI) (percentage)
		 * Default: 0.0 (center); Range: 0.0 to 100.0
		 */
		down: number
	}
	/**
	 * Border feather (percentage)
	 * Default: 0.0; Range: 0.0 to 100.0
	 */
	feather?: number
}

/**
 * Properties of a keyer
 * Value ranges in this type adhere to the API and may differ from the GUI
 */
export interface TriCasterKeyer extends TriCasterLayer {
	onAir?: boolean
	transition?: TriCasterTransition
}
