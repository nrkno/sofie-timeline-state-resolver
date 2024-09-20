import { Conductor } from '../../../conductor'
import {
	Mappings,
	DeviceType,
	TSRTimeline,
	Mapping,
	SomeMappingVizMSE,
	TimelineContentTypeVizMSE,
	VIZMSETransitionType,
	VIZMSEPlayoutItemContentExternal,
	VIZMSEPlayoutItemContentInternal,
	VizMSEOptions,
} from 'timeline-state-resolver-types'
import { MockTime } from '../../../__tests__/mockTime'
import { ThreadedClass } from 'threadedclass'
import { addConnections, awaitNextRemoval, getMockCall } from '../../../__tests__/lib'
import { VizMSEDevice } from '..'
import * as vConnection from '../../../__mocks__/v-connection'
import * as net from '../../../__mocks__/net'
import { Socket } from '../../../__mocks__/net'
const getMockMSEs = vConnection.getMockMSEs
type MSEMock = vConnection.MSEMock
type VRundownMocked = vConnection.VRundownMocked
import _ = require('underscore')
import { StatusCode } from '../../../devices/device'
import { MOCK_SHOWS } from '../../../__mocks__/v-connection'
import { literal } from '../../../lib'

const orgSetTimeout = setTimeout

async function wait(time = 1) {
	return new Promise((resolve) => {
		orgSetTimeout(resolve, time)
	})
}

async function setupDevice() {
	let device: any = undefined
	const commandReceiver0 = jest.fn((...args) => {
		return device._defaultCommandReceiver(...args)
	})

	const myChannelMapping0: Mapping<SomeMappingVizMSE> = {
		device: DeviceType.VIZMSE,
		deviceId: 'myViz',
		options: {},
	}
	const myChannelMapping1: Mapping<SomeMappingVizMSE> = {
		device: DeviceType.VIZMSE,
		deviceId: 'myViz',
		options: {},
	}
	const myChannelMapping: Mappings = {
		viz0: myChannelMapping0,
		viz_continue: myChannelMapping1,
	}

	const myConductor = new Conductor({
		multiThreadedResolver: false,
		getCurrentTime: mockTime.getCurrentTime,
	})
	const onError = jest.fn()
	myConductor.on('error', onError)

	myConductor.setTimelineAndMappings([], myChannelMapping)
	await myConductor.init()
	await addConnections(myConductor.connectionManager, {
		myViz: {
			type: DeviceType.VIZMSE,
			options: {
				host: '127.0.0.1',
				preloadAllElements: true,
				playlistID: 'my-super-playlist-id',
				profile: 'profile9999',
				showDirectoryPath: 'SOFIE',
			},
			commandReceiver: commandReceiver0,
		},
	})
	const deviceContainer = myConductor.connectionManager.getConnection('myViz')
	device = deviceContainer!.device as ThreadedClass<VizMSEDevice>

	return { device, myConductor, onError, commandReceiver0 }
}

const mockTime = new MockTime()

