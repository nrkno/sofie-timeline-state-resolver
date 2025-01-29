import { PanasonicPtzDevice } from '..'
import {
	Mappings,
	DeviceType,
	Mapping,
	SomeMappingPanasonicPTZ,
	MappingPanasonicPTZType,
	Timeline,
	TSRTimelineContent,
	TimelineContentPanasonicPtzAny,
	TimelineContentTypePanasonicPtz,
} from 'timeline-state-resolver-types'
import { MockTime } from '../../../__tests__/mockTime'
import got from '../../../__mocks__/got'
import { Response } from 'got'
import { PanasonicPtzState } from '../state'
import { getDeviceContext } from '../../__tests__/testlib'
import { PanasonicPtzCommandWithContext } from '../diff'

const orgSetTimeout = setTimeout

async function getInitialisedDevice() {
	const dev = new PanasonicPtzDevice(getDeviceContext())
	await dev.init({ host: 'localhost', port: 8082 })
	return dev
}

describe('Panasonic PTZ', () => {
	jest.mock('got', () => got)

	const mockTime = new MockTime()

	const onGet = jest.fn(async (url, _options) => {
		return new Promise<Pick<Response, 'body' | 'statusCode'>>((resolve, reject) => {
			orgSetTimeout(() => {
				if (url === 'http://192.168.0.10:8000/cgi-bin/aw_ptz?cmd=%23O&res=1') {
					resolve({
						statusCode: 200,
						body: 'p1',
					})
				} else {
					reject(new Error('Unsupported mock'))
				}
			}, 1)
		})
	})
	got.setMockGet(onGet)
	beforeEach(() => {
		mockTime.init()
	})

	describe('convertTimelineStateToDeviceState', () => {
		async function compareState(tlState: Timeline.TimelineState<TSRTimelineContent>, expDevState: PanasonicPtzState) {
			const device = await getInitialisedDevice()

			const actualState = device.convertTimelineStateToDeviceState(tlState, myChannelMapping)

			expect(actualState).toEqual(expDevState)
		}

		test('convert empty state', async () => {
			await compareState(createTimelineState({}), {
				zoomSpeed: {
					timelineObjId: 'default',
					value: 0,
				},
			})
		})

		test('convert state', async () => {
			await compareState(
				createTimelineState({
					ptz_k1: {
						id: 'ptz_k1_0',
						content: {
							deviceType: DeviceType.PANASONIC_PTZ,
							type: TimelineContentTypePanasonicPtz.PRESET,

							preset: 2,
						},
					},
					ptz_k1_s: {
						id: 'ptz_k1_s_0',
						content: {
							deviceType: DeviceType.PANASONIC_PTZ,
							type: TimelineContentTypePanasonicPtz.SPEED,

							speed: 0,
						},
					},
					ptz_k1_z: {
						id: 'ptz_k1_z_0',
						content: {
							deviceType: DeviceType.PANASONIC_PTZ,
							type: TimelineContentTypePanasonicPtz.ZOOM,

							zoom: 2,
						},
					},
					ptz_k1_zs: {
						id: 'ptz_k1_zs_0',
						content: {
							deviceType: DeviceType.PANASONIC_PTZ,
							type: TimelineContentTypePanasonicPtz.ZOOM_SPEED,

							zoomSpeed: 0,
						},
					},
				}),
				{
					speed: {
						value: 0,
						timelineObjId: 'ptz_k1_s_0',
					},
					preset: {
						value: 2,
						timelineObjId: 'ptz_k1_0',
					},
					zoomSpeed: {
						value: 0,
						timelineObjId: 'ptz_k1_zs_0',
					},
					zoom: {
						value: 2,
						timelineObjId: 'ptz_k1_z_0',
					},
				}
			)
		})
	})

	describe('diffState', () => {
		async function compareStates(
			oldDevState: PanasonicPtzState | undefined,
			newDevState: PanasonicPtzState,
			expCommands: PanasonicPtzCommandWithContext[]
		) {
			const device = await getInitialisedDevice()

			const commands = device.diffStates(oldDevState, newDevState, {}, 0, 'test')

			expect(commands).toEqual(expCommands)
		}

		test('From undefined', async () => {
			await compareStates(undefined, {}, [])
		})

		test('Empty states', async () => {
			await compareStates({}, {}, [])
		})

		test('To state', async () => {
			await compareStates(
				{},
				{
					speed: {
						value: 0,
						timelineObjId: 'ptz_k1_s_0',
					},
					preset: {
						value: 2,
						timelineObjId: 'ptz_k1_0',
					},
					zoomSpeed: {
						value: 0,
						timelineObjId: 'ptz_k1_zs_0',
					},
					zoom: {
						value: 2,
						timelineObjId: 'ptz_k1_z_0',
					},
				},
				[
					{
						command: {
							type: TimelineContentTypePanasonicPtz.SPEED,
							speed: 0,
						},
						context: 'speed differ (0, undefined) (test)',
						timelineObjId: 'ptz_k1_s_0',
					},
					{
						command: {
							type: TimelineContentTypePanasonicPtz.ZOOM_SPEED,
							speed: 0,
						},
						context: 'zoom speed differ (0, undefined) (test)',
						timelineObjId: 'ptz_k1_zs_0',
					},
					{
						command: {
							type: TimelineContentTypePanasonicPtz.ZOOM,
							zoom: 2,
						},
						context: 'zoom differ (2, undefined) (test)',
						timelineObjId: 'ptz_k1_z_0',
					},
					{
						command: {
							type: TimelineContentTypePanasonicPtz.PRESET,
							preset: 2,
						},
						context: 'preset differ (2, undefined) (test)',
						timelineObjId: 'ptz_k1_0',
					},
				]
			)
		})

		test('From state to empty', async () => {
			await compareStates(
				{
					speed: {
						value: 0,
						timelineObjId: 'ptz_k1_s_0',
					},
					preset: {
						value: 2,
						timelineObjId: 'ptz_k1_0',
					},
					zoomSpeed: {
						value: 0,
						timelineObjId: 'ptz_k1_zs_0',
					},
					zoom: {
						value: 2,
						timelineObjId: 'ptz_k1_z_0',
					},
				},
				{},
				[]
			)
		})
	})
})

