import { setupQuantelGatewayMock } from './quantelGatewayMock'
import { Conductor } from '../../../conductor'
import {
	Mappings,
	DeviceType,
	Mapping,
	SomeMappingQuantel,
	QuantelTransitionType,
	MappingQuantelType,
} from 'timeline-state-resolver-types'
import { MockTime } from '../../../__tests__/mockTime'
import { ThreadedClass } from 'threadedclass'
import { QuantelDevice } from '..'
import { QuantelCommandType } from '../types'
import '../../../__tests__/lib'

const orgSetTimeout = setTimeout

async function t<A>(p: Promise<A>, mockTime, advanceTime = 50): Promise<A> {
	orgSetTimeout(() => {
		mockTime.advanceTimeTicks(advanceTime)
	}, 1)
	return p
}

/** Accepted deviance, accepted deviance in command timing during testing */
const ADEV = 30

describe('Quantel', () => {
	const { quantelServer, onRequest } = setupQuantelGatewayMock()

	function clearMocks() {
		onRequest.mockClear()
	}
	async function setupDefaultQuantelDeviceForTest() {
		let device: any = undefined
		const commandReceiver0: any = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: Mapping<SomeMappingQuantel> = {
			device: DeviceType.QUANTEL,
			deviceId: 'myQuantel',

			options: {
				mappingType: MappingQuantelType.Port,
				portId: 'my_port',
				channelId: 2,
				// keyChannelID: number
				// mode?: QuantelControlMode
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)
		await myConductor.init()

		await t(
			myConductor.addDevice('myQuantel', {
				type: DeviceType.QUANTEL,
				options: {
					// host: '127.0.0.1'

					gatewayUrl: 'localhost:3000',
					ISAUrlMaster: 'myISA:8000',
					zoneId: undefined, // fallback to 'default'
					serverId: 1100,
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myQuantel')
		device = deviceContainer!.device as ThreadedClass<QuantelDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10000)
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			expect.toBeCloseTo(10000, ADEV),
			expect.objectContaining({
				type: QuantelCommandType.SETUPPORT,
				time: 10005, // Because it was so close to currentTime, otherwise 9000
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			expect.toBeCloseTo(10000, ADEV),
			expect.objectContaining({
				type: QuantelCommandType.CLEARCLIP,
				time: 10005,
			}),
			expect.any(String),
			expect.any(String)
		)

		// Connect to ISA
		expect(onRequest).toHaveBeenNthCalledWith(1, 'post', 'http://localhost:3000/connect/myISA%3A8000')
		// get initial server info
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', 'http://localhost:3000/default/server')

		// Set up port:
		// get server info
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', 'http://localhost:3000/default/server')
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', 'http://localhost:3000/default/server/1100/port/my_port')
		// create new port and assign to channel
		expect(onRequest).toHaveBeenNthCalledWith(
			5,
			'put',
			'http://localhost:3000/default/server/1100/port/my_port/channel/2'
		)
		// Reset the port
		expect(onRequest).toHaveBeenNthCalledWith(6, 'post', 'http://localhost:3000/default/server/1100/port/my_port/reset')

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		quantelServer.ignoreConnectivityCheck = true

		return {
			commandReceiver0,
			myConductor,
			errorHandler,
			deviceErrorHandler,
			device,
		}
	}

	const mockTime = new MockTime()
	beforeEach(() => {
		mockTime.init()

		clearMocks()
		quantelServer.ignoreConnectivityCheck = false
		quantelServer.ports = {}
	})
	test('Play and stop', async () => {
		const { commandReceiver0, myConductor, errorHandler, deviceErrorHandler } = await setupDefaultQuantelDeviceForTest()

		myConductor.setTimelineAndMappings([
			{
				id: 'video0',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					title: 'myClip0',

					// seek?: number
					// inPoint?: number
					// length?: number
					// pauseTime?: number
					// playing?: boolean
					// noStarttime?: boolean
				},
			},
		])
		// Time to preload the clip
		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			10155,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
				clip: expect.objectContaining({
					title: 'myClip0',
				}),
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(6)

		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/default/clip?Title=%22myClip0%22'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip/1337'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('clip/1337/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(5, 'post', expect.stringContaining('port/my_port/fragments'))
		// Prepare jump:
		expect(onRequest).toHaveBeenNthCalledWith(6, 'put', expect.stringContaining('port/my_port/jump?offset=0'))

		clearMocks()
		commandReceiver0.mockClear()

		// Time to start playing
		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				type: QuantelCommandType.PLAYCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(3)

		// Trigger Jump
		// expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('/default/server/1100/port/my_port/trigger/JUMP'))
		// Trigger play
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/START')
		)
		// Check that play worked
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Plan to stop at end of clip
		expect(onRequest).toHaveBeenNthCalledWith(
			3,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=1999')
		)

		clearMocks()
		commandReceiver0.mockClear()

		// Time to stop playing
		await mockTime.advanceTimeToTicks(16050)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			16000,
			expect.objectContaining({
				type: QuantelCommandType.CLEARCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(1)
		// Clear port from clip (reset port)
		expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('port/my_port/reset'))

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})
	test('Play and stop, using clip guid', async () => {
		const { commandReceiver0, myConductor, errorHandler, deviceErrorHandler } = await setupDefaultQuantelDeviceForTest()

		myConductor.setTimelineAndMappings([
			{
				id: 'video0',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					guid: 'abcdef872832832a2b932c97d9b2eb9',

					// seek?: number
					// inPoint?: number
					// length?: number
					// pauseTime?: number
					// playing?: boolean
					// noStarttime?: boolean
				},
			},
		])
		// Time to preload the clip
		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			10155,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
			}),
			expect.any(String),
			expect.any(String)
		)

		// expect(onRequest).toHaveBeenCalledTimes(6)

		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'get',
			expect.stringContaining('/default/clip?ClipGUID=%22abcdef872832832a2b932c97d9b2eb9%22')
		)
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip/1337'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('clip/1337/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(5, 'post', expect.stringContaining('port/my_port/fragments'))
		// Prepare jump:
		expect(onRequest).toHaveBeenNthCalledWith(6, 'put', expect.stringContaining('port/my_port/jump?offset='))

		clearMocks()
		commandReceiver0.mockClear()

		// Time to start playing
		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				type: QuantelCommandType.PLAYCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(3)

		// Trigger Jump
		// expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('/default/server/1100/port/my_port/trigger/JUMP'))
		// Trigger play
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/START')
		)
		// Check that play worked
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Plan to stop at end of clip
		expect(onRequest).toHaveBeenNthCalledWith(
			3,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=1999')
		)

		clearMocks()
		commandReceiver0.mockClear()

		// Time to stop playing
		await mockTime.advanceTimeToTicks(16050)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			16000,
			expect.objectContaining({
				type: QuantelCommandType.CLEARCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(1)
		// Clear port from clip (reset port)
		expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('port/my_port/reset'))

		await myConductor.destroy()
		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})
	test('Play, seek and re-use clip', async () => {
		const { commandReceiver0, myConductor, errorHandler, deviceErrorHandler, device } =
			await setupDefaultQuantelDeviceForTest()

		clearMocks()
		commandReceiver0.mockClear()

		await mockTime.advanceTimeToTicks(15000)

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'video0',
				enable: {
					start: 15000, // now
					duration: 1000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					title: 'Test0',

					// seek?: number
					// inPoint?: number
					// length?: number
					// pauseTime?: number
					// playing?: boolean
					// noStarttime?: boolean
				},
			},
			{
				id: 'video1',
				enable: {
					start: '#video0.start + 200', // 15200
					duration: 300, // 15500
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					title: 'myClip0',
				},
			},
			{
				id: 'video0_again', // it should be possible to remove this object when the timeline hass added support for instance.contentStart
				enable: {
					start: '#video1.end', // 15500
					end: 16000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					title: 'Test0',

					inPoint: 500,
				},
			},
		])
		// What's going to happen:
		// 15000: clip Test0 starts playing
		// 15200: clip myClip starts playing (replaces old clip)
		// 15500: clip Test0 resumes playing
		// 16000: port is cleared

		await mockTime.advanceTimeToTicks(15150)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			15005,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
				time: 15005,
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			15010,
			expect.objectContaining({
				type: QuantelCommandType.PLAYCLIP,
				time: 15005,
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			3,
			15070,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
				time: 15055,
			}),
			expect.any(String),
			expect.any(String)
		)

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

		clearMocks()
		commandReceiver0.mockClear()
		// Time to start playing
		await mockTime.advanceTimeToTicks(15300)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			15200,
			expect.objectContaining({
				type: QuantelCommandType.PLAYCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			15265,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
			}),
			expect.any(String),
			expect.any(String)
		)

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

		clearMocks()
		commandReceiver0.mockClear()
		// Time to start playing
		await mockTime.advanceTimeToTicks(15700)

		expect(onRequest).toHaveBeenCalledTimes(4)

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
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=3986')
		)

		clearMocks()
		commandReceiver0.mockClear()

		// Time to stop playing
		await mockTime.advanceTimeToTicks(16050)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			16000,
			expect.objectContaining({
				type: QuantelCommandType.CLEARCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(1)
		// Clear port from clip (reset port)
		expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('port/my_port/reset'))

		await myConductor.destroy()
		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})
	test('outTransition to clear', async () => {
		const { commandReceiver0, myConductor, errorHandler, deviceErrorHandler } = await setupDefaultQuantelDeviceForTest()

		myConductor.setTimelineAndMappings([
			{
				id: 'video0',
				enable: {
					start: 11000,
					duration: 2000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					title: 'myClip0',
					outTransition: {
						type: QuantelTransitionType.DELAY,
						delay: 1000, // ms
					},
				},
			},
		])
		// Time to preload the clip
		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			10155,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(6)

		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/default/clip?Title=%22myClip0%22'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip/1337'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('clip/1337/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(5, 'post', expect.stringContaining('port/my_port/fragments'))
		// Prepare jump:
		expect(onRequest).toHaveBeenNthCalledWith(6, 'put', expect.stringContaining('port/my_port/jump?offset='))

		clearMocks()
		commandReceiver0.mockClear()

		// Time to start playing
		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				type: QuantelCommandType.PLAYCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(3)

		// Trigger Jump
		// expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('/default/server/1100/port/my_port/trigger/JUMP'))
		// Trigger play
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/START')
		)
		// Check that play worked
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Plan to stop at end of clip
		expect(onRequest).toHaveBeenNthCalledWith(
			3,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=1999')
		)

		clearMocks()
		commandReceiver0.mockClear()

		// Time to stop playing
		await mockTime.advanceTimeToTicks(13050)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			13000,
			expect.objectContaining({
				type: QuantelCommandType.CLEARCLIP,
				transition: {
					type: QuantelTransitionType.DELAY,
					delay: 1000,
				},
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(0) // because of the outTransition

		await mockTime.advanceTimeToTicks(14050)

		expect(onRequest).toHaveBeenCalledTimes(1)
		// Clear port from clip (reset port)
		expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('port/my_port/reset'))

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})
	test('outTransition to notOnAir', async () => {
		const { commandReceiver0, myConductor, errorHandler, deviceErrorHandler, device } =
			await setupDefaultQuantelDeviceForTest()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'video0',
				enable: {
					start: 11000,
					duration: 2000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					title: 'myClip0',
					outTransition: {
						type: QuantelTransitionType.DELAY,
						delay: 1000, // ms
					},
				},
			},
			{
				id: 'video1',
				enable: {
					start: '#video0.end', // 13000
					duration: 2000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,
					title: 'Test0',
					notOnAir: true,
					// pauseTime: 13000,
					noStarttime: true,
					playing: false,
				},
			},
		])
		// Time to preload the clip
		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			10155,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(6)

		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/default/clip?Title=%22myClip0%22'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip/1337'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('clip/1337/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(5, 'post', expect.stringContaining('port/my_port/fragments'))
		// Prepare jump:
		expect(onRequest).toHaveBeenNthCalledWith(6, 'put', expect.stringContaining('port/my_port/jump?offset=0'))

		clearMocks()
		commandReceiver0.mockClear()

		// Time to start playing
		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				type: QuantelCommandType.PLAYCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(3)

		// Trigger Jump
		// expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('/default/server/1100/port/my_port/trigger/JUMP'))
		// Trigger play
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/START')
		)
		// Check that play worked
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Plan to stop at end of clip
		expect(onRequest).toHaveBeenNthCalledWith(
			3,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=1999')
		)

		clearMocks()
		commandReceiver0.mockClear()

		// Time to stop playing

		await mockTime.advanceTimeToTicks(13050)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			12000,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			13000,
			expect.objectContaining({
				type: QuantelCommandType.PAUSECLIP,
				transition: {
					type: QuantelTransitionType.DELAY,
					delay: 1000,
				},
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(6) // because of the outTransition of #video0

		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/default/clip?Title=%22Test0%22'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip/2'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('clip/2/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(5, 'post', expect.stringContaining('port/my_port/fragments'))
		// Prepare jump:
		expect(onRequest).toHaveBeenNthCalledWith(6, 'put', expect.stringContaining('port/my_port/jump?offset=2000'))

		clearMocks()
		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(14050)
		expect(onRequest).toHaveBeenCalledTimes(2)
		// Trigger STOP
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP')
		)
		// Trigger JUMP
		expect(onRequest).toHaveBeenNthCalledWith(
			2,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/JUMP')
		)

		clearMocks()
		commandReceiver0.mockClear()

		await mockTime.advanceTimeToTicks(16050)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			expect.toBeCloseTo(15000, 5),
			expect.objectContaining({
				type: QuantelCommandType.CLEARCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(onRequest).toHaveBeenCalledTimes(1)
		// Clear port from clip (reset port)
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/reset')
		)

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})
	test('outTransition not tun for lookaheads', async () => {
		const { commandReceiver0, myConductor, errorHandler, deviceErrorHandler, device } =
			await setupDefaultQuantelDeviceForTest()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'video0',
				enable: {
					start: 11000,
					duration: 2000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					title: 'myClip0',
					notOnAir: true,
					outTransition: {
						type: QuantelTransitionType.DELAY,
						delay: 1000, // ms
					},
				},
			},
			{
				id: 'video1',
				enable: {
					start: '#video0.end', // 13000
					duration: 2000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,
					title: 'Test0',
					notOnAir: true,
					// pauseTime: 13000,
					noStarttime: true,
					playing: false,
				},
			},
		])
		// Time to preload the clip
		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			10155,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(6)

		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/default/clip?Title=%22myClip0%22'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip/1337'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('clip/1337/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(5, 'post', expect.stringContaining('port/my_port/fragments'))
		// Prepare jump:
		expect(onRequest).toHaveBeenNthCalledWith(6, 'put', expect.stringContaining('port/my_port/jump?offset=0'))

		clearMocks()
		commandReceiver0.mockClear()

		// Time to start playing
		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				type: QuantelCommandType.PLAYCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(3)

		// Trigger Jump
		// expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('/default/server/1100/port/my_port/trigger/JUMP'))
		// Trigger play
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/START')
		)
		// Check that play worked
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Plan to stop at end of clip
		expect(onRequest).toHaveBeenNthCalledWith(
			3,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=1999')
		)

		clearMocks()
		commandReceiver0.mockClear()

		// Time to stop playing

		await mockTime.advanceTimeToTicks(13050)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			12000,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			13000,
			expect.objectContaining({
				type: QuantelCommandType.PAUSECLIP,
				transition: undefined,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(8) // because of no outTransition of #video0

		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/default/clip?Title=%22Test0%22'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip/2'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('clip/2/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(5, 'post', expect.stringContaining('port/my_port/fragments'))
		// Prepare jump:
		expect(onRequest).toHaveBeenNthCalledWith(6, 'put', expect.stringContaining('port/my_port/jump?offset=2000'))
		// Trigger STOP
		expect(onRequest).toHaveBeenNthCalledWith(
			7,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP')
		)
		// Trigger JUMP
		expect(onRequest).toHaveBeenNthCalledWith(
			8,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/JUMP')
		)

		clearMocks()
		commandReceiver0.mockClear()

		await mockTime.advanceTimeToTicks(16050)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			expect.toBeCloseTo(15000, 5),
			expect.objectContaining({
				type: QuantelCommandType.CLEARCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(onRequest).toHaveBeenCalledTimes(1)
		// Clear port from clip (reset port)
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/reset')
		)

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})
	test('Play, then pause', async () => {
		const { commandReceiver0, myConductor, errorHandler, deviceErrorHandler } = await setupDefaultQuantelDeviceForTest()

		myConductor.setTimelineAndMappings([
			{
				id: 'video0',
				enable: {
					start: 11000,
					duration: 20000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,
					title: 'myClip0',
				},
			},
		])
		// Time to preload the clip
		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			10155,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(6)

		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/default/clip?Title=%22myClip0%22'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip/1337'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('clip/1337/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(5, 'post', expect.stringContaining('port/my_port/fragments'))
		// Prepare jump:
		expect(onRequest).toHaveBeenNthCalledWith(6, 'put', expect.stringContaining('port/my_port/jump?offset=0'))

		clearMocks()
		commandReceiver0.mockClear()

		// Time to start playing
		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				type: QuantelCommandType.PLAYCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(3)

		// Trigger Jump
		// expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('/default/server/1100/port/my_port/trigger/JUMP'))
		// Trigger play
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/START')
		)
		// Check that play worked
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Plan to stop at end of clip
		expect(onRequest).toHaveBeenNthCalledWith(
			3,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=1999')
		)

		clearMocks()
		commandReceiver0.mockClear()

		await mockTime.advanceTimeToTicks(14000)

		// Add a lookahead of the same clip
		myConductor.setTimelineAndMappings([
			{
				id: 'video0',
				enable: {
					start: 11000,
					duration: 20000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					title: 'myClip0',
				},
			},
			{
				id: 'lookahead_video0',
				enable: {
					while: 1,
				},
				content: {
					deviceType: DeviceType.QUANTEL,
					title: 'myClip0',
				},
				layer: 'lookahead_myLayer0',
				isLookahead: true,
				lookaheadForLayer: 'myLayer0',
			},
		])

		await mockTime.advanceTimeTicks(1000)
		// There should be no changes
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		expect(onRequest).toHaveBeenCalledTimes(0)

		clearMocks()
		commandReceiver0.mockClear()

		await mockTime.advanceTimeToTicks(20000)

		myConductor.setTimelineAndMappings([
			{
				id: 'lookahead_video0',
				enable: {
					while: 1,
				},
				content: {
					deviceType: DeviceType.QUANTEL,
					title: 'myClip0',
				},
				layer: 'lookahead_myLayer0',
				isLookahead: true,
				lookaheadForLayer: 'myLayer0',
			},
		])

		// Should seek to the beginning
		await mockTime.advanceTimeTicks(1000)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			20005,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
				clip: expect.objectContaining({
					title: 'myClip0',
				}),
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			20010,
			expect.objectContaining({
				type: QuantelCommandType.PAUSECLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(4)
		// Lookup clip id
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('default/clip/1337'))
		// Prepare jump:
		expect(onRequest).toHaveBeenNthCalledWith(2, 'put', expect.stringContaining('port/my_port/jump?offset=0'))
		// Stop playing:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'post', expect.stringContaining('port/my_port/trigger/STOP'))
		// // Trigger jump:
		expect(onRequest).toHaveBeenNthCalledWith(4, 'post', expect.stringContaining('port/my_port/trigger/JUMP'))

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})
	test('Play, then handle lookahead', async () => {
		const { commandReceiver0, myConductor, errorHandler, deviceErrorHandler } = await setupDefaultQuantelDeviceForTest()

		// Play a video
		myConductor.setTimelineAndMappings([
			{
				id: 'video0',
				enable: {
					start: 11000,
					duration: 20000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,
					title: 'myClip0',
				},
			},
		])

		// >> Skipping the tests to see that the clip started playing, that's covered in other tests <<

		await mockTime.advanceTimeToTicks(14000)
		clearMocks()
		commandReceiver0.mockClear()

		// Add a lookahead of another clip
		myConductor.setTimelineAndMappings([
			{
				id: 'video0',
				enable: {
					start: 11000,
					duration: 20000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					title: 'myClip0',
				},
			},
			{
				id: 'lookahead_video1',
				enable: {
					while: 1,
				},
				content: {
					deviceType: DeviceType.QUANTEL,
					title: 'myClip1',
				},
				layer: 'lookahead_myLayer0',
				isLookahead: true,
				lookaheadForLayer: 'myLayer0',
			},
		])

		await mockTime.advanceTimeTicks(1000)

		// The lookahead-clip should be preloaded:

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			14005,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
				clip: expect.objectContaining({
					title: 'myClip1',
				}),
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(5)

		// Find the clip
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/default/clip?Title=%22myClip1%22'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip/1338'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('clip/1338/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(5, 'post', expect.stringContaining('port/my_port/fragments'))

		clearMocks()
		commandReceiver0.mockClear()
		await mockTime.advanceTimeTicks(1000)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		expect(onRequest).toHaveBeenCalledTimes(0)

		// Remove the original clip, leaving the lookahead:
		myConductor.setTimelineAndMappings([
			{
				id: 'lookahead_video1',
				enable: {
					while: 1,
				},
				content: {
					deviceType: DeviceType.QUANTEL,
					title: 'myClip1',
				},
				layer: 'lookahead_myLayer0',
				isLookahead: true,
				lookaheadForLayer: 'myLayer0',
			},
		])

		// Should seek to the beginning of the lookahead-clip:

		await mockTime.advanceTimeTicks(1000)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			16005,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
				clip: expect.objectContaining({
					title: 'myClip1',
				}),
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			16010,
			expect.objectContaining({
				type: QuantelCommandType.PAUSECLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(4)
		// Lookup clip id
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('default/clip/1338'))
		// Prepare jump:
		expect(onRequest).toHaveBeenNthCalledWith(2, 'put', expect.stringContaining('port/my_port/jump?offset=2000'))
		// Stop playing:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'post', expect.stringContaining('port/my_port/trigger/STOP'))
		// // Trigger jump:
		expect(onRequest).toHaveBeenNthCalledWith(4, 'post', expect.stringContaining('port/my_port/trigger/JUMP'))

		clearMocks()
		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(20000)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		expect(onRequest).toHaveBeenCalledTimes(0)

		// Start playing the lookahead
		myConductor.setTimelineAndMappings([
			{
				id: 'video1',
				enable: {
					start: 20000, // now
					duration: 5000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					title: 'myClip1',
				},
			},
		])

		// Should start playing the clip:

		await mockTime.advanceTimeTicks(1000)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			20005,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
				clip: expect.objectContaining({
					title: 'myClip1',
				}),
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			20010,
			expect.objectContaining({
				type: QuantelCommandType.PLAYCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(4)
		// Lookup clip id
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('default/clip/1338'))
		// Start playing:
		expect(onRequest).toHaveBeenNthCalledWith(2, 'post', expect.stringContaining('port/my_port/trigger/START'))
		// Check that play worked
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Stop playing at the last frame
		expect(onRequest).toHaveBeenNthCalledWith(
			4,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=3233')
		)

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})
	test('Lookahead, then play, pause, seek, clear', async () => {
		const { commandReceiver0, myConductor, errorHandler, deviceErrorHandler } = await setupDefaultQuantelDeviceForTest()

		// Start by having a lookahead
		myConductor.setTimelineAndMappings([
			{
				id: 'lookahead_video0',
				enable: {
					while: 1,
				},
				content: {
					deviceType: DeviceType.QUANTEL,
					title: 'myClip0',
				},
				layer: 'lookahead_myLayer0',
				isLookahead: true,
				lookaheadForLayer: 'myLayer0',
			},
		])

		await mockTime.advanceTimeTicks(1000)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			10105,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
				clip: expect.objectContaining({
					title: 'myClip0',
				}),
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			10110,
			expect.objectContaining({
				type: QuantelCommandType.PAUSECLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(8)

		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/default/clip?Title=%22myClip0%22'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip/1337'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('clip/1337/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(5, 'post', expect.stringContaining('port/my_port/fragments'))
		// Prepare jump:
		expect(onRequest).toHaveBeenNthCalledWith(6, 'put', expect.stringContaining('port/my_port/jump?offset=0'))
		expect(onRequest).toHaveBeenNthCalledWith(7, 'post', expect.stringContaining('port/my_port/trigger/STOP'))
		expect(onRequest).toHaveBeenNthCalledWith(8, 'post', expect.stringContaining('port/my_port/trigger/JUMP'))

		clearMocks()
		commandReceiver0.mockClear()

		await mockTime.advanceTimeToTicks(15000)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		expect(onRequest).toHaveBeenCalledTimes(0)

		// Start playing the former lookahead
		myConductor.setTimelineAndMappings([
			{
				id: 'video0',
				enable: {
					start: 15000,
					duration: 20000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,
					title: 'myClip0',
				},
			},
		])

		await mockTime.advanceTimeTicks(1000)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			15005,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			15010,
			expect.objectContaining({
				type: QuantelCommandType.PLAYCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(4)

		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/default/clip/1337'))
		// Start playing:
		expect(onRequest).toHaveBeenNthCalledWith(2, 'post', expect.stringContaining('port/my_port/trigger/START'))
		// Check that play worked
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Plan to stop at end of clip
		expect(onRequest).toHaveBeenNthCalledWith(
			4,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=1999')
		)

		clearMocks()
		commandReceiver0.mockClear()

		await mockTime.advanceTimeToTicks(20000)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		expect(onRequest).toHaveBeenCalledTimes(0)

		// Pause the video:
		myConductor.setTimelineAndMappings([
			{
				id: 'video0',
				enable: {
					start: 15000,
					duration: 20000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					title: 'myClip0',

					playing: false,
					pauseTime: 20000, // Pausing now, we're 5 seconds in
				},
			},
		])

		// Should pause the clip:
		// Note: In a future implementation we could be smarter and know that we're
		// already on the right frame, and just pause the clip. Currently we're always going to seek.

		await mockTime.advanceTimeTicks(1000)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			20005,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
				clip: expect.objectContaining({
					title: 'myClip0',
				}),
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			20010,
			expect.objectContaining({
				type: QuantelCommandType.PAUSECLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(4)
		// Lookup clip id
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('default/clip/1337'))
		// Prepare jump:
		expect(onRequest).toHaveBeenNthCalledWith(2, 'put', expect.stringContaining('port/my_port/jump?offset=125')) // 5 seconds * 25fps = 125
		// Stop playing:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'post', expect.stringContaining('port/my_port/trigger/STOP'))
		// // Trigger jump:
		expect(onRequest).toHaveBeenNthCalledWith(4, 'post', expect.stringContaining('port/my_port/trigger/JUMP'))

		clearMocks()
		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(25000)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		expect(onRequest).toHaveBeenCalledTimes(0)

		// Start playing the clip again:
		myConductor.setTimelineAndMappings([
			{
				id: 'video0',
				enable: {
					start: 15000,
					duration: 20000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					title: 'myClip0',

					playing: true,
					pauseTime: 20000, // We previously paused at 20000
				},
			},
		])

		// Should start playing:

		await mockTime.advanceTimeTicks(1000)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			25005,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
				clip: expect.objectContaining({
					title: 'myClip0',
				}),
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			25010,
			expect.objectContaining({
				type: QuantelCommandType.PLAYCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		// Note: since we're already on the correct frame, no seeking is needed, just start playing right away

		expect(onRequest).toHaveBeenCalledTimes(4)
		// Lookup clip id
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/default/clip/1337'))
		// Start playing:
		expect(onRequest).toHaveBeenNthCalledWith(2, 'post', expect.stringContaining('port/my_port/trigger/START'))
		// Check that play worked
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Plan to stop at end of clip
		expect(onRequest).toHaveBeenNthCalledWith(
			4,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=1999')
		)

		clearMocks()
		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(30000)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		expect(onRequest).toHaveBeenCalledTimes(0)

		// Stop playing
		myConductor.setTimelineAndMappings([])

		// Time to stop playing
		await mockTime.advanceTimeTicks(100)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			30005,
			expect.objectContaining({
				type: QuantelCommandType.CLEARCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(1)
		// Clear port from clip (reset port)
		expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('port/my_port/reset'))

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})
	test('Preload fragments from non-existing clip (retry)', async () => {
		const { commandReceiver0, myConductor, errorHandler, deviceErrorHandler } = await setupDefaultQuantelDeviceForTest()

		quantelServer.noClipsFound = true

		myConductor.setTimelineAndMappings([
			{
				id: 'video0',
				enable: {
					while: 1,
				},
				content: {
					deviceType: DeviceType.QUANTEL,
					title: 'myClip0',
				},
				layer: 'lookahead_myLayer0',
				isLookahead: true,
				lookaheadForLayer: 'myLayer0',
			},
		])
		// Time to preload the clip
		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			10105,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
				clip: expect.objectContaining({
					title: 'myClip0',
				}),
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			10110,
			expect.objectContaining({
				type: QuantelCommandType.PAUSECLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(2)

		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/default/clip?Title=%22myClip0%22'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip?Title=%22myClip0%22'))

		clearMocks()
		commandReceiver0.mockClear()
		await mockTime.advanceTimeTicks(25000)

		// there should have been two more attempts:
		expect(onRequest).toHaveBeenCalledTimes(2)
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/default/clip?Title=%22myClip0%22'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip?Title=%22myClip0%22'))

		clearMocks()
		commandReceiver0.mockClear()
		quantelServer.noClipsFound = false
		await mockTime.advanceTimeTicks(10000)

		expect(onRequest).toHaveBeenCalledTimes(8)

		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/default/clip?Title=%22myClip0%22'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip/1337'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('clip/1337/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(5, 'post', expect.stringContaining('port/my_port/fragments'))

		// Jump:
		expect(onRequest).toHaveBeenNthCalledWith(6, 'put', expect.stringContaining('port/my_port/jump?offset=0'))
		expect(onRequest).toHaveBeenNthCalledWith(7, 'post', expect.stringContaining('port/my_port/trigger/STOP'))
		expect(onRequest).toHaveBeenNthCalledWith(8, 'post', expect.stringContaining('port/my_port/trigger/JUMP'))

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)

		clearMocks()
		commandReceiver0.mockClear()
	})
	test('Rename a port', async () => {
		const { commandReceiver0, myConductor, errorHandler, deviceErrorHandler } = await setupDefaultQuantelDeviceForTest()

		const mappings = myConductor.mapping
		const mapping = mappings['myLayer0'] as MappingQuantel
		expect(mapping).toBeTruthy()

		// Rename the port to something else
		mapping.portId = 'myNewPort'

		myConductor.setTimelineAndMappings([], mappings)
		await mockTime.advanceTimeTicks(50)

		// console.log('commandReceiver0', commandReceiver0.mock.calls)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)

		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			10105,
			expect.objectContaining({
				type: QuantelCommandType.RELEASEPORT,
				portId: 'my_port',
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			10105,
			expect.objectContaining({
				type: QuantelCommandType.SETUPPORT,
				portId: 'myNewPort',
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(1)
		expect(onRequest).toHaveBeenNthCalledWith(1, 'delete', expect.stringContaining('/default/server/1100/port/my_port'))

		commandReceiver0.mockClear()
		onRequest.mockClear()
		await mockTime.advanceTimeTicks(500)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			10205, // should be ca 100ms after the previous call
			expect.objectContaining({
				type: QuantelCommandType.CLEARCLIP,
				portId: 'myNewPort',
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(3)
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/default/server/1100/port/myNewPort'))
		expect(onRequest).toHaveBeenNthCalledWith(
			2,
			'put',
			expect.stringContaining('/default/server/1100/port/myNewPort/channel/2')
		)
		expect(onRequest).toHaveBeenNthCalledWith(
			3,
			'post',
			expect.stringContaining('/default/server/1100/port/myNewPort/reset')
		)

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)

		clearMocks()
		commandReceiver0.mockClear()
	})
})
