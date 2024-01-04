import { TSRInput } from '../src'
import { DeviceType } from 'timeline-state-resolver'

export const input: TSRInput = {
	devices: {
		// caspar0: {
		// 	type: DeviceType.CASPARCG,
		// 	options: {
		// 		host: '127.0.0.1',
		// 		port: 5250,
		// 	},
		// },
		obs0: {
			type: DeviceType.OBS,
			options: {
				host: '127.0.0.1',
				port: 4455,
				password: 'PT7WXMT3iRTUnche',
			},
		},
	},
}
