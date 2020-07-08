import {
	Mappings,
	DeviceType,
	MappingTCPSend,
	MappingShotoku,
	TimelineContentTypeShotoku,
	ShotokuTransitionType
} from '../../types/src'
import { Conductor } from '../../conductor'
import { Socket as MockSocket } from 'net'
import { StatusCode } from '../device'
import { ThreadedClass } from 'threadedclass'
import { MockTime } from '../../__tests__/mockTime'
import { ShotokuDevice } from '../shotoku'

jest.mock('net')
let setTimeoutOrg = setTimeout

function waitALittleBit () {
	return new Promise((resolve) => {
		setTimeoutOrg(resolve, 10)
	})
}

// let nowActual = Date.now()
describe('Shotoku', () => {
	let mockTime = new MockTime()
	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})
	// afterEach(() => {})
	async function testShots (cmd?: ShotokuTransitionType) {
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

		let myLayerMapping0: MappingShotoku = {
			device: DeviceType.SHOTOKU,
			deviceId: 'myShotoku'
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

		await myConductor.addDevice('myShotoku', {
			type: DeviceType.SHOTOKU,

			options: {
				commandReceiver: commandReceiver0,
				host: '192.168.0.1',
				port: 1234
			}
		})

		expect(onSocketCreate).toHaveBeenCalledTimes(1)

		// @ts-ignore
		// let sockets = MockSocket.mockSockets()
		// expect(sockets).toHaveLength(1)
		// let socket = sockets[0]

		await myConductor.setMapping(myLayerMapping)
		await mockTime.advanceTimeToTicks(10100) // 10100
		expect(mockTime.now).toEqual(10100)
		expect(onConnection).toHaveBeenCalledTimes(1)

		let deviceContainer = myConductor.getDevice('myShotoku')
		let device = deviceContainer.device as ThreadedClass<ShotokuDevice>

		await device.on('connectionChanged', onConnectionChanged)

		expect(await device.canConnect).toEqual(true)
		expect(await device.deviceName).toMatch(/myShotoku/i)

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		// Test Added object:
		myConductor.timeline = [
			{
				id: 'obj0',
				enable: {
					start: 11000,
					duration: 2000
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.SHOTOKU,
					type: TimelineContentTypeShotoku.SHOT,

					shot: 1,
					transitionType: cmd
				}
			}
		]

		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		await mockTime.advanceTimeToTicks(11100)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0.mock.calls[0][1]).toMatchObject({
			show: undefined,
			shot: 1,
			type: cmd || 'cut',
			changeOperatorScreen: undefined
		})
		expect(commandReceiver0.mock.calls[0][2]).toMatch(/added: obj0/)
		await waitALittleBit()
		expect(onSocketWrite).toHaveBeenCalledTimes(1)
		if (cmd === ShotokuTransitionType.Fade) {
			expect(onSocketWrite.mock.calls[0][0]).toEqual(Buffer.from([0xf9, 0x01, 0x01, 0x00, 0x01, 0x01, 0x00, 0x00, 0x43]))
		} else {
			expect(onSocketWrite.mock.calls[0][0]).toEqual(Buffer.from([0xf9, 0x01, 0x02, 0x00, 0x01, 0x01, 0x00, 0x00, 0x42]))
		}
		// Test Changed object:
		myConductor.timeline = [
			{
				id: 'obj0',
				enable: {
					start: 11000,
					duration: 2000
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.SHOTOKU,
					type: TimelineContentTypeShotoku.SHOT,

					shot: 255, // max
					changeOperatorScreen: true,
					transitionType: cmd
				}
			}
		]

		await mockTime.advanceTimeToTicks(12000) // 12000
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0.mock.calls[1][1]).toMatchObject({
			show: undefined,
			shot: 255,
			type: cmd || 'cut',
			changeOperatorScreen: true
		})
		expect(commandReceiver0.mock.calls[1][2]).toMatch(/added: obj0/)
		await waitALittleBit() // allow for async socket events to fire
		expect(onSocketWrite).toHaveBeenCalledTimes(2)
		if (cmd === ShotokuTransitionType.Fade) {
			expect(onSocketWrite.mock.calls[1][0]).toEqual(Buffer.from([0xf9, 0x01, 0x21, 0x00, 0x01, 0xff, 0x00, 0x00, 0x25]))
		} else {
			expect(onSocketWrite.mock.calls[1][0]).toEqual(Buffer.from([0xf9, 0x01, 0x22, 0x00, 0x01, 0xff, 0x00, 0x00, 0x24]))
		}

		myConductor.timeline = []

		await mockTime.advanceTimeToTicks(12000) // 12000
		expect(commandReceiver0).toHaveBeenCalledTimes(2) // no new commands

		await device.terminate()
	}

	test('Default transition to shot', async () => {
		await testShots()
	})
	test('Cut to shot', async () => {
		await testShots(ShotokuTransitionType.Cut)
	})
	test('Fade to shot', async () => {
		await testShots(ShotokuTransitionType.Fade)
	})
})
