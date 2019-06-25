import * as _ from 'underscore'
import { QuantelGateway } from '../quantelGateway'
import { setupQuantelGatewayMock } from './quantelGatewayMock'

const orgSetTimeout = setTimeout

function wait (time: number = 1) {
	return new Promise((resolve) => {
		orgSetTimeout(resolve, time)
	})
}
describe('QuantelGateway', () => {
	const {
		quantelServer,
		onGet,
		onPost,
		onPut,
		onHead,
		onPatch,
		onDel,
		onDelete
	} = setupQuantelGatewayMock()

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
		let quantel = new QuantelGateway()
		quantel.on('error', onError)

		await quantel.init(
			'localhost:3000',
			'myISA:8000',
			undefined, // fallback to 'default'
			1100
		)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(onPost).toHaveBeenCalledWith('http://localhost:3000/connect/myISA%3A8000', undefined, expect.any(Function))

		expect(quantel.gatewayUrl).toEqual('http://localhost:3000')
		expect(quantel.ISAUrl).toEqual('myISA:8000')
		expect(quantel.zoneId).toEqual('default')
		expect(quantel.serverId).toEqual(1100)

		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('Connection status', async () => {
		let onError = jest.fn()
		let quantel = new QuantelGateway()
		quantel.on('error', onError)

		await quantel.init(
			'localhost:3000',
			'myISA:8000',
			undefined, // fallback to 'default'
			1100
		)
		const onStatusChange = jest.fn()
		quantel.checkStatusInterval = 300
		quantel.monitorServerStatus(onStatusChange)

		await wait(100)

		expect(quantel.connected)
		expect(onStatusChange).toHaveBeenCalledTimes(1)
		expect(onStatusChange).toHaveBeenCalledWith(true, null)
		onStatusChange.mockClear()

		quantelServer.ISAServerIsUp = false
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
	test('Create a port', async () => {

		let onError = jest.fn()
		let quantel = new QuantelGateway()
		quantel.on('error', onError)

		await quantel.init('localhost:3000', 'myISA:8000', undefined, 1100)
		await quantel.createPort('my_port', 3)

		expect(onPut).toHaveBeenCalledTimes(1)
		expect(onPut).toHaveBeenCalledWith('http://localhost:3000/default/server/1100/port/my_port/channel/3', undefined, expect.any(Function))

		await quantel.releasePort('my_port')
		expect(onDelete).toHaveBeenCalledTimes(1)
		expect(onDelete).toHaveBeenCalledWith('http://localhost:3000/default/server/1100/port/my_port', undefined, expect.any(Function))

		expect(onError).toHaveBeenCalledTimes(0)

	})
	test('Load Clip onto a port', async () => {

		let onError = jest.fn()
		let quantel = new QuantelGateway()
		quantel.on('error', onError)

		await quantel.init('localhost:3000', 'myISA:8000', undefined, 1100)
		const portInfo = await quantel.createPort('my_port', 3)

		expect(portInfo).toMatchObject({
			portID: expect.any(Number),
			portName: expect.stringContaining('my_port')
		})
		const portId = portInfo.portName

		const clipsSummary = await quantel.searchClip({ Title: 'Test0' })
		expect(clipsSummary).toHaveLength(1)
		const clipSummary = clipsSummary[0]

		expect(clipSummary).toMatchObject({
			ClipID: expect.any(Number)
		})

		const clip = await quantel.getClip(clipSummary.ClipID)
		expect(clip).toMatchObject({
			ClipID: clipSummary.ClipID,
			Title: 'Test0'
		})

		const fragmentInfo = await quantel.getClipFragments(clip.ClipID)

		expect(fragmentInfo.fragments).toHaveLength(4)

		const response = await quantel.loadFragmentsOntoPort(portId, fragmentInfo.fragments)
		expect(response).toMatchObject({
			portID: 'my_port'
		})

		expect(onError).toHaveBeenCalledTimes(0)

	})
})
