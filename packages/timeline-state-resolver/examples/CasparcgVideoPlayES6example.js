//ES6 example code based on playVideoInCaspar.ts
//copy and paste it to your own project

const { Conductor, DeviceType, MappingCasparCGType } = require('timeline-state-resolver')

// Initialize TimelineStateResolver:
const tsrConductor = new Conductor()
tsrConductor.on('error', (e) => console.log('error', e))
tsrConductor.on('info', (e) => console.log('info', e))
tsrConductor.on('warning', (e) => console.log('warning', e))
//tsrConductor.on('debug', (msg, msg2) => console.log('debug', msg, msg2));

tsrConductor
	.init()
	.then(() => {
		// Add devices to the TSR-conductor:
		return tsrConductor.connectionManager.setConnections({
			casparcg0: {
				type: DeviceType.CASPARCG,
				options: {
					host: 'localhost',
					port: 5250,
				},
			},
		})
	})
	.then(() => {
		// Setup mappings from timeline-layers to device-outputs:
		tsrConductor.mapping = {
			'layer1-10': {
				device: DeviceType.CASPARCG,
				deviceId: 'casparcg0',
				options: {
					mappingType: MappingCasparCGType.Layer,
					channel: 1,
					layer: 10,
				},
			},
		}
	})
	.then(() => {
		// Set a new timeline:
		const video0 = {
			id: 'video0', // the id must be unique
			enable: {
				start: Date.now(), // This will cause the video to start playing "now"
				duration: 60 * 1000, // Duration / How long the video will be played
			},
			layer: 'layer1-10',
			content: {
				deviceType: DeviceType.CASPARCG,
				type: 'video',

				file: 'go1080p25', // The file name of the video
				loop: true, // true will cause the video to loop

				// playing: false, // Set to true to pause the clip
				// pauseTime: Date.now() // the time at which the clip was paused
			},
		}
		console.log('set timeline')
		tsrConductor.setTimelineAndMappings([video0])
		// After the timeline has been set, the TSR Conductor will make sure it starts playing
	})
