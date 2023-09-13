import { AtemStateUtil, Enums, MacroState, VideoState } from 'atem-connection'
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
} from 'timeline-state-resolver-types'
import _ = require('underscore')
import { State as DeviceState, Defaults as StateDefault } from 'atem-state'
import { assertNever, cloneDeep, deepMerge } from '../../lib'

export class AtemStateBuilder {
	// Start out with default state:
	readonly #deviceState = AtemStateUtil.Create()

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
						}
						break
					case MappingAtemType.DownStreamKeyer:
						if (content.type === TimelineContentTypeAtem.DSK) {
							builder._applyDownStreamKeyer(mapping.options, content)
						}
						break
					case MappingAtemType.SuperSourceBox:
						if (content.type === TimelineContentTypeAtem.SSRC) {
							builder._applySuperSourceBox(mapping.options, content)
						}
						break
					case MappingAtemType.SuperSourceProperties:
						if (content.type === TimelineContentTypeAtem.SSRCPROPS) {
							builder._applySuperSourceProperties(mapping.options, content)
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
		if (typeof content.me.transitionPosition === 'number') {
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
				stateMixEffect.upstreamKeyers[objKeyer.upstreamKeyerId] = deepMerge(
					AtemStateUtil.getUpstreamKeyer(stateMixEffect, objKeyer.upstreamKeyerId),
					objKeyer
				)
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
}