describe('vizMSE', () => {
	jest.mock('@tv2media/v-connection', () => vConnection)
	jest.mock('net', () => net)

	// const orgSetTimeout = setTimeout

	beforeEach(() => {
		mockTime.init()
	})
	test('Internal element', async () => {
		const { device, myConductor, commandReceiver0 } = await setupDevice()
		await mockTime.advanceTimeToTicks(10100)

		await device.ignoreWaitsInTests()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now + 5000, // 15100
					duration: 5000, // 20100
				},
				layer: 'viz0',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.ELEMENT_INTERNAL,
					// continueStep?: number
					// channelName?: string
					// cue?: boolean
					// noAutoPreloading?: boolean
					templateName: 'myInternalElement',
					templateData: ['line1', 'line2'],
					showName: MOCK_SHOWS[0].name,
				},
			},
			{
				id: 'obj1',
				enable: {
					start: mockTime.now + 7000, // 17100
					duration: 5000, // 22100
				},
				layer: 'viz0',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.ELEMENT_INTERNAL,
					templateName: 'myInternalElement2',
					templateData: ['line1'],
					showName: MOCK_SHOWS[0].name,
				},
			},
			{
				id: 'obj2',
				enable: {
					start: mockTime.now + 9000, // 19100
					duration: 500,
				},
				layer: 'viz_continue',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.CONTINUE,
					reference: 'viz0',
				},
			},
		])

		await mockTime.advanceTimeTicks(500) // 10500
		expect(commandReceiver0.mock.calls.length).toEqual(0)

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(14500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj0',
			// fromLookahead?: boolean
			// layerId?: string
			time: 14100,
			content: {
				instanceName: expect.stringContaining('myInternalElement'),
				templateName: 'myInternalElement',
				templateData: ['line1', 'line2'],
				showId: MOCK_SHOWS[0].id,
			},
			type: 'prepare',
			// channelName?: string
			// noAutoPreloading?: boolean
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(15500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj0',
			time: 15100,
			content: {
				instanceName: expect.stringContaining('myInternalElement'),
				templateName: 'myInternalElement',
				templateData: ['line1', 'line2'],
				showId: MOCK_SHOWS[0].id,
			},
			type: 'take',
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(16500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj1',
			time: 16100,
			content: {
				instanceName: expect.stringContaining('myInternalElement2'),
				templateName: 'myInternalElement2',
				templateData: ['line1'],
				showId: MOCK_SHOWS[0].id,
			},
			type: 'prepare',
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(17500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj1',
			time: 17100,
			content: {
				instanceName: expect.stringContaining('myInternalElement2'),
				templateName: 'myInternalElement2',
				templateData: ['line1'],
				showId: MOCK_SHOWS[0].id,
			},
			type: 'take',
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(19500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj2',
			time: 19100,
			content: {
				instanceName: expect.stringContaining('myInternalElement2'),
				templateName: 'myInternalElement2',
				templateData: ['line1'],
				showId: MOCK_SHOWS[0].id,
			},
			type: 'continue',
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(22500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj1',
			time: 22100,
			content: {
				instanceName: expect.stringContaining('myInternalElement2'),
				templateName: 'myInternalElement2',
				templateData: ['line1'],
				showId: MOCK_SHOWS[0].id,
			},
			type: 'out',
		})
	})
	test('External/Pilot element', async () => {
		const { device, myConductor, onError, commandReceiver0 } = await setupDevice()
		await mockTime.advanceTimeToTicks(10100)

		await device.ignoreWaitsInTests()
		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now + 5000, // 15100
					duration: 5000, // 20100
				},
				layer: 'viz0',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.ELEMENT_PILOT,
					// continueStep?: number
					// cue?: boolean
					// noAutoPreloading?: boolean
					channelName: 'FULL1',
					templateVcpId: 1337,
				},
			},
			{
				id: 'obj1',
				enable: {
					start: mockTime.now + 7000, // 17100
					duration: 5000, // 22100
				},
				layer: 'viz0',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.ELEMENT_PILOT,
					channelName: 'FULL1',
					templateVcpId: 1338,
				},
			},
			{
				id: 'obj2',
				enable: {
					start: mockTime.now + 9000, // 19100
					duration: 500,
				},
				layer: 'viz_continue',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.CONTINUE,
					reference: 'viz0',
				},
			},
		])

		await mockTime.advanceTimeTicks(500) // 10500
		expect(commandReceiver0.mock.calls.length).toEqual(0)

		const mse = _.last(getMockMSEs()) as MSEMock
		expect(mse).toBeTruthy()
		expect(mse.getMockRundowns()).toHaveLength(1)
		const rundown = _.last(mse.getMockRundowns()) as VRundownMocked
		expect(rundown).toBeTruthy()

		expect(await device.supportsExpectedPlayoutItems).toEqual(true)
		const expectedItem1: VIZMSEPlayoutItemContentExternal = {
			vcpid: 1337,
			channel: 'FULL1',
		}
		const expectedItem2: VIZMSEPlayoutItemContentExternal = {
			vcpid: 1336,
			channel: 'FULL1',
		}
		await device.handleExpectedPlayoutItems([expectedItem1, expectedItem2])
		await mockTime.advanceTimeTicks(100)

		expect(rundown.createElement).toHaveBeenCalledTimes(2)
		expect(rundown.createElement).toHaveBeenNthCalledWith(1, expectedItem1)
		expect(rundown.createElement).toHaveBeenNthCalledWith(2, expectedItem2)
		rundown.createElement.mockClear()

		await myConductor.devicesMakeReady(true)
		await mockTime.advanceTimeTicks(10)

		expect(rundown.activate).toHaveBeenCalledTimes(2)

		expect(rundown.getElement).toHaveBeenCalledTimes(4)
		expect(rundown.getElement).toHaveBeenNthCalledWith(1, expectedItem1)
		expect(rundown.getElement).toHaveBeenNthCalledWith(2, expectedItem2)

		expect(rundown.createElement).toHaveBeenCalledTimes(2)
		expect(rundown.createElement).toHaveBeenNthCalledWith(1, expectedItem1)
		expect(rundown.createElement).toHaveBeenNthCalledWith(2, expectedItem2)

		expect(rundown.initialize).toHaveBeenCalledTimes(2)
		expect(rundown.initialize).toHaveBeenNthCalledWith(1, expectedItem1)
		expect(rundown.initialize).toHaveBeenNthCalledWith(2, expectedItem2)

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(14500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj0',
			// fromLookahead?: boolean
			// layerId?: string
			time: 14100,
			content: {
				vcpid: 1337,
				channel: 'FULL1',
			},
			type: 'prepare',
			// noAutoPreloading?: boolean
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(15500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj0',
			time: 15100,
			content: {
				vcpid: 1337,
				channel: 'FULL1',
			},
			type: 'take',
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(16500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj1',
			time: 16100,
			content: {
				vcpid: 1338,
				channel: 'FULL1',
			},
			type: 'prepare',
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(17500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj1',
			time: 17100,
			content: {
				vcpid: 1338,
				channel: 'FULL1',
			},
			type: 'take',
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(19500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj2',
			time: 19100,
			content: {
				vcpid: 1338,
				channel: 'FULL1',
			},
			type: 'continue',
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(22500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj1',
			time: 22100,
			content: {
				vcpid: 1338,
				channel: 'FULL1',
			},
			type: 'out',
		})

		// manually load elements:
		commandReceiver0.mockClear()
		rundown.getElement.mockClear()
		rundown.createElement.mockClear()
		rundown.initialize.mockClear()

		const expectedItem3: VIZMSEPlayoutItemContentExternal = {
			vcpid: 9999,
			channel: 'FULL1',
		}

		await device.handleExpectedPlayoutItems([expectedItem1, expectedItem2, expectedItem3])

		myConductor.setTimelineAndMappings([
			{
				id: 'loadAll',
				enable: {
					start: 25000,
					duration: 500, // 25500
				},
				layer: 'viz0',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.LOAD_ALL_ELEMENTS,
				},
			},
		])

		await mockTime.advanceTimeToTicks(24900)

		expect(rundown.createElement).toHaveBeenCalledTimes(1)
		expect(rundown.createElement).toHaveBeenNthCalledWith(1, expectedItem3)
		expect(rundown.initialize).toHaveBeenCalledTimes(0)

		rundown.getElement.mockClear()
		rundown.createElement.mockClear()
		rundown.initialize.mockClear()

		await mockTime.advanceTimeToTicks(25500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'loadAll',
			time: 25000,
			type: 'load_all_elements',
		})

		expect(rundown.initialize).toHaveBeenCalledTimes(1)
		expect(rundown.initialize).toHaveBeenNthCalledWith(1, expectedItem3)

		expect(rundown.deactivate).toHaveBeenCalledTimes(0)
		await myConductor.devicesStandDown(true)
		expect(rundown.deactivate).toHaveBeenCalledTimes(1)

		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('basic functionality', async () => {
		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const onError = jest.fn()
		myConductor.on('error', onError)
		const onWarning = jest.fn()
		myConductor.on('warning', onWarning)

		await myConductor.init()

		await addConnections(
			myConductor.connectionManager,
			{
				myViz: {
					type: DeviceType.VIZMSE,
					options: literal<Omit<VizMSEOptions, 'host'>>({
						// host: '127.0.0.1',
						profile: 'myProfile',
					}) as any,
				},
			},
			false
		)
		await awaitNextRemoval(myConductor.connectionManager)
		await addConnections(
			myConductor.connectionManager,
			{
				myViz: {
					type: DeviceType.VIZMSE,
					options: literal<Omit<VizMSEOptions, 'profile'>>({
						host: '127.0.0.1',
						// profile: 'myProfile',
					}) as any,
				},
			},
			false
		)
		await awaitNextRemoval(myConductor.connectionManager)

		expect(onError).toHaveBeenCalledTimes(2)
		onError.mockClear()

		await addConnections(myConductor.connectionManager, {
			myViz: {
				type: DeviceType.VIZMSE,
				options: {
					host: '127.0.0.1',
					profile: 'myProfile',
				},
			},
		})
		const device = myConductor.connectionManager.getConnection('myViz')!.device
		const connectionChanged = jest.fn()
		await device.on('connectionChanged', connectionChanged)

		const mse = _.last(getMockMSEs()) as MSEMock
		expect(mse).toBeTruthy()
		expect(mse.getMockRundowns()).toHaveLength(1)

		expect(connectionChanged).toHaveBeenCalledTimes(0)
		expect(await device.getStatus()).toMatchObject({
			statusCode: StatusCode.GOOD,
		})
		connectionChanged.mockClear()

		mse.mockSetDisconnected()

		await mockTime.advanceTimeTicks(100)
		expect(connectionChanged).toHaveBeenCalledTimes(1)
		expect(await device.getStatus()).toMatchObject({
			statusCode: StatusCode.BAD,
		})
		connectionChanged.mockClear()

		mse.mockSetConnected()

		await mockTime.advanceTimeTicks(100)
		expect(connectionChanged).toHaveBeenCalledTimes(1)
		expect(await device.getStatus()).toMatchObject({
			statusCode: StatusCode.GOOD,
		})

		await device.terminate()

		await mockTime.advanceTimeTicks(1000)

		expect(onError).toHaveBeenCalledTimes(0)
		expect(onWarning).toHaveBeenCalledTimes(0)
	})
	test('clear all elements', async () => {
		const commandReceiver0 = jest.fn(async () => {
			return Promise.resolve()
		})
		const myChannelMapping0: Mapping<SomeMappingVizMSE> = {
			device: DeviceType.VIZMSE,
			deviceId: 'myViz',
			options: {},
		}
		const myChannelMapping1: Mapping<SomeMappingVizMSE> = {
			device: DeviceType.VIZMSE,
			deviceId: 'myViz',
			options: {},
		}
		const myChannelMapping: Mappings = {
			viz0: myChannelMapping0,
			viz_continue: myChannelMapping1,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		myConductor.setTimelineAndMappings([], myChannelMapping)
		await myConductor.init()
		await addConnections(myConductor.connectionManager, {
			myViz: {
				type: DeviceType.VIZMSE,
				options: {
					host: '127.0.0.1',
					preloadAllElements: true,
					playlistID: 'my-super-playlist-id',
					profile: 'profile9999',
					clearAllTemplateName: 'clear_all_of_them',
					clearAllCommands: ['RENDERER*FRONT_LAYER SET_OBJECT ', 'RENDERER SET_OBJECT '],
					showDirectoryPath: 'SOFIE',
				},
				commandReceiver: commandReceiver0,
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.connectionManager.getConnection('myViz')
		const device = deviceContainer!.device as ThreadedClass<VizMSEDevice>
		await device.ignoreWaitsInTests()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now, // 10100
					duration: 10 * 1000, // 20100
				},
				layer: 'viz0',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.ELEMENT_INTERNAL,
					templateName: 'myInternalElement',
					templateData: [],
					showName: MOCK_SHOWS[0].name,
				},
			},
			{
				id: 'clearAll',
				enable: {
					start: mockTime.now + 5000, // 15100
					duration: 1000, // 16100
				},
				layer: 'viz0',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.CLEAR_ALL_ELEMENTS,
					channelsToSendCommands: ['OVL', 'FULL'],
					showName: MOCK_SHOWS[0].name,
				},
			},
		] as TSRTimeline)

		// await mockTime.advanceTimeTicks(500) // 10500
		// expect(commandReceiver0.mock.calls.length).toEqual(0)

		// commandReceiver0.mockClear()
		// await mockTime.advanceTimeToTicks(14500)
		// expect(commandReceiver0.mock.calls.length).toEqual(1)
		// expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
		// 	timelineObjId: 'obj0',
		// 	time: 14100,
		// 	templateInstance: expect.stringContaining('myInternalElement'),
		// 	type: 'prepare',
		// 	templateName: 'myInternalElement',
		// 	templateData: []
		// })

		// commandReceiver0.mockClear()
		// await mockTime.advanceTimeToTicks(100)
		await mockTime.advanceTimeTicks(500) // 10500
		expect(commandReceiver0.mock.calls.length).toEqual(2)

		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj0',
			time: 10100,
			content: {
				instanceName: expect.stringContaining('myInternalElement'),
				templateName: 'myInternalElement',
				templateData: [],
				showId: MOCK_SHOWS[0].id,
			},
			type: 'prepare',
		})
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			timelineObjId: 'obj0',
			time: 10105,
			content: {
				instanceName: expect.stringContaining('myInternalElement'),
				templateName: 'myInternalElement',
				templateData: [],
				showId: MOCK_SHOWS[0].id,
			},
			type: 'take',
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(15500)
		expect(commandReceiver0.mock.calls.length).toEqual(3)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'clearAll',
			time: 15100,
			type: 'clear_all_elements',
			templateName: 'clear_all_of_them',
		})
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			timelineObjId: 'clearAll',
			time: 15100,
			type: 'clear_all_engines',
			channels: ['OVL', 'FULL'],
			commands: ['RENDERER*FRONT_LAYER SET_OBJECT ', 'RENDERER SET_OBJECT '],
		})
		expect(getMockCall(commandReceiver0, 2, 1)).toMatchObject({
			timelineObjId: 'obj0',
			time: 15150,
			content: {
				instanceName: expect.stringContaining('myInternalElement'),
				templateName: 'myInternalElement',
				templateData: [],
				showId: MOCK_SHOWS[0].id,
			},
			type: 'prepare',
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(16500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj0',
			time: 16100,
			content: {
				instanceName: expect.stringContaining('myInternalElement'),
				templateName: 'myInternalElement',
				templateData: [],
				showId: MOCK_SHOWS[0].id,
			},
			type: 'take',
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(20500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj0',
			time: 20100,
			content: {
				instanceName: expect.stringContaining('myInternalElement'),
				templateName: 'myInternalElement',
				templateData: [],
				showId: MOCK_SHOWS[0].id,
			},
			type: 'out',
		})
	})
	test('Delayed External/Pilot element', async () => {
		const { device, myConductor, onError, commandReceiver0 } = await setupDevice()
		await mockTime.advanceTimeToTicks(10100)

		await device.ignoreWaitsInTests()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		const mse = _.last(getMockMSEs()) as MSEMock
		expect(mse).toBeTruthy()
		expect(mse.getMockRundowns()).toHaveLength(1)
		const rundown = _.last(mse.getMockRundowns()) as VRundownMocked
		expect(rundown).toBeTruthy()

		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now + 5000, // 15100
					duration: 5000, // 20100
				},
				layer: 'viz0',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.ELEMENT_PILOT,
					channelName: 'FULL1',
					templateVcpId: 1337,
					outTransition: {
						type: VIZMSETransitionType.DELAY,
						delay: 1000,
					},
				},
			},
		])

		await mockTime.advanceTimeToTicks(14000)
		expect(commandReceiver0.mock.calls.length).toEqual(0)

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(14500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj0',
			time: 14100,
			content: {
				vcpid: 1337,
				channel: 'FULL1',
			},
			type: 'prepare',
		})

		commandReceiver0.mockClear()
		rundown.take.mockClear()
		await mockTime.advanceTimeToTicks(15500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(rundown.take).toHaveBeenCalledTimes(1)
		expect(rundown.take).toHaveBeenNthCalledWith(1, {
			vcpid: 1337,
			channel: 'FULL1',
		})
		expect(rundown.out).toHaveBeenCalledTimes(0)

		commandReceiver0.mockClear()
		rundown.out.mockClear()
		rundown.take.mockClear()
		await mockTime.advanceTimeToTicks(20500)
		expect(rundown.out).toHaveBeenCalledTimes(0) // because it's delayed!

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(21200)
		expect(rundown.out).toHaveBeenCalledTimes(1)
		expect(rundown.out).toHaveBeenNthCalledWith(1, {
			vcpid: 1337,
			channel: 'FULL1',
		})
		expect(rundown.take).toHaveBeenCalledTimes(0)

		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('produces initialization and cleanup commands', async () => {
		const { device, myConductor, onError, commandReceiver0 } = await setupDevice()
		await mockTime.advanceTimeToTicks(10100)
		await device.ignoreWaitsInTests()
		await myConductor.devicesMakeReady(true)

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		const mse = _.last(getMockMSEs()) as MSEMock
		expect(mse).toBeTruthy()
		expect(mse.getMockRundowns()).toHaveLength(1)
		const rundown = _.last(mse.getMockRundowns()) as VRundownMocked
		expect(rundown).toBeTruthy()

		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now + 5000, // 15100
					duration: 5000, // 20100
				},
				layer: 'viz0',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.INITIALIZE_SHOWS,
					showNames: [MOCK_SHOWS[0].name, MOCK_SHOWS[1].name],
				},
			},
			{
				id: 'obj1',
				enable: {
					start: mockTime.now + 11000, // 21100
					duration: 5000, // 26100
				},
				layer: 'viz0',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.CLEANUP_SHOWS,
					showNames: [MOCK_SHOWS[2].name, MOCK_SHOWS[3].name],
				},
			},
		])

		await mockTime.advanceTimeToTicks(15000)
		expect(commandReceiver0.mock.calls.length).toEqual(0)

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(15500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj0',
			time: 15100,
			type: 'initialize_shows',
			showIds: [MOCK_SHOWS[0].id, MOCK_SHOWS[1].id],
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(20500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj0',
			time: 20100,
			type: 'initialize_shows',
			showIds: [],
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(21500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj1',
			time: 21100,
			type: 'cleanup_shows',
			showIds: [MOCK_SHOWS[2].id, MOCK_SHOWS[3].id],
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(26500)
		expect(commandReceiver0.mock.calls.length).toEqual(0)

		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('re-initializes show for incoming elements during TimelineObjVIZMSEInitializeShows', async () => {
		const { device, myConductor, onError } = await setupDevice()
		await device.ignoreWaitsInTests()
		await myConductor.devicesMakeReady(true)

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		const mse = _.last(getMockMSEs()) as MSEMock
		expect(mse).toBeTruthy()
		expect(mse.getMockRundowns()).toHaveLength(1)
		const rundown = _.last(mse.getMockRundowns()) as VRundownMocked
		expect(rundown).toBeTruthy()

		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now + 5000, // 15100
					duration: 5000, // 20100
				},
				layer: 'viz0',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.INITIALIZE_SHOWS,
					showNames: [MOCK_SHOWS[0].name, MOCK_SHOWS[1].name],
				},
			},
		])

		await device.handleExpectedPlayoutItems(
			literal<VIZMSEPlayoutItemContentInternal[]>([
				{
					templateName: 'bund',
					showName: MOCK_SHOWS[0].name,
				},
			])
		)

		await mockTime.advanceTimeToTicks(15500)

		rundown.initializeShow.mockClear()
		await device.handleExpectedPlayoutItems(
			literal<VIZMSEPlayoutItemContentInternal[]>([
				{
					templateName: 'bund',
					showName: MOCK_SHOWS[0].name,
				},
				{
					templateName: 'bund',
					showName: MOCK_SHOWS[1].name,
				},
				{
					templateName: 'ident',
					showName: MOCK_SHOWS[2].name,
				},
				{
					templateName: 'tlf',
					showName: MOCK_SHOWS[1].name,
				},
			])
		)
		await mockTime.advanceTimeToTicks(16500)
		expect(rundown.initializeShow).toHaveBeenCalledTimes(1)
		expect(rundown.initializeShow).toHaveBeenNthCalledWith(1, MOCK_SHOWS[1].id)

		rundown.initializeShow.mockClear()
		await mockTime.advanceTimeToTicks(25500)
		expect(rundown.initializeShow).toHaveBeenCalledTimes(0)

		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('creates and deletes internal elements', async () => {
		const { device, myConductor, onError } = await setupDevice()
		await mockTime.advanceTimeToTicks(10100)

		await device.ignoreWaitsInTests()
		await myConductor.devicesMakeReady(true)

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		const mse = _.last(getMockMSEs()) as MSEMock
		expect(mse).toBeTruthy()
		expect(mse.getMockRundowns()).toHaveLength(1)
		const rundown = _.last(mse.getMockRundowns()) as VRundownMocked
		expect(rundown).toBeTruthy()

		await mockTime.advanceTimeToTicks(20500)
		await device.handleExpectedPlayoutItems(
			literal<VIZMSEPlayoutItemContentInternal[]>([
				{
					templateName: 'bund',
					showName: MOCK_SHOWS[1].name,
					templateData: ['foo', 'bar'],
					channel: 'my_channel',
				},
			])
		)
		expect(rundown.createElement).toHaveBeenCalledTimes(1)
		expect(rundown.createElement).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				instanceName: 'sofieInt_bund_szi7xlRYleXD4TLRdBjduVRjx3E_',
				showId: MOCK_SHOWS[1].id,
			}),
			'bund',
			['foo', 'bar'],
			'my_channel'
		)

		await device.handleExpectedPlayoutItems(literal<VIZMSEPlayoutItemContentInternal[]>([]))

		await mockTime.advanceTimeToTicks(39500)
		expect(rundown.deleteElement).toHaveBeenCalledTimes(0)
		await mockTime.advanceTimeToTicks(41500)
		expect(rundown.deleteElement).toHaveBeenCalledTimes(1)
		expect(rundown.deleteElement).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				instanceName: 'sofieInt_bund_szi7xlRYleXD4TLRdBjduVRjx3E_',
				showId: MOCK_SHOWS[1].id,
			})
		)

		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('vizMSE: clear all elements on makeReady when clearAllOnMakeReady is true', async () => {
		const CLEAR_COMMAND = 'RENDERER*FRONT_LAYER SET_OBJECT'
		const PROFILE_NAME = 'mockProfile'
		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await addConnections(myConductor.connectionManager, {
			myViz: {
				type: DeviceType.VIZMSE,
				options: {
					host: '127.0.0.1',
					preloadAllElements: true,
					playlistID: 'my-super-playlist-id',
					profile: PROFILE_NAME,
					clearAllOnMakeReady: true,
					clearAllTemplateName: 'clear_all_of_them',
					clearAllCommands: [CLEAR_COMMAND],
				},
			},
		})

		const deviceContainer = myConductor.connectionManager.getConnection('myViz')
		const device = deviceContainer!.device as ThreadedClass<VizMSEDevice>
		await device.ignoreWaitsInTests()

		const mse = _.last(getMockMSEs()) as MSEMock
		expect(mse).toBeTruthy()
		mse.mockCreateProfile(PROFILE_NAME, {
			Channel1: {
				entry: {
					viz: {
						value: 'Engine1',
					},
				},
			},
		})
		mse.mockSetEngines([
			{
				mode: 'mockData',
				status: 'mockData',
				type: 'viz',
				name: 'Engine1',
				encoding: {
					value: 'mockData',
				},
				state: 'mockData',
				renderer: {
					localhost: {},
				},
				publishing_point_uri: 'mockData',
				publishing_point_atom_id: 'mockData',
				info: 'mockData',
			},
		])

		let netSocket: Socket

		const writeBuffer = await Promise.all([
			new Promise((resolve) => {
				Socket.mockOnNextSocket((mockSocket: Socket) => {
					netSocket = mockSocket
					netSocket.onWrite = (buffer) => {
						resolve(buffer.toString())
					}
				})
			}),
			device.makeReady(true, 'someDummyId'),
		])

		expect(writeBuffer[0]).toMatch(CLEAR_COMMAND)
	})
	test("vizMSE: don't clear engines when clearAllOnMakeReady is set to false", async () => {
		const CLEAR_COMMAND = 'RENDERER*FRONT_LAYER SET_OBJECT'
		const PROFILE_NAME = 'mockProfile'
		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await addConnections(myConductor.connectionManager, {
			myViz: {
				type: DeviceType.VIZMSE,
				options: {
					host: '127.0.0.1',
					preloadAllElements: true,
					playlistID: 'my-super-playlist-id',
					profile: PROFILE_NAME,
					clearAllOnMakeReady: false,
					clearAllTemplateName: 'clear_all_of_them',
					clearAllCommands: [CLEAR_COMMAND],
				},
			},
		})

		const deviceContainer = myConductor.connectionManager.getConnection('myViz')
		const device = deviceContainer!.device as ThreadedClass<VizMSEDevice>
		await device.ignoreWaitsInTests()

		const mse = _.last(getMockMSEs()) as MSEMock
		expect(mse).toBeTruthy()
		mse.mockCreateProfile(PROFILE_NAME, {
			Channel1: {
				entry: {
					viz: {
						value: 'Engine1',
					},
				},
			},
		})
		mse.mockSetEngines([
			{
				mode: 'mockData',
				status: 'mockData',
				type: 'viz',
				name: 'Engine1',
				encoding: {
					value: 'mockData',
				},
				state: 'mockData',
				renderer: {
					localhost: {},
				},
				publishing_point_uri: 'mockData',
				publishing_point_atom_id: 'mockData',
				info: 'mockData',
			},
		])

		let netSocket: Socket

		const promiseRaceResult = await Promise.all([
			Promise.race([
				new Promise((resolve) => {
					Socket.mockOnNextSocket((mockSocket: Socket) => {
						netSocket = mockSocket
						netSocket.onWrite = (buffer) => {
							resolve(buffer.toString())
						}
					})
				}),
				(async () => {
					await wait(100)
					return 'timeout'
				})(),
			]),
			device.makeReady(true, 'someDummyId'),
		])
		expect(promiseRaceResult[0]).toBe('timeout')
	})
})
