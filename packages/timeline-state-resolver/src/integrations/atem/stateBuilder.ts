import { AtemState, AtemStateUtil, Enums, MacroState, VideoState } from 'atem-connection'
import {
	Mapping,
	SomeMappingAtem,
	DeviceType,
	MappingAtemType,
	TimelineContentTypeAtem,
	Mappings,
	TSRTimelineContent,
	Timeline,
	AtemTransitionStyle,
	TimelineContentAtemME,
	MappingAtemMixEffect,
	TimelineContentAtemDSK,
	TimelineContentAtemSsrcProps,
	TimelineContentAtemAUX,
	TimelineContentAtemMediaPlayer,
	TimelineContentAtemAudioChannel,
	TimelineContentAtemSsrc,
	TimelineContentAtemMacroPlayer,
	MappingAtemMacroPlayer,
	MappingAtemAudioChannel,
	MappingAtemMediaPlayer,
	MappingAtemAuxilliary,
	MappingAtemSuperSourceBox,
	MappingAtemSuperSourceProperties,
	MappingAtemDownStreamKeyer,
	MappingAtemAudioRouting,
	TimelineContentAtemAudioRouting,
	MappingAtemColorGenerator,
	TimelineContentAtemColorGenerator,
} from 'timeline-state-resolver-types'
import _ = require('underscore')
import { Defaults, State as DeviceState, Defaults as StateDefault } from 'atem-state'
import { assertNever, cloneDeep, deepMerge, literal } from '../../lib'
import { PartialDeep } from 'type-fest'

export type InternalAtemConnectionState = AtemState & { controlValues?: Record<string, string> }

export class AtemStateBuilder {
	// Start out with default state:
	readonly #deviceState: InternalAtemConnectionState = AtemStateUtil.Create()

	public static fromTimeline(timelineState: Timeline.StateInTime<TSRTimelineContent>, mappings: Mappings): DeviceState {
		const builder = new AtemStateBuilder()

		// Sort layer based on Layer name
		const sortedLayers = _.map(timelineState, (tlObject, layerName) => ({ layerName, tlObject })).sort((a, b) =>
			a.layerName.localeCompare(b.layerName)
		)

		// For every layer, augment the state
		_.each(sortedLayers, ({ tlObject, layerName }) => {
			const content = tlObject.content

			const mapping = mappings[layerName] as Mapping<SomeMappingAtem> | undefined

			if (mapping && content.deviceType === DeviceType.ATEM) {
				switch (mapping.options.mappingType) {
					case MappingAtemType.MixEffect:
						if (content.type === TimelineContentTypeAtem.ME) {
							builder._applyMixEffect(mapping.options, content)
							builder._setControlValue(builder._getMixEffectAddressesFromTlObject(mapping.options, content), tlObject)
						}
						break
					case MappingAtemType.DownStreamKeyer:
						if (content.type === TimelineContentTypeAtem.DSK) {
							builder._applyDownStreamKeyer(mapping.options, content)
							builder._setControlValue(['video.dsk.' + mapping.options.index], tlObject)
						}
						break
					case MappingAtemType.SuperSourceBox:
						if (content.type === TimelineContentTypeAtem.SSRC) {
							builder._applySuperSourceBox(mapping.options, content)
							builder._setControlValue(['video.superSource.' + mapping.options.index], tlObject)
						}
						break
					case MappingAtemType.SuperSourceProperties:
						if (content.type === TimelineContentTypeAtem.SSRCPROPS) {
							builder._applySuperSourceProperties(mapping.options, content)
							builder._setControlValue(['video.superSource.' + mapping.options.index], tlObject)
						}
						break
					case MappingAtemType.Auxilliary:
						if (content.type === TimelineContentTypeAtem.AUX) {
							builder._applyAuxilliary(mapping.options, content)
						}
						break
					case MappingAtemType.MediaPlayer:
						if (content.type === TimelineContentTypeAtem.MEDIAPLAYER) {
							builder._applyMediaPlayer(mapping.options, content)
						}
						break
					case MappingAtemType.AudioChannel:
						if (content.type === TimelineContentTypeAtem.AUDIOCHANNEL) {
							builder._applyAudioChannel(mapping.options, content)
						}
						break
					case MappingAtemType.AudioRouting:
						if (content.type === TimelineContentTypeAtem.AUDIOROUTING) {
							builder._applyAudioRouting(mapping.options, content)
						}
						break
					case MappingAtemType.MacroPlayer:
						if (content.type === TimelineContentTypeAtem.MACROPLAYER) {
							builder._applyMacroPlayer(mapping.options, content)
						}
						break
					case MappingAtemType.ColorGenerator:
						if (content.type === TimelineContentTypeAtem.COLORGENERATOR) {
							builder._applyColorGenerator(mapping.options, content)
						}
						break
					case MappingAtemType.ControlValue:
						break
					default:
						assertNever(mapping.options)
						break
				}
			}
		})

		return builder.#deviceState
	}

