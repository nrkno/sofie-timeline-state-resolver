import { TSRInput } from '../src'
import { DeviceType } from 'timeline-state-resolver'

export const input: TSRInput = {
	devices: {
		caspar0: {
			type: DeviceType.CASPARCG,
			options: {
				host: '127.0.0.1',
				port: 5250,
			},
		},
	},
}
