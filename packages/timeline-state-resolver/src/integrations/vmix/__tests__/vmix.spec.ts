import { setupVmixMock } from './vmixMock'
import { Conductor } from '../../../conductor'
import {
	Mappings,
	DeviceType,
	MappingVMix,
	MappingVMixType,
	TimelineContentTypeVMix,
	VMixInputType,
	VMixCommand,
	MappingVMixAny,
	VMixTransitionType,
	MappingVMixOverlay,
	MappingVMixRecording,
	MappingVMixExternal,
	MappingVMixStreaming,
	MappingVMixOutput,
	MappingVMixInput,
	MappingVMixFadeToBlack,
	MappingVMixFader,
	MappingVMixScript,
} from 'timeline-state-resolver-types'
import { ThreadedClass } from 'threadedclass'
import { VMixDevice } from '..'
import { MockTime } from '../../../__tests__/mockTime'
import '../../../__tests__/lib'

const orgSetTimeout = setTimeout

async function runPromise<A>(p: Promise<A>, mockTime: MockTime, advanceTime = 50): Promise<A> {
	const pTimers = new Promise((resolve, reject) => {
		orgSetTimeout(() => {
			mockTime.advanceTimeTicks(advanceTime).then(resolve, reject)
		}, 1)
	})

	const res = await p

	await pTimers

	return res
}

/** Accepted deviance, accepted deviance in command timing during testing */
const ADEV = 30

