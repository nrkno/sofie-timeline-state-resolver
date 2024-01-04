import {
	DeviceType,
	Mapping,
	MappingCasparCGType,
	MappingObsType,
	SomeMappingCasparCG,
	SomeMappingObs,
} from 'timeline-state-resolver'
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

		obsLayer0: literal<Mapping<SomeMappingObs>>({
			device: DeviceType.OBS,
			deviceId: 'obs0',
			options: {
				mappingType: MappingObsType.CurrentScene,
			},
		}),
		obsLayerAudio: literal<Mapping<SomeMappingObs>>({
			device: DeviceType.OBS,
			deviceId: 'obs0',
			options: {
				mappingType: MappingObsType.InputAudio,
				input: 'Media Source',
			},
		}),
		obsLayerMedia: literal<Mapping<SomeMappingObs>>({
			device: DeviceType.OBS,
			deviceId: 'obs0',
			options: {
				mappingType: MappingObsType.InputMedia,
				input: 'Media Source',
			},
		}),
		obsLayerSceneItem: literal<Mapping<SomeMappingObs>>({
			device: DeviceType.OBS,
			deviceId: 'obs0',
			options: {
				mappingType: MappingObsType.SceneItem,
				sceneName: 'Scene 1',
				source: 'Image',
			},
		}),
	},
}
