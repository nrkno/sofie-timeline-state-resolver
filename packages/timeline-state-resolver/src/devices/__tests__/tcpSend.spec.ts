import {
	Mappings,
	DeviceType,
	MappingTCPSend
} from '../../types/src'
import { Conductor } from '../../conductor'
import { Socket as MockSocket } from 'net'
import { StatusCode } from '../device'
import { ThreadedClass } from 'threadedclass'
import { MockTime } from '../../__tests__/mockTime'
import { TCPSendDevice } from '../tcpSend'

jest.mock('net')
let setTimeoutOrg = setTimeout

function waitALittleBit () {
	return new Promise((resolve) => {
		setTimeoutOrg(resolve, 10)
	})
}

// let nowActual = Date.now()
describe('TCP-Send', () => {
	let mockTime = new MockTime()
	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})
	// afterEach(() => {})
	test('Send message', async () => {

		const commandReceiver0: any = jest.fn((time, cmd, context) => {
			// return Promise.resolve()
			// @ts-ignore
			device._defaultCommandReceiver(time, cmd, context)
		})

		let onSocketCreate = jest.fn()
		let onConnection = jest.fn()
		let onSocketClose = jest.fn()
		let onSocketWrite = jest.fn()
		let onConnectionChanged = jest.fn()

		// @ts-ignore MockSocket
		MockSocket.mockOnNextSocket((socket: any) => {
			onSocketCreate(onSocketCreate)

			socket.onConnect = onConnection
			socket.onWrite = onSocketWrite
			socket.onClose = onSocketClose
		})

		let myLayerMapping0: MappingTCPSend = {
			device: DeviceType.TCPSEND,
			deviceId: 'myTCP'
		}
		let myLayerMapping: Mappings = {
			'myLayer0': myLayerMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: () => mockTime.now
		})
		let onError = jest.fn(console.log)
		myConductor.on('error', onError)
		await myConductor.init()

		await myConductor.addDevice('myTCP', {
			type: DeviceType.TCPSEND,

			options: {
				commandReceiver: commandReceiver0,
				host: '192.168.0.1',
				port: 1234,
				makeReadyCommands: [{
					message: 'makeReady0'
				},{
					message: 'makeReady1'
				}]
				// bufferEncoding: 'hex',
			}
		})

		expect(onSocketCreate).toHaveBeenCalledTimes(1)

		// @ts-ignore
		let sockets = MockSocket.mockSockets()
		expect(sockets).toHaveLength(1)
		let socket = sockets[0]

		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100) // 10100
		expect(mockTime.now).toEqual(10100)
		expect(onConnection).toHaveBeenCalledTimes(1)

		let deviceContainer = myConductor.getDevice('myTCP')
		let device = deviceContainer.device as ThreadedClass<TCPSendDevice>

		await device.on('connectionChanged', onConnectionChanged)

		expect(await device.canConnect).toEqual(true)
		expect(await device.deviceName).toMatch(/tcp/i)

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		// Test Added object:
		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: 11000,
					duration: 2000
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.TCPSEND,
					message: 'hello world'
				}
			}
		])

		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		await mockTime.advanceTimeToTicks(11100)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0.mock.calls[0][1]).toMatchObject({
			message: 'hello world'
		})
		expect(commandReceiver0.mock.calls[0][2]).toMatch(/added: obj0/)
		await waitALittleBit()
		expect(onSocketWrite).toHaveBeenCalledTimes(1)
		expect(onSocketWrite.mock.calls[0][0]).toEqual(Buffer.from('hello world'))

		// Test Changed object:
		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: 11000,
					duration: 2000
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.TCPSEND,
					message: 'anyone here'
				}
			}
		])

		await mockTime.advanceTimeToTicks(12000) // 12000
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0.mock.calls[1][1]).toMatchObject({
			message: 'anyone here'
		})
		expect(commandReceiver0.mock.calls[1][2]).toMatch(/changed: obj0/)
		await waitALittleBit() // allow for async socket events to fire
		expect(onSocketWrite).toHaveBeenCalledTimes(2)
		expect(onSocketWrite.mock.calls[1][0]).toEqual(Buffer.from('anyone here'))

		// Test Removed object:
		await mockTime.advanceTimeToTicks(16000) // 16000
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(onSocketWrite).toHaveBeenCalledTimes(2)

		// test disconnected
		// @ts-ignore
		socket.mockClose()
		expect(onSocketClose).toHaveBeenCalledTimes(1)
		await waitALittleBit()
		expect(onConnectionChanged).toHaveBeenCalledTimes(1)
		expect(onConnectionChanged.mock.calls[0][0]).toMatchObject({
			statusCode: StatusCode.BAD
		})

		// test retry
		await mockTime.advanceTimeTicks(6000) // enough time has passed

		// a new connection should have been made

		expect(onConnection).toHaveBeenCalledTimes(2)
		await waitALittleBit()
		expect(onConnectionChanged).toHaveBeenCalledTimes(2)
		expect(onConnectionChanged.mock.calls[1][0]).toMatchObject({
			statusCode: StatusCode.GOOD
		})

		// Test makeReady:
		await myConductor.devicesMakeReady(true)
		await mockTime.advanceTimeTicks(10)
		await waitALittleBit()

		expect(onConnectionChanged).toHaveBeenCalledTimes(4)
		expect(onConnectionChanged.mock.calls[2][0]).toMatchObject({
			statusCode: StatusCode.BAD
		})
		expect(onConnectionChanged.mock.calls[3][0]).toMatchObject({
			statusCode: StatusCode.GOOD
		})

		expect(commandReceiver0).toHaveBeenCalledTimes(4)
		expect(commandReceiver0.mock.calls[2][1]).toMatchObject({
			message: 'makeReady0'
		})
		expect(commandReceiver0.mock.calls[3][1]).toMatchObject({
			message: 'makeReady1'
		})

		// dispose
		await device.terminate()

		expect(onSocketClose).toHaveBeenCalledTimes(2)
		expect(onConnectionChanged).toHaveBeenCalledTimes(5)
		expect(onConnectionChanged.mock.calls[4][0]).toMatchObject({
			statusCode: StatusCode.BAD
		})

		expect(onError).toHaveBeenCalledTimes(0)
		// expect(0).toEqual(1)
	})
})
