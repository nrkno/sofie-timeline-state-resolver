import { Conductor } from '../../../conductor'
import {
	TimelineContentTypeCasparCg,
	SomeMappingCasparCG,
	Mappings,
	DeviceType,
	ChannelFormat,
	Transition,
	Ease,
	Direction,
	TSRTimeline,
	Mapping,
	MappingCasparCGType,
} from 'timeline-state-resolver-types'
import { MockTime } from '../../../__tests__/mockTime'
import { addConnections, getMockCall } from '../../../__tests__/lib'
import { Commands } from 'casparcg-connection'

// usage logCalls(commandReceiver0)
// function logCalls (fcn) {
// 	console.log('calls')
// 	fcn.mock.calls.forEach((call) => {
// 		console.log(call[0], call[1])
// 	})
// }

describe('CasparCG', () => {
	const mockTime = new MockTime()
	beforeEach(() => {
		mockTime.init()
	})
	test('CasparCG: Play AMB for 60s', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 42,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await addConnections(myConductor.connectionManager, {
			myCCG: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
				},
				commandReceiver: commandReceiver0,
				skipVirginCheck: true,
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		commandReceiver0.mockClear()

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.getCurrentTime() - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10200)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			channel: 2,
			layer: 42,
			clip: 'AMB',
			loop: true,
			seek: 0, // looping and seeking nos supported when length not provided
		})

		// advance time to end of clip:
		await mockTime.advanceTimeToTicks(11200)

		// two commands have been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1).command).toEqual(Commands.Clear)
		expect(getMockCall(commandReceiver0, 1, 1).params.channel).toEqual(2)
		expect(getMockCall(commandReceiver0, 1, 1).params.layer).toEqual(42)
	})
	test('CasparCG: Play AMB for 60s, start at 10s', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 42,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await addConnections(myConductor.connectionManager, {
			myCCG: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
				},
				commandReceiver: commandReceiver0,
				skipVirginCheck: true,
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		commandReceiver0.mockClear()

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.getCurrentTime() - 10000, // 10 seconds ago
						duration: 60000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10200)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			channel: 2,
			layer: 42,
			clip: 'AMB',
			seek: 25 * 10,
		})
	})
	test('CasparCG: Play AMB for 60s in 50fps', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 42,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await addConnections(myConductor.connectionManager, {
			myCCG: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
					fps: 50,
				},
				commandReceiver: commandReceiver0,
				skipVirginCheck: true,
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		commandReceiver0.mockClear()

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.getCurrentTime() - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
						inPoint: 0,
						length: 60 * 1000,
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10200)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			channel: 2,
			layer: 42,

			clip: 'AMB',
			loop: true,
			seek: 50,
			length: 60 * 50,
		})

		// advance time to end of clip:
		await mockTime.advanceTimeToTicks(11200)

		// two commands have been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1).command).toBe(Commands.Clear)
		expect(getMockCall(commandReceiver0, 1, 1).params.channel).toEqual(2)
		expect(getMockCall(commandReceiver0, 1, 1).params.layer).toEqual(42)
	})

	test('CasparCG: Play IP input for 60s', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 42,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await addConnections(myConductor.connectionManager, {
			myCCG: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
				},
				commandReceiver: commandReceiver0,
				skipVirginCheck: true,
			},
		})

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.getCurrentTime() - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.IP,

						uri: 'rtsp://127.0.0.1:5004',
					},
				},
			],
			myLayerMapping
		)
		await mockTime.advanceTimeTicks(100)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).command).toBe(Commands.Play)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			channel: 2,
			layer: 42,

			clip: 'rtsp://127.0.0.1:5004',
			seek: 0, // can't seek in an ip input
		})

		// advance time to end of clip:
		await mockTime.advanceTimeTicks(2000)

		// two commands have been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1).command).toEqual(Commands.Clear)
		expect(getMockCall(commandReceiver0, 1, 1).params.channel).toEqual(2)
		expect(getMockCall(commandReceiver0, 1, 1).params.layer).toEqual(42)
	})

	test('CasparCG: Play decklink input for 60s', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 42,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await addConnections(myConductor.connectionManager, {
			myCCG: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
				},
				commandReceiver: commandReceiver0,
				skipVirginCheck: true,
			},
		})

		// await mockTime.advanceTimeToTicks(10050)
		// expect(commandReceiver0).toHaveBeenCalledTimes(3)

		// await mockTime.advanceTimeToTicks(10010)

		await mockTime.advanceTimeToTicks(10050)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: 9000,
						duration: 2000, // 11000
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.INPUT,

						device: 1,
						inputType: 'decklink',
						deviceFormat: ChannelFormat.HD_720P5000,
					},
				},
			],
			myLayerMapping
		)
		await mockTime.advanceTimeToTicks(10100)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)

		expect(getMockCall(commandReceiver0, 0, 1).command).toBe(Commands.PlayDecklink)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			channel: 2,
			layer: 42,
			device: 1,
			format: ChannelFormat.HD_720P5000,
		})

		await mockTime.advanceTimeToTicks(12000)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)

		expect(getMockCall(commandReceiver0, 1, 1).command).toBe(Commands.Clear)
		expect(getMockCall(commandReceiver0, 1, 1).params).toMatchObject({
			channel: 2,
			layer: 42,
		})

		// advance time to end of clip:
		// await mockTime.advanceTimeToTicks(11200)

		// two commands have been sent:
		// expect(commandReceiver0).toHaveBeenCalledTimes(5)
	})

	test('CasparCG: Play template for 60s', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 42,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await addConnections(myConductor.connectionManager, {
			myCCG: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
				},
				commandReceiver: commandReceiver0,
				skipVirginCheck: true,
			},
		})

		await mockTime.advanceTimeToTicks(10050)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: 9000,
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.TEMPLATE,

						name: 'LT',
						data: {
							f0: 'Hello',
							f1: 'World',
						},
						useStopCommand: true,
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10100)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).command).toBe(Commands.CgAdd)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			channel: 2,
			layer: 42,

			template: 'LT',
			cgLayer: 1,
			playOnLoad: true,
			data: { f0: 'Hello', f1: 'World' },
		})

		await mockTime.advanceTimeToTicks(12100)

		expect(getMockCall(commandReceiver0, 1, 1).command).toBe(Commands.CgStop)
	})

	test('CasparCG: Schedule recording', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 42,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await addConnections(myConductor.connectionManager, {
			myCCG: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
				},
				commandReceiver: commandReceiver0,
				skipVirginCheck: true,
			},
		})

		await mockTime.advanceTimeToTicks(10050)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: 9000,
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.RECORD,

						file: 'RECORDING',
						encoderOptions: '-format mkv -c:v libx264 -crf 22',
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10100)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).command).toBe(Commands.Add)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			consumer: 'FILE',
			parameters: 'RECORDING -format mkv -c:v libx264 -crf 22',
		})

		await mockTime.advanceTimeToTicks(12100)

		expect(getMockCall(commandReceiver0, 1, 1).command).toBe(Commands.Remove)
	})

	test('CasparCG: Play 2 routes for 60s', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 42,
			},
		}
		const myLayerMapping1: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 1,
				layer: 42,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
			myLayer1: myLayerMapping1,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await addConnections(myConductor.connectionManager, {
			myCCG: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
				},
				commandReceiver: commandReceiver0,
				skipVirginCheck: true,
			},
		})

		const connContainer = myConductor.connectionManager.getConnection('myCCG')
		const conn = connContainer!.device
		await conn['_ccgState']

		await mockTime.advanceTimeToTicks(10050)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: 9000,
						duration: 3000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.ROUTE,

						mappedLayer: 'myLayer1',
						delay: 80, // * 1000, // @todo: because reasons, TSR uses fps of 0.025, which breaks all calculations in CasparCG-state
						mode: 'BACKGROUND',
					},
				},
				{
					id: 'obj1',
					enable: {
						start: 11000,
						duration: 1000,
					},
					layer: 'myLayer1',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.ROUTE,

						channel: 2,
						layer: 23,
						delay: 320, // * 1000
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10100)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			channel: 2,
			layer: 42,

			route: {
				channel: 1,
				layer: 42,
			},
			framesDelay: 2,
			mode: 'BACKGROUND',
		})

		await mockTime.advanceTimeToTicks(11000)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1).params).toMatchObject({
			channel: 1,
			layer: 42,

			route: {
				channel: 2,
				layer: 23,
			},
			framesDelay: 8,
		})

		// advance time to end of clip:
		await mockTime.advanceTimeToTicks(12010)

		// two more commands have been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(4)
		// expect 2 clear commands:
		expect(getMockCall(commandReceiver0, 2, 1).command).toEqual(Commands.Clear)
		expect(getMockCall(commandReceiver0, 3, 1).command).toEqual(Commands.Clear)
	})

	test('CasparCG: AMB with transitions', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 42,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await addConnections(myConductor.connectionManager, {
			myCCG: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
				},
				commandReceiver: commandReceiver0,
				skipVirginCheck: true,
			},
		})

		// Check that no commands has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		await mockTime.advanceTimeToTicks(10050)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.getCurrentTime() - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',

						transitions: {
							inTransition: {
								type: Transition.MIX,
								duration: 1000,
								easing: Ease.LINEAR,
								direction: Direction.LEFT,
							},
							outTransition: {
								type: Transition.MIX,
								duration: 1000,
								easing: Ease.LINEAR,
								direction: Direction.RIGHT,
							},
						},
					},
				},
			],
			myLayerMapping
		)

		// fast-forward:
		await mockTime.advanceTimeTicks(100)
		// Check that an ACMP-command has been sent
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).command).toEqual(Commands.Play)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			channel: 2,
			layer: 42,

			transition: {
				transitionType: 'MIX',
				duration: 25,
				tween: 'LINEAR',
				direction: 'LEFT',
			},
			clip: 'AMB',
			seek: 25,
			loop: false,
		})

		await mockTime.advanceTimeTicks(2000)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1).command).toEqual(Commands.Play)
		expect(getMockCall(commandReceiver0, 1, 1).params).toMatchObject({
			channel: 2,
			layer: 42,
			transition: {
				transitionType: 'MIX',
				duration: 25,
				tween: 'LINEAR',
				direction: 'RIGHT',
			},
			clip: 'empty',
		})

		// Nothing more should've happened:
		await mockTime.advanceTimeToTicks(12400)

		expect(commandReceiver0.mock.calls.length).toBe(2)
	})

	test('CasparCG: Mixer commands', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 42,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		myConductor.on('error', (e) => {
			throw new Error(e)
		})
		myConductor.on('warning', (msg) => {
			console.warn(msg)
		})
		await myConductor.init()
		await addConnections(myConductor.connectionManager, {
			myCCG: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
				},
				commandReceiver: commandReceiver0,
				skipVirginCheck: true,
			},
		})

		// Check that no commands has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.getCurrentTime() - 1000, // 1 seconds ago
						duration: 12000, // 12s
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA, // more to be implemented later!
						file: 'AMB',
						loop: true,
					},
					keyframes: [
						{
							id: 'kf1',
							enable: {
								start: 500, // 0 = parent's start
								duration: 5500,
							},
							content: {
								mixer: {
									perspective: {
										topLeftX: 0,
										topLeftY: 0,
										topRightX: 0.5,
										topRightY: 0,
										bottomRightX: 0.5,
										bottomRightY: 1,
										bottomLeftX: 0,
										bottomLeftY: 1,
									},
								},
							},
						},
						{
							id: 'kf2',
							enable: {
								start: 6000, // 0 = parent's start
								duration: 6000,
							},
							content: {
								mixer: {
									perspective: {
										topLeftX: 0,
										topLeftY: 0,
										topRightX: 1,
										topRightY: 0,
										bottomRightX: 1,
										bottomRightY: 1,
										bottomLeftX: 0,
										bottomLeftY: 1,
									},
								},
							},
						},
					],
				},
			],
			myLayerMapping
		)

		// fast-forward:
		await mockTime.advanceTimeTicks(100)

		// Check that ACMP-commands has been sent
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		// we've already tested play commands so let's check the mixer command:
		expect(getMockCall(commandReceiver0, 1, 1).command).toMatch(Commands.MixerPerspective)
		expect(getMockCall(commandReceiver0, 1, 1).params).toMatchObject({
			channel: 2,
			layer: 42,
			topLeftX: 0,
			topLeftY: 0,
			topRightX: 0.5,
			topRightY: 0,
			bottomRightX: 0.5,
			bottomRightY: 1,
			bottomLeftX: 0,
			bottomLeftY: 1,
		})

		// fast-forward:
		await mockTime.advanceTimeTicks(5000)

		expect(commandReceiver0.mock.calls).toHaveLength(3)
		// expect(CasparCG.mockDo.mock.calls[2][0]).toBeInstanceOf(AMCP.StopCommand);
		expect(getMockCall(commandReceiver0, 2, 1).command).toMatch(Commands.MixerPerspective)
		expect(getMockCall(commandReceiver0, 2, 1).params).toMatchObject({
			channel: 2,
			layer: 42,
			topLeftX: 0,
			topLeftY: 0,
			topRightX: 1,
			topRightY: 0,
			bottomRightX: 1,
			bottomRightY: 1,
			bottomLeftX: 0,
			bottomLeftY: 1,
		})
	})

	test('CasparCG: loadbg command', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 42,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await addConnections(myConductor.connectionManager, {
			myCCG: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
				},
				commandReceiver: commandReceiver0,
				skipVirginCheck: true,
			},
		})

		expect(mockTime.getCurrentTime()).toEqual(10000)

		await mockTime.advanceTimeToTicks(10050)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0_bg',
					enable: {
						start: 10000,
						duration: 1200,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
					},
					// @ts-ignore
					isLookahead: true,
				},
				{
					id: 'obj0',
					enable: {
						start: 11200, // 1.2 seconds in the future
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeTicks(100)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).command).toEqual(Commands.Loadbg)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			channel: 2,
			layer: 42,

			clip: 'AMB',
			auto: false,
			loop: true,
			seek: 0,
			clearOn404: true,
		})

		await mockTime.advanceTimeTicks(2000)
		expect(getMockCall(commandReceiver0, 1, 1).command).toEqual(Commands.Play)
		expect(getMockCall(commandReceiver0, 1, 1).params).toEqual({
			channel: 2,
			layer: 42,
		})

		await mockTime.advanceTimeTicks(2000)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(getMockCall(commandReceiver0, 2, 1).command).toEqual(Commands.Clear)
		expect(getMockCall(commandReceiver0, 2, 1).params).toEqual({
			channel: 2,
			layer: 42,
		})
	})

	test('CasparCG: load command', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 42,
				previewWhenNotOnAir: true,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await addConnections(myConductor.connectionManager, {
			myCCG: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
				},
				commandReceiver: commandReceiver0,
				skipVirginCheck: true,
			},
		})

		expect(mockTime.getCurrentTime()).toEqual(10000)

		await mockTime.advanceTimeToTicks(10050)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0_bg',
					enable: {
						start: 10000,
						duration: 1200,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
					},
					// @ts-ignore
					isLookahead: true,
				},
				{
					id: 'obj0',
					enable: {
						start: 11200, // 1.2 seconds in the future
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeTicks(100)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).command).toEqual(Commands.Load)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			channel: 2,
			layer: 42,

			clip: 'AMB',
			loop: true,
			seek: 0,
			clearOn404: true,
		})

		await mockTime.advanceTimeTicks(2000)

		expect(getMockCall(commandReceiver0, 1, 1).command).toEqual(Commands.Resume)
		expect(getMockCall(commandReceiver0, 1, 1).params).toEqual({
			channel: 2,
			layer: 42,
		})

		await mockTime.advanceTimeTicks(2000)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(getMockCall(commandReceiver0, 2, 1).command).toEqual(Commands.Clear)
		expect(getMockCall(commandReceiver0, 2, 1).params).toEqual({
			channel: 2,
			layer: 42,
		})
	})

	test('CasparCG: Schedule Play, then change my mind', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 42,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await addConnections(myConductor.connectionManager, {
			myCCG: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
				},
				commandReceiver: commandReceiver0,
				skipVirginCheck: true,
			},
		})

		await mockTime.advanceTimeToTicks(10050)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0_bg',
					enable: {
						start: 10000,
						duration: 1200, // 11200
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
					},
					// @ts-ignore
					isLookahead: true,
				},
				{
					id: 'obj0',
					enable: {
						start: 11200, // 1.2 seconds in the future
						duration: 2000, // 13200
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10100)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).command).toEqual(Commands.Loadbg)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			channel: 2,
			layer: 42,

			clip: 'AMB',
			auto: false,
			loop: true,
			seek: 0,
		})

		// then change my mind:
		myConductor.setTimelineAndMappings([])
		await mockTime.advanceTimeToTicks(10200)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1).command).toEqual(Commands.Loadbg)
		expect(getMockCall(commandReceiver0, 1, 1).params).toMatchObject({
			channel: 2,
			layer: 42,
			clip: 'EMPTY',
		})

		await mockTime.advanceTimeToTicks(13000) //  10100
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
	})
	test('CasparCG: Play a looping video, then continue looping', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 1,
				layer: 10,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await addConnections(myConductor.connectionManager, {
			myCCG: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
				},
				commandReceiver: commandReceiver0,
				skipVirginCheck: true,
			},
		})

		await mockTime.advanceTimeToTicks(10050)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: 10000,
						duration: 5000, // 15000
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
					},
				},
				{
					id: 'obj1',
					enable: {
						start: '#obj0.end', // 15000
						duration: 5000, // 20000
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(30000)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)

		expect(getMockCall(commandReceiver0, 0, 1).command).toEqual(Commands.Play)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			channel: 1,
			layer: 10,

			clip: 'AMB',
			loop: true,
			seek: 0,
		})
		expect(getMockCall(commandReceiver0, 1, 1).command).toEqual(Commands.Clear)
		expect(getMockCall(commandReceiver0, 1, 1).params).toEqual({
			channel: 1,
			layer: 10,
		})
	})

	test('CasparCG: Play a filtered decklink in PAL for 60s', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 42,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await addConnections(myConductor.connectionManager, {
			myCCG: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
				},
				commandReceiver: commandReceiver0,
				skipVirginCheck: true,
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		commandReceiver0.mockClear()

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.getCurrentTime() - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.INPUT,

						device: 1,
						inputType: 'decklink',
						deviceFormat: ChannelFormat.HD_720P5000,

						// format: ChannelFormat.PAL,
						videoFilter: 'yadif=0:-1',
					},
				},
			] as TSRTimeline,
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10200)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			channel: 2,
			layer: 42,

			device: 1,
			vFilter: 'yadif=0:-1',
			format: ChannelFormat.HD_720P5000,
		})

		// advance time to end of clip:
		await mockTime.advanceTimeToTicks(11200)

		// two commands have been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1).command).toEqual(Commands.Clear)
		expect(getMockCall(commandReceiver0, 1, 1).params.channel).toEqual(2)
		expect(getMockCall(commandReceiver0, 1, 1).params.layer).toEqual(42)
	})

	test('CasparCG: play missing file with reloads', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 42,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await addConnections(myConductor.connectionManager, {
			myCCG: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
					retryInterval: undefined, // disable retries explicitly, we will manually trigger them
				},
				commandReceiver: commandReceiver0,
				skipVirginCheck: true,
			},
		})
		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		commandReceiver0.mockClear()

		const connContainer = myConductor.connectionManager.getConnection('myCCG')
		const conn = connContainer!.device

		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.getCurrentTime() - 1000, // 1 seconds ago
					duration: 2000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.CASPARCG,
					type: TimelineContentTypeCasparCg.MEDIA,

					file: 'AMB',
					loop: true,
				},
			},
		])

		await mockTime.advanceTimeToTicks(10200)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).command).toBe(Commands.Play)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			channel: 2,
			layer: 42,

			clip: 'AMB',
			loop: true,
			seek: 0, // looping and seeking nos supported when length not provided
		})

		// advance before half way
		await mockTime.advanceTimeToTicks(10500)
		// no retries issued yet
		expect(commandReceiver0).toHaveBeenCalledTimes(1)

		// advance to half way
		await mockTime.advanceTimeToTicks(10700)
		// call the retry mechanism
		await (conn as any)._assertIntendedState()
		await mockTime.advanceTimeToTicks(10800)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1).command).toBe(Commands.Play)
		expect(getMockCall(commandReceiver0, 1, 1).params).toMatchObject({
			channel: 2,
			layer: 42,

			clip: 'AMB',
			loop: true,
			seek: 0, // looping and seeking nos supported when length not provided
		})

		// apply command to internal ccg-state
		const resCommand = getMockCall(commandReceiver0, 1, 1)
		// @ts-ignore
		await conn._changeTrackedStateFromCommand(
			resCommand,
			{ responseCode: 202, command: resCommand.command },
			mockTime.getCurrentTime()
		)
		// trigger retry mechanism
		await (conn as any)._assertIntendedState()
		await mockTime.advanceTimeToTicks(10900)
		// no retries done
		expect(commandReceiver0).toHaveBeenCalledTimes(2)

		// advance time to end of clip:
		await mockTime.advanceTimeToTicks(11200)

		// 3 commands have been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(getMockCall(commandReceiver0, 2, 1).command).toEqual(Commands.Clear)
		expect(getMockCall(commandReceiver0, 2, 1).params.channel).toEqual(2)
		expect(getMockCall(commandReceiver0, 2, 1).params.layer).toEqual(42)

		// advance time to after clip:
		await mockTime.advanceTimeToTicks(11700)
		// call the retry mechanism
		await (conn as any)._assertIntendedState()
		await mockTime.advanceTimeToTicks(11800)
		// no retries issued
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
	})

	test('CasparCG: play empty and expect no reloads', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 42,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await addConnections(myConductor.connectionManager, {
			myCCG: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
					retryInterval: undefined, // disable retries explicitly, we will manually trigger them
				},
				commandReceiver: commandReceiver0,
				skipVirginCheck: true,
			},
		})
		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		commandReceiver0.mockClear()

		const connContainer = myConductor.connectionManager.getConnection('myCCG')
		const conn = connContainer!.device

		myConductor.setTimelineAndMappings([
			{
				id: 'group0',
				enable: {
					while: 1,
				},
				layer: 'abstract',
				isGroup: true,
				content: {
					deviceType: DeviceType.ABSTRACT,
					type: 'empty',
				},
				children: [
					{
						id: 'obj0',
						enable: {
							start: 0, // always
						},
						layer: 'myLayer0',
						content: {
							deviceType: DeviceType.CASPARCG,
							type: TimelineContentTypeCasparCg.MEDIA,

							file: 'empty',
							transitions: {
								inTransition: {
									type: Transition.CUT,
									duration: 56 * 40,
								},
							},
						},
					},
				],
			},
		])

		await mockTime.advanceTimeToTicks(10200)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			channel: 2,
			layer: 42,

			clip: 'empty',
			transition: {
				transitionType: 'CUT',
				direction: 'RIGHT',
				tween: 'LINEAR',
				duration: 56,
			},
			seek: 252, // 10100 / 40
		})

		// apply command to internal ccg-state
		// @ts-ignore
		const resCommand = getMockCall(commandReceiver0, 0, 1)
		// @ts-ignore
		await conn._changeTrackedStateFromCommand(
			resCommand,
			{ responseCode: 202, command: resCommand.command },
			mockTime.getCurrentTime()
		)

		// advance before half way
		await mockTime.advanceTimeToTicks(10500)
		// no retries issued yet
		expect(commandReceiver0).toHaveBeenCalledTimes(1)

		// advance to half way
		await mockTime.advanceTimeToTicks(10700)
		// call the retry mechanism
		await (conn as any)._assertIntendedState()
		// still no retries as empty always plays
		expect(commandReceiver0).toHaveBeenCalledTimes(1)

		// note: no clear command is sent because the layer is already empty

		// advance time to after clip:
		await mockTime.advanceTimeToTicks(20700)
		// call the retry mechanism
		await (conn as any)._assertIntendedState()
		await mockTime.advanceTimeToTicks(20800)
		// no retries issued
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
	})

	test('CasparCG: Multiple mappings for 1 layer', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 42,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
			myLayer1: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await addConnections(myConductor.connectionManager, {
			myCCG: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
				},
				commandReceiver: commandReceiver0,
				skipVirginCheck: true,
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		commandReceiver0.mockClear()

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.getCurrentTime() - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						inPoint: 480,
					},
				},
				{
					id: 'obj1',
					enable: {
						start: mockTime.getCurrentTime() - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer1',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						length: 5000,
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10200)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			channel: 2,
			layer: 42,

			clip: 'AMB',
			inPoint: 12,
			length: 125,
			seek: 25 + 12, // started 1 second ago
		})
		commandReceiver0.mockClear()

		// advance time to end of clip:
		await mockTime.advanceTimeToTicks(11200)

		// two commands have been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).command).toBe(Commands.Clear)
	})

	test('CasparCG: Multiple mappings for 1 layer extend template data', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			options: {
				mappingType: MappingCasparCGType.Layer,
				channel: 2,
				layer: 42,
			},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
			myLayer1: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await addConnections(myConductor.connectionManager, {
			myCCG: {
				type: DeviceType.CASPARCG,
				options: {
					host: '127.0.0.1',
				},
				commandReceiver: commandReceiver0,
				skipVirginCheck: true,
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		commandReceiver0.mockClear()

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.getCurrentTime() - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.TEMPLATE,

						name: 'LT',
						templateType: 'html',
						data: {
							f0: 'Hello',
							f1: 'World',
							foo: {
								bar: 'baz',
							},
						},
						useStopCommand: true,
					},
				},
				{
					id: 'obj1',
					enable: {
						start: mockTime.getCurrentTime() - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer1',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.TEMPLATE,

						name: 'LT',
						templateType: 'html',
						data: {
							f1: 'Universe',
							foo: {
								bar1: 'bazinga',
							},
						},
						useStopCommand: true,
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10200)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		// console.log(getMockCall(commandReceiver0, 0, 1).params)
		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
			channel: 2,
			layer: 42,

			template: 'LT',
			cgLayer: 1,
			playOnLoad: true,
			data: { f0: 'Hello', f1: 'Universe', foo: { bar: 'baz', bar1: 'bazinga' } },
		})
		commandReceiver0.mockClear()

		// advance time to end of clip:
		await mockTime.advanceTimeToTicks(11200)

		// two commands have been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).command).toBe(Commands.CgStop)
	})
})

