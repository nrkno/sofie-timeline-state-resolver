import { DeviceType, MappingCasparCG } from 'timeline-state-resolver'
import { literal } from 'timeline-state-resolver/dist/devices/device'
import type { TSRInput } from '../src'

export const input: TSRInput = {
	mappings: {
		casparLayer0: literal<MappingCasparCG>({
			device: DeviceType.CASPARCG,
			deviceId: 'caspar0',
			channel: 1,
			layer: 10,
		}),
	},
}
