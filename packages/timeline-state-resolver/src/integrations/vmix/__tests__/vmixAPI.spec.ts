import { setupVmixMock } from './vmixMock'
import { Response, VMix } from '../connection'

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
		const onStateChanged = jest.fn()
		const onData = jest.fn((response: Response) => {
			if (response.command === 'XML' && response.body) {
				vmix.parseVMixState(response.body)
			}
		})

		const vmix = new VMix('255.255.255.255')
		vmix.on('error', onError)
		vmix.on('connected', onConnected)
		vmix.on('disconnected', onDisconnected)
		vmix.on('stateChanged', onStateChanged)
		vmix.on('data', onData)

		expect(vmix.connected).toBeFalsy()

		vmix.connect()

		await wait(10)

		expect(vmix.connected).toBeTruthy()

		expect(onConnect).toHaveBeenLastCalledWith(8099, '255.255.255.255')

		await vmix.requestVMixState()

		await wait(10)

		expect(vmix.state).toEqual({
			version: '21.0.0.55',
			edition: 'HD',
			inputs: {
				'1': {
					number: 1,
					type: 'Capture',
					state: 'Running',
					position: 0,
					duration: 0,
					loop: false,
					muted: false,
					volume: 100,
					balance: 0,
					audioBuses: 'M',
					transform: {
						alpha: -1,
						panX: 0,
						panY: 0,
						zoom: 1,
					},
				},
				'2': {
					number: 2,
					type: 'Capture',
					state: 'Running',
					position: 0,
					duration: 0,
					loop: false,
					muted: true,
					volume: 100,
					balance: 0,
					audioBuses: 'M,C',
					transform: {
						alpha: -1,
						panX: 0,
						panY: 0,
						zoom: 1,
					},
				},
			},
			overlays: [
				{ number: 1, input: undefined },
				{ number: 2, input: undefined },
				{ number: 3, input: undefined },
				{ number: 4, input: undefined },
				{ number: 5, input: undefined },
				{ number: 6, input: undefined },
			],
			mixes: [
				{
					number: 1,
					program: 1,
					preview: 2,
					transition: {
						duration: 0,
						effect: 'Cut',
					},
				},
			],
			fadeToBlack: false,
			recording: true,
			external: true,
			streaming: true,
			playlist: false,
			multiCorder: false,
			fullscreen: false,
			audio: [
				{
					volume: 100,
					muted: false,
					meterF1: 0.04211706,
					meterF2: 0.04211706,
					headphonesVolume: 74.80521,
				},
			],
			fixedInputsCount: 2,
		})

		expect(onConnected).toHaveBeenCalledTimes(1)
		expect(onStateChanged).toHaveBeenCalledTimes(1)
		expect(onDisconnected).toHaveBeenCalledTimes(0)
		expect(onError).toHaveBeenCalledTimes(0)

		vmix.disconnect()

		expect(vmix.connected).toBeFalsy()
	})
	test('Connection status', async () => {
		const vmix = new VMix('255.255.255.255')
		const onError = jest.fn()
		const onConnected = jest.fn()
		const onDisconnected = jest.fn()
		const onStateChanged = jest.fn()
		vmix.on('error', onError)
		vmix.on('connected', onConnected)
		vmix.on('disconnected', onDisconnected)
		vmix.on('stateChanged', onStateChanged)
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
