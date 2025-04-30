import * as AtemConnection from 'atem-connection'
import {
	AtemTransitionStyle,
	DeviceType,
	Mapping,
	MappingAtemAudioChannel,
	MappingAtemAudioRouting,
	MappingAtemAuxilliary,
	MappingAtemColorGenerator,
	MappingAtemDownStreamKeyer,
	MappingAtemMacroPlayer,
	MappingAtemMediaPlayer,
	MappingAtemMixEffect,
	MappingAtemSuperSourceBox,
	MappingAtemSuperSourceProperties,
	MappingAtemType,
	Mappings,
	MediaSourceType,
	TSRTimelineContent,
	Timeline,
	TimelineContentAtemAUX,
	TimelineContentAtemAudioChannel,
	TimelineContentAtemAudioRouting,
	TimelineContentAtemColorGenerator,
	TimelineContentAtemDSK,
	TimelineContentAtemMacroPlayer,
	TimelineContentAtemMediaPlayer,
	TimelineContentAtemSsrc,
	TimelineContentAtemSsrcProps,
	TimelineContentTypeAtem,
} from 'timeline-state-resolver-types'
import { makeTimelineObjectResolved } from '../../../__mocks__/objects'
import { AtemStateBuilder, InternalAtemConnectionState } from '../stateBuilder'
import { SuperSourceArtOption } from 'atem-connection/dist/enums'
import { cloneDeep } from '../../../lib'
import { Defaults } from 'atem-state'

