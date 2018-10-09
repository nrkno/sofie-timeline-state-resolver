//ES6 example code based on playVideoInCaspar.ts
//copy and paste it to your own project

const { Conductor,
        DeviceType,
        ConductorOptions,
        Device,
        TimelineContentObject,
        TriggerType,
        TimelineTriggerTimeResult,
        DeviceOptions
	} = require("timeline-state-resolver");

// Initialize TimelineStateResolver:
const tsrConductor = new Conductor({
	externalLog: console.log
});
tsrConductor.on('error', e => console.log('error', e));
tsrConductor.on('info', e => console.log('info', e));
tsrConductor.on('command', (deviceId, cmd) => console.log('command', deviceId, cmd));
// tsrConductor.on('timelineCallback', e => console.log('timelineCallback', e))

tsrConductor.init()
.then((response) => {
	tsrConductor.addDevice('casparcg0', {
		type: DeviceType.CASPARCG,
		options: {
			host: '91.224.210.82',
			port: 21914
		},
		externalLog: (...args) => console.log(...args)
	});
})
.then((response) => { // Setup mappings from layers to outputs:
	tsrConductor.mapping = {
    'layer1-10': {
		device: DeviceType.CASPARCG,
		deviceId: 'casparcg0',
		channel: 1,
		layer: 10
    	}
	};
})
.then((response) => {
	// Set a new timeline:
	var video0 = ({
		id: 'video0',
		trigger: {
			type: TriggerType.TIME_ABSOLUTE,
			value: Date.now()
		},
		duration: 60 * 1000,
		LLayer: 'layer1-10',
		content: {
		type: 'video',
		attributes: {
			file: 'go1080p25',
			loop: true
		}
		// playing: false,
		// pauseTime: Date.now()
		} 
	});
	console.log('set timeline');
	tsrConductor.timeline = [
		video0
	];
});