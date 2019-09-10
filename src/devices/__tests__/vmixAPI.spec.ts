import * as _ from 'underscore'
import { VMix } from '../vmixAPI'
import { setupVmixMock } from './vmixMock'
import { VMixOptions } from '../../types/src/vmix'

const orgSetTimeout = setTimeout

function wait (time: number = 1) {
	return new Promise((resolve) => {
		orgSetTimeout(resolve, time)
	})
}
describe('vMixAPI', () => {
	const {
		vmixServer,
		onGet,
		onPost,
		onPut,
		onHead,
		onPatch,
		onDel,
		onDelete
	} = setupVmixMock()

	beforeEach(() => {
		// jest.useFakeTimers()
		// @ts-ignore
		// WebSocket.clearMockInstances()
		onGet.mockClear()
		onPost.mockClear()
		onPut.mockClear()
		onHead.mockClear()
		onPatch.mockClear()
		onDel.mockClear()
		onDelete.mockClear()
	})
	test('Connectivity', async () => {
		let onError = jest.fn()
		let onConnected = jest.fn()
		let onDisconnected = jest.fn()
		let onStateChanged = jest.fn()

		let vmix = new VMix()
		vmix.on('error', onError)
		vmix.on('connected', onConnected)
		vmix.on('disconnected', onDisconnected)
		vmix.on('stateChanged', onStateChanged)

		const options: VMixOptions = {
			host: '127.0.0.1',
			port: 9999
		}
		await vmix.connect(options)

		await wait(100)

		expect(onPost).toHaveBeenCalledTimes(1)
		expect(onPost).toHaveBeenCalledWith('http://localhost:3000/connect/myISA%3A8000', undefined, expect.any(Function))

		expect(vmix.state).toEqual({

		})
		// expect(vmix.ISAUrl).toEqual('myISA:8000')
		// expect(vmix.zoneId).toEqual('default')
		// expect(vmix.serverId).toEqual(1100)

		expect(onConnected).toHaveBeenCalledTimes(1)
		expect(onStateChanged).toHaveBeenCalledTimes(1)
		expect(onDisconnected).toHaveBeenCalledTimes(0)
		expect(onError).toHaveBeenCalledTimes(0)

		// disconnect?
		// do something?
		expect(onDisconnected).toHaveBeenCalledTimes(1)
	})
	test('Connection status', async () => {
		let vmix = new VMix()
		let onError = jest.fn()
		let onConnected = jest.fn()
		let onDisconnected = jest.fn()
		let onStateChanged = jest.fn()
		vmix.on('error', onError)
		vmix.on('connected', onConnected)
		vmix.on('disconnected', onDisconnected)
		vmix.on('stateChanged', onStateChanged)

		const options: VMixOptions = {
			host: '127.0.0.1',
			port: 9999
		}
		await vmix.connect(options)

		await wait(100)

		expect(quantel.connected)
		expect(onStatusChange).toHaveBeenCalledTimes(1)
		expect(onStatusChange).toHaveBeenCalledWith(true, null)
		onStatusChange.mockClear()

		quantelServer.serverIsUp = false
		await wait(quantel.checkStatusInterval)

		expect(!quantel.connected)
		expect(onStatusChange).toHaveBeenCalledTimes(1)
		expect(onStatusChange).toHaveBeenCalledWith(false, 'Server 1100 is down')
		onStatusChange.mockClear()

		quantelServer.ISAServerIsUp = true
		await wait(quantel.checkStatusInterval)

		expect(quantel.connected)
		expect(onStatusChange).toHaveBeenCalledTimes(1)
		expect(onStatusChange).toHaveBeenCalledWith(true, null)
		onStatusChange.mockClear()

	})
	test('Methods', async () => {

		let vmix = new VMix()
		let onError = jest.fn()
		let onConnected = jest.fn()
		let onDisconnected = jest.fn()
		let onStateChanged = jest.fn()
		vmix.on('error', onError)
		vmix.on('connected', onConnected)
		vmix.on('disconnected', onDisconnected)
		vmix.on('stateChanged', onStateChanged)

		const options: VMixOptions = {
			host: '127.0.0.1',
			port: 9999
		}
		await vmix.connect(options)

		vmix.playInput('blah')
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(onPost).toHaveBeenCalledWith('http://localhost:3000/default/server/1100/port/my_port/channel/3', undefined, expect.any(Function))

		vmix.overlayInputIn(1, 1)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(onPost).toHaveBeenCalledWith('http://localhost:3000/default/server/1100/port/my_port/channel/3', undefined, expect.any(Function))



		expect(onError).toHaveBeenCalledTimes(0)

	})
})
