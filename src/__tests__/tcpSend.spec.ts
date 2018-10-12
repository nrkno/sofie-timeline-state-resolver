// import {Resolver, Enums} from "superfly-timeline"
// import { Commands, Atem } from 'atem-connection'
import { TriggerType } from 'superfly-timeline'

import { Mappings, DeviceType, MappingTCPSend } from '../devices/mapping'
import { Conductor } from '../conductor'
import { TCPSendDevice } from '../devices/TCPSend'
import { Socket as MockSocket } from 'net'

jest.mock('net')
let setTimeoutOrg = setTimeout

function waitALittleBit () {
	return new Promise((resolve) => {
		setTimeoutOrg(resolve, 10)
	})
}

// let nowActual = Date.now()
describe('TCP-Send', () => {
	let now: number = 10000
	beforeAll(() => {
		Date.now = jest.fn(() => {
			return getCurrentTime()
		})
		// Date.now['mockReturnValue'](now)
	})
	function getCurrentTime () {
		return now
	}
	function advanceTime (advanceTime: number) {
		now += advanceTime
		jest.advanceTimersByTime(advanceTime)
	}
	function advanceTimeTo (time: number) {
		if (time > now) {
			advanceTime(time - now)

			expect(now).toEqual(time)
		} else {
			throw Error('Cant go back in time')
		}
	}
	beforeEach(() => {
		now = 10000
		jest.useFakeTimers()
	})
	// afterEach(() => {})
	test('Send message', async () => {

		let device

		let commandReceiver0 = jest.fn((time, cmd, context) => {
			// return Promise.resolve()
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
			getCurrentTime: getCurrentTime
		})
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

		myConductor.mapping = myLayerMapping
		advanceTimeTo(10100) // 10100
		expect(now).toEqual(10100)
		expect(onConnection).toHaveBeenCalledTimes(1)

		device = myConductor.getDevice('myTCP') as TCPSendDevice

		device.on('connectionChanged', onConnectionChanged)

		expect(device.canConnect).toEqual(true)
		expect(device.deviceName).toMatch(/tcp/i)

		// Check that no commands has been scheduled:
		expect(device.queue).toHaveLength(0)

		// Test Added object:
		myConductor.timeline = [
			{
				id: 'obj0',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: 11000
				},
				duration: 2000,
				LLayer: 'myLayer0',
				content: {
					message: 'hello world'
				}
			}
		]

		advanceTimeTo(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		advanceTimeTo(11100)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0.mock.calls[0][1]).toMatchObject({
			message: 'hello world'
		})
		expect(commandReceiver0.mock.calls[0][2]).toMatch(/added: obj0/)
		await waitALittleBit()
		expect(onSocketWrite).toHaveBeenCalledTimes(1)
		expect(onSocketWrite.mock.calls[0][0]).toEqual(Buffer.from('hello world'))

		// Test Changed object:
		myConductor.timeline = [
			{
				id: 'obj0',
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: 11000
				},
				duration: 2000,
				LLayer: 'myLayer0',
				content: {
					message: 'anyone here'
				}
			}
		]

		advanceTimeTo(12000) // 12000
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0.mock.calls[1][1]).toMatchObject({
			message: 'anyone here'
		})
		expect(commandReceiver0.mock.calls[1][2]).toMatch(/changed: obj0/)
		await waitALittleBit() // allow for async socket events to fire
		expect(onSocketWrite).toHaveBeenCalledTimes(2)
		expect(onSocketWrite.mock.calls[1][0]).toEqual(Buffer.from('anyone here'))

		// Test Removed object:
		advanceTimeTo(16000) // 16000
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(onSocketWrite).toHaveBeenCalledTimes(2)

		// test disconnected
		// @ts-ignore
		socket.mockClose()
		expect(onSocketClose).toHaveBeenCalledTimes(1)
		await waitALittleBit()
		expect(onConnectionChanged).toHaveBeenCalledTimes(1)
		expect(onConnectionChanged.mock.calls[0][0]).toEqual(false)

		// test retry
		jest.advanceTimersByTime(6000) // enough time has passed

		// a new connection should have been made

		expect(onConnection).toHaveBeenCalledTimes(2)
		await waitALittleBit()
		expect(onConnectionChanged).toHaveBeenCalledTimes(2)
		expect(onConnectionChanged.mock.calls[1][0]).toEqual(true)

		// Test makeReady:
		await myConductor.devicesMakeReady(true)
		jest.advanceTimersByTime(10)
		await waitALittleBit()

		expect(onConnectionChanged).toHaveBeenCalledTimes(4)
		expect(onConnectionChanged.mock.calls[2][0]).toEqual(false)
		expect(onConnectionChanged.mock.calls[3][0]).toEqual(true)

		expect(commandReceiver0).toHaveBeenCalledTimes(4)
		expect(commandReceiver0.mock.calls[2][1]).toMatchObject({
			message: 'makeReady0'
		})
		expect(commandReceiver0.mock.calls[3][1]).toMatchObject({
			message: 'makeReady1'
		})

		// dispose
		device.terminate()

		expect(onSocketClose).toHaveBeenCalledTimes(2)
		expect(onConnectionChanged).toHaveBeenCalledTimes(5)
		expect(onConnectionChanged.mock.calls[4][0]).toEqual(false)

		// expect(0).toEqual(1)
	})
})
