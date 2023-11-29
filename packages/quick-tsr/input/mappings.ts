import { DeviceType, Mapping, MappingCasparCGType, SomeMappingCasparCG } from 'timeline-state-resolver'
import { literal } from 'timeline-state-resolver/dist/lib'
import type { TSRInput } from '../src'

export const input: TSRInput = {
	mappings: {
		casparLayer0: literal<Mapping<SomeMappingCasparCG>>({
			device: DeviceType.CASPARCG,
			deviceId: 'caspar0',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 1,
				layer: 10,
			},
		}),
	},
}
