jest.mock('osc')
import { SisyfosInterface } from '../sisyfosAPI'
import { MockOSC } from '../../__mocks__/osc'

const orgSetTimeout = setTimeout

function wait (time: number = 1) {
	return new Promise((resolve) => {
		orgSetTimeout(resolve, time)
	})
}

describe('SisyfosAPI', () => {

	beforeEach(() => {
		jest.useFakeTimers()
	})
	test('Connectivity', async () => {

		let onError = jest.fn()
		let onInitialized = jest.fn()
		let onConnected = jest.fn()
		let onDisconnected = jest.fn()

		let sisyfos = new SisyfosInterface()
		sisyfos.on('error', onError)
		sisyfos.on('initialized', onInitialized)
		sisyfos.on('connected', onConnected)
		sisyfos.on('disconnected', onDisconnected)

		// osc connection is closed
		expect(sisyfos.connected).toEqual(false)

		await sisyfos.connect('127.0.0.1', 1234)

		expect(sisyfos.connected).toEqual(true)

		// Failed reconnection attempt:
		MockOSC.connectionIsGood = false
		jest.advanceTimersByTime(3000)
		await wait(1)
		jest.advanceTimersByTime(3000)
		await wait(1)

		expect(sisyfos.connected).toEqual(false)
		expect(onDisconnected).toHaveBeenCalledTimes(1)

		// Successful reconnection attempt:
		MockOSC.connectionIsGood = true
		// Allow time to pass and triggers to run:
		jest.advanceTimersByTime(3000)
		await wait(1)
		jest.advanceTimersByTime(3000)
		await wait(1)

		expect(sisyfos.connected).toEqual(true)
		expect(onConnected).toHaveBeenCalledTimes(2)

		sisyfos.dispose()
		expect(sisyfos.connected).toEqual(false)

		expect(onDisconnected).toHaveBeenCalledTimes(2)
		expect(onError).toHaveBeenCalledTimes(0)
	})
	// test('Functionality', async () => {
		// todo:

		// Commands.TOGGLE_PGM
		// Commands.TOGGLE_PST
		// Commands.SET_FADER
		// Commands.TAKE

	// })
})