// describe('CasparCG - Custom transitions', () => {
// 	const mockTime = new MockTime()
// 	beforeEach(() => {
// 		mockTime.init()
// 	})
// 	test('FILL', async () => {
// 		const commandReceiver0: any = jest.fn(async () => {
// 			return Promise.resolve()
// 		})
// 		const myLayerMapping0: Mapping<SomeMappingCasparCG> = {
// 			device: DeviceType.CASPARCG,
// 			deviceId: 'myCCG',
// 			channel: 2,
// 			layer: 42,
// 		}
// 		const myLayerMapping: Mappings = {
// 			myLayer0: myLayerMapping0,
// 		}

// 		const myConductor = new Conductor({
// 			multiThreadedResolver: false,
// 			getCurrentTime: mockTime.getCurrentTime,
// 		})
// 		await myConductor.init()
// 		await myConductor.addDevice('myCCG', {
// 			type: DeviceType.CASPARCG,
// 			options: {
// 				host: '127.0.0.1',
// 				retryInterval: undefined, // disable retries explicitly, we will manually trigger them
// 			},
// 			commandReceiver: commandReceiver0,
// 		})
// 		myConductor.setTimelineAndMappings([], myLayerMapping)
// 		await mockTime.advanceTimeToTicks(10000)

// 		expect(commandReceiver0).toHaveBeenCalledTimes(0)

