import { TriggerType } from 'superfly-timeline'
import {
	MappingCasparCG,
	Mappings,
	DeviceType
} from '../types/src'
import { Conductor } from '../conductor'
import { MockTime } from './mockTime.spec'
import * as _ from 'underscore'
import { getMockCall } from './lib.spec'

// let nowActual: number = Date.now()

describe('Rundown', () => {
	let mockTime = new MockTime()
	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})

	test('Do a full rundown', async () => {

		let commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})
		let commandReceiver0Calls = 0
		let cam1Mapping: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 3,
			layer: 10
		}
		let cam2Mapping: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 3,
			layer: 20
		}
		let gfxMapping: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 1,
			layer: 11
		}
		let pgmMapping: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 1,
			layer: 10
		}
		let auxMapping: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 2,
			layer: 10
		}
		let myLayerMapping: Mappings = {
			'cam1': cam1Mapping,
			'cam2': cam2Mapping,
			'gfx': gfxMapping,
			'pgm': pgmMapping,
			'aux1': auxMapping
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})
		await myConductor.init()
		await myConductor.addDevice('myCCG', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				timeBase: 50,
				useScheduling: true
			}
		})
		await myConductor.setMapping(myLayerMapping)
		await mockTime.advanceTimeToTicks(10001)

		let deviceContainer = myConductor.getDevice('myCCG')
		let device = deviceContainer.device

		// Check that no commands has been scheduled:
		expect(await device['queue']).toHaveLength(0)

		await mockTime.advanceTimeToTicks(10050)
		commandReceiver0Calls += 3
		expect(commandReceiver0).toHaveBeenCalledTimes(commandReceiver0Calls)
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1).name).toEqual('TimeCommand')

		// 00:00 - aux - bg_item1
		// 00:00 - gfx - short opener
		// 00:00 - pgm - cam 1

		// 00:03 - gfx - lt
		// 00:05 - pgm - stinger
		// 00:05 - aux - bg_item2
		// 00:08 - pgm - full opener
		myConductor.timeline = [
			{
				id: 'cam1',
				content: {
					type: 'input',
					attributes: {
						device: 3
					}
				},
				duration: 0, // always on
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: 10000
				},
				LLayer: 'cam1'
			},
			{
				id: 'cam2',
				content: {
					type: 'input',
					attributes: {
						device: 4
					}
				},
				duration: 0, // always on
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: 10000
				},
				LLayer: 'cam2'
			},

			// rundown
			{
				id: 'bg_item1_0',
				content: {
					type: 'media',
					attributes: {
						file: 'BG1',
						loop: true
					}
				},
				trigger: {
					type: TriggerType.LOGICAL,
					value: '.opener_item_1'
				},
				duration: 10000,
				LLayer: 'aux1'
			},
			{
				id: 'opener_clip_short',
				content: {
					type: 'media',
					attributes: {
						file: 'opener_short'
					},
					keyframes: [
						{
							id: 'kf1',
							trigger: {
								type: TriggerType.TIME_RELATIVE,
								value: '#opener_clip_short.end - 500'
							},
							duration: 500,
							content: { mixer: {
								opacity: 0,
								inTransition: {
									duration: 500
								}
							} }
						}
					]
				},
				trigger: {
					type: TriggerType.TIME_ABSOLUTE,
					value: 10000
				},
				duration: 2000,
				LLayer: 'gfx'
			},
			{
				id: 'cam_opener_item_1',
				content: {
					type: 'route',
					attributes: {
						LLayer: 'cam1'
					}
				},
				classes: ['opener_item_1'],
				trigger: {
					type: TriggerType.TIME_RELATIVE,
					value: '#opener_clip_short.start'
				},
				duration: 5500,
				LLayer: 'pgm'
			},
			{
				id: 'lt_opener',
				content: {
					type: 'template',
					attributes: {
						name: 'LT',
						data: {
							name: 'Presentator 123'
						},
						useStopCommand: true
					}
				},
				trigger: {
					type: TriggerType.TIME_RELATIVE,
					value: '#opener_clip_short.end + 1000'
				},
				duration: 1500,
				LLayer: 'gfx'
			},
			{
				id: 'stinger_opener_1_bg',
				content: {
					type: 'media',
					attributes: {
						file: 'stinger1'
					}
				},
				trigger: {
					type: TriggerType.TIME_RELATIVE,
					value: '#cam_opener_item_1.end - 1000'
				},
				isBackground: true,
				duration: 1000,
				LLayer: 'gfx'
			},
			{
				id: 'stinger_opener_1',
				content: {
					type: 'media',
					attributes: {
						file: 'stinger1'
					}
				},
				trigger: {
					type: TriggerType.TIME_RELATIVE,
					value: '#cam_opener_item_1.end - 500'
				},
				duration: 1000,
				LLayer: 'gfx'
			},
			{
				id: 'cam_opener_item_2',
				content: {
					type: 'route',
					attributes: {
						LLayer: 'cam2'
					}
				},
				classes: ['opener_item_2'],
				trigger: {
					type: TriggerType.TIME_RELATIVE,
					value: '#cam_opener_item_1.end'
				},
				duration: 2500,
				LLayer: 'pgm'
			},
			{
				id: 'bg_item2_0_bg',
				content: {
					type: 'media',
					attributes: {
						file: 'BG2',
						loop: true
					}
				},
				trigger: {
					type: TriggerType.TIME_RELATIVE,
					value: '#cam_opener_item_2.start'
				},
				isBackground: true,
				duration: 1399,
				LLayer: 'aux1'
			},
			{
				id: 'bg_item2_0',
				content: {
					type: 'media',
					attributes: {
						file: 'BG2',
						loop: true
					}
				},
				trigger: {
					type: TriggerType.LOGICAL,
					value: '.opener_item_2'
				},
				duration: 10000,
				LLayer: 'aux1'
			},
			{
				id: 'opener_full_bg',
				content: {
					type: 'media',
					attributes: {
						file: 'opener_full'
					},
					transitions: {
						inTransition: {
							type: 'PUSH',
							duration: 250
						}
					}
				},
				trigger: {
					type: TriggerType.TIME_RELATIVE,
					value: '#opener_full.start - 2000'
				},
				isBackground: true,
				duration: 2000,
				LLayer: 'gfx'
			},
			{
				id: 'opener_full',
				content: {
					type: 'media',
					attributes: {
						file: 'opener_full'
					},
					transitions: {
						inTransition: {
							type: 'PUSH',
							duration: 250
						}
					}
				},
				trigger: {
					type: TriggerType.TIME_RELATIVE,
					value: '#cam_opener_item_2.end'
				},
				duration: 5000,
				LLayer: 'gfx'
			}
		]
		await mockTime.advanceTimeToTicks(10101)

		expect(mockTime.getCurrentTime()).toEqual(10101)

		// PLAY 1-10 ROUTE://3-10
		// PLAY 1-11 OPENER_SHORT
		// PLAY 2-10 BG1
		// PLAY 3-10 DECKLINK 3
		// PLAY 3-20 DECKLINK 4
		commandReceiver0Calls += 7
		expect(commandReceiver0).toHaveBeenCalledTimes(commandReceiver0Calls)
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 7, 1).name).toEqual('PlayRouteCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 7, 1).name).toEqual('PlayRouteCommand')

		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 7, 1)._objectParams.command).toEqual('PLAY 1-10 route://3-10')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 6, 1).name).toEqual('PlayCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 6, 1)._objectParams).toMatchObject({
			channel: 1,
			layer: 11,
			noClear: false,
			clip: 'opener_short',
			loop: false,
			seek: 0
		})
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 5, 1).name).toEqual('PlayCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 5, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 10,
			noClear: false,
			clip: 'BG1',
			loop: true,
			seek: 0
		})
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 4, 1).name).toEqual('PlayDecklinkCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 4, 1)._objectParams).toMatchObject({
			channel: 3,
			layer: 10,
			noClear: false,
			device: 3,
			format: undefined,
			channelLayout: undefined
		})
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1).name).toEqual('PlayDecklinkCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1)._objectParams).toMatchObject({
			channel: 3,
			layer: 20,
			noClear: false,
			device: 4,
			format: undefined,
			channelLayout: undefined
		})

		// SCHEDULE SET 1.5s MIXER OPACITY 25
		// commandReceiver0.mock.calls.forEach(c => {
		// 	console.log(c[1].name, c[1]._objectParams)
		// })
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1).name).toEqual('ScheduleSetCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1)._objectParams.command.name).toEqual('MixerOpacityCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1)._objectParams.timecode).toEqual('00:00:11:25')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1)._objectParams.command._objectParams).toMatchObject({
			'channel': 1,
			'layer': 11,
			'transition': 'mix',
			'transitionDuration': 13,
			'transitionEasing': 'linear',
			'transitionDirection': 'right',
			'opacity': 0,
			'keyword': 'OPACITY'
		})
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1).name).toEqual('ScheduleSetCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.timecode).toEqual('00:00:12:00')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.command.name).toEqual('ClearCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.command._objectParams).toMatchObject({
			'channel': 1,
			'layer': 11
		})

		await mockTime.advanceTimeToTicks(11101)
		expect(mockTime.getCurrentTime()).toEqual(11101)
		commandReceiver0Calls += 1
		expect(commandReceiver0).toHaveBeenCalledTimes(commandReceiver0Calls)
		// SCHEDULE SET 3s CG ADD 1-11 ...
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.timecode).toEqual('00:00:13:00')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.command._objectParams).toMatchObject({
			channel: 1,
			layer: 11,
			noClear: false,
			templateName: 'LT',
			flashLayer: 1,
			playOnLoad: true,
			data: { name: 'Presentator 123' },
			cgStop: true,
			templateType: 'html'
		})

		await mockTime.advanceTimeToTicks(12601)
		expect(mockTime.getCurrentTime()).toEqual(12601)
		commandReceiver0Calls += 3

		expect(commandReceiver0).toHaveBeenCalledTimes(commandReceiver0Calls)
		// SCHEDULE SET 4.5s CG STOP
		// SCHEDULE SET 4.5s LOADBG 1-11 STINGER
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1)._objectParams.timecode).toEqual('00:00:14:25')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1)._objectParams.command._objectParams).toMatchObject({
			channel: 1,
			layer: 11,
			flashLayer: 1
		})
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1)._objectParams.timecode).toEqual('00:00:14:25')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1)._objectParams.command._objectParams).toMatchObject({
			channel: 1,
			layer: 11,
			noClear: false,
			clip: 'stinger1',
			auto: false
		})

		// await mockTime.advanceTimeToTicks(13000)
		// commandReceiver0Calls += 1
		// expect(commandReceiver0).toHaveBeenCalledTimes(commandReceiver0Calls)
		// SCHEDULE SET 5s PLAY 1-11
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.timecode).toEqual('00:00:15:00')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.command._objectParams).toMatchObject({
			channel: 1,
			layer: 11,
			noClear: false
		})

		await mockTime.advanceTimeToTicks(14000)
		expect(mockTime.getCurrentTime()).toEqual(14000)
		commandReceiver0Calls += 5
		expect(commandReceiver0).toHaveBeenCalledTimes(commandReceiver0Calls)
		// SCHEDULE SET 5.5s PLAY 2-10
		// SCHEDULE SET 5.5s PLAY 1-10 ROUTE://3-20
		// SCHEDULE SET 5s LOADBG 2-10 BG2
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 5, 1)._objectParams.timecode).toEqual('00:00:15:25')
		// expect(getMockCall(commandReceiver0, 12, 1)._objectParams.command.name).toEqual('PlayCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 5, 1)._objectParams.command._objectParams).toMatchObject({
			channel: 2,
			layer: 10,
			noClear: false
		})

		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 4, 1)._objectParams.timecode).toEqual('00:00:15:25')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 4, 1)._objectParams.command.name).toEqual('PlayRouteCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 4, 1)._objectParams.command._objectParams.command).toEqual('PLAY 1-10 route://3-20')

		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1)._objectParams.timecode).toEqual('00:00:15:25')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1)._objectParams.command.name).toEqual('LoadbgCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1)._objectParams.command._objectParams).toMatchObject({
			channel: 2,
			layer: 10,
			noClear: false,
			clip: 'BG2',
			auto: false
		})

		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1)._objectParams.timecode).toEqual('00:00:16:00')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1)._objectParams.command._objectParams).toMatchObject({
			'channel': 1,
			'layer': 11
		})
		// SCHEDULE SET 6s LOADBG 1-11 OPENER_FULL PUSH 13
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.timecode).toEqual('00:00:16:00')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.command._objectParams).toMatchObject({
			channel: 1,
			layer: 11,
			noClear: false,
			clip: 'opener_full',
			auto: false,
			transition: 'PUSH',
			transitionDuration: 6,
			transitionEasing: 'linear',
			transitionDirection: 'right'
		})

		await mockTime.advanceTimeTicks(1000)
		expect(mockTime.getCurrentTime()).toEqual(15000)
		commandReceiver0Calls += 4
		expect(commandReceiver0).toHaveBeenCalledTimes(commandReceiver0Calls)
		// commandReceiver0.mock.calls.forEach(c => console.log(c[0], c[1].name, c[1]._objectParams))
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 4, 1)._objectParams.timecode).toEqual('00:00:16:44')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 4, 1)._objectParams.command._objectParams).toMatchObject({
			channel: 2,
			layer: 10,
			noClear: false
		})

		// SCHEDULE SET 8s PLAY 1-11
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1)._objectParams.timecode).toEqual('00:00:18:00')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1)._objectParams.command._objectParams).toMatchObject({
			channel: 1,
			layer: 11,
			noClear: false
		})
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1)._objectParams.timecode).toEqual('00:00:18:00')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1)._objectParams.command._objectParams).toMatchObject({
			'channel': 1,
			'layer': 10
		})
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.timecode).toEqual('00:00:18:00')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.command._objectParams).toMatchObject({
			'channel': 2,
			'layer': 10
		})

		await mockTime.advanceTimeToTicks(22000)
		expect(mockTime.getCurrentTime()).toEqual(22000)
		commandReceiver0Calls += 1

		expect(commandReceiver0).toHaveBeenCalledTimes(commandReceiver0Calls)

		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.timecode).toEqual('00:00:23:00')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.command._objectParams).toMatchObject({
			'channel': 1,
			'layer': 11
		})
	})
})
