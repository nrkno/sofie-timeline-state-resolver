import { HyperdeckDevice } from '..'
import * as HyperdeckConnection from '../../../__mocks__/hyperdeck-connection'
import { StatusCode } from 'timeline-state-resolver-types'
import { MockTime } from '../../../__tests__/mockTime'
import { getDeviceContext } from '../../__tests__/testlib'
import { promisify } from 'util'
import { literal } from '../../../lib'

const sleep = promisify(setTimeout)

async function waitForConnection(device: HyperdeckDevice) {
	for (let i = 0; i < 10; i++) {
		await sleep(10)
		if (device.connected) break
	}
	if (!device.connected) throw new Error('Mock device failed to report connected')
}

describe('Hyperdeck', () => {
	jest.mock('hyperdeck-connection', () => HyperdeckConnection)

	const mockTime = new MockTime()
	beforeEach(() => {
		mockTime.init()
	})

	test('Check Status', async () => {
		const device = new HyperdeckDevice(getDeviceContext())

		try {
			expect(device.getStatus()).toEqual({
				messages: ['Not connected'],
				statusCode: StatusCode.BAD,
			})

			await device.init({
				host: '127.0.0.1',
			})
			expect(device.getStatus()).toEqual({
				messages: ['Not connected'],
				statusCode: StatusCode.BAD,
			})

			// Check OK once connected
			await waitForConnection(device)
			expect(device.getStatus()).toEqual({
				messages: [],
				statusCode: StatusCode.GOOD,
			})

			const mocks = HyperdeckConnection.Hyperdeck.getMockInstances()
			expect(mocks).toHaveLength(1)
			const mockConnection = mocks[0]

			// Disconnect
			mockConnection.emit('disconnected')
			expect(device.getStatus()).toEqual({
				messages: ['Not connected'],
				statusCode: StatusCode.BAD,
			})
		} finally {
			await device.terminate()
		}
	})

	test('Check Status: Recording time', async () => {
		const device = new HyperdeckDevice(getDeviceContext())

		try {
			await device.init({
				host: '127.0.0.1',
				minRecordingTime: 10 * 60,
			})

			// Check OK once connected
			await waitForConnection(device)

			// Setup the mock and listen for commands
			const mocks = HyperdeckConnection.Hyperdeck.getMockInstances()
			expect(mocks).toHaveLength(1)
			const mockConnection = mocks[0]
			const sentCommands: HyperdeckConnection.Commands.AbstractCommand<any>[] = []
			const mockHandler = jest.fn(
				async (
					command: HyperdeckConnection.Commands.AbstractCommand<any>
				): Promise<HyperdeckConnection.Commands.SlotInfoCommandResponse> => {
					sentCommands.push(command)

					throw new Error('Unexpected command')
				}
			)
			mockConnection.setMockCommandReceiver(mockHandler)

			// Run with plenty of time left
			mockHandler.mockImplementation(async (command: HyperdeckConnection.Commands.AbstractCommand<any>) => {
				sentCommands.push(command)

				if (command instanceof HyperdeckConnection.Commands.SlotInfoCommand) {
					return literal<HyperdeckConnection.Commands.SlotInfoCommandResponse>({
						slotId: command.slotId ?? 999,
						status: command.slotId == 1 ? HyperdeckConnection.SlotStatus.MOUNTED : HyperdeckConnection.SlotStatus.EMPTY,
						volumeName: 'Test',
						recordingTime: 600,
						videoFormat: HyperdeckConnection.VideoFormat.PAL,
					})
				}

				throw new Error('Unexpected command')
			})

			await device._queryRecordingTime()
			expect(sentCommands).toHaveLength(2)

			expect(device.getStatus()).toEqual({
				messages: ['Slot 2 is not mounted'],
				statusCode: StatusCode.WARNING_MINOR,
			})

			// Run with a short time left
			mockHandler.mockImplementation(async (command: HyperdeckConnection.Commands.AbstractCommand<any>) => {
				sentCommands.push(command)

				if (command instanceof HyperdeckConnection.Commands.SlotInfoCommand) {
					return literal<HyperdeckConnection.Commands.SlotInfoCommandResponse>({
						slotId: command.slotId ?? 999,
						status: command.slotId == 1 ? HyperdeckConnection.SlotStatus.MOUNTED : HyperdeckConnection.SlotStatus.EMPTY,
						volumeName: 'Test',
						recordingTime: 10,
						videoFormat: HyperdeckConnection.VideoFormat.PAL,
					})
				}

				throw new Error('Unexpected command')
			})

			await device._queryRecordingTime()
			expect(sentCommands).toHaveLength(4)

			expect(device.getStatus()).toEqual({
				messages: ['Recording time left is less than 0 minutes and 10 seconds', 'Slot 2 is not mounted'],
				statusCode: StatusCode.WARNING_MAJOR,
			})

			// Run with empty drives
			mockHandler.mockImplementation(async (command: HyperdeckConnection.Commands.AbstractCommand<any>) => {
				sentCommands.push(command)

				if (command instanceof HyperdeckConnection.Commands.SlotInfoCommand) {
					return literal<HyperdeckConnection.Commands.SlotInfoCommandResponse>({
						slotId: command.slotId ?? 999,
						status: command.slotId == 1 ? HyperdeckConnection.SlotStatus.MOUNTED : HyperdeckConnection.SlotStatus.EMPTY,
						volumeName: 'Test',
						recordingTime: 0,
						videoFormat: HyperdeckConnection.VideoFormat.PAL,
					})
				}

				throw new Error('Unexpected command')
			})

			await device._queryRecordingTime()
			expect(sentCommands).toHaveLength(6)

			expect(device.getStatus()).toEqual({
				messages: ['Recording time left is less than 0 minutes and 0 seconds', 'Slot 2 is not mounted'],
				statusCode: StatusCode.BAD,
			})
		} finally {
			await device.terminate()
		}
	})
})