// 		commandReceiver0.mockClear()

// 		myConductor.setTimelineAndMappings([
// 			{
// 				id: 'video0',
// 				enable: {
// 					start: mockTime.getCurrentTime(), // 10000
// 				},
// 				layer: 'myLayer0',
// 				content: {
// 					deviceType: DeviceType.CASPARCG,
// 					type: TimelineContentTypeCasparCg.MEDIA,

// 					file: 'amb',
// 					// transitions: {
// 					// 	inTransition: {
// 					// 		type: Transition.CUT,
// 					// 		duration: 56 * 40
// 					// 	}
// 					// }
// 					mixer: {
// 						changeTransition: {
// 							type: Transition.TSR_TRANSITION,
// 							customOptions: {
// 								updateInterval: 1000 / 25,
// 								acceleration: 0.000002,
// 							},
// 						},
// 						fill: {
// 							x: 0,
// 							y: 0,
// 							xScale: 1,
// 							yScale: 1,
// 						},
// 					},
// 				},
// 				keyframes: [
// 					{
// 						id: 'kf0',
// 						enable: {
// 							start: 1000, // 11000
// 						},
// 						content: {
// 							mixer: {
// 								fill: {
// 									x: 0.5,
// 									y: 0.5,
// 									xScale: 0.5,
// 									yScale: 0.5,
// 								},
// 							},
// 						},
// 					},
// 				],
// 			},
// 		])

