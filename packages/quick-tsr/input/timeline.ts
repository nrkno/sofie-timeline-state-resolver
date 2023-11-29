import {
	DeviceType,
	TimelineContentTypeCasparCg,
	TimelineContentCCGMedia,
	TSRTimelineObj,
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
	],
}
