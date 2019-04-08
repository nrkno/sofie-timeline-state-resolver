
import {
	Conductor,
	DeviceType,
	ConductorOptions,
	Device,
	TimelineContentObject,
	TriggerType,
	TimelineTriggerTimeResult,
	DeviceOptions
} from '../src/' // from 'timeline-state-resolver'
import { TimelineContentTypeCasparCg } from '../src/devices/casparCG'

// Initialize TSR:
const tsr = new Conductor()
tsr.on('info', e => console.log('info', e))
tsr.on('warning', e => console.log('warning', e))
tsr.on('error', e => console.log('error', e))

let a = async function () {

	await tsr.init()

	await tsr.addDevice('casparcg0', {
		type: DeviceType.CASPARCG,
		options: {
			// useScheduling: true,
			host: '127.0.0.1'
			// port: 5250
		}
	})

	// Setup mappings from layers to outputs:
	tsr.mapping = {
		'layer0': {
			device: DeviceType.CASPARCG,
			deviceId: 'casparcg0',
			channel: 1,
			layer: 10
		}
	}

	setTimeout(() => {
		console.log('set timeline')
		tsr.timeline = [
			{
				id: 'video0',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: Date.now() + 500
				},
				duration: 60 * 1000,
				LLayer: 'layer0',
				content: {
					type: TimelineContentTypeCasparCg.MEDIA,
					attributes: {
						file: 'AMB',
						loop: true
					}
				}
			}
		]
		setTimeout(() => {
			console.log('set timeline')
			tsr.timeline = [
				{
					id: 'video0',
					trigger: {
						type: TriggerType.TIME_ABSOLUTE,
						value: Date.now()
					},
					duration: 60 * 1000,
					LLayer: 'layer0',
					content: {
						type: TimelineContentTypeCasparCg.MEDIA,
						attributes: {
							file: 'CG1080i50',
							loop: true
						}
					}
				},
				{
					id: 'video1',
					trigger: {
						type: TriggerType.TIME_ABSOLUTE,
						value: Date.now() + 5000
					},
					duration: 60 * 1000,
					LLayer: 'layer0',
					content: {
						type: TimelineContentTypeCasparCg.MEDIA,
						attributes: {
							file: 'AMB',
							loop: true
						}
					}
				}
			]
		}, 100)
	}, 1000)
	/*
		Note: This is a test to make sure that the sending of commands to CasparCG works correctly.
		What should display on the screen is:
		* 0.1s after start: CG1080i50 starts playing
		* 5.0s after start: AMB starts playing
	*/

}
a().catch(e => console.log(e))
