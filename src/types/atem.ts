import { TimelineObject, TimelineKeyframe } from 'superfly-timeline'
import { Mapping, DeviceType } from './mapping'

export interface MappingAtem extends Mapping {
	device: DeviceType.ATEM,
	mappingType: MappingAtemType
	index?: number
}
export enum MappingAtemType {
	MixEffect,
	DownStreamKeyer,
	SuperSourceBox,
	Auxilliary,
	MediaPlayer,
	SuperSourceProperties
}

export interface AtemOptions {
	host: string
	port?: number
}

export enum TimelineContentTypeAtem { //  Atem-state
	ME = 'me',
	DSK = 'dsk',
	AUX = 'aux',
	SSRC = 'ssrc',
	SSRCPROPS = 'ssrcProps',
	MEDIAPLAYER = 'mp'
}

export enum AtemTransitionStyle { // Note: copied from atem-state
	MIX,
	DIP,
	WIPE,
	DVE,
	STING,
	CUT
}

export type TimelineObjAtemAny = TimelineObjAtemME | TimelineObjAtemDSK | TimelineObjAtemAUX | TimelineObjAtemSsrc | TimelineObjAtemSsrcProps

export type SuperSourceBox = {
	enabled: boolean,
	source?: number,
	x?: number,
	y?: number,
	size?: number,
	cropped?: boolean,
	cropTop?: number,
	cropBottom?: number,
	cropLeft?: number,
	cropRight?: number
}

export interface AtemTransitionSettings {
	// dip
	// DVE
	mix?: {
		rate: number
	}
	// stinger
	wipe?: {
		rate?: number,
		pattern?: number,
		borderWidth?: number,
		borderInput?: number,
		symmetry?: number,
		borderSoftness?: number,
		xPosition?: number,
		yPosition?: number,
		reverseDirection?: boolean,
		flipFlop?: boolean
	}
}

export interface TimelineObjAtemME extends TimelineObject {
	content: {
		keyframes?: Array<TimelineKeyframe>
		type: TimelineContentTypeAtem.ME
		attributes: { // Casparcg-state
			input?: number,
			transition?: AtemTransitionStyle,

			// programInput?: number; // programInput exists, bu I don't think we should use it /Nyman
			previewInput?: number;
			inTransition?: boolean;
			transitionPreview?: boolean;
			transitionPosition?: number;
			// transitionFramesLeft?: number;
			// fadeToBlack?: boolean;
			// numberOfKeyers?: number;
			// transitionProperties?: AtemTransitionProperties;

			transitionSettings?: AtemTransitionSettings,

			upstreamKeyers?: {
				readonly upstreamKeyerId: number,
				onAir?: boolean
				mixEffectKeyType?: number,
				flyEnabled?: boolean,
				fillSource?: number,
				cutSource?: number,
				maskEnabled?: boolean,
				maskTop?: number,
				maskBottom?: number,
				maskLeft?: number,
				maskRight?: number,

				// dveSettings: UpstreamKeyerDVESettings;
				// chromaSettings: UpstreamKeyerChromaSettings;
				// patternSettings: UpstreamKeyerPatternSettings;
				// flyKeyframes: Array<UpstreamKeyerFlyKeyframe>;
				// flyProperties: UpstreamKeyerFlySettings;
				lumaSettings?: {
					preMultiplied?: boolean,
					clip?: number,
					gain?: number,
					invert?: boolean
				}
			}[]
		}
	}
}
export interface TimelineObjAtemDSK extends TimelineObject {
	content: {
		keyframes?: Array<TimelineKeyframe>
		type: TimelineContentTypeAtem.DSK
		attributes: {
			onAir: boolean,
			sources?: {
				fillSource: number,
				cutSource: number
			},
			properties?: {
				tie?: boolean,
				rate?: number,
				preMultiply?: boolean,
				clip?: number,
				gain?: number,
				invert?: boolean,
				mask?: {
					enabled: boolean,
					top?: number,
					bottom?: number,
					left?: number,
					right?: number
				}
			}
		}
	}
}
export interface TimelineObjAtemAUX extends TimelineObject {
	content: {
		keyframes?: Array<TimelineKeyframe>
		type: TimelineContentTypeAtem.AUX
		attributes: {
			input: number
		}
	}
}
export interface TimelineObjAtemSsrc extends TimelineObject {
	content: {
		keyframes?: Array<TimelineKeyframe>
		type: TimelineContentTypeAtem.SSRC
		attributes: {
			boxes: Array<SuperSourceBox>
		}
	}
}
export interface TimelineObjAtemSsrcProps extends TimelineObject {
	content: {
		keyframes?: Array<TimelineKeyframe>
		type: TimelineContentTypeAtem.SSRCPROPS
		attributes: {
			artFillSource: number
			artCutSource: number
			artOption: number
			artPreMultiplied: boolean
			// artClip: number
			// artGain: number
			// artInvertKey: number
			// borderEnabled: number
			// borderBevel: number
			// borderOuterWidth: number
			// borderInnerWidth: number
			// borderOuterSoftness: number
			// borderInnerSoftness: number
			// borderBevelSoftness: number
			// borderBevelPosition: number
			// borderHue: number
			// borderSaturation: number
			// borderLuma: number
			// borderLightSourceDirection: number
			// borderLightSourceAltitude: number
		}
	}
}
