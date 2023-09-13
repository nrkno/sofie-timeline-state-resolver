import { AtemStateUtil, Enums } from 'atem-connection'
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
} from 'timeline-state-resolver-types'
import _ = require('underscore')
import * as underScoreDeepExtend from 'underscore-deep-extend'
import { State as DeviceState, Defaults as StateDefault } from 'atem-state'
import { assertNever, cloneDeep } from '../../lib'

_.mixin({ deepExtend: underScoreDeepExtend(_) })

function deepExtend<T>(destination: T, ...sources: any[]) {
	// @ts-ignore (mixin)
	return _.deepExtend(destination, ...sources)
}

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

		const stateMixEffect = AtemStateUtil.getMixEffect(this.#deviceState, mapping.index)
		deepExtend(stateMixEffect, _.omit(content.me, 'upstreamKeyers'))

		const objectTransition = content.me.transition
		if (this._isAssignableToNextStyle(objectTransition)) {
			stateMixEffect.transitionProperties.nextStyle = objectTransition as number as Enums.TransitionStyle
		}

		const objectKeyers = content.me.upstreamKeyers
		if (objectKeyers) {
			for (const objKeyer of objectKeyers) {
				const stateKeyer = AtemStateUtil.getUpstreamKeyer(stateMixEffect, objKeyer.upstreamKeyerId)
				deepExtend(stateKeyer, objKeyer)
			}
		}
	}

	private _applyDownStreamKeyer(mapping: MappingAtemDownStreamKeyer, content: TimelineContentAtemDSK): void {
		if (typeof mapping.index !== 'number' || mapping.index < 0) return

		const stateDSK = AtemStateUtil.getDownstreamKeyer(this.#deviceState, mapping.index)
		deepExtend(stateDSK, content.dsk)
	}

	private _applySuperSourceBox(mapping: MappingAtemSuperSourceBox, content: TimelineContentAtemSsrc): void {
		if (typeof mapping.index !== 'number' || mapping.index < 0) return

		const stateSuperSource = AtemStateUtil.getSuperSource(this.#deviceState, mapping.index)

		content.ssrc.boxes.forEach((objBox, i) => {
			const stateBox = stateSuperSource.boxes[i]
			if (stateBox) {
				deepExtend(stateBox, objBox)
			} else {
				stateSuperSource.boxes[i] = deepExtend(cloneDeep(StateDefault.Video.SuperSourceBox), objBox)
			}
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

		if (!stateSuperSource.properties) stateSuperSource.properties = cloneDeep(StateDefault.Video.SuperSourceProperties)
		deepExtend(stateSuperSource.properties, _.omit(content.ssrcProps, ...borderKeys))

		if (!stateSuperSource.border) stateSuperSource.border = cloneDeep(StateDefault.Video.SuperSourceBorder)
		deepExtend(stateSuperSource.border, _.pick(content.ssrcProps, ...borderKeys))
	}

	private _applyAuxilliary(mapping: MappingAtemAuxilliary, content: TimelineContentAtemAUX): void {
		if (typeof mapping.index !== 'number' || mapping.index < 0) return

		this.#deviceState.video.auxilliaries[mapping.index] = content.aux.input
	}

	private _applyMediaPlayer(mapping: MappingAtemMediaPlayer, content: TimelineContentAtemMediaPlayer): void {
		if (typeof mapping.index !== 'number' || mapping.index < 0) return

		const ms = AtemStateUtil.getMediaPlayer(this.#deviceState, mapping.index)
		if (ms) deepExtend(ms, content.mediaPlayer)
	}

	private _applyAudioChannel(mapping: MappingAtemAudioChannel, content: TimelineContentAtemAudioChannel): void {
		if (typeof mapping.index !== 'number' || mapping.index < 0) return

		if (!this.#deviceState.audio) this.#deviceState.audio = { channels: {} }

		const stateAudioChannel = this.#deviceState.audio.channels[mapping.index] ?? cloneDeep(StateDefault.Audio.Channel)
		this.#deviceState.audio.channels[mapping.index] = {
			...cloneDeep(stateAudioChannel),
			...content.audioChannel,
		}
	}

	private _applyMacroPlayer(_mapping: MappingAtemMacroPlayer, content: TimelineContentAtemMacroPlayer): void {
		const stateMacroPlayer = this.#deviceState.macro.macroPlayer
		deepExtend(stateMacroPlayer, content.macroPlayer)
	}
}