	private _isAssignableToNextStyle(transition: AtemTransitionStyle | undefined): boolean {
		return (
			transition !== undefined && transition !== AtemTransitionStyle.DUMMY && transition !== AtemTransitionStyle.CUT
		)
	}

	private _applyMixEffect(mapping: MappingAtemMixEffect, content: TimelineContentAtemME): void {
		if (typeof mapping.index !== 'number' || mapping.index < 0) return

		const stateMixEffect = deepMerge(
			AtemStateUtil.getMixEffect(this.#deviceState, mapping.index),
			_.omit(content.me, 'upstreamKeyers', 'transitionPosition')
		)
		this.#deviceState.video.mixEffects[mapping.index] = stateMixEffect
		if (content.me.transitionPosition !== undefined) {
			stateMixEffect.transitionPosition = {
				handlePosition: content.me.transitionPosition,

				// Readonly properties
				inTransition: false,
				remainingFrames: 0,
			}
		}

		const objectTransition = content.me.transition
		if (this._isAssignableToNextStyle(objectTransition)) {
			stateMixEffect.transitionProperties.nextStyle = objectTransition as number as Enums.TransitionStyle
		}

		const objectKeyers = content.me.upstreamKeyers
		if (objectKeyers) {
			for (const objKeyer of objectKeyers) {
				const fixedObjKeyer: PartialDeep<VideoState.USK.UpstreamKeyer> = {
					...objKeyer,
					flyKeyframes: [undefined, undefined],
					flyProperties: undefined,
				}
				delete fixedObjKeyer.flyProperties
				delete fixedObjKeyer.flyKeyframes

				if (objKeyer.flyProperties) {
					fixedObjKeyer.flyProperties = {
						isASet: false,
						isBSet: false,
						isAtKeyFrame: objKeyer.flyProperties.isAtKeyFrame as number,
						runToInfiniteIndex: objKeyer.flyProperties.runToInfiniteIndex,
					}
				}

				stateMixEffect.upstreamKeyers[objKeyer.upstreamKeyerId] = deepMerge<VideoState.USK.UpstreamKeyer>(
					AtemStateUtil.getUpstreamKeyer(stateMixEffect, objKeyer.upstreamKeyerId),
					fixedObjKeyer
				)

				const keyer = stateMixEffect.upstreamKeyers[objKeyer.upstreamKeyerId]
				if (objKeyer.flyKeyframes && keyer) {
					keyer.flyKeyframes = [keyer.flyKeyframes[0] ?? undefined, keyer.flyKeyframes[1] ?? undefined]
					if (objKeyer.flyKeyframes[0]) {
						keyer.flyKeyframes[0] = literal<VideoState.USK.UpstreamKeyerFlyKeyframe>({
							...StateDefault.Video.flyKeyframe(0),
							...objKeyer.flyKeyframes[0],
						})
					}
					if (objKeyer.flyKeyframes[1]) {
						keyer.flyKeyframes[1] = literal<VideoState.USK.UpstreamKeyerFlyKeyframe>({
							...StateDefault.Video.flyKeyframe(1),
							...objKeyer.flyKeyframes[1],
						})
					}
				}
			}
		}
	}

	private _applyDownStreamKeyer(mapping: MappingAtemDownStreamKeyer, content: TimelineContentAtemDSK): void {
		if (typeof mapping.index !== 'number' || mapping.index < 0) return

		this.#deviceState.video.downstreamKeyers[mapping.index] = deepMerge<VideoState.DSK.DownstreamKeyer>(
			AtemStateUtil.getDownstreamKeyer(this.#deviceState, mapping.index),
			content.dsk
		)
	}

	private _applySuperSourceBox(mapping: MappingAtemSuperSourceBox, content: TimelineContentAtemSsrc): void {
		if (typeof mapping.index !== 'number' || mapping.index < 0) return

		const stateSuperSource = AtemStateUtil.getSuperSource(this.#deviceState, mapping.index)

		content.ssrc.boxes.forEach((objBox, i) => {
			stateSuperSource.boxes[i] = deepMerge<VideoState.SuperSource.SuperSourceBox>(
				stateSuperSource.boxes[i] ?? cloneDeep(StateDefault.Video.SuperSourceBox),
				objBox
			)
		})
	}

	private _applySuperSourceProperties(
		mapping: MappingAtemSuperSourceProperties,
		content: TimelineContentAtemSsrcProps
	): void {
		const stateSuperSource = AtemStateUtil.getSuperSource(this.#deviceState, mapping.index)

		const borderKeys = [
			'borderEnabled',
			'borderBevel',
			'borderOuterWidth',
			'borderInnerWidth',
			'borderOuterSoftness',
			'borderInnerSoftness',
			'borderBevelSoftness',
			'borderBevelPosition',
			'borderHue',
			'borderSaturation',
			'borderLuma',
			'borderLightSourceDirection',
			'borderLightSourceAltitude',
		]

		stateSuperSource.properties = deepMerge(
			stateSuperSource.properties ?? cloneDeep(StateDefault.Video.SuperSourceProperties),
			_.omit(content.ssrcProps, ...borderKeys)
		)

		stateSuperSource.border = deepMerge(
			stateSuperSource.border ?? cloneDeep(StateDefault.Video.SuperSourceBorder),
			_.pick(content.ssrcProps, ...borderKeys)
		)
	}

	private _applyAuxilliary(mapping: MappingAtemAuxilliary, content: TimelineContentAtemAUX): void {
		if (typeof mapping.index !== 'number' || mapping.index < 0) return

		this.#deviceState.video.auxilliaries[mapping.index] = content.aux.input
	}

	private _applyMediaPlayer(mapping: MappingAtemMediaPlayer, content: TimelineContentAtemMediaPlayer): void {
		if (typeof mapping.index !== 'number' || mapping.index < 0) return

		this.#deviceState.media.players[mapping.index] = deepMerge(
			AtemStateUtil.getMediaPlayer(this.#deviceState, mapping.index),
			content.mediaPlayer
		)
	}

	private _applyAudioChannel(mapping: MappingAtemAudioChannel, content: TimelineContentAtemAudioChannel): void {
		if (typeof mapping.index !== 'number' || mapping.index < 0) return

		if (!this.#deviceState.audio) this.#deviceState.audio = { channels: {} }

		const stateAudioChannel = this.#deviceState.audio.channels[mapping.index] ?? StateDefault.ClassicAudio.Channel
		this.#deviceState.audio.channels[mapping.index] = {
			...cloneDeep(stateAudioChannel),
			...content.audioChannel,
		}
	}

	private _applyAudioRouting(mapping: MappingAtemAudioRouting, content: TimelineContentAtemAudioRouting): void {
		if (typeof mapping.index !== 'number' || mapping.index < 0) return

		// lazily generate the state properties, to make this be opt in per-mapping
		if (!this.#deviceState.fairlight) this.#deviceState.fairlight = { inputs: {} }
		if (!this.#deviceState.fairlight.audioRouting)
			this.#deviceState.fairlight.audioRouting = {
				sources: {},
				outputs: {},
			}

		this.#deviceState.fairlight.audioRouting.outputs[mapping.index] = {
			// readonly props, they won't be diffed
			audioOutputId: mapping.index,
			audioChannelPair: 0,
			externalPortType: 0,
			internalPortType: 0,

			// mutable props
			name: `Output ${mapping.index}`,
			...content.audioRouting,
		}
	}

	private _applyMacroPlayer(_mapping: MappingAtemMacroPlayer, content: TimelineContentAtemMacroPlayer): void {
		this.#deviceState.macro.macroPlayer = deepMerge<MacroState.MacroPlayerState>(
			this.#deviceState.macro.macroPlayer,
			content.macroPlayer
		)
	}

	private _applyColorGenerator(mapping: MappingAtemColorGenerator, content: TimelineContentAtemColorGenerator): void {
		if (!this.#deviceState.colorGenerators) this.#deviceState.colorGenerators = {}
		this.#deviceState.colorGenerators[mapping.index] = {
			...Defaults.Color.ColorGenerator,
			...this.#deviceState.colorGenerators[mapping.index],
			...content.colorGenerator,
		}
	}

	private _setControlValue(addresses: string[], tlObject: Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>) {
		if (!this.#deviceState.controlValues) this.#deviceState.controlValues = {}

		for (const a of addresses) {
			const oldValue = this.#deviceState[a]
			this.#deviceState.controlValues[a] =
				Math.max(
					tlObject.instance.start,
					tlObject.instance.originalStart ?? 0,
					tlObject.lastModified ?? 0,
					oldValue ?? 0
				) + ''
		}
	}

	private _getMixEffectAddressesFromTlObject(mapping: MappingAtemMixEffect, content: TimelineContentAtemME): string[] {
		const addresses: string[] = []

		if ('input' in content.me || 'programInput' in content.me) {
			addresses.push('video.mixEffects.' + mapping.index + '.pgm')
		}

		if ('previewInput' in content.me || 'transition' in content.me) {
			addresses.push('video.mixEffects.' + mapping.index + '.base')
		}

		if ('transitionSettings' in content.me) {
			addresses.push('video.mixEffects.' + mapping.index + '.transitionSettings')
		}

		if (content.me.upstreamKeyers) {
			addresses.push(
				...content.me.upstreamKeyers
					.filter((usk) => !!usk)
					.map((usk) => 'video.mixEffects.' + mapping.index + '.usk.' + usk.upstreamKeyerId)
			)
		}

		return addresses
	}
}
