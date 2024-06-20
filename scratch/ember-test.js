const {
	Conductor,
	DeviceType,
	TimelineContentTypeCasparCg,
	MappingSisyfosType,
	MappingLawoType,
	LawoDeviceMode,
	TimelineContentTypeLawo,
} = require('../packages/timeline-state-resolver/dist')

;(async function () {
	const cond = new Conductor({ multiThreadedResolver: true, optimizeForProduction: true })
	cond.on('debug', console.log)
	cond.on('warn', console.log)
	cond.on('info', console.log)
	cond.on('error', console.log)

	const myLayerMapping0 = {
		device: DeviceType.LAWO,
		deviceId: 'lawo0',
		mappingType: MappingLawoType.FULL_PATH,
		identifier: 'Ruby.Sums.MAIN.DSP.Delay.On',
	}
	const myLayerMapping1 = {
		device: DeviceType.LAWO,
		deviceId: 'lawo0',
		mappingType: MappingLawoType.FULL_PATH,
		identifier: 'Ruby.Sums.MAIN.DSP.Delay.002',
	}
	const mappings = {
		myLayer0: myLayerMapping0,
		myLayer1: myLayerMapping1,
	}

	const dev = await cond.addDevice('lawo0', {
		type: DeviceType.LAWO,
		options: {
			host: '127.0.0.1',
			port: 9002,
			deviceMode: LawoDeviceMode.Ruby,
		},
		isMultiThreaded: true,
	})

	await cond.init()
	console.log('added')

	dev.device.on('debug', console.log)
	dev.device.on('info', console.log)
	dev.device.on('warning', console.log)
	dev.device.on('error', console.log)

	dev.device.on('connectionChanged', console.log)

	cond.setTimelineAndMappings(
		[
			{
				id: 'audio0',
				enable: {
					start: Date.now(),
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.EMBER_PROPERTY,

					value: false,
				},
				keyframes: [],
				isLookahead: true,
			},
			{
				id: 'audio1',
				enable: {
					start: Date.now(),
				},
				layer: 'myLayer1',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.EMBER_PROPERTY,

					value: 0,
				},
				keyframes: [],
				isLookahead: true,
			},
		],
		mappings
	)

	console.log('set tl')
})()
