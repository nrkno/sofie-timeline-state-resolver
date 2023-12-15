import { setupVmixMock } from './vmixMock'
import { VMixConnection } from '../connection'

const orgSetTimeout = setTimeout

async function wait(time = 1) {
	return new Promise((resolve) => {
		orgSetTimeout(resolve, time)
	})
}
describe('vMixAPI', () => {
	const { vmixServer, onConnect, onData, disconnectAll } = setupVmixMock()

	beforeEach(() => {
		// jest.useFakeTimers()
		// @ts-ignore
		// WebSocket.clearMockInstances()
		vmixServer.repliesAreGood = true
		vmixServer.serverIsUp = true
		onConnect.mockClear()
		onData.mockClear()
		jest.useFakeTimers()
	})
	test('Connectivity', async () => {
		const onError = jest.fn()
		const onConnected = jest.fn()
		const onDisconnected = jest.fn()

		const vmix = new VMixConnection('255.255.255.255')
		vmix.on('error', onError)
		vmix.on('connected', onConnected)
		vmix.on('disconnected', onDisconnected)

		expect(vmix.connected).toBeFalsy()

		vmix.connect()

		await wait(10)

		expect(vmix.connected).toBeTruthy()

		expect(onConnect).toHaveBeenLastCalledWith(8099, '255.255.255.255')

		expect(onConnected).toHaveBeenCalledTimes(1)
		expect(onDisconnected).toHaveBeenCalledTimes(0)
		expect(onError).toHaveBeenCalledTimes(0)

		vmix.disconnect()

		expect(vmix.connected).toBeFalsy()
	})
	test('Connection status', async () => {
		const vmix = new VMixConnection('255.255.255.255')
		const onError = jest.fn()
		const onConnected = jest.fn()
		const onDisconnected = jest.fn()
		vmix.on('error', onError)
		vmix.on('connected', onConnected)
		vmix.on('disconnected', onDisconnected)
		vmix.connect('255.255.255.255')

		await wait(10)

		expect(vmix.connected).toEqual(true)
		expect(onConnected).toHaveBeenCalledTimes(1)
		expect(onDisconnected).toHaveBeenCalledTimes(0)
		onConnected.mockClear()

		disconnectAll()

		await wait(10)

		expect(vmix.connected).toBeFalsy()
		expect(onDisconnected).toHaveBeenCalledTimes(1)
		expect(onConnected).toHaveBeenCalledTimes(0)
		onDisconnected.mockClear()

		// should try to reconnect
		jest.advanceTimersByTime(6000)

		await wait(10)

		expect(vmix.connected).toBeTruthy()
		expect(onConnected).toHaveBeenCalledTimes(1)
		onConnected.mockClear()
		vmix.disconnect()
	})
})