describe('AtemStateBuilder', () => {
	describe('MixEffect', () => {
		const myLayerMapping0: Mapping<MappingAtemMixEffect> = {
			device: DeviceType.ATEM,
			deviceId: 'myAtem',
			options: {
				mappingType: MappingAtemType.MixEffect,
				index: 0,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		test('Cut Input', async () => {
			const mockState1: Timeline.StateInTime<TSRTimelineContent> = {
				myLayer0: makeTimelineObjectResolved({
					id: 'obj0',
					enable: {
						start: -1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.ME,
						me: {
							input: 2,
							transition: AtemTransitionStyle.CUT,
						},
					},
				}),
			}

			const expectedState = AtemConnection.AtemStateUtil.Create() as InternalAtemConnectionState
			Object.assign(AtemConnection.AtemStateUtil.getMixEffect(expectedState, 0), {
				input: 2,
				transition: AtemTransitionStyle.CUT,
			})

			expectedState.controlValues = { 'video.mixEffects.0.base': '0', 'video.mixEffects.0.pgm': '0' }

			const deviceState1 = AtemStateBuilder.fromTimeline(mockState1, myLayerMapping)
			expect(deviceState1).toEqual(expectedState)
		})

		test('Wipe Input', async () => {
			const mockState1: Timeline.StateInTime<TSRTimelineContent> = {
				myLayer0: makeTimelineObjectResolved({
					id: 'obj0',
					enable: {
						start: -1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.ME,
						me: {
							input: 2,
							transition: AtemTransitionStyle.WIPE,
						},
					},
				}),
			}

			const expectedState = AtemConnection.AtemStateUtil.Create() as InternalAtemConnectionState
			const expectedMixEffect = AtemConnection.AtemStateUtil.getMixEffect(expectedState, 0)
			Object.assign(expectedMixEffect, {
				input: 2,
				transition: AtemTransitionStyle.WIPE,
			})
			expectedMixEffect.transitionProperties.nextStyle = AtemConnection.Enums.TransitionStyle.WIPE

			expectedState.controlValues = { 'video.mixEffects.0.base': '0', 'video.mixEffects.0.pgm': '0' }

			const deviceState1 = AtemStateBuilder.fromTimeline(mockState1, myLayerMapping)
			expect(deviceState1).toEqual(expectedState)
		})

		test('Upstream keyer', async () => {
			const mockState1: Timeline.StateInTime<TSRTimelineContent> = {
				myLayer0: makeTimelineObjectResolved({
					id: 'obj0',
					enable: {
						start: -1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.ME,
						me: {
							upstreamKeyers: [
								{
									upstreamKeyerId: 0,

									lumaSettings: {
										preMultiplied: false,
										clip: 300,
										gain: 2,
										invert: true,
									},
								},
							],
						},
					},
				}),
			}

			const expectedState = AtemConnection.AtemStateUtil.Create() as InternalAtemConnectionState
			const expectedMixEffect = AtemConnection.AtemStateUtil.getMixEffect(expectedState, 0)
			AtemConnection.AtemStateUtil.getUpstreamKeyer(expectedMixEffect, 0).lumaSettings = {
				preMultiplied: false,
				clip: 300,
				gain: 2,
				invert: true,
			}

			expectedState['controlValues'] = { 'video.mixEffects.0.usk.0': '0' }

			const deviceState1 = AtemStateBuilder.fromTimeline(mockState1, myLayerMapping)
			expect(deviceState1).toEqual(expectedState)
		})

		test('Upstream keyer: Uses upstreamKeyerId as index', async () => {
			const mockState1: Timeline.StateInTime<TSRTimelineContent> = {
				myLayer0: makeTimelineObjectResolved({
					id: 'obj0',
					enable: {
						start: -1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.ME,
						me: {
							upstreamKeyers: [
								{
									upstreamKeyerId: 2,

									lumaSettings: {
										preMultiplied: false,
										clip: 300,
										gain: 2,
										invert: true,
									},
								},
							],
						},
					},
				}),
			}

			const expectedState = AtemConnection.AtemStateUtil.Create() as InternalAtemConnectionState
			const expectedMixEffect = AtemConnection.AtemStateUtil.getMixEffect(expectedState, 0)
			AtemConnection.AtemStateUtil.getUpstreamKeyer(expectedMixEffect, 2).lumaSettings = {
				preMultiplied: false,
				clip: 300,
				gain: 2,
				invert: true,
			}
			expect(expectedMixEffect.upstreamKeyers).toHaveLength(3)

			expectedState.controlValues = { 'video.mixEffects.0.usk.2': '0' }

			const deviceState1 = AtemStateBuilder.fromTimeline(mockState1, myLayerMapping)
			expect(deviceState1).toEqual(expectedState)
		})
	})

	describe('Downstream keyer', () => {
		const myLayerMapping0: Mapping<MappingAtemDownStreamKeyer> = {
			device: DeviceType.ATEM,
			deviceId: 'myAtem',
			options: {
				mappingType: MappingAtemType.DownStreamKeyer,
				index: 0,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		test('Basic', async () => {
			const mockState1: Timeline.StateInTime<TimelineContentAtemDSK> = {
				myLayer0: makeTimelineObjectResolved({
					id: 'obj0',
					enable: {
						start: -1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.DSK,
						dsk: {
							onAir: true,
							properties: {
								preMultiply: false,
								clip: 300,
								gain: 2,
								invert: true,
								tie: true,
								rate: 90,
								mask: {
									enabled: true,
									left: 1,
									right: 2,
									top: -1,
									bottom: -2,
								},
							},
						},
					},
				}),
			}

			const expectedState = AtemConnection.AtemStateUtil.Create() as InternalAtemConnectionState
			const expectedDSK = AtemConnection.AtemStateUtil.getDownstreamKeyer(expectedState, 0)
			expectedDSK.onAir = true
			expectedDSK.properties = {
				preMultiply: false,
				clip: 300,
				gain: 2,
				invert: true,
				tie: true,
				rate: 90,
				mask: {
					enabled: true,
					left: 1,
					right: 2,
					top: -1,
					bottom: -2,
				},
			}
			expect(expectedState.video.downstreamKeyers).toHaveLength(1)

			expectedState.controlValues = { 'video.dsk.0': '0' }

			const deviceState1 = AtemStateBuilder.fromTimeline(mockState1, myLayerMapping)
			expect(deviceState1).toEqual(expectedState)
		})
	})

	describe('SuperSource Box', () => {
		const myLayerMapping0: Mapping<MappingAtemSuperSourceBox> = {
			device: DeviceType.ATEM,
			deviceId: 'myAtem',
			options: {
				mappingType: MappingAtemType.SuperSourceBox,
				index: 0,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		test('Basic', async () => {
			const mockState1: Timeline.StateInTime<TimelineContentAtemSsrc> = {
				myLayer0: makeTimelineObjectResolved({
					id: 'obj0',
					enable: {
						start: -1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.SSRC,
						ssrc: {
							boxes: [
								{
									enabled: true,
									source: 123,
									x: 4,
									y: 5,
									size: 6,
									cropped: true,
									cropTop: 7,
									cropBottom: 8,
									cropLeft: 9,
									cropRight: 10,
								},
							],
						},
					},
				}),
			}

			const expectedState = AtemConnection.AtemStateUtil.Create() as InternalAtemConnectionState
			const expectedSuperSource = AtemConnection.AtemStateUtil.getSuperSource(expectedState, 0)
			expectedSuperSource.boxes[0] = {
				enabled: true,
				source: 123,
				x: 4,
				y: 5,
				size: 6,
				cropped: true,
				cropTop: 7,
				cropBottom: 8,
				cropLeft: 9,
				cropRight: 10,
			}
			expect(expectedState.video.superSources).toHaveLength(1)

			expectedState.controlValues = { 'video.superSource.0': '0' }

			const deviceState1 = AtemStateBuilder.fromTimeline(mockState1, myLayerMapping)
			expect(deviceState1).toEqual(expectedState)
		})
	})

	describe('SuperSource Properties', () => {
		const myLayerMapping0: Mapping<MappingAtemSuperSourceProperties> = {
			device: DeviceType.ATEM,
			deviceId: 'myAtem',
			options: {
				mappingType: MappingAtemType.SuperSourceProperties,
				index: 0,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		test('Basic', async () => {
			const mockState1: Timeline.StateInTime<TimelineContentAtemSsrcProps> = {
				myLayer0: makeTimelineObjectResolved({
					id: 'obj0',
					enable: {
						start: -1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.SSRCPROPS,
						ssrcProps: {
							artFillSource: 1,
							artCutSource: 2,
							artOption: 1,
							artPreMultiplied: false,
							artClip: 30,
							artGain: 40,
							artInvertKey: true,
							borderEnabled: false,
						},
					},
				}),
			}

			const expectedState = AtemConnection.AtemStateUtil.Create() as InternalAtemConnectionState

			const expectedSuperSource = AtemConnection.AtemStateUtil.getSuperSource(expectedState, 0)
			expectedSuperSource.properties = {
				artFillSource: 1,
				artCutSource: 2,
				artOption: SuperSourceArtOption.Foreground,
				artPreMultiplied: false,
				artClip: 30,
				artGain: 40,
				artInvertKey: true,
			}
			expectedSuperSource.border = cloneDeep(Defaults.Video.SuperSourceBorder)
			expect(expectedState.video.superSources).toHaveLength(1)

			expectedState.controlValues = {
				'video.superSource.0': '0',
			}

			const deviceState1 = AtemStateBuilder.fromTimeline(mockState1, myLayerMapping)
			expect(deviceState1).toEqual(expectedState)
		})
	})

	describe('Auxilliary', () => {
		const myLayerMapping0: Mapping<MappingAtemAuxilliary> = {
			device: DeviceType.ATEM,
			deviceId: 'myAtem',
			options: {
				mappingType: MappingAtemType.Auxilliary,
				index: 2,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		test('Basic', async () => {
			const mockState1: Timeline.StateInTime<TimelineContentAtemAUX> = {
				myLayer0: makeTimelineObjectResolved({
					id: 'obj0',
					enable: {
						start: -1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.AUX,
						aux: {
							input: 5,
						},
					},
				}),
			}

			const expectedState = AtemConnection.AtemStateUtil.Create()
			expectedState.video.auxilliaries[2] = 5

			const deviceState1 = AtemStateBuilder.fromTimeline(mockState1, myLayerMapping)
			expect(deviceState1).toEqual(expectedState)
		})
	})

	describe('Media Player', () => {
		const myLayerMapping0: Mapping<MappingAtemMediaPlayer> = {
			device: DeviceType.ATEM,
			deviceId: 'myAtem',
			options: {
				mappingType: MappingAtemType.MediaPlayer,
				index: 1,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		test('Basic', async () => {
			const mockState1: Timeline.StateInTime<TimelineContentAtemMediaPlayer> = {
				myLayer0: makeTimelineObjectResolved({
					id: 'obj0',
					enable: {
						start: -1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.MEDIAPLAYER,
						mediaPlayer: {
							sourceType: MediaSourceType.Clip,
							clipIndex: 2,
							stillIndex: 3,

							playing: true,
							loop: true,
							atBeginning: true,
							clipFrame: 4,
						},
					},
				}),
			}

			const expectedState = AtemConnection.AtemStateUtil.Create()
			const expectedMediaPlayer = AtemConnection.AtemStateUtil.getMediaPlayer(expectedState, 1)
			Object.assign(expectedMediaPlayer, {
				sourceType: MediaSourceType.Clip,
				clipIndex: 2,
				stillIndex: 3,

				playing: true,
				loop: true,
				atBeginning: true,
				clipFrame: 4,
			})
			expect(expectedState.media.players).toHaveLength(2)

			const deviceState1 = AtemStateBuilder.fromTimeline(mockState1, myLayerMapping)
			expect(deviceState1).toEqual(expectedState)
		})
	})

	describe('Classic Audio Channel', () => {
		const myLayerMapping0: Mapping<MappingAtemAudioChannel> = {
			device: DeviceType.ATEM,
			deviceId: 'myAtem',
			options: {
				mappingType: MappingAtemType.AudioChannel,
				index: 1,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		test('Basic', async () => {
			const mockState1: Timeline.StateInTime<TimelineContentAtemAudioChannel> = {
				myLayer0: makeTimelineObjectResolved({
					id: 'obj0',
					enable: {
						start: -1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.AUDIOCHANNEL,
						audioChannel: {
							gain: 123,
							balance: 456,
							mixOption: 2,
						},
					},
				}),
			}

			const expectedState = AtemConnection.AtemStateUtil.Create()
			expect(expectedState.audio?.channels).toBeFalsy()
			expectedState.audio = { channels: {} }

			expectedState.audio.channels[1] = Object.assign(cloneDeep(Defaults.ClassicAudio.Channel), {
				gain: 123,
				balance: 456,
				mixOption: 2,
			})

			const deviceState1 = AtemStateBuilder.fromTimeline(mockState1, myLayerMapping)
			expect(deviceState1).toEqual(expectedState)
		})
	})

	describe('Audio Routing', () => {
		const myLayerMapping0: Mapping<MappingAtemAudioRouting> = {
			device: DeviceType.ATEM,
			deviceId: 'myAtem',
			options: {
				mappingType: MappingAtemType.AudioRouting,
				index: 123,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		test('Basic', async () => {
			const mockState1: Timeline.StateInTime<TimelineContentAtemAudioRouting> = {
				myLayer0: makeTimelineObjectResolved({
					id: 'obj0',
					enable: {
						start: -1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.AUDIOROUTING,
						audioRouting: {
							sourceId: 456,
						},
					},
				}),
			}

			const expectedState = AtemConnection.AtemStateUtil.Create()
			expectedState.fairlight = {
				inputs: {},
			}
			expectedState.fairlight.audioRouting = {
				sources: {},
				outputs: {},
			}

			expectedState.fairlight.audioRouting.outputs[123] = {
				// readonly props, they won't be diffed
				audioOutputId: 123,
				audioChannelPair: 0,
				externalPortType: 0,
				internalPortType: 0,

				name: `Output 123`,
				sourceId: 456,
			}

			const deviceState1 = AtemStateBuilder.fromTimeline(mockState1, myLayerMapping)
			expect(deviceState1).toEqual(expectedState)
		})
	})

	describe('Macro Player', () => {
		const myLayerMapping0: Mapping<MappingAtemMacroPlayer> = {
			device: DeviceType.ATEM,
			deviceId: 'myAtem',
			options: {
				mappingType: MappingAtemType.MacroPlayer,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		test('Basic', async () => {
			const mockState1: Timeline.StateInTime<TimelineContentAtemMacroPlayer> = {
				myLayer0: makeTimelineObjectResolved({
					id: 'obj0',
					enable: {
						start: -1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.MACROPLAYER,
						macroPlayer: {
							macroIndex: 4,
							isRunning: true,
							loop: true,
						},
					},
				}),
			}

			const expectedState = AtemConnection.AtemStateUtil.Create()
			expectedState.macro.macroPlayer = {
				isRunning: true,
				isWaiting: false,
				loop: true,
				macroIndex: 4,
			}

			const deviceState1 = AtemStateBuilder.fromTimeline(mockState1, myLayerMapping)
			expect(deviceState1).toEqual(expectedState)
		})
	})

	describe('Color Generator', () => {
		const myLayerMapping0: Mapping<MappingAtemColorGenerator> = {
			device: DeviceType.ATEM,
			deviceId: 'myAtem',
			options: {
				mappingType: MappingAtemType.ColorGenerator,
				index: 0,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		test('Basic', async () => {
			const mockState1: Timeline.StateInTime<TimelineContentAtemColorGenerator> = {
				myLayer0: makeTimelineObjectResolved<TimelineContentAtemColorGenerator>({
					id: 'obj0',
					enable: {
						start: -1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ATEM,
						type: TimelineContentTypeAtem.COLORGENERATOR,
						colorGenerator: {
							hue: 123,
							luma: 456,
							saturation: 789,
						},
					},
				}),
			}

			const expectedState = AtemConnection.AtemStateUtil.Create()
			expectedState.colorGenerators = {
				[0]: {
					hue: 123,
					luma: 456,
					saturation: 789,
				},
			}

			const deviceState1 = AtemStateBuilder.fromTimeline(mockState1, myLayerMapping)
			expect(deviceState1).toEqual(expectedState)
		})
	})
})
