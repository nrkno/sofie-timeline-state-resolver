/* eslint-disable jest/expect-expect */
import { TSRTimelineContent, TimelineContentAbstractAny, Timeline, DeviceType } from 'timeline-state-resolver-types'
import { AbstractCommandWithContext, AbstractDevice, AbstractDeviceState } from '..'
import { StatusCode } from '../../../devices/device'
import { MockTime } from '../../../__tests__/mockTime'
import { ResolvedTimelineObjectInstance } from 'timeline-state-resolver-types/dist/superfly-timeline'
import { makeTimelineObjectResolved } from '../../../__mocks__/objects'
import { getDeviceContext } from '../../__tests__/testlib'

async function getInitialisedDevice() {
	const dev = new AbstractDevice(getDeviceContext())
	await dev.init({})

	return dev
}

describe('Abstract device', () => {
	const mockTime = new MockTime()
	beforeEach(() => {
		mockTime.init()
	})

	test('Device setup', async () => {
		const device = await getInitialisedDevice()

		expect(device.connected).toBeFalsy()
		expect(device.getStatus()).toMatchObject({ statusCode: StatusCode.GOOD })
	})

	test('convertTimelineStateToDeviceState', async () => {
		const device = await getInitialisedDevice()

		const testState: Timeline.TimelineState<TSRTimelineContent> = {
			time: 10,
			layers: {},
			nextEvents: [],
		}
		const resultState = device.convertTimelineStateToDeviceState(testState)
		expect(resultState).toBeTruthy()
		expect(testState).toBe(resultState) // Exact same object
	})

	describe('diffState', () => {
		const LAYERNAME = 'myLayer0'

		async function compareStates(
			oldDevState: AbstractDeviceState | undefined,
			newDevState: AbstractDeviceState,
			expCommands: AbstractCommandWithContext[]
		) {
			const device = await getInitialisedDevice()

			const commands = device.diffStates(oldDevState, newDevState)

			expect(commands).toEqual(expCommands)
		}

		test('From undefined', async () => {
			await compareStates(
				undefined,
				{
					time: 20,
					nextEvents: [],
					layers: {},
				},
				[]
			)
		})

		test('Empty states', async () => {
			await compareStates(
				{
					time: 10,
					nextEvents: [],
					layers: {},
				},
				{
					time: 20,
					nextEvents: [],
					layers: {},
				},
				[]
			)
		})

		test('Start object', async () => {
			await compareStates(
				{
					time: 10,
					nextEvents: [],
					layers: {},
				},
				{
					time: 20,
					nextEvents: [],
					layers: {
						[LAYERNAME]: createResolvedTimelineObject('obj0', LAYERNAME),
					},
				},
				[
					{
						command: 'addedAbstract',
						context: 'added: obj0',
						timelineObjId: 'obj0',
					},
				]
			)
		})

		test('Change object', async () => {
			await compareStates(
				{
					time: 10,
					nextEvents: [],
					layers: {
						[LAYERNAME]: createResolvedTimelineObject('obj0', LAYERNAME),
					},
				},
				{
					time: 20,
					nextEvents: [],
					layers: {
						[LAYERNAME]: createResolvedTimelineObject('obj1', LAYERNAME),
					},
				},
				[
					{
						command: 'changedAbstract',
						context: 'changed: obj1',
						timelineObjId: 'obj1',
					},
				]
			)
		})

		test('End object', async () => {
			await compareStates(
				{
					time: 10,
					nextEvents: [],
					layers: { [LAYERNAME]: createResolvedTimelineObject('obj0', LAYERNAME) },
				},
				{
					time: 20,
					nextEvents: [],
					layers: {},
				},
				[
					{
						command: 'removedAbstract',
						context: 'removed: obj0',
						timelineObjId: 'obj0',
					},
				]
			)
		})
	})
})

function createResolvedTimelineObject(
	objectId: string,
	layerName: string
): ResolvedTimelineObjectInstance<TimelineContentAbstractAny> {
	return makeTimelineObjectResolved({
		id: objectId,
		enable: {
			start: 0,
		},
		layer: layerName,
		content: {
			deviceType: DeviceType.ABSTRACT,
		},
	})
}