// 		await mockTime.advanceTimeToTicks(10500)

// 		// // one command has been sent:
// 		expect(commandReceiver0).toHaveBeenCalledTimes(2)
// 		expect(getMockCall(commandReceiver0, 0, 1).params).toMatchObject({
// 			channel: 2,
// 			layer: 42,
//
// 			clip: 'amb',
// 			seek: 0,
// 		})
// 		expect(getMockCall(commandReceiver0, 1, 1).params).toMatchObject({
// 			channel: 2,
// 			layer: 42,
// 			keyword: 'FILL',
// 			x: 0,
// 			y: 0,
// 			xScale: 1,
// 			yScale: 1,
// 		})

// 		commandReceiver0.mockClear()
// 		await mockTime.advanceTimeToTicks(13500)

// 		expect(
// 			commandReceiver0.mock.calls.map((call) => {
// 				const o = {
// 					...call[1].params,
// 				}
// 				delete o.layer
// 				delete o.channel
// 				delete o.keyword
// 				return o
// 			})
// 		).toMatchSnapshot()

// 		expect(getMockCall(commandReceiver0, 58, 1).params).toMatchObject({
// 			channel: 2,
// 			layer: 42,
// 			keyword: 'FILL',
// 			x: 0.5,
// 			y: 0.5,
// 			xScale: 0.5,
// 			yScale: 0.5,
// 		})

// 		expect(commandReceiver0).toHaveBeenCalledTimes(59)

// 		commandReceiver0.mockClear()
// 		await mockTime.advanceTimeToTicks(13500)

// 		expect(commandReceiver0).toHaveBeenCalledTimes(0)
// 	})
// })
