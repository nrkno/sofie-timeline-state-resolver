import { SingularLiveControlNodeCommandContent, SingularLiveDevice } from '..'
import {
	SomeMappingSingularLive,
	Mapping,
	Mappings,
	DeviceType,
	TimelineContentTypeSingularLive,
	MappingSingularLiveType,
} from 'timeline-state-resolver-types'
import { getDeviceContext } from '../../__tests__/testlib'
import { makeTimelineObjectResolved } from '../../../__mocks__/objects'

describe('Singular.Live', () => {
	test('POST message', async () => {
		const myLayerMapping0: Mapping<SomeMappingSingularLive> = {
			device: DeviceType.SINGULAR_LIVE,
			deviceId: 'mySingular',
			options: {
				mappingType: MappingSingularLiveType.Composition,
				compositionName: 'Lower Third',
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const device = new SingularLiveDevice(getDeviceContext())

		const deviceState = device.convertTimelineStateToDeviceState(
			{
				time: 1000,
				layers: {
					myLayer0: makeTimelineObjectResolved({
						id: 'obj0',
						enable: {
							start: 1000,
							duration: 2000,
						},
						layer: 'myLayer0',
						content: {
							deviceType: DeviceType.SINGULAR_LIVE,
							type: TimelineContentTypeSingularLive.COMPOSITION,
							controlNode: {
								state: 'In',
								payload: {
									Name: 'Thomas',
									Title: 'Foreperson',
								},
							},
						},
					}),
				},
				nextEvents: [],
			},
			myLayerMapping
		)

		const commands = device.diffStates(undefined, deviceState, myLayerMapping, 1000)
		expect(commands).toHaveLength(1)
		expect(commands[0].command.content).toEqual<SingularLiveControlNodeCommandContent>({
			subCompositionName: 'Lower Third',
			state: 'In',
			payload: {
				Name: 'Thomas',
				Title: 'Foreperson',
			},
		})

		const deviceState2 = device.convertTimelineStateToDeviceState(
			{
				time: 2000,
				layers: {},
				nextEvents: [],
			},
			myLayerMapping
		)

		const commands2 = device.diffStates(deviceState, deviceState2, myLayerMapping, 2000)
		expect(commands2).toHaveLength(1)
		expect(commands2[0].command.content).toEqual<SingularLiveControlNodeCommandContent>({
			subCompositionName: 'Lower Third',
			state: 'Out',
		})
	})
})
