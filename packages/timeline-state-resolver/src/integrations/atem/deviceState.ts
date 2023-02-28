import { AtemStateUtil, Enums as ConnectionEnums } from 'atem-connection'
import { State, Defaults as StateDefault } from 'atem-state'
import { debug } from 'console'
import {
	MappingAtem,
	DeviceType,
	MappingAtemType,
	TimelineContentTypeAtem,
	Timeline,
	TSRTimelineContent,
	Mappings,
	AtemTransitionStyle,
} from 'timeline-state-resolver-types'
import _ = require('underscore')
import * as underScoreDeepExtend from 'underscore-deep-extend'

export interface AtemDeviceState {
	timestamp: number
	state: {
		[mappingId: string]:
			| {
					mapping: {
						device: DeviceType.ATEM
						mappingType: MappingAtemType.MixEffect
						index?: number
					}
					state: State['video']['mixEffects'][any]
					startTime: number
			  }
			| {
					mapping: {
						device: DeviceType.ATEM
						mappingType: MappingAtemType.Auxilliary
						index?: number
					}
					state: State['video']['auxilliaries'][any]
					startTime: number
			  }
	}
}

export function tlStateToDeviceState(
	state: Timeline.TimelineState<TSRTimelineContent>,
	newMappings: Mappings
): AtemDeviceState {
	const deviceState: AtemDeviceState = {
		timestamp: state.time,
		state: {},
	}

	// Sort layer based on Layer name
	const sortedLayers = _.map(state.layers, (tlObject, layerName) => ({ layerName, tlObject })).sort((a, b) =>
		a.layerName.localeCompare(b.layerName)
	)

	// For every layer, augment the state
	_.each(sortedLayers, ({ tlObject, layerName }) => {
		const content = tlObject.content

		const mapping = newMappings[layerName] as MappingAtem | undefined
		const defaultState = AtemStateUtil.Create()

		if (mapping && content.deviceType === DeviceType.ATEM) {
			switch (mapping.mappingType) {
				case MappingAtemType.MixEffect:
					if (content.type === TimelineContentTypeAtem.ME) {
						// const me = AtemStateUtil.getMixEffect(defaultState, mapping.index ?? 0)
						// const atemObjKeyers = content.me.upstreamKeyers
						// const transition = content.me.transition

						// deepExtend(me, _.omit(content.me, 'upstreamKeyers'))
						// if (isAssignableToNextStyle(transition)) {
						// 	me.transitionProperties.nextStyle = transition as number as ConnectionEnums.TransitionStyle
						// }
						// if (atemObjKeyers) {
						// 	_.each(atemObjKeyers, (objKey, i) => {
						// 		const keyer = AtemStateUtil.getUpstreamKeyer(me, i)
						// 		deepExtend(keyer, objKey)
						// 	})
						// }

						deviceState.state[layerName] = {
							mapping: {
								...mapping,
								mappingType: mapping.mappingType,
							},
							state: {
								previewInput: content.me.previewInput,
								programInput: content.me.programInput,
							},
							startTime: tlObject.instance.start,
						}
					}
					break
				case MappingAtemType.Auxilliary:
					if (content.type === TimelineContentTypeAtem.AUX) {
						deviceState.state[layerName] = {
							mapping: {
								...mapping,
								mappingType: mapping.mappingType,
							},
							state: content.aux.input,
							startTime: tlObject.instance.start,
						}
					}
					break
			}
		}
	})

	return deviceState
}

