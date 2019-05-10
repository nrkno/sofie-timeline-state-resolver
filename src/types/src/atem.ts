import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'

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
	SuperSourceProperties,
	AudioChannel
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
	MEDIAPLAYER = 'mp',
	AUDIOCHANNEL = 'audioChan'
}

export enum AtemTransitionStyle { // Note: copied from atem-state
	MIX,
	DIP,
	WIPE,
	DVE,
	STING,
	CUT
}

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
export type TimelineObjAtemAny = (
	TimelineObjAtemME |
	TimelineObjAtemDSK |
	TimelineObjAtemAUX |
	TimelineObjAtemSsrc |
	TimelineObjAtemSsrcProps
)
export interface TimelineObjAtemBase extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.ATEM
		type: TimelineContentTypeAtem
	}
}

export interface TimelineObjAtemME extends TimelineObjAtemBase {
	content: {
		deviceType: DeviceType.ATEM
		type: TimelineContentTypeAtem.ME
		me: {
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
export interface TimelineObjAtemDSK extends TimelineObjAtemBase {
	content: {
		deviceType: DeviceType.ATEM
		type: TimelineContentTypeAtem.DSK
		dsk: {
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
export interface TimelineObjAtemAUX extends TimelineObjAtemBase {
	content: {
		deviceType: DeviceType.ATEM
		type: TimelineContentTypeAtem.AUX
		aux: {
			input: number
		}
	}
}
export interface TimelineObjAtemSsrc extends TimelineObjAtemBase {
	content: {
		deviceType: DeviceType.ATEM
		type: TimelineContentTypeAtem.SSRC
		ssrc: {
			boxes: Array<SuperSourceBox>
		}
	}
}
export interface TimelineObjAtemSsrcProps extends TimelineObjAtemBase {
	content: {
		deviceType: DeviceType.ATEM
		type: TimelineContentTypeAtem.SSRCPROPS
		ssrcProps: {
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
export interface TimelineObjAtemMediaPlayer extends TimelineObjAtemBase {
	content: {
		deviceType: DeviceType.ATEM
		type: TimelineContentTypeAtem.MEDIAPLAYER

		mediaPlayer: {
			playing: boolean
			loop: boolean
			atBeginning: boolean
			clipFrame: number
		}
	}
}
export interface TimelineObjAtemAudioChannel extends TimelineObjAtemBase {
	content: {
		deviceType: DeviceType.ATEM
		type: TimelineContentTypeAtem.AUDIOCHANNEL
		audioChannel: {
			gain?: number
			balance?: number
			mixOption?: number
		}
	}
}
