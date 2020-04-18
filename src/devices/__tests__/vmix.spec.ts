import { setupVmixMock } from './vmixMock'
import { Conductor } from '../../conductor'
import {
	Mappings,
	DeviceType,
	MappingVMix,
	MappingVMixType,
	TimelineContentTypeVMix,
	VMixInputType,
	VMixCommand,
	MappingVMixAny,
	VMixTransitionType
} from '../../types/src'
import { ThreadedClass } from 'threadedclass'
import { VMixDevice } from '../vmix'
import { MockTime } from '../../__tests__/mockTime'
import '../../__tests__/lib'

const orgSetTimeout = setTimeout

async function t<A> (p: Promise<A>, mockTime, advanceTime: number = 50): Promise<A> {

	orgSetTimeout(() => {
		mockTime.advanceTimeTicks(advanceTime)
	},1)
	return p
}

/** Accepted deviance, accepted deviance in command timing during testing */
const ADEV = 30

describe('vMix', () => {
	const {
		vmixServer,
		onRequest
	} = setupVmixMock()

	function clearMocks () {
		onRequest.mockClear()
	}

	let mockTime = new MockTime()
	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()

		clearMocks()
		vmixServer.repliesAreGood = true
		vmixServer.serverIsUp = true
	})
	test('Add and remove input', async () => {
		let device
		let commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		let myLayerMapping0: MappingVMix = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Input,
			deviceId: 'myvmix'
		}
		let myLayerMapping: Mappings = {
			'vmix_media0': myLayerMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})
		let errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)
		myConductor.on('commandError', errorHandler)

		await myConductor.init()

		await t(myConductor.addDevice('myvmix', {
			type: DeviceType.VMIX,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				port: 9999
			}
		}), mockTime)

		let deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer.device as ThreadedClass<VMixDevice>
		let deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		await myConductor.setMapping(myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10000)
		await mockTime.advanceTimeToTicks(10100)

		// get initial info
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', 'http://127.0.0.1:9999/api')

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.timeline = [
			{
				id: 'media',
				enable: {
					start: 11000,
					duration: 5000
				},
				layer: 'vmix_media0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.INPUT,
					inputType: VMixInputType.Video,
					filePath: 'C:/videos/My Clip.mp4',
					playing: true
				}
			}
		]
		// Time to preload the clip
		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(1, expect.toBeCloseTo(10115, ADEV), expect.objectContaining({
			command: {
				command: VMixCommand.ADD_INPUT,
				value: 'Video|C:/videos/My Clip.mp4'
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(2, expect.toBeCloseTo(10115, ADEV), expect.objectContaining({
			command: {
				command: VMixCommand.SET_INPUT_NAME,
				input: 'My Clip.mp4',
				value: 'C:/videos/My Clip.mp4'
			}
		}), null, expect.any(String))

		expect(onRequest).toHaveBeenCalledTimes(2)

		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/api/?Function=AddInput&Value=Video|C:/videos/My Clip.mp4'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/api/?Function=SetInputName&Input=My Clip.mp4&Value=C:/videos/My Clip.mp4'))

		clearMocks()
		commandReceiver0.mockClear()

		// Time to start playing
		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(1, 11000, expect.objectContaining({
			command: {
				command: VMixCommand.PLAY_INPUT,
				input: 'C:/videos/My Clip.mp4'
			}
		}), null, expect.any(String))

		expect(onRequest).toHaveBeenCalledTimes(1)
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/api/?Function=Play&Input=C:/videos/My Clip.mp4'))

		clearMocks()
		commandReceiver0.mockClear()

		// Time to stop playing
		await mockTime.advanceTimeToTicks(16050)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(1, 16000, expect.objectContaining({
			command: {
				command: VMixCommand.REMOVE_INPUT,
				input: 'C:/videos/My Clip.mp4'
			}
		}), null, expect.any(String))

		expect(onRequest).toHaveBeenCalledTimes(1)
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/api/?Function=RemoveInput&Input=C:/videos/My Clip.mp4'))

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('Input properties', async () => {
		let device
		let commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		let myLayerMapping0: MappingVMix = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Input,
			deviceId: 'myvmix'
		}
		let myLayerMapping: Mappings = {
			'vmix_media0': myLayerMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})
		let errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)
		myConductor.on('commandError', errorHandler)

		await myConductor.init()

		await t(myConductor.addDevice('myvmix', {
			type: DeviceType.VMIX,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				port: 9999
			}
		}), mockTime)

		let deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer.device as ThreadedClass<VMixDevice>
		let deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		await myConductor.setMapping(myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10000)
		await mockTime.advanceTimeToTicks(10100)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.timeline = [
			{
				id: 'media',
				enable: {
					start: 11000,
					duration: 5000
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
						alpha: 123
					},
					overlays: {
						1: 'G:/videos/My Other Clip.mp4',
						3: 5
					}
				}
			}
		]
		// Time to preload the clip
		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(1, expect.toBeCloseTo(10115, ADEV), expect.objectContaining({
			command: {
				command: VMixCommand.ADD_INPUT,
				value: 'Video|C:/videos/My Clip.mp4'
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(2, expect.toBeCloseTo(10115, ADEV), expect.objectContaining({
			command: {
				command: VMixCommand.SET_INPUT_NAME,
				input: 'My Clip.mp4',
				value: 'C:/videos/My Clip.mp4'
			}
		}), null, expect.any(String))

		expect(onRequest).toHaveBeenCalledTimes(2)

		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/api/?Function=AddInput&Value=Video|C:/videos/My Clip.mp4'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/api/?Function=SetInputName&Input=My Clip.mp4&Value=C:/videos/My Clip.mp4'))

		clearMocks()
		commandReceiver0.mockClear()

		// Time to start playing
		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(9)
		expect(commandReceiver0).toHaveBeenNthCalledWith(1, 11000, expect.objectContaining({
			command: {
				command: VMixCommand.SET_POSITION,
				input: 'C:/videos/My Clip.mp4',
				value: 10000
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(2, 11000, expect.objectContaining({
			command: {
				command: VMixCommand.LOOP_ON,
				input: 'C:/videos/My Clip.mp4'
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(3, 11000, expect.objectContaining({
			command: {
				command: VMixCommand.SET_ZOOM,
				input: 'C:/videos/My Clip.mp4',
				value: 0.5
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(4, 11000, expect.objectContaining({
			command: {
				command: VMixCommand.SET_ALPHA,
				input: 'C:/videos/My Clip.mp4',
				value: 123
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(5, 11000, expect.objectContaining({
			command: {
				command: VMixCommand.SET_PAN_X,
				input: 'C:/videos/My Clip.mp4',
				value: 0.3
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(6, 11000, expect.objectContaining({
			command: {
				command: VMixCommand.SET_PAN_Y,
				input: 'C:/videos/My Clip.mp4',
				value: 1.2
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(7, 11000, expect.objectContaining({
			command: {
				command: VMixCommand.SET_INPUT_OVERLAY,
				input: 'C:/videos/My Clip.mp4',
				index: 1,
				value: 'G:/videos/My Other Clip.mp4'
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(8, 11000, expect.objectContaining({
			command: {
				command: VMixCommand.SET_INPUT_OVERLAY,
				input: 'C:/videos/My Clip.mp4',
				index: 3,
				value: 5
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(9, 11000, expect.objectContaining({
			command: {
				command: VMixCommand.PLAY_INPUT,
				input: 'C:/videos/My Clip.mp4'
			}
		}), null, expect.any(String))

		expect(onRequest).toHaveBeenCalledTimes(9)

		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/api/?Function=SetPosition&Input=C:/videos/My Clip.mp4&Value=10000'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/api/?Function=LoopOn&Input=C:/videos/My Clip.mp4'))
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('/api/?Function=SetZoom&Input=C:/videos/My Clip.mp4&Value=0.5'))
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('/api/?Function=SetAlpha&Input=C:/videos/My Clip.mp4&Value=123'))
		expect(onRequest).toHaveBeenNthCalledWith(5, 'get', expect.stringContaining('/api/?Function=SetPanX&Input=C:/videos/My Clip.mp4&Value=0.3'))
		expect(onRequest).toHaveBeenNthCalledWith(6, 'get', expect.stringContaining('/api/?Function=SetPanY&Input=C:/videos/My Clip.mp4&Value=1.2'))
		expect(onRequest).toHaveBeenNthCalledWith(7, 'get', expect.stringContaining('/api/?Function=SetMultiViewOverlay&Input=C:/videos/My Clip.mp4&Value=1,G:/videos/My Other Clip.mp4'))
		expect(onRequest).toHaveBeenNthCalledWith(8, 'get', expect.stringContaining('/api/?Function=SetMultiViewOverlay&Input=C:/videos/My Clip.mp4&Value=3,5'))
		expect(onRequest).toHaveBeenNthCalledWith(9, 'get', expect.stringContaining('/api/?Function=Play&Input=C:/videos/My Clip.mp4'))

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('Address input by its layer', async () => {
		let device
		let commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		let myLayerMapping0: MappingVMixAny = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Input,
			deviceId: 'myvmix'
		}
		let myLayerMapping1: MappingVMixAny = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.AudioChannel,
			inputLayer: 'vmix_media0',
			deviceId: 'myvmix'
		}
		let myLayerMapping2: MappingVMixAny = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.Program,
			deviceId: 'myvmix'
		}
		let myLayerMapping: Mappings = {
			'vmix_media0': myLayerMapping0,
			'vmix_media0_audio': myLayerMapping1,
			'vmix_program': myLayerMapping2
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})
		let errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)
		myConductor.on('commandError', errorHandler)

		await myConductor.init()

		await t(myConductor.addDevice('myvmix', {
			type: DeviceType.VMIX,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				port: 9999
			}
		}), mockTime)

		let deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer.device as ThreadedClass<VMixDevice>
		let deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		await myConductor.setMapping(myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10000)
		await mockTime.advanceTimeToTicks(10100)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.timeline = [
			{
				id: 'media0',
				enable: {
					start: 11000,
					duration: 5000
				},
				layer: 'vmix_media0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.INPUT,
					inputType: VMixInputType.Video,
					filePath: 'C:/videos/My Clip.mp4'
				}
			},
			{
				id: 'audio',
				enable: {
					start: 11000,
					duration: 10000
				},
				layer: 'vmix_media0_audio',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.AUDIO,
					volume: 25
				}
			},
			{
				id: 'program',
				enable: {
					start: 11000,
					duration: 10000
				},
				layer: 'vmix_program',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.PROGRAM,
					inputLayer: 'vmix_media0'
				}
			},
			{
				id: 'media1',
				enable: {
					start: 16000,
					duration: 5000
				},
				layer: 'vmix_media0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.INPUT,
					inputType: VMixInputType.Video,
					filePath: 'G:/videos/My Other Clip.mp4'
				}
			}
		]
		// Time to preload the clip
		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(1, expect.toBeCloseTo(10115, ADEV), expect.objectContaining({
			command: {
				command: VMixCommand.ADD_INPUT,
				value: 'Video|C:/videos/My Clip.mp4'
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(2, expect.toBeCloseTo(10115, ADEV), expect.objectContaining({
			command: {
				command: VMixCommand.SET_INPUT_NAME,
				input: 'My Clip.mp4',
				value: 'C:/videos/My Clip.mp4'
			}
		}), null, expect.any(String))

		expect(onRequest).toHaveBeenCalledTimes(2)

		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/api/?Function=AddInput&Value=Video|C:/videos/My Clip.mp4'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/api/?Function=SetInputName&Input=My Clip.mp4&Value=C:/videos/My Clip.mp4'))

		clearMocks()
		commandReceiver0.mockClear()

		// Time to cut
		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(1, 11000, expect.objectContaining({
			command: {
				command: VMixCommand.AUDIO_VOLUME,
				input: 'C:/videos/My Clip.mp4',
				value: 25,
				fade: 0
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(2, 11000, expect.objectContaining({
			command: {
				command: VMixCommand.TRANSITION,
				input: 'C:/videos/My Clip.mp4',
				duration: 0,
				effect: VMixTransitionType.Cut,
				mix: 0
			}
		}), null, expect.any(String))

		expect(onRequest).toHaveBeenCalledTimes(2)

		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/api/?Function=SetVolume&Input=C:/videos/My Clip.mp4&Value=25'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/api/?Function=Cut&Input=C:/videos/My Clip.mp4&Duration=0&Mix=0'))

		clearMocks()
		commandReceiver0.mockClear()

		// Time to swap the video
		await mockTime.advanceTimeToTicks(16300)

		expect(commandReceiver0).toHaveBeenCalledTimes(5)
		expect(commandReceiver0).toHaveBeenNthCalledWith(1, expect.toBeCloseTo(12505, ADEV), expect.objectContaining({
			command: {
				command: VMixCommand.ADD_INPUT,
				value: 'Video|G:/videos/My Other Clip.mp4'
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(2, expect.toBeCloseTo(12505, ADEV), expect.objectContaining({
			command: {
				command: VMixCommand.SET_INPUT_NAME,
				input: 'My Other Clip.mp4',
				value: 'G:/videos/My Other Clip.mp4'
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(3, 16000, expect.objectContaining({
			command: {
				command: VMixCommand.AUDIO_VOLUME,
				input: 'G:/videos/My Other Clip.mp4',
				value: 25,
				fade: 0
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(4, 16000, expect.objectContaining({
			command: {
				command: VMixCommand.TRANSITION,
				input: 'G:/videos/My Other Clip.mp4',
				duration: 0,
				effect: VMixTransitionType.Cut,
				mix: 0
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(5, 16000, expect.objectContaining({
			command: {
				command: VMixCommand.REMOVE_INPUT,
				input: 'C:/videos/My Clip.mp4'
			}
		}), null, expect.any(String))

		expect(onRequest).toHaveBeenCalledTimes(5)

		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/api/?Function=AddInput&Value=Video|G:/videos/My Other Clip.mp4'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/api/?Function=SetInputName&Input=My Other Clip.mp4&Value=G:/videos/My Other Clip.mp4'))
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('/api/?Function=SetVolume&Input=G:/videos/My Other Clip.mp4&Value=25'))
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('/api/?Function=Cut&Input=G:/videos/My Other Clip.mp4&Duration=0&Mix=0'))
		expect(onRequest).toHaveBeenNthCalledWith(5, 'get', expect.stringContaining('/api/?Function=RemoveInput&Input=C:/videos/My Clip.mp4'))

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})

	test('Audio channel', async () => {
		let device
		let commandReceiver0 = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		let myLayerMapping0: MappingVMixAny = {
			device: DeviceType.VMIX,
			mappingType: MappingVMixType.AudioChannel,
			index: '2',
			deviceId: 'myvmix'
		}
		let myLayerMapping: Mappings = {
			'vmix_audio0': myLayerMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})
		let errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)
		myConductor.on('commandError', errorHandler)

		await myConductor.init()

		await t(myConductor.addDevice('myvmix', {
			type: DeviceType.VMIX,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				port: 9999
			}
		}), mockTime)

		let deviceContainer = myConductor.getDevice('myvmix')
		device = deviceContainer.device as ThreadedClass<VMixDevice>
		let deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		await myConductor.setMapping(myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10000)
		await mockTime.advanceTimeToTicks(10100)

		clearMocks()
		commandReceiver0.mockClear()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.timeline = [
			{
				id: 'audio',
				enable: {
					start: 11000,
					duration: 5000
				},
				layer: 'vmix_audio0',
				content: {
					deviceType: DeviceType.VMIX,
					type: TimelineContentTypeVMix.AUDIO,
					volume: 46,
					fade: 1337,
					balance: 0.12,
					audioAuto: false,
					muted: true,
					audioBuses: 'A,C,F'
				}
			}
		]
		// Time to preload the clip
		await mockTime.advanceTimeToTicks(11300)
		await mockTime.advanceTimeToTicks(11400)

		expect(commandReceiver0).toHaveBeenCalledTimes(6)
		expect(commandReceiver0).toHaveBeenNthCalledWith(1, 11000, expect.objectContaining({
			command: {
				command: VMixCommand.AUDIO_VOLUME,
				input: '2',
				value: 46,
				fade: 1337
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(2, 11000, expect.objectContaining({
			command: {
				command: VMixCommand.AUDIO_BALANCE,
				input: '2',
				value: 0.12
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(3, 11000, expect.objectContaining({
			command: {
				command: VMixCommand.AUDIO_AUTO_OFF,
				input: '2'
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(4, 11000, expect.objectContaining({
			command: {
				command: VMixCommand.AUDIO_BUS_ON,
				input: '2',
				value: 'A'
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(5, 11000, expect.objectContaining({
			command: {
				command: VMixCommand.AUDIO_BUS_ON,
				input: '2',
				value: 'F'
			}
		}), null, expect.any(String))
		expect(commandReceiver0).toHaveBeenNthCalledWith(6, 11000, expect.objectContaining({
			command: {
				command: VMixCommand.AUDIO_BUS_OFF,
				input: '2',
				value: 'M'
			}
		}), null, expect.any(String))

		expect(onRequest).toHaveBeenCalledTimes(6)

		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/api/?Function=SetVolumeFade&Input=2&Value=46,1337'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/api/?Function=SetBalance&Input=2&Value=0.12'))
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('/api/?Function=AudioAutoOff&Input=2'))
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('/api/?Function=AudioBusOn&Input=2&Value=A'))
		expect(onRequest).toHaveBeenNthCalledWith(5, 'get', expect.stringContaining('/api/?Function=AudioBusOn&Input=2&Value=F'))
		expect(onRequest).toHaveBeenNthCalledWith(6, 'get', expect.stringContaining('/api/?Function=AudioBusOff&Input=2&Value=M'))

		clearMocks()
		commandReceiver0.mockClear()

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})
})
