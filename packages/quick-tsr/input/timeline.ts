import {
	DeviceType,
	TimelineContentTypeCasparCg,
	TimelineContentCCGMedia,
	TSRTimelineObj,
	TimelineContentOBSAny,
	TimelineContentTypeOBS,
	TSRTimelineKeyframe,
} from 'timeline-state-resolver'
import { TSRInput } from '../src'
import { literal } from 'timeline-state-resolver/dist/lib'

export const input: TSRInput = {
	timeline: [
		literal<TSRTimelineObj<TimelineContentCCGMedia>>({
			id: 'video0',
			enable: {
				start: Date.now(),
				duration: 20 * 1000,
			},
			layer: 'casparLayer0',
			content: {
				deviceType: DeviceType.CASPARCG,
				type: TimelineContentTypeCasparCg.MEDIA,
				file: 'amb',
				mixer: {
					rotation: 0,
					anchor: {
						x: 0.5,
						y: 0.5,
					},
					fill: {
						x: 0.5,
						y: 0.5,
						xScale: 0.7,
						yScale: 1,
					},
				},

				$references: {
					'mixer.fill.xScale': {
						// Local path to overwrite
						datastoreKey: 'scale', // Reference key in datastore
						overwrite: false,
					},
					'mixer.fill.yScale': {
						// Local path to overwrite
						datastoreKey: 'scale', // Reference key in datastore
						overwrite: false,
					},
				},
			},
			/*
			keyframes: [
				{
					id: 'kf0',
					enable: {
						start: 1000,
						duration: 5000,
					},
					content: {
						mixer: {
							rotation: 45,
							changeTransition: {
								duration: 5000,
								easing: Ease.LINEAR,
							},
						},
					},
				},
				{
					id: 'kf1',
					enable: {
						start: 1,
					},
					content: {
						mixer: {
							changeTransition: {
								duration: 5000,
								easing: Ease.LINEAR,
							},
						},
					},
				},
			],
			*/
		}),

		literal<TSRTimelineObj<TimelineContentOBSAny>>({
			id: 'scene0',
			disabled: true,
			enable: {
				start: Date.now(),
				duration: 20 * 1000,
			},
			layer: 'obsLayer0',
			content: {
				deviceType: DeviceType.OBS,
				type: TimelineContentTypeOBS.CURRENT_SCENE,

				sceneName: 'Screen cap',
			},
			keyframes: [
				literal<TSRTimelineKeyframe<TimelineContentOBSAny>>({
					id: 'kf0',
					enable: {
						start: 0,
						// end: Date.now() + 20 * 1000,
						duration: 3 * 1000,
						repeating: 6 * 1000,
					},
					content: {
						deviceType: DeviceType.OBS,
						type: TimelineContentTypeOBS.CURRENT_SCENE,

						sceneName: 'Scene 1',
					},
				}),
			],
		}),

		literal<TSRTimelineObj<TimelineContentOBSAny>>({
			id: 'audio0',
			disabled: true,
			enable: {
				start: Date.now(),
				duration: 20 * 1000,
			},
			priority: 1,
			layer: 'obsLayerAudio',
			content: {
				deviceType: DeviceType.OBS,
				type: TimelineContentTypeOBS.INPUT_AUDIO,

				volume: -10,
			},
			keyframes: [
				literal<TSRTimelineKeyframe<TimelineContentOBSAny>>({
					id: 'kf1',
					enable: {
						start: 0,
						// end: Date.now() + 20 * 1000,
						duration: 1 * 1000,
						repeating: 2 * 1000,
					},
					content: {
						deviceType: DeviceType.OBS,
						type: TimelineContentTypeOBS.INPUT_AUDIO,

						volume: 0,
					},
				}),
			],
		}),

		literal<TSRTimelineObj<TimelineContentOBSAny>>({
			id: 'sceneItem0',
			disabled: true,
			enable: {
				start: Date.now(),
				duration: 20 * 1000,
			},
			priority: 1,
			layer: 'obsLayerSceneItem',
			content: {
				deviceType: DeviceType.OBS,
				type: TimelineContentTypeOBS.SCENE_ITEM,

				transform: {
					positionX: 1176,
					positionY: 388,
				},
			},
			keyframes: [
				literal<TSRTimelineKeyframe<TimelineContentOBSAny>>({
					id: 'sceneItem0_kf1',
					enable: {
						start: 0,
						// end: Date.now() + 20 * 1000,
						duration: 1 * 1000,
						repeating: 2 * 1000,
					},
					content: {
						deviceType: DeviceType.OBS,
						type: TimelineContentTypeOBS.SCENE_ITEM,

						transform: {
							positionX: 104,
							positionY: 52,
						},
					},
				}),
			],
		}),

		literal<TSRTimelineObj<TimelineContentOBSAny>>({
			id: 'media0',
			disabled: false,
			enable: {
				start: Date.now() - 30 * 1000,
				duration: 120 * 1000,
			},
			priority: 1,
			layer: 'obsLayerMedia',
			content: {
				deviceType: DeviceType.OBS,
				type: TimelineContentTypeOBS.INPUT_MEDIA,

				state: 'paused',
			},
			keyframes: [
				literal<TSRTimelineKeyframe<TimelineContentOBSAny>>({
					id: 'media_kf0',
					disabled: true,
					enable: {
						start: 1000,
						// end: Date.now() + 20 * 1000,
						// duration: 1 * 1000,
						// repeating: 2 * 1000,
					},
					content: {
						deviceType: DeviceType.OBS,
						type: TimelineContentTypeOBS.INPUT_MEDIA,

						// state: 'playing',
						seek: 1,
					},
				}),
			],
		}),
	],
}
