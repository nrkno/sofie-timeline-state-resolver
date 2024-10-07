import {
	DeviceType,
	Mapping,
	MappingHyperdeckType,
	Mappings,
	SomeMappingHyperdeck,
	TSRTimelineContent,
	Timeline,
	TimelineContentHyperdeckAny,
	TimelineContentTypeHyperdeck,
	TransportStatus,
} from 'timeline-state-resolver-types'
import { convertTimelineStateToHyperdeckState, getDefaultHyperdeckState } from '../stateBuilder'
import { makeTimelineObjectResolved } from '../../../__mocks__/objects'

describe('State Builder', () => {
	describe('Transport', () => {
		const myLayerMapping0: Mapping<SomeMappingHyperdeck> = {
			device: DeviceType.HYPERDECK,
			deviceId: 'hyperdeck0',
			options: {
				mappingType: MappingHyperdeckType.Transport,
			},
		}

		const myLayerMappings: Mappings = {
			myLayer0: myLayerMapping0,
		}

		test('No objects', async () => {
			const mockState1: Timeline.StateInTime<TSRTimelineContent> = {}

			const expectedState = getDefaultHyperdeckState()

			const deviceState1 = convertTimelineStateToHyperdeckState(mockState1, myLayerMappings)
			expect(deviceState1).toEqual(expectedState)
		})

		test('Preview', async () => {
			const mockState1: Timeline.StateInTime<TimelineContentHyperdeckAny> = {
				myLayer0: makeTimelineObjectResolved({
					id: 'obj0',
					enable: {
						start: -1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.HYPERDECK,
						type: TimelineContentTypeHyperdeck.TRANSPORT,
						status: TransportStatus.PREVIEW,
					},
				}),
			}

			const expectedState = getDefaultHyperdeckState()
			expectedState.transport.status = TransportStatus.PREVIEW

			const deviceState1 = convertTimelineStateToHyperdeckState(mockState1, myLayerMappings)
			expect(deviceState1).toEqual(expectedState)
		})

		test('Stopped', async () => {
			const mockState1: Timeline.StateInTime<TimelineContentHyperdeckAny> = {
				myLayer0: makeTimelineObjectResolved({
					id: 'obj0',
					enable: {
						start: -1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.HYPERDECK,
						type: TimelineContentTypeHyperdeck.TRANSPORT,
						status: TransportStatus.STOPPED,
					},
				}),
			}

			const expectedState = getDefaultHyperdeckState()
			expectedState.transport.status = TransportStatus.STOPPED

			const deviceState1 = convertTimelineStateToHyperdeckState(mockState1, myLayerMappings)
			expect(deviceState1).toEqual(expectedState)
		})

		test('Recording', async () => {
			const mockState1: Timeline.StateInTime<TimelineContentHyperdeckAny> = {
				myLayer0: makeTimelineObjectResolved({
					id: 'obj0',
					enable: {
						start: -1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.HYPERDECK,
						type: TimelineContentTypeHyperdeck.TRANSPORT,
						status: TransportStatus.RECORD,
						recordFilename: undefined,
					},
				}),
			}

			const expectedState = getDefaultHyperdeckState()
			expectedState.transport.status = TransportStatus.RECORD

			const deviceState1 = convertTimelineStateToHyperdeckState(mockState1, myLayerMappings)
			expect(deviceState1).toEqual(expectedState)
		})

		test('Recording with filename', async () => {
			const mockState1: Timeline.StateInTime<TimelineContentHyperdeckAny> = {
				myLayer0: makeTimelineObjectResolved({
					id: 'obj0',
					enable: {
						start: -1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.HYPERDECK,
						type: TimelineContentTypeHyperdeck.TRANSPORT,
						status: TransportStatus.RECORD,
						recordFilename: 'test',
					},
				}),
			}

			const expectedState = getDefaultHyperdeckState()
			expectedState.transport.status = TransportStatus.RECORD
			expectedState.transport.recordFilename = 'test'

			const deviceState1 = convertTimelineStateToHyperdeckState(mockState1, myLayerMappings)
			expect(deviceState1).toEqual(expectedState)
		})

		test('Playing', async () => {
			const mockState1: Timeline.StateInTime<TimelineContentHyperdeckAny> = {
				myLayer0: makeTimelineObjectResolved({
					id: 'obj0',
					enable: {
						start: -1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.HYPERDECK,
						type: TimelineContentTypeHyperdeck.TRANSPORT,
						status: TransportStatus.PLAY,
						clipId: 14,
					},
				}),
			}

			const expectedState = getDefaultHyperdeckState()
			expectedState.transport.status = TransportStatus.PLAY
			expectedState.transport.clipId = 14

			const deviceState1 = convertTimelineStateToHyperdeckState(mockState1, myLayerMappings)
			expect(deviceState1).toEqual(expectedState)
		})

		test('Playing with props', async () => {
			const mockState1: Timeline.StateInTime<TimelineContentHyperdeckAny> = {
				myLayer0: makeTimelineObjectResolved({
					id: 'obj0',
					enable: {
						start: -1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.HYPERDECK,
						type: TimelineContentTypeHyperdeck.TRANSPORT,
						status: TransportStatus.PLAY,
						clipId: null,
						speed: 110,
					},
				}),
			}

			const expectedState = getDefaultHyperdeckState()
			expectedState.transport.status = TransportStatus.PLAY
			expectedState.transport.speed = 110

			const deviceState1 = convertTimelineStateToHyperdeckState(mockState1, myLayerMappings)
			expect(deviceState1).toEqual(expectedState)
		})
	})
})