describe('vMix', () => {
	let onFunction: jest.Mock, onXML: jest.Mock

	function setupMocks() {
		;({ onFunction, onXML } = setupVmixMock())
	}

	function clearMocks() {
		onFunction.mockClear()
		onXML.mockClear()
	}

	const mockTime = new MockTime()
	beforeEach(() => {
		mockTime.init()
		setupMocks()
	})
	test('Add and remove input', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingVMix = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Input,
			deviceId: 'myvmix',
		}
		const myLayerMapping: Mappings = {
			vmix_media0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await runPromise(
			myConductor.addDevice('myvmix', {
				type: DeviceType.VMIX,
				options: {
					host: '127.0.0.1',
					port: 8099,
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer!.device as ThreadedClass<VMixDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10050)
		await mockTime.advanceTimeToTicks(10100)

		// get initial info
		expect(onXML).toHaveBeenCalled()

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'media',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_media0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.INPUT,
					inputType: VMixInputType.Video,
					filePath: 'C:/videos/My Clip.mp4',
					playing: true,
				},
			},
		])
		// Time to preload the clip
		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			expect.toBeCloseTo(10115, ADEV),
			expect.objectContaining({
				command: {
					command: VMixCommand.ADD_INPUT,
					value: 'Video|C:/videos/My Clip.mp4',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			expect.toBeCloseTo(10115, ADEV),
			expect.objectContaining({
				command: {
					command: VMixCommand.SET_INPUT_NAME,
					input: 'My Clip.mp4',
					value: 'C:/videos/My Clip.mp4',
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(2)

		expect(onFunction).toHaveBeenNthCalledWith(
			1,
			'AddInput',
			expect.stringContaining('Value=Video|C:/videos/My Clip.mp4')
		)
		expect(onFunction).toHaveBeenNthCalledWith(
			2,
			'SetInputName',
			expect.stringContaining('Input=My Clip.mp4&Value=C:/videos/My Clip.mp4')
		)

		clearMocks()
		commandReceiver0.mockClear()

		// Time to start playing
		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.PLAY_INPUT,
					input: 'C:/videos/My Clip.mp4',
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)
		expect(onFunction).toHaveBeenNthCalledWith(1, 'Play', expect.stringContaining('Input=C:/videos/My Clip.mp4'))

		clearMocks()
		commandReceiver0.mockClear()

		// Time to stop playing
		await mockTime.advanceTimeToTicks(16050)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.REMOVE_INPUT,
					input: 'C:/videos/My Clip.mp4',
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)
		expect(onFunction).toHaveBeenNthCalledWith(1, 'RemoveInput', expect.stringContaining('Input=C:/videos/My Clip.mp4'))

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('Input properties', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingVMixInput = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Input,
			deviceId: 'myvmix',
		}
		const myLayerMapping: Mappings = {
			vmix_media0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await runPromise(
			myConductor.addDevice('myvmix', {
				type: DeviceType.VMIX,
				options: {
					host: '127.0.0.1',
					port: 8099,
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer!.device as ThreadedClass<VMixDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10050)
		await mockTime.advanceTimeToTicks(10100)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'media',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_media0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.INPUT,
					inputType: VMixInputType.Video,
					filePath: 'C:/videos/My Clip.mp4',
					playing: true,
					loop: true,
					seek: 10000,
					transform: {
						zoom: 0.5,
						panX: 0.3,
						panY: 1.2,
						alpha: 123,
					},
					overlays: {
						1: 'G:/videos/My Other Clip.mp4',
						3: 5,
					},
				},
			},
		])

		// Time to preload the clip
		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			expect.toBeCloseTo(10115, ADEV),
			expect.objectContaining({
				command: {
					command: VMixCommand.ADD_INPUT,
					value: 'Video|C:/videos/My Clip.mp4',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			expect.toBeCloseTo(10115, ADEV),
			expect.objectContaining({
				command: {
					command: VMixCommand.SET_INPUT_NAME,
					input: 'My Clip.mp4',
					value: 'C:/videos/My Clip.mp4',
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(2)

		expect(onFunction).toHaveBeenNthCalledWith(
			1,
			'AddInput',
			expect.stringContaining('Value=Video|C:/videos/My Clip.mp4')
		)
		expect(onFunction).toHaveBeenNthCalledWith(
			2,
			'SetInputName',
			expect.stringContaining('Input=My Clip.mp4&Value=C:/videos/My Clip.mp4')
		)

		clearMocks()
		commandReceiver0.mockClear()

		// Time to start playing
		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(9)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.SET_POSITION,
					input: 'C:/videos/My Clip.mp4',
					value: 10000,
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.LOOP_ON,
					input: 'C:/videos/My Clip.mp4',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			3,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.SET_ZOOM,
					input: 'C:/videos/My Clip.mp4',
					value: 0.5,
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			4,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.SET_ALPHA,
					input: 'C:/videos/My Clip.mp4',
					value: 123,
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			5,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.SET_PAN_X,
					input: 'C:/videos/My Clip.mp4',
					value: 0.3,
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			6,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.SET_PAN_Y,
					input: 'C:/videos/My Clip.mp4',
					value: 1.2,
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			7,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.SET_INPUT_OVERLAY,
					input: 'C:/videos/My Clip.mp4',
					index: 1,
					value: 'G:/videos/My Other Clip.mp4',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			8,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.SET_INPUT_OVERLAY,
					input: 'C:/videos/My Clip.mp4',
					index: 3,
					value: 5,
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			9,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.PLAY_INPUT,
					input: 'C:/videos/My Clip.mp4',
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(9)

		expect(onFunction).toHaveBeenNthCalledWith(
			1,
			'SetPosition',
			expect.stringContaining('Input=C:/videos/My Clip.mp4&Value=10000')
		)
		expect(onFunction).toHaveBeenNthCalledWith(2, 'LoopOn', expect.stringContaining('Input=C:/videos/My Clip.mp4'))
		expect(onFunction).toHaveBeenNthCalledWith(
			3,
			'SetZoom',
			expect.stringContaining('Input=C:/videos/My Clip.mp4&Value=0.5')
		)
		expect(onFunction).toHaveBeenNthCalledWith(
			4,
			'SetAlpha',
			expect.stringContaining('Input=C:/videos/My Clip.mp4&Value=123')
		)
		expect(onFunction).toHaveBeenNthCalledWith(
			5,
			'SetPanX',
			expect.stringContaining('Input=C:/videos/My Clip.mp4&Value=0.3')
		)
		expect(onFunction).toHaveBeenNthCalledWith(
			6,
			'SetPanY',
			expect.stringContaining('Input=C:/videos/My Clip.mp4&Value=1.2')
		)
		expect(onFunction).toHaveBeenNthCalledWith(
			7,
			'SetMultiViewOverlay',
			expect.stringContaining('Input=C:/videos/My Clip.mp4&Value=1,G:/videos/My Other Clip.mp4')
		)
		expect(onFunction).toHaveBeenNthCalledWith(
			8,
			'SetMultiViewOverlay',
			expect.stringContaining('Input=C:/videos/My Clip.mp4&Value=3,5')
		)
		expect(onFunction).toHaveBeenNthCalledWith(9, 'Play', expect.stringContaining('Input=C:/videos/My Clip.mp4'))

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('Input properties 2', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingVMixInput = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Input,
			deviceId: 'myvmix',
			index: 2,
		}
		const myLayerMapping: Mappings = {
			vmix_media0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await runPromise(
			myConductor.addDevice('myvmix', {
				type: DeviceType.VMIX,
				options: {
					host: '127.0.0.1',
					port: 8099,
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer!.device as ThreadedClass<VMixDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10050)
		await mockTime.advanceTimeToTicks(10100)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'media',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_media0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.INPUT,
					loop: true,
					playing: true,
					overlays: {
						1: 'G:/videos/My Other Clip.mp4',
						3: 5,
					},
				},
			},
		])

		await mockTime.advanceTimeToTicks(11300)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.LOOP_ON,
					input: '2',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.SET_INPUT_OVERLAY,
					input: '2',
					index: 1,
					value: 'G:/videos/My Other Clip.mp4',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			3,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.SET_INPUT_OVERLAY,
					input: '2',
					index: 3,
					value: 5,
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			4,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.PLAY_INPUT,
					input: '2',
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(4)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'LoopOn', expect.stringContaining('Input=2'))
		expect(onFunction).toHaveBeenNthCalledWith(
			2,
			'SetMultiViewOverlay',
			expect.stringContaining('Input=2&Value=1,G:/videos/My Other Clip.mp4')
		)
		expect(onFunction).toHaveBeenNthCalledWith(3, 'SetMultiViewOverlay', expect.stringContaining('Input=2&Value=3,5'))
		expect(onFunction).toHaveBeenNthCalledWith(4, 'Play', expect.stringContaining('Input=2'))

		clearMocks()
		commandReceiver0.mockClear()

		await mockTime.advanceTimeToTicks(16300)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.PAUSE_INPUT,
					input: '2',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.LOOP_OFF,
					input: '2',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			3,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.SET_INPUT_OVERLAY,
					input: '2',
					index: 1,
					value: '',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			4,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.SET_INPUT_OVERLAY,
					input: '2',
					index: 3,
					value: '',
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(4)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'Pause', expect.stringContaining('Input=2'))
		expect(onFunction).toHaveBeenNthCalledWith(2, 'LoopOff', expect.stringContaining('Input=2'))
		expect(onFunction).toHaveBeenNthCalledWith(3, 'SetMultiViewOverlay', expect.stringContaining('Input=2&Value=1,'))
		expect(onFunction).toHaveBeenNthCalledWith(4, 'SetMultiViewOverlay', expect.stringContaining('Input=2&Value=3,'))

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('Address input by its layer', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingVMixAny = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Input,
			deviceId: 'myvmix',
		}
		const myLayerMapping1: MappingVMixAny = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.AudioChannel,
			inputLayer: 'vmix_media0',
			deviceId: 'myvmix',
		}
		const myLayerMapping2: MappingVMixAny = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Program,
			deviceId: 'myvmix',
		}
		const myLayerMapping: Mappings = {
			vmix_media0: myLayerMapping0,
			vmix_media0_audio: myLayerMapping1,
			vmix_program: myLayerMapping2,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await runPromise(
			myConductor.addDevice('myvmix', {
				type: DeviceType.VMIX,
				options: {
					host: '127.0.0.1',
					port: 8099,
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer!.device as ThreadedClass<VMixDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10050)
		await mockTime.advanceTimeToTicks(10100)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'media0',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_media0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.INPUT,
					inputType: VMixInputType.Video,
					filePath: 'C:/videos/My Clip.mp4',
				},
			},
			{
				id: 'audio',
				enable: {
					start: 11000,
					duration: 10000,
				},
				layer: 'vmix_media0_audio',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.AUDIO,
					volume: 25,
				},
			},
			{
				id: 'program',
				enable: {
					start: 11000,
					duration: 10000,
				},
				layer: 'vmix_program',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.PROGRAM,
					inputLayer: 'vmix_media0',
				},
			},
			{
				id: 'media1',
				enable: {
					start: 16000,
					duration: 5000,
				},
				layer: 'vmix_media0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.INPUT,
					inputType: VMixInputType.Video,
					filePath: 'G:/videos/My Other Clip.mp4',
				},
			},
		])
		// Time to preload the clip
		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			expect.toBeCloseTo(10115, ADEV),
			expect.objectContaining({
				command: {
					command: VMixCommand.ADD_INPUT,
					value: 'Video|C:/videos/My Clip.mp4',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			expect.toBeCloseTo(10115, ADEV),
			expect.objectContaining({
				command: {
					command: VMixCommand.SET_INPUT_NAME,
					input: 'My Clip.mp4',
					value: 'C:/videos/My Clip.mp4',
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(2)

		expect(onFunction).toHaveBeenNthCalledWith(
			1,
			'AddInput',
			expect.stringContaining('Value=Video|C:/videos/My Clip.mp4')
		)
		expect(onFunction).toHaveBeenNthCalledWith(
			2,
			'SetInputName',
			expect.stringContaining('Input=My Clip.mp4&Value=C:/videos/My Clip.mp4')
		)

		clearMocks()
		commandReceiver0.mockClear()

		// Time to cut
		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.AUDIO_VOLUME,
					input: 'C:/videos/My Clip.mp4',
					value: 25,
					fade: 0,
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.TRANSITION,
					input: 'C:/videos/My Clip.mp4',
					duration: 0,
					effect: VMixTransitionType.Cut,
					mix: 0,
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(2)

		expect(onFunction).toHaveBeenNthCalledWith(
			1,
			'SetVolume',
			expect.stringContaining('Input=C:/videos/My Clip.mp4&Value=25')
		)
		expect(onFunction).toHaveBeenNthCalledWith(
			2,
			'Cut',
			expect.stringContaining('Input=C:/videos/My Clip.mp4&Duration=0&Mix=0')
		)

		clearMocks()
		commandReceiver0.mockClear()

		// Time to swap the video
		await mockTime.advanceTimeToTicks(16300)

		expect(commandReceiver0).toHaveBeenCalledTimes(5)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			expect.toBeCloseTo(12505, ADEV),
			expect.objectContaining({
				command: {
					command: VMixCommand.ADD_INPUT,
					value: 'Video|G:/videos/My Other Clip.mp4',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			expect.toBeCloseTo(12505, ADEV),
			expect.objectContaining({
				command: {
					command: VMixCommand.SET_INPUT_NAME,
					input: 'My Other Clip.mp4',
					value: 'G:/videos/My Other Clip.mp4',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			3,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.AUDIO_VOLUME,
					input: 'G:/videos/My Other Clip.mp4',
					value: 25,
					fade: 0,
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			4,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.TRANSITION,
					input: 'G:/videos/My Other Clip.mp4',
					duration: 0,
					effect: VMixTransitionType.Cut,
					mix: 0,
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			5,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.REMOVE_INPUT,
					input: 'C:/videos/My Clip.mp4',
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(5)

		expect(onFunction).toHaveBeenNthCalledWith(
			1,
			'AddInput',
			expect.stringContaining('Value=Video|G:/videos/My Other Clip.mp4')
		)
		expect(onFunction).toHaveBeenNthCalledWith(
			2,
			'SetInputName',
			expect.stringContaining('Input=My Other Clip.mp4&Value=G:/videos/My Other Clip.mp4')
		)
		expect(onFunction).toHaveBeenNthCalledWith(
			3,
			'SetVolume',
			expect.stringContaining('Input=G:/videos/My Other Clip.mp4&Value=25')
		)
		expect(onFunction).toHaveBeenNthCalledWith(
			4,
			'Cut',
			expect.stringContaining('Input=G:/videos/My Other Clip.mp4&Duration=0&Mix=0')
		)
		expect(onFunction).toHaveBeenNthCalledWith(5, 'RemoveInput', expect.stringContaining('Input=C:/videos/My Clip.mp4'))

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('Audio channel', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingVMixAny = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.AudioChannel,
			index: '2',
			deviceId: 'myvmix',
		}
		const myLayerMapping: Mappings = {
			vmix_audio0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await runPromise(
			myConductor.addDevice('myvmix', {
				type: DeviceType.VMIX,
				options: {
					host: '127.0.0.1',
					port: 8099,
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer!.device as ThreadedClass<VMixDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10050)
		await mockTime.advanceTimeToTicks(10100)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'audio',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_audio0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.AUDIO,
					volume: 46,
					fade: 1337,
					balance: 0.12,
					audioAuto: false,
					muted: false,
					audioBuses: 'A,C,F',
				},
			},
		])
		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(8)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.AUDIO_VOLUME,
					input: '2',
					value: 46,
					fade: 1337,
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.AUDIO_BALANCE,
					input: '2',
					value: 0.12,
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			3,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.AUDIO_AUTO_OFF,
					input: '2',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			4,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.AUDIO_BUS_ON,
					input: '2',
					value: 'A',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			5,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.AUDIO_BUS_ON,
					input: '2',
					value: 'C',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			6,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.AUDIO_BUS_ON,
					input: '2',
					value: 'F',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			7,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.AUDIO_BUS_OFF,
					input: '2',
					value: 'M',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			8,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.AUDIO_ON,
					input: '2',
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(8)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'SetVolumeFade', expect.stringContaining('Input=2&Value=46,1337'))
		expect(onFunction).toHaveBeenNthCalledWith(2, 'SetBalance', expect.stringContaining('Input=2&Value=0.12'))
		expect(onFunction).toHaveBeenNthCalledWith(3, 'AudioAutoOff', expect.stringContaining('Input=2'))
		expect(onFunction).toHaveBeenNthCalledWith(4, 'AudioBusOn', expect.stringContaining('Input=2&Value=A'))
		expect(onFunction).toHaveBeenNthCalledWith(5, 'AudioBusOn', expect.stringContaining('Input=2&Value=C'))
		expect(onFunction).toHaveBeenNthCalledWith(6, 'AudioBusOn', expect.stringContaining('Input=2&Value=F'))
		expect(onFunction).toHaveBeenNthCalledWith(7, 'AudioBusOff', expect.stringContaining('Input=2&Value=M'))
		expect(onFunction).toHaveBeenNthCalledWith(8, 'AudioOn', expect.stringContaining('Input=2'))

		clearMocks()
		commandReceiver0.mockClear()

		await mockTime.advanceTimeToTicks(16300)

		expect(commandReceiver0).toHaveBeenCalledTimes(8)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.AUDIO_OFF,
					input: '2',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.AUDIO_VOLUME,
					input: '2',
					value: 100,
					fade: 0,
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			3,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.AUDIO_BALANCE,
					input: '2',
					value: 0,
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			4,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.AUDIO_AUTO_ON,
					input: '2',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			5,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.AUDIO_BUS_ON,
					input: '2',
					value: 'M',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			6,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.AUDIO_BUS_OFF,
					input: '2',
					value: 'A',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			7,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.AUDIO_BUS_OFF,
					input: '2',
					value: 'C',
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			8,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.AUDIO_BUS_OFF,
					input: '2',
					value: 'F',
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(8)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'AudioOff', expect.stringContaining('Input=2'))
		expect(onFunction).toHaveBeenNthCalledWith(2, 'SetVolume', expect.stringContaining('Input=2&Value=100'))
		expect(onFunction).toHaveBeenNthCalledWith(3, 'SetBalance', expect.stringContaining('Input=2&Value=0'))
		expect(onFunction).toHaveBeenNthCalledWith(4, 'AudioAutoOn', expect.stringContaining('Input=2'))
		expect(onFunction).toHaveBeenNthCalledWith(5, 'AudioBusOn', expect.stringContaining('Input=2&Value=M'))
		expect(onFunction).toHaveBeenNthCalledWith(6, 'AudioBusOff', expect.stringContaining('Input=2&Value=A'))
		expect(onFunction).toHaveBeenNthCalledWith(7, 'AudioBusOff', expect.stringContaining('Input=2&Value=C'))
		expect(onFunction).toHaveBeenNthCalledWith(8, 'AudioBusOff', expect.stringContaining('Input=2&Value=F'))

		clearMocks()
		commandReceiver0.mockClear()

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('Mix buses', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingVMixAny = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Program,
			deviceId: 'myvmix',
		}
		const myLayerMapping1: MappingVMixAny = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Program,
			index: 2,
			deviceId: 'myvmix',
		}
		const myLayerMapping2: MappingVMixAny = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Preview,
			deviceId: 'myvmix',
		}
		const myLayerMapping3: MappingVMixAny = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Preview,
			index: 2,
			deviceId: 'myvmix',
		}
		const myLayerMapping: Mappings = {
			vmix_program0: myLayerMapping0,
			vmix_program1: myLayerMapping1,
			vmix_preview0: myLayerMapping2,
			vmix_preview1: myLayerMapping3,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await runPromise(
			myConductor.addDevice('myvmix', {
				type: DeviceType.VMIX,
				options: {
					host: '127.0.0.1',
					port: 8099,
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer!.device as ThreadedClass<VMixDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10050)
		await mockTime.advanceTimeToTicks(10100)

		// get initial info
		expect(onXML).toHaveBeenCalledTimes(1)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'program0',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_program0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.PROGRAM,
					input: 'Cam 1',
					transition: {
						effect: VMixTransitionType.VerticalSlideReverse,
						duration: 1337,
					},
				},
			},
			// this one should fail:
			{
				id: 'preview0',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_preview0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.PREVIEW,
					input: 3,
				},
			},
			{
				id: 'program1',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_program1',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.PROGRAM,
					input: 5,
				},
			},
			{
				id: 'preview1',
				enable: {
					start: 11005,
					duration: 5000,
				},
				layer: 'vmix_preview0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.PREVIEW,
					input: 'Cam 4',
				},
			},
			{
				id: 'preview2',
				enable: {
					start: 11005,
					duration: 5000,
				},
				layer: 'vmix_preview1',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.PREVIEW,
					input: 3,
				},
			},
			{
				id: 'preview3',
				enable: {
					start: 16000,
					duration: 5000,
				},
				layer: 'vmix_program1',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.PROGRAM,
					input: 4,
				},
			},
		])

		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(4)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.TRANSITION,
					input: 'Cam 1',
					duration: 1337,
					effect: VMixTransitionType.VerticalSlideReverse,
					mix: 0,
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.TRANSITION,
					input: 5,
					duration: 0,
					effect: VMixTransitionType.Cut,
					mix: 1,
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			3,
			11005,
			expect.objectContaining({
				command: {
					command: VMixCommand.PREVIEW_INPUT,
					input: 'Cam 4',
					mix: 0,
				},
			}),
			null,
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			4,
			11005,
			expect.objectContaining({
				command: {
					command: VMixCommand.PREVIEW_INPUT,
					input: 3,
					mix: 1,
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(4)

		expect(onFunction).toHaveBeenNthCalledWith(
			1,
			'VerticalSlideReverse',
			expect.stringContaining('Input=Cam 1&Duration=1337&Mix=0')
		)
		expect(onFunction).toHaveBeenNthCalledWith(2, 'Cut', expect.stringContaining('Input=5&Duration=0&Mix=1'))
		expect(onFunction).toHaveBeenNthCalledWith(3, 'PreviewInput', expect.stringContaining('Input=Cam 4&Mix=0'))
		expect(onFunction).toHaveBeenNthCalledWith(4, 'PreviewInput', expect.stringContaining('Input=3&Mix=1'))

		clearMocks()
		commandReceiver0.mockClear()

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('Overlay', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingVMixOverlay = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Overlay,
			index: 2,
			deviceId: 'myvmix',
		}
		const myLayerMapping: Mappings = {
			vmix_overlay2: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await runPromise(
			myConductor.addDevice('myvmix', {
				type: DeviceType.VMIX,
				options: {
					host: '127.0.0.1',
					port: 8099,
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer!.device as ThreadedClass<VMixDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10050)
		await mockTime.advanceTimeToTicks(10100)

		// get initial info
		expect(onXML).toHaveBeenCalledTimes(1)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'lowerthird0',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_overlay2',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.OVERLAY,
					input: 1,
				},
			},
		])

		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.OVERLAY_INPUT_IN,
					input: 1,
					value: 2,
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'OverlayInput2In', expect.stringContaining('Input=1'))

		clearMocks()
		commandReceiver0.mockClear()

		await mockTime.advanceTimeToTicks(16300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.OVERLAY_INPUT_OUT,
					value: 2,
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'OverlayInput2Out', null)

		clearMocks()
		commandReceiver0.mockClear()

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('Recording', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingVMixRecording = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Recording,
			deviceId: 'myvmix',
		}
		const myLayerMapping: Mappings = {
			vmix_recording0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await runPromise(
			myConductor.addDevice('myvmix', {
				type: DeviceType.VMIX,
				options: {
					host: '127.0.0.1',
					port: 8099,
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer!.device as ThreadedClass<VMixDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10050)
		await mockTime.advanceTimeToTicks(10100)

		// get initial info
		expect(onXML).toHaveBeenCalledTimes(1)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'recording0',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_recording0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.RECORDING,
					on: true,
				},
			},
		])

		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.START_RECORDING,
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'StartRecording', null)

		clearMocks()
		commandReceiver0.mockClear()

		await mockTime.advanceTimeToTicks(16300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.STOP_RECORDING,
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'StopRecording', null)

		clearMocks()
		commandReceiver0.mockClear()

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('External', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingVMixExternal = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.External,
			deviceId: 'myvmix',
		}
		const myLayerMapping: Mappings = {
			vmix_external0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await runPromise(
			myConductor.addDevice('myvmix', {
				type: DeviceType.VMIX,
				options: {
					host: '127.0.0.1',
					port: 8099,
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer!.device as ThreadedClass<VMixDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10050)
		await mockTime.advanceTimeToTicks(10100)

		// get initial info
		expect(onXML).toHaveBeenCalledTimes(1)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'external0',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_external0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.EXTERNAL,
					on: true,
				},
			},
		])

		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.START_EXTERNAL,
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'StartExternal', null)

		clearMocks()
		commandReceiver0.mockClear()

		await mockTime.advanceTimeToTicks(16300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.STOP_EXTERNAL,
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'StopExternal', null)

		clearMocks()
		commandReceiver0.mockClear()

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('Streaming', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingVMixStreaming = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Streaming,
			deviceId: 'myvmix',
		}
		const myLayerMapping: Mappings = {
			vmix_streaming0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await runPromise(
			myConductor.addDevice('myvmix', {
				type: DeviceType.VMIX,
				options: {
					host: '127.0.0.1',
					port: 8099,
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer!.device as ThreadedClass<VMixDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10050)
		await mockTime.advanceTimeToTicks(10100)

		// get initial info
		expect(onXML).toHaveBeenCalledTimes(1)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'external0',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_streaming0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.STREAMING,
					on: true,
				},
			},
		])

		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.START_STREAMING,
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'StartStreaming', null)

		clearMocks()
		commandReceiver0.mockClear()

		await mockTime.advanceTimeToTicks(16300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.STOP_STREAMING,
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'StopStreaming', null)

		clearMocks()
		commandReceiver0.mockClear()

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('Output', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingVMixOutput = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Output,
			deviceId: 'myvmix',
			index: 'Fullscreen',
		}
		const myLayerMapping: Mappings = {
			vmix_output0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await runPromise(
			myConductor.addDevice('myvmix', {
				type: DeviceType.VMIX,
				options: {
					host: '127.0.0.1',
					port: 8099,
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer!.device as ThreadedClass<VMixDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10050)
		await mockTime.advanceTimeToTicks(10100)

		// get initial info
		expect(onXML).toHaveBeenCalledTimes(1)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'external0',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_output0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.OUTPUT,
					source: 'Preview',
				},
			},
		])

		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.SET_OUPUT,
					name: 'Fullscreen',
					value: 'Preview',
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'SetOutputFullscreen', expect.stringContaining('Value=Preview'))

		clearMocks()
		commandReceiver0.mockClear()

		await mockTime.advanceTimeToTicks(16300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.SET_OUPUT,
					name: 'Fullscreen',
					value: 'Output',
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'SetOutputFullscreen', expect.stringContaining('Value=Output'))

		clearMocks()
		commandReceiver0.mockClear()

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('Output an Input', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingVMixOutput = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Output,
			deviceId: 'myvmix',
			index: 'Fullscreen',
		}
		const myLayerMapping: Mappings = {
			vmix_output0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await runPromise(
			myConductor.addDevice('myvmix', {
				type: DeviceType.VMIX,
				options: {
					host: '127.0.0.1',
					port: 8099,
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer!.device as ThreadedClass<VMixDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10050)
		await mockTime.advanceTimeToTicks(10100)

		// get initial info
		expect(onXML).toHaveBeenCalledTimes(1)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'output0',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_output0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.OUTPUT,
					source: 'Input',
					input: 2,
				},
			},
		])

		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.SET_OUPUT,
					name: 'Fullscreen',
					value: 'Input',
					input: 2,
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'SetOutputFullscreen', expect.stringContaining('Input=2&Value=Input'))

		clearMocks()
		commandReceiver0.mockClear()

		await mockTime.advanceTimeToTicks(16300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.SET_OUPUT,
					name: 'Fullscreen',
					value: 'Output',
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'SetOutputFullscreen', expect.stringContaining('Value=Output'))

		clearMocks()
		commandReceiver0.mockClear()

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('Fade To Black', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingVMixFadeToBlack = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.FadeToBlack,
			deviceId: 'myvmix',
		}
		const myLayerMapping: Mappings = {
			vmix_ftb0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await runPromise(
			myConductor.addDevice('myvmix', {
				type: DeviceType.VMIX,
				options: {
					host: '127.0.0.1',
					port: 8099,
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer!.device as ThreadedClass<VMixDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10050)
		await mockTime.advanceTimeToTicks(10100)

		// get initial info
		expect(onXML).toHaveBeenCalledTimes(1)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'ftb0',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_ftb0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.FADE_TO_BLACK,
					on: true,
				},
			},
		])

		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.FADE_TO_BLACK,
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'FadeToBlack', null)

		clearMocks()
		commandReceiver0.mockClear()

		await mockTime.advanceTimeToTicks(16300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.FADE_TO_BLACK,
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'FadeToBlack', null)

		clearMocks()
		commandReceiver0.mockClear()

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('Fader', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingVMixFader = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Fader,
			deviceId: 'myvmix',
		}
		const myLayerMapping: Mappings = {
			vmix_fader0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await runPromise(
			myConductor.addDevice('myvmix', {
				type: DeviceType.VMIX,
				options: {
					host: '127.0.0.1',
					port: 8099,
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer!.device as ThreadedClass<VMixDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10050)
		await mockTime.advanceTimeToTicks(10100)

		// get initial info
		expect(onXML).toHaveBeenCalledTimes(1)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'fader0',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_fader0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.FADER,
					position: 126,
				},
			},
		])

		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.FADER,
					value: 126,
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'SetFader', expect.stringContaining('Value=126'))

		clearMocks()
		commandReceiver0.mockClear()

		await mockTime.advanceTimeToTicks(16300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.FADER,
					value: 0,
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'SetFader', expect.stringContaining('Value=0'))

		clearMocks()
		commandReceiver0.mockClear()

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('Script Start', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingVMixScript = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Script,
			deviceId: 'myvmix',
		}
		const myLayerMapping: Mappings = {
			vmix_ss0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await runPromise(
			myConductor.addDevice('myvmix', {
				type: DeviceType.VMIX,
				options: {
					host: '127.0.0.1',
					port: 9999,
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer!.device as ThreadedClass<VMixDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10050)
		await mockTime.advanceTimeToTicks(10100)

		// get initial info
		expect(onXML).toHaveBeenCalledTimes(1)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'ss0',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_ss0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.SCRIPT,
					name: 'myscript',
				},
			},
		])

		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.SCRIPT_START,
					value: 'myscript',
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'ScriptStart', expect.stringContaining('Value=myscript'))

		clearMocks()
		commandReceiver0.mockClear()

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('Script Stop', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingVMixScript = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Script,
			deviceId: 'myvmix',
		}
		const myLayerMapping: Mappings = {
			vmix_ss0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await runPromise(
			myConductor.addDevice('myvmix', {
				type: DeviceType.VMIX,
				options: {
					host: '127.0.0.1',
					port: 9999,
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer!.device as ThreadedClass<VMixDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10050)
		await mockTime.advanceTimeToTicks(10100)

		// get initial info
		expect(onXML).toHaveBeenCalledTimes(1)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'ss0',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_ss0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.SCRIPT,
					name: 'myscript',
				},
			},
		])

		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.SCRIPT_START,
					value: 'myscript',
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'ScriptStart', expect.stringContaining('Value=myscript'))

		await mockTime.advanceTimeToTicks(20000)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			16000,
			expect.objectContaining({
				command: {
					command: VMixCommand.SCRIPT_STOP,
					value: 'myscript',
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(2)

		expect(onFunction).toHaveBeenNthCalledWith(2, 'ScriptStop', expect.stringContaining('Value=myscript'))

		clearMocks()
		commandReceiver0.mockClear()

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('List Remove All', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingVMixInput = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Input,
			deviceId: 'myvmix',
			index: 1,
		}
		const myLayerMapping: Mappings = {
			vmix_lra0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await runPromise(
			myConductor.addDevice('myvmix', {
				type: DeviceType.VMIX,
				options: {
					host: '127.0.0.1',
					port: 9999,
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer!.device as ThreadedClass<VMixDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10050)
		await mockTime.advanceTimeToTicks(10100)

		// get initial info
		expect(onXML).toHaveBeenCalledTimes(1)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'lra0',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_lra0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.INPUT,
					listFilePaths: [],
				},
			},
		])

		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.LIST_REMOVE_ALL,
					input: '1',
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(1)

		expect(onFunction).toHaveBeenNthCalledWith(1, 'ListRemoveAll', expect.stringContaining('Input=1'))

		clearMocks()
		commandReceiver0.mockClear()

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('List Add', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingVMixInput = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Input,
			deviceId: 'myvmix',
			index: 1,
		}
		const myLayerMapping: Mappings = {
			vmix_la0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await runPromise(
			myConductor.addDevice('myvmix', {
				type: DeviceType.VMIX,
				options: {
					host: '127.0.0.1',
					port: 9999,
				},
				commandReceiver: commandReceiver0,
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer!.device as ThreadedClass<VMixDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10050)
		await mockTime.advanceTimeToTicks(10100)

		// get initial info
		expect(onXML).toHaveBeenCalledTimes(1)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'la0',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'vmix_la0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.INPUT,
					listFilePaths: ['C:\\foo.mov'],
				},
			},
		])

		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			11000,
			expect.objectContaining({
				command: {
					command: VMixCommand.LIST_ADD,
					input: '1',
					value: 'C:\\foo.mov',
				},
			}),
			null,
			expect.any(String)
		)

		expect(onFunction).toHaveBeenCalledTimes(2)

		expect(onFunction).toHaveBeenNthCalledWith(
			2,
			'ListAdd',
			expect.stringContaining(`Input=1&Value=${encodeURIComponent('C:\\foo.mov')}`)
		)

		clearMocks()
		commandReceiver0.mockClear()

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})
})