const myChannelMapping0: Mapping<SomeMappingPanasonicPTZ> = {
	device: DeviceType.PANASONIC_PTZ,
	deviceId: 'myPtz',
	options: {
		mappingType: MappingPanasonicPTZType.PresetMem,
	},
}
const myChannelMapping1: Mapping<SomeMappingPanasonicPTZ> = {
	device: DeviceType.PANASONIC_PTZ,
	deviceId: 'myPtz',
	options: {
		mappingType: MappingPanasonicPTZType.PresetSpeed,
	},
}
const myChannelMapping2: Mapping<SomeMappingPanasonicPTZ> = {
	device: DeviceType.PANASONIC_PTZ,
	deviceId: 'myPtz',
	options: {
		mappingType: MappingPanasonicPTZType.Zoom,
	},
}
const myChannelMapping3: Mapping<SomeMappingPanasonicPTZ> = {
	device: DeviceType.PANASONIC_PTZ,
	deviceId: 'myPtz',
	options: {
		mappingType: MappingPanasonicPTZType.ZoomSpeed,
	},
}
const myChannelMapping: Mappings = {
	ptz_k1: myChannelMapping0,
	ptz_k1_s: myChannelMapping1,
	ptz_k1_z: myChannelMapping2,
	ptz_k1_zs: myChannelMapping3,
}

function createTimelineState(
	objs: Record<string, { id: string; content: TimelineContentPanasonicPtzAny }>
): Timeline.TimelineState<TSRTimelineContent> {
	return {
		time: 10,
		layers: objs as any,
		nextEvents: [],
	}
}
