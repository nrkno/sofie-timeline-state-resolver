import { QuantelGateway } from 'tv-automation-quantel-gateway-client'
import { QuantelManager } from '../connection'
import { setupQuantelGatewayMock } from './quantelGatewayMock'
import { QuantelCommandType } from '../types'
import { QuantelControlMode } from 'timeline-state-resolver-types'
import { MockTime } from '../../../__tests__/mockTime'

describe('Quantel connection', () => {
	const { quantelServer, onRequest } = setupQuantelGatewayMock()
	const mockTime = new MockTime()

	beforeEach(() => {
		mockTime.init()

		onRequest.mockClear()
		quantelServer.ignoreConnectivityCheck = false
		quantelServer.ports = {}
	})

	test('Play, seek and re-use clip', async () => {
		const gw = new QuantelGateway()
		const manager = new QuantelManager(gw, () => Date.now(), {})

		await gw.init('localhost:3000', 'myISA:8000', undefined, 1100)

		expect(mockTime.getCurrentTime()).toEqual(10000)
		await mockTime.advanceTimeToTicks(10100)

		// setup system
		await manager.setupPort({
			type: QuantelCommandType.SETUPPORT,
			portId: 'my_port',
			channel: 2,
			timelineObjId: 'tlObj0',
		})
		await manager.clearClip({
			type: QuantelCommandType.CLEARCLIP,
			portId: 'my_port',
			timelineObjId: 'tlObj0',
		})

		// Connect to ISA
		expect(onRequest).toHaveBeenNthCalledWith(1, 'post', 'http://localhost:3000/connect/myISA%3A8000')
		// get initial server info
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', 'http://localhost:3000/default/server')

		// Set up port:

		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', 'http://localhost:3000/default/server/1100/port/my_port')
		// create new port and assign to channel
		expect(onRequest).toHaveBeenNthCalledWith(
			4,
			'put',
			'http://localhost:3000/default/server/1100/port/my_port/channel/2'
		)
		// Reset the port
		expect(onRequest).toHaveBeenNthCalledWith(5, 'post', 'http://localhost:3000/default/server/1100/port/my_port/reset')

		onRequest.mockClear()

		await mockTime.advanceTimeToTicks(15000)

		// play a clip
		;(async () => {
			await manager.loadClipFragments({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
				portId: 'my_port',
				timelineObjId: 'obj1',
				fromLookahead: false,
				clip: {
					title: 'Test0',
					playing: true,
					playTime: 15000,
				},
				timeOfPlay: 15000,
				allowedToPrepareJump: true,
			})
			await manager.playClip({
				type: QuantelCommandType.PLAYCLIP,
				portId: 'my_port',
				timelineObjId: 'obj1',
				fromLookahead: false,
				clip: {
					title: 'Test0',
					playing: false,
					playTime: null,
				},
				mode: QuantelControlMode.QUALITY,
				transition: undefined,
			})
			// load next clip
			await manager.loadClipFragments({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
				portId: 'my_port',
				timelineObjId: 'obj1',
				fromLookahead: false,
				clip: {
					title: 'myClip0',
					playing: false,
					playTime: 15200,
				},
				timeOfPlay: 15200,
				allowedToPrepareJump: true,
			})
		})().catch((e) => {
			throw e
		})
		await mockTime.advanceTimeToTicks(15100)

		expect(onRequest).toHaveBeenCalledTimes(14)
		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/default/clip?Title=%22Test0%22'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip/2'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('clip/2/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(5, 'post', expect.stringContaining('port/my_port/fragments'))

		// Note: These are skipped since the playhead is already there:
		/*
		// Prepare jump
		expect(onRequest).toHaveBeenNthCalledWith(6, 'put', expect.stringContaining('port/my_port/jump?offset=0'))
		// Trigger Jump
		expect(onRequest).toHaveBeenNthCalledWith(6, 'post', expect.stringContaining('/default/server/1100/port/my_port/trigger/JUMP'))
		*/

		// Trigger play
		expect(onRequest).toHaveBeenNthCalledWith(
			6,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/START')
		)
		// Check that play worked
		expect(onRequest).toHaveBeenNthCalledWith(7, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Plan to stop at end of clip
		expect(onRequest).toHaveBeenNthCalledWith(
			8,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=999')
		)

		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(9, 'get', expect.stringContaining('/default/clip?Title=%22myClip0%22'))
		expect(onRequest).toHaveBeenNthCalledWith(10, 'get', expect.stringContaining('/default/clip/1337'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(11, 'get', expect.stringContaining('clip/1337/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(12, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(13, 'post', expect.stringContaining('port/my_port/fragments?offset=1000'))
		// Prepare jump
		expect(onRequest).toHaveBeenNthCalledWith(14, 'put', expect.stringContaining('port/my_port/jump?offset=1000'))

		onRequest.mockClear()
		await mockTime.advanceTimeToTicks(15200)
		;(async () => {
			// play 2nd clip
			await manager.playClip({
				type: QuantelCommandType.PLAYCLIP,
				portId: 'my_port',
				timelineObjId: 'obj1',
				fromLookahead: false,
				clip: {
					title: 'myClip0',
					playing: true,
					playTime: 15200,
				},
				mode: QuantelControlMode.QUALITY,
				transition: undefined,
			})
			// load clip from before
			await manager.loadClipFragments({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
				portId: 'my_port',
				timelineObjId: 'obj1',
				fromLookahead: false,
				clip: {
					title: 'Test0',
					playing: false,
					playTime: 15700,
					inPoint: 500,
				},
				timeOfPlay: 15700,
				allowedToPrepareJump: true,
			})
		})().catch((e) => {
			throw e
		})
		await mockTime.advanceTimeToTicks(15300)

		expect(onRequest).toHaveBeenCalledTimes(9)
		// Trigger Jump
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/JUMP')
		)
		// Trigger play
		expect(onRequest).toHaveBeenNthCalledWith(
			2,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/START')
		)
		// Check that play worked
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Plan to stop at end of clip
		expect(onRequest).toHaveBeenNthCalledWith(
			4,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=2999')
		)

		// Load next clip:

		// Search for and get clip info:
		// expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('/default/clip?Title=%22myClip0%22')) // already have this info
		expect(onRequest).toHaveBeenNthCalledWith(5, 'get', expect.stringContaining('/default/clip/2'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(6, 'get', expect.stringContaining('clip/2/fragments/13-1000'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(7, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(8, 'post', expect.stringContaining('port/my_port/fragments?offset=3000'))
		// Prepare jump
		expect(onRequest).toHaveBeenNthCalledWith(9, 'put', expect.stringContaining('port/my_port/jump?offset=3000'))

		onRequest.mockClear()

		await mockTime.advanceTimeToTicks(16050)
		manager
			.clearClip({
				type: QuantelCommandType.CLEARCLIP,
				portId: 'my_port',
				timelineObjId: 'obj1',
			})
			.catch((e) => {
				throw e
			})
		await mockTime.advanceTimeToTicks(16100)

		expect(onRequest).toHaveBeenCalledTimes(1)
		// Clear port from clip (reset port)
		expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('port/my_port/reset'))
	})
})
