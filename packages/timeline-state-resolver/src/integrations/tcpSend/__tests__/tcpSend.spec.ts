import { DeviceType, TimelineContentTCPSendAny, TSRTimelineContent, Timeline } from 'timeline-state-resolver-types'
import { Socket as OrgSocket } from 'net'
import { Socket as MockSocket } from '../../../__mocks__/net'
import { TcpSendDevice } from '..'
import { getDeviceContext } from '../../__tests__/testlib'
import { literal } from '../../../lib'

jest.mock('net')

const SocketMock = OrgSocket as any as typeof MockSocket

// SocketMock.mockClose

const setTimeoutOrg = setTimeout

async function sleep(duration: number) {
	return new Promise((resolve) => {
		setTimeoutOrg(resolve, duration)
	})
}

async function getInitializedTcpDevice() {
	const dev = new TcpSendDevice(getDeviceContext())
	await dev.init({
		host: '192.168.0.254',
		port: 1234,
	})
	await sleep(10)
	return dev
}

describe('TCP-Send', () => {
	const onSocketCreate = jest.fn()
	const onConnection = jest.fn()
	const onSocketClose = jest.fn()
	const onSocketWrite = jest.fn()
	const onConnectionChanged = jest.fn()

	function setupSocketMock() {
		SocketMock.mockOnNextSocket((socket: any) => {
			onSocketCreate()

			socket.onConnect = onConnection
			socket.onWrite = onSocketWrite
			socket.onClose = onSocketClose
		})
	}
	beforeEach(() => {
		setupSocketMock()
	})
	afterEach(() => {
		const sockets = SocketMock.openSockets()
		// Destroy any lingering sockets, to prevent a failing test from affecting other tests:
		sockets.forEach((s) => s.destroy())

		SocketMock.clearMockOnNextSocket()
		onSocketCreate.mockClear()
		onConnection.mockClear()
		onSocketClose.mockClear()
		onSocketWrite.mockClear()
		onConnectionChanged.mockClear()

		// Just a check to ensure that the unit tests cleaned up the socket after themselves:
		// eslint-disable-next-line jest/no-standalone-expect
		expect(sockets).toHaveLength(0)
	})

	describe('diffState', () => {
		test('From undefined', async () => {
			const device = await getInitializedTcpDevice()
			const commands = device.diffStates(undefined, createTimelineState({}))
			expect(commands).toEqual([])
			await device.terminate()
		})
		test('Empty states', async () => {
			const device = await getInitializedTcpDevice()
			const commands = device.diffStates(createTimelineState({}), createTimelineState({}))
			expect(commands).toEqual([])
			await device.terminate()
		})
		test('New command', async () => {
			const device = await getInitializedTcpDevice()

			const content = literal<TimelineContentTCPSendAny>({
				...DEFAULT_TL_CONTENT,
				message: 'hello world',
			})
			const commands = device.diffStates(
				createTimelineState({}),
				createTimelineState({
					layer0: {
						id: 'obj0',
						content,
					},
				})
			)
			expect(commands).toEqual([
				{
					timelineObjId: 'obj0',
					context: `added: obj0`,
					command: {
						commandName: 'added',
						content,
						layer: 'layer0',
					},
				},
			])
			await device.terminate()
		})

		test('Changed command', async () => {
			const device = await getInitializedTcpDevice()

			const content0 = literal<TimelineContentTCPSendAny>({
				...DEFAULT_TL_CONTENT,
				message: 'hello world',
			})
			const content1 = literal<TimelineContentTCPSendAny>({
				...DEFAULT_TL_CONTENT,
				message: 'goodbye world',
			})
			const commands = device.diffStates(
				createTimelineState({
					layer0: {
						id: 'obj0',
						content: content0,
					},
				}),
				createTimelineState({
					layer0: {
						id: 'obj1',
						content: content1,
					},
				})
			)
			expect(commands).toEqual([
				{
					timelineObjId: 'obj1',
					context: `changed: obj1`,
					command: {
						commandName: 'changed',
						content: {
							...content1,
						},
						layer: 'layer0',
					},
				},
			])
			await device.terminate()
		})

		test('Removed command', async () => {
			const device = await getInitializedTcpDevice()

			const content = literal<TimelineContentTCPSendAny>({
				...DEFAULT_TL_CONTENT,
				message: 'hello world',
			})
			const commands = device.diffStates(
				createTimelineState({
					layer0: {
						id: 'obj0',
						content,
					},
				}),
				createTimelineState({})
			)
			expect(commands).toEqual([
				{
					timelineObjId: 'obj0',
					context: `removed: obj0`,
					command: {
						commandName: 'removed',
						content,
						layer: 'layer0',
					},
				},
			])
			await device.terminate()
		})
	})
	describe('Socket connection', () => {
		test('Connect', async () => {
			const device = await getInitializedTcpDevice()

			expect(device.connected).toBe(true)
			expect(onSocketCreate).toHaveBeenCalledTimes(1)
			expect(onConnection).toHaveBeenCalledTimes(1)
			expect(SocketMock.openSockets()).toHaveLength(1)
			expect(onSocketClose).toHaveBeenCalledTimes(0)
			expect(onSocketWrite).toHaveBeenCalledTimes(0)

			await device.terminate()
		})
		test('Disconnect', async () => {
			const device = await getInitializedTcpDevice()
			await device.terminate()

			expect(device.connected).toBe(false)
			expect(SocketMock.openSockets()).toHaveLength(0)
			expect(onSocketClose).toHaveBeenCalledTimes(1)
		})
		test('Lose connection and reconnect', async () => {
			const device = await getInitializedTcpDevice()

			expect(device.connected).toBe(true)

			const sockets = SocketMock.openSockets()
			expect(sockets).toHaveLength(1)

			// Simulate that the socket is closed:
			sockets[0].mockClose()
			await sleep(10)
			// The device should have disconnected:
			expect(device.connected).toBe(false)

			await sleep(600)

			// The device should have reconnected:
			expect(device.connected).toBe(true)

			await device.terminate()
		})
	})
	describe('sendCommand', () => {
		test('Send message', async () => {
			const device = await getInitializedTcpDevice()

			const content = literal<TimelineContentTCPSendAny>({
				...DEFAULT_TL_CONTENT,
				message: 'hello world',
			})
			const commands = device.diffStates(
				createTimelineState({}),
				createTimelineState({
					layer0: {
						id: 'obj0',
						content,
					},
				})
			)

			expect(commands).toHaveLength(1)
			await device.sendCommand(commands[0])

			expect(onSocketCreate).toHaveBeenCalledTimes(1)
			expect(SocketMock.openSockets()).toHaveLength(1)
			expect(onConnection).toHaveBeenCalledTimes(1)

			expect(onSocketWrite).toHaveBeenCalledTimes(1)
			expect(onSocketWrite.mock.calls[0][0]).toEqual(Buffer.from('hello world'))

			await device.terminate()
		})
		test('Send message when disconnected', async () => {
			setupSocketMock() // Add one more socket mock
			const device = await getInitializedTcpDevice()

			const content = literal<TimelineContentTCPSendAny>({
				...DEFAULT_TL_CONTENT,
				message: 'hello world',
			})
			const commands = device.diffStates(
				createTimelineState({}),
				createTimelineState({
					layer0: {
						id: 'obj0',
						content,
					},
				})
			)
			expect(commands).toHaveLength(1)

			// Simulate that the socket is closed:
			const sockets = SocketMock.openSockets()
			expect(sockets).toHaveLength(1)
			sockets[0].mockClose()
			await sleep(10)
			// The device should have disconnected:
			expect(device.connected).toBe(false)
			expect(SocketMock.openSockets()).toHaveLength(0)

			// Now, send a command. This should trigger an immediate reconnect:
			await device.sendCommand(commands[0])
			expect(device.connected).toBe(true)

			expect(SocketMock.openSockets()).toHaveLength(1)

			expect(onSocketWrite).toHaveBeenCalledTimes(1)
			expect(onSocketWrite.mock.calls[0][0]).toEqual(Buffer.from('hello world'))

			await device.terminate()
		})
	})
})
function createTimelineState(
	objs: Record<string, { id: string; content: TimelineContentTCPSendAny }>
): Timeline.TimelineState<TSRTimelineContent> {
	return {
		time: 10,
		layers: objs as any,
		nextEvents: [],
	}
}
const DEFAULT_TL_CONTENT: {
	deviceType: DeviceType.TCPSEND
} = {
	deviceType: DeviceType.TCPSEND,
}
