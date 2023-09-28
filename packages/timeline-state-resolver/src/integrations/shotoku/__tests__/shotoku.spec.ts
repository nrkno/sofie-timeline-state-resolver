/* eslint-disable jest/expect-expect */
import {
	DeviceType,
	Timeline,
	TimelineContentShotoku,
	TimelineContentTypeShotoku,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { ShotokuCommandWithContext, ShotokuDevice, ShotokuDeviceState } from '..'
import { getDeviceContext } from '../../__tests__/testlib'
import { ShotokuCommandType } from '../connection'

const MOCKED_SOCKET_CONNECT = jest.fn((_: any, _2: any, cb: any) => cb())
const MOCKED_SOCKET_WRITE = jest.fn()
const SOCKET_EVENTS: Map<string, (...args: any[]) => void> = new Map()

jest.mock('net', () => {
	return {
		Socket: jest.fn(() => ({
			connect: MOCKED_SOCKET_CONNECT,
			write: MOCKED_SOCKET_WRITE,
			on: (event: string, listener: (...args: any[]) => void) => {
				SOCKET_EVENTS.set(event, listener)
			},
			close: jest.fn(),
			destroy: jest.fn(),
		})),
	}
})

async function getInitialisedDevice() {
	const dev = new ShotokuDevice(getDeviceContext())
	await dev.init({ host: 'localhost', port: 8082 })

	const cb = SOCKET_EVENTS.get('connect')
	if (cb) cb()

	return dev
}

describe('Shotoku Device', () => {
	describe('convertTimelineStateToDeviceState', () => {
		async function compareState(tlState: Timeline.TimelineState<TSRTimelineContent>, expDevState: ShotokuDeviceState) {
			const device = await getInitialisedDevice()

			const actualState = device.convertTimelineStateToDeviceState(tlState)

			expect(actualState).toEqual(expDevState)
		}

		test('convert empty state', async () => {
			await compareState(createTimelineState({}), {
				shots: {},
				sequences: {},
			})
		})

		test('added shot', async () => {
			await compareState(
				createTimelineState({
					layer0: {
						id: 'obj0',
						content: {
							...DEFAULT_TL_CONTENT,

							shot: 1,
						},
					},
				}),
				{
					shots: {
						'1.1': {
							...DEFAULT_TL_CONTENT,
							shot: 1,
							fromTlObject: 'obj0',
						},
					},
					sequences: {},
				}
			)
		})

		test('added sequence', async () => {
			await compareState(
				createTimelineState({
					layer0: {
						id: 'obj0',
						content: {
							...DEFAULT_TL_CONTENT,
							type: TimelineContentTypeShotoku.SEQUENCE,

							sequenceId: 'sequence0',
							shots: [
								{
									offset: 0,
									shot: 1,
								},
								{
									offset: 100,
									shot: 2,
								},
							],
						},
					},
				}),
				{
					shots: {},
					sequences: {
						sequence0: {
							fromTlObject: 'obj0',
							shots: [
								{
									offset: 0,
									shot: 1,
								},
								{
									offset: 100,
									shot: 2,
								},
							],
						},
					},
				}
			)
		})
	})

	describe('diffState', () => {
		async function compareStates(
			oldDevState: ShotokuDeviceState,
			newDevState: ShotokuDeviceState,
			expCommands: ShotokuCommandWithContext[]
		) {
			const device = await getInitialisedDevice()

			const commands = device.diffStates(oldDevState, newDevState)

			expect(commands).toEqual(expCommands)
		}

		test('Empty states', async () => {
			await compareStates(
				{
					shots: {},
					sequences: {},
				},
				{
					shots: {},
					sequences: {},
				},
				[]
			)
		})

		test('Shot', async () => {
			await compareStates(
				{
					shots: {},
					sequences: {},
				},
				{
					shots: {
						'1.1': {
							...DEFAULT_TL_CONTENT,
							shot: 1,
							fromTlObject: 'obj0',
						},
					},
					sequences: {},
				},
				[
					{
						command: {
							type: ShotokuCommandType.Cut,
							shot: 1,
						},
						context: 'added: obj0',
						timelineObjId: 'obj0',
					},
				]
			)
		})

		test('Sequence', async () => {
			await compareStates(
				{
					shots: {},
					sequences: {},
				},
				{
					shots: {},
					sequences: {
						sequence0: {
							fromTlObject: 'obj0',
							shots: [
								{
									offset: 0,
									shot: 1,
								},
								{
									offset: 100,
									shot: 2,
								},
							],
						},
					},
				},
				[
					{
						command: {
							shots: [
								{
									type: ShotokuCommandType.Cut,
									offset: 0,
									shot: 1,
								},
								{
									type: ShotokuCommandType.Cut,
									offset: 100,
									shot: 2,
								},
							],
						},
						context: 'added: obj0',
						timelineObjId: 'obj0',
					},
				]
			)
		})
	})

	describe('sendCommand', () => {
		beforeEach(() => {
			MOCKED_SOCKET_WRITE.mockReset()
		})

		test('send a command', async () => {
			const dev = await getInitialisedDevice()

			dev
				.sendCommand({
					command: {
						type: ShotokuCommandType.Cut,
						shot: 1,
					},
					context: '',
					timelineObjId: '',
				})
				.catch((e) => {
					throw e
				})

			expect(MOCKED_SOCKET_WRITE).toHaveBeenCalledTimes(1)
			expect(MOCKED_SOCKET_WRITE).toHaveBeenCalledWith(
				Buffer.from([0xf9, 0x01, 0x02, 0x00, 0x01, 0x01, 0x00, 0x00, 0x42])
			)
		})

		test('send a sequence', async () => {
			jest.useFakeTimers({ now: 10000 })
			const dev = await getInitialisedDevice()

			dev
				.sendCommand({
					command: {
						shots: [
							{
								type: ShotokuCommandType.Cut,
								offset: 0,
								shot: 1,
							},
							{
								type: ShotokuCommandType.Cut,
								offset: 100,
								shot: 2,
							},
						],
					},
					context: '',
					timelineObjId: '',
				})
				.catch((e) => {
					throw e
				})

			jest.advanceTimersByTime(1)

			expect(MOCKED_SOCKET_WRITE).toHaveBeenCalledTimes(1)
			expect(MOCKED_SOCKET_WRITE).toHaveBeenCalledWith(
				Buffer.from([0xf9, 0x01, 0x02, 0x00, 0x01, 0x01, 0x00, 0x00, 0x42])
			)

			jest.advanceTimersByTime(1000)

			expect(MOCKED_SOCKET_WRITE).toHaveBeenCalledTimes(2)
			expect(MOCKED_SOCKET_WRITE).toHaveBeenCalledWith(
				Buffer.from([0xf9, 0x01, 0x02, 0x00, 0x01, 0x02, 0x00, 0x00, 0x41])
			)
		})
	})
})

function createTimelineState(
	objs: Record<string, { id: string; content: TimelineContentShotoku }>
): Timeline.TimelineState<TSRTimelineContent> {
	return {
		time: 10,
		layers: objs as any,
		nextEvents: [],
	}
}
const DEFAULT_TL_CONTENT: {
	deviceType: DeviceType.SHOTOKU
	type: TimelineContentTypeShotoku.SHOT
} = {
	deviceType: DeviceType.SHOTOKU,
	type: TimelineContentTypeShotoku.SHOT,
}
