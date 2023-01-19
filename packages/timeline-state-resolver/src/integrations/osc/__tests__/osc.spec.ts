import {
	DeviceType,
	OSCDeviceType,
	OSCValueType,
	Timeline,
	TimelineContentOSCAny,
	TimelineContentTypeOSC,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { OscCommandWithContext, OscDevice, OscDeviceState } from '..'

const MOCKED_SOCKET_CONNECT = jest.fn()
const MOCKED_SOCKET_WRITE = jest.fn()
const SOCKET_EVENTS: Map<string, (...args: any[]) => void> = new Map()

jest.mock('osc', () => {
	return {
		UDPPort: jest.fn().mockImplementation(() => {
			return {
				open: MOCKED_SOCKET_CONNECT,
				send: MOCKED_SOCKET_WRITE,
				on: (event: string, listener: (...args: any[]) => void) => {
					SOCKET_EVENTS.set(event, listener)
				},
				close: jest.fn(),
			}
		}),
	}
})

async function getInitialisedOscDevice() {
	const dev = new OscDevice()
	await dev.init({ host: 'localhost', port: 8082, type: OSCDeviceType.UDP })
	return dev
}

describe('OSC Device', () => {
	describe('convertTimelineStateToDeviceState', () => {
		async function compareState(tlState: Timeline.TimelineState<TSRTimelineContent>, expDevState: OscDeviceState) {
			const device = await getInitialisedOscDevice()

			const actualState = device.convertTimelineStateToDeviceState(tlState)

			expect(actualState).toEqual(expDevState)
		}

		test('convert empty state', async () => {
			await compareState(createTimelineState({}), {})
		})

		test('added object', async () => {
			await compareState(
				createTimelineState({
					layer0: {
						id: 'obj0',
						content: {
							...DEFAULT_TL_CONTENT,

							path: '/path/test',
							values: [],
						},
					},
				}),
				{
					'/path/test': {
						...DEFAULT_TL_CONTENT,
						fromTlObject: 'obj0',
						path: '/path/test',
						values: [],
					},
				}
			)
		})

		test('object with values', async () => {
			await compareState(
				createTimelineState({
					layer0: {
						id: 'obj0',
						content: {
							...DEFAULT_TL_CONTENT,

							path: '/path/test',
							values: [
								{
									type: OSCValueType.INT,
									value: 1,
								},
							],
						},
					},
				}),
				{
					'/path/test': {
						...DEFAULT_TL_CONTENT,
						fromTlObject: 'obj0',
						path: '/path/test',
						values: [
							{
								type: OSCValueType.INT,
								value: 1,
							},
						],
					},
				}
			)
		})

		test('object with animation', async () => {
			await compareState(
				createTimelineState({
					layer0: {
						id: 'obj0',
						content: {
							...DEFAULT_TL_CONTENT,
							path: '/path/test',
							values: [
								{
									type: OSCValueType.FLOAT,
									value: 1,
								},
							],
							from: [
								{
									type: OSCValueType.FLOAT,
									value: 0,
								},
							],
							transition: {
								duration: 500,
								type: 'Linear',
								direction: 'None',
							},
						},
					},
				}),
				{
					'/path/test': {
						...DEFAULT_TL_CONTENT,
						fromTlObject: 'obj0',

						path: '/path/test',
						values: [
							{
								type: OSCValueType.FLOAT,
								value: 1,
							},
						],
						from: [
							{
								type: OSCValueType.FLOAT,
								value: 0,
							},
						],
						transition: {
							duration: 500,
							type: 'Linear',
							direction: 'None',
						},
					},
				}
			)
		})
	})

	describe('diffState', () => {
		async function compareStates(
			oldDevState: OscDeviceState,
			newDevState: OscDeviceState,
			expCommands: OscCommandWithContext[]
		) {
			const device = await getInitialisedOscDevice()

			const commands = device.diffStates(oldDevState, newDevState)

			expect(commands).toEqual(expCommands)
		}

		test('Empty states', async () => {
			await compareStates({}, {}, [])
		})

		test('added object', async () => {
			await compareStates(
				{},
				{
					'/path/test': {
						fromTlObject: 'obj0',
						type: TimelineContentTypeOSC.OSC,
						path: '/path/test',
						values: [],
					},
				},
				[
					{
						command: {
							fromTlObject: 'obj0',
							path: '/path/test',
							type: TimelineContentTypeOSC.OSC,
							values: [],
						},
						context: 'added: obj0',
						tlObjId: 'obj0',
					},
				]
			)
		})

		test('same object', async () => {
			await compareStates(
				{
					'/path/test': {
						fromTlObject: 'obj0',
						type: TimelineContentTypeOSC.OSC,
						path: '/path/test',
						values: [],
					},
				},
				{
					'/path/test': {
						fromTlObject: 'obj0',
						type: TimelineContentTypeOSC.OSC,
						path: '/path/test',
						values: [],
					},
				},
				[]
			)
		})

		test('removed object', async () => {
			await compareStates(
				{
					'/path/test': {
						fromTlObject: 'obj0',
						type: TimelineContentTypeOSC.OSC,
						path: '/path/test',
						values: [],
					},
				},
				{},
				[]
			)
		})
	})

	describe('sendCommand', () => {
		test('send a command', async () => {
			const dev = await getInitialisedOscDevice()

			dev
				.sendCommand({
					command: {
						fromTlObject: 'obj0',
						path: '/path/test',
						type: TimelineContentTypeOSC.OSC,
						values: [],
					},
					context: '',
					tlObjId: '',
				})
				.catch((e) => {
					throw e
				})

			expect(MOCKED_SOCKET_WRITE).toHaveBeenCalledTimes(1)
			expect(MOCKED_SOCKET_WRITE).toHaveBeenCalledWith(
				{
					address: '/path/test',
					args: [],
				},
				undefined,
				undefined
			)
		})
		test('execute animation', async () => {
			MOCKED_SOCKET_WRITE.mockReset()
			jest.useFakeTimers({ now: 10000 })
			const dev = await getInitialisedOscDevice()

			dev
				.sendCommand({
					command: {
						fromTlObject: 'obj0',
						path: '/path/test',
						type: TimelineContentTypeOSC.OSC,
						values: [
							{
								type: OSCValueType.FLOAT,
								value: 123.45,
							},
						],
						from: [
							{
								type: OSCValueType.FLOAT,
								value: 100,
							},
						],
						transition: {
							duration: 1000,
							type: 'Linear',
							direction: 'None',
						},
					},
					context: '',
					tlObjId: '',
				})
				.catch((e) => {
					throw e
				})

			// first command is sent immediately
			expect(MOCKED_SOCKET_WRITE).toHaveBeenCalledTimes(1)
			expect(MOCKED_SOCKET_WRITE).toHaveBeenCalledWith(
				{
					address: '/path/test',
					args: [
						{
							type: 'f',
							value: 100,
						},
					],
				},
				undefined,
				undefined
			)

			jest.advanceTimersByTime(1000)
			expect(MOCKED_SOCKET_WRITE).toHaveBeenCalledTimes(1000 / 40 + 1)

			let last = 100
			for (let i = 1; i < 26; i++) {
				const v = MOCKED_SOCKET_WRITE.mock.calls[i][0].args?.[0]?.value
				expect(v).toBeGreaterThan(last)
				expect(v).toBeLessThanOrEqual(123.45)
				last = v
			}

			expect(last).toBe(123.45)
		})
	})
})

function createTimelineState(
	objs: Record<string, { id: string; content: TimelineContentOSCAny }>
): Timeline.TimelineState<TSRTimelineContent> {
	return {
		time: 10,
		layers: objs as any,
		nextEvents: [],
	}
}
const DEFAULT_TL_CONTENT: {
	deviceType: DeviceType.OSC
	type: TimelineContentTypeOSC.OSC
} = {
	deviceType: DeviceType.OSC,
	type: TimelineContentTypeOSC.OSC,
}