export function tlStateToAtemState(state: Timeline.TimelineState<TSRTimelineContent>, newMappings: Mappings): State {
	// Start out with default state:
	const deviceState = AtemStateUtil.Create()

	// Sort layer based on Layer name
	const sortedLayers = _.map(state.layers, (tlObject, layerName) => ({ layerName, tlObject })).sort((a, b) =>
		a.layerName.localeCompare(b.layerName)
	)

	// For every layer, augment the state
	_.each(sortedLayers, ({ tlObject, layerName }) => {
		const content = tlObject.content

		const mapping = newMappings[layerName] as MappingAtem | undefined

		if (mapping && content.deviceType === DeviceType.ATEM) {
			// if (mapping && mapping.deviceId === this.deviceId && content.deviceType === DeviceType.ATEM) {
			if (mapping.index !== undefined && mapping.index >= 0) {
				// index must be 0 or higher
				switch (mapping.mappingType) {
					case MappingAtemType.MixEffect:
						if (content.type === TimelineContentTypeAtem.ME) {
							const me = AtemStateUtil.getMixEffect(deviceState, mapping.index)
							const atemObjKeyers = content.me.upstreamKeyers
							const transition = content.me.transition

							deepExtend(me, _.omit(content.me, 'upstreamKeyers'))
							if (isAssignableToNextStyle(transition)) {
								me.transitionProperties.nextStyle = transition as number as ConnectionEnums.TransitionStyle
							}
							if (atemObjKeyers) {
								_.each(atemObjKeyers, (objKey, i) => {
									const keyer = AtemStateUtil.getUpstreamKeyer(me, i)
									deepExtend(keyer, objKey)
								})
							}
						}
						break
					case MappingAtemType.DownStreamKeyer:
						if (content.type === TimelineContentTypeAtem.DSK) {
							const dsk = AtemStateUtil.getDownstreamKeyer(deviceState, mapping.index)
							if (dsk) deepExtend(dsk, content.dsk)
						}
						break
					case MappingAtemType.SuperSourceBox:
						if (content.type === TimelineContentTypeAtem.SSRC) {
							const ssrc = AtemStateUtil.getSuperSource(deviceState, mapping.index)
							if (ssrc) {
								const objBoxes = content.ssrc.boxes
								_.each(objBoxes, (box, i) => {
									if (ssrc.boxes[i]) {
										deepExtend(ssrc.boxes[i], box)
									} else {
										ssrc.boxes[i] = {
											...StateDefault.Video.SuperSourceBox,
											...box,
										}
									}
								})
							}
						}
						break
					case MappingAtemType.SuperSourceProperties:
						if (content.type === TimelineContentTypeAtem.SSRCPROPS) {
							const ssrc = AtemStateUtil.getSuperSource(deviceState, mapping.index)
							if (!ssrc.properties) ssrc.properties = { ...StateDefault.Video.SuperSourceProperties }
							if (ssrc) deepExtend(ssrc.properties, content.ssrcProps)
						}
						break
					case MappingAtemType.Auxilliary:
						if (content.type === TimelineContentTypeAtem.AUX) {
							deviceState.video.auxilliaries[mapping.index] = content.aux.input
						}
						break
					case MappingAtemType.MediaPlayer:
						if (content.type === TimelineContentTypeAtem.MEDIAPLAYER) {
							const ms = AtemStateUtil.getMediaPlayer(deviceState, mapping.index)
							if (ms) deepExtend(ms, content.mediaPlayer)
						}
						break
					case MappingAtemType.AudioChannel:
						if (content.type === TimelineContentTypeAtem.AUDIOCHANNEL) {
							const chan = deviceState.audio?.channels[mapping.index]
							if (chan && deviceState.audio) {
								deviceState.audio.channels[mapping.index] = {
									...chan,
									...content.audioChannel,
								}
							}
						}
						break
				}
			}

			if (mapping.mappingType === MappingAtemType.MacroPlayer) {
				if (content.type === TimelineContentTypeAtem.MACROPLAYER) {
					const ms = deviceState.macro.macroPlayer
					if (ms) deepExtend(ms, content.macroPlayer)
				}
			}
		}
	})

	return deviceState
}

_.mixin({ deepExtend: underScoreDeepExtend(_) })

function deepExtend<T>(destination: T, ...sources: any[]) {
	// @ts-ignore (mixin)
	return _.deepExtend(destination, ...sources)
}

function isAssignableToNextStyle(transition: AtemTransitionStyle | undefined) {
	return transition !== undefined && transition !== AtemTransitionStyle.DUMMY && transition !== AtemTransitionStyle.CUT
}
