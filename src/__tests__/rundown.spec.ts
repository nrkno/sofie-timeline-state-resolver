// import { CasparCG, AMCP } from 'casparcg-connection'
// import {Resolver, Enums} from "superfly-timeline"
import { TriggerType } from 'superfly-timeline'

import { Mappings, MappingCasparCG, DeviceType } from '../devices/mapping'
import { Conductor } from '../conductor'

let externalLog = (...args) => {
	args = args
	// console.log('trace', ...args)
}
// let nowActual: number = Date.now()

describe('Rundown', () => {
	let now: number = 10000
	beforeAll(() => {
		Date.now = jest.fn(() => {
			return getCurrentTime()
		})
		// Date.now['mockReturnValue'](now)
	})
	function getCurrentTime () {
		return now
	}
	function advanceTime (advanceTime: number) {
		now += advanceTime
		jest.advanceTimersByTime(advanceTime)
		// console.log('Advancing ' + advanceTime + ' ms -----------------------')
	}
	beforeEach(() => {
		now = 10000
		jest.useFakeTimers()
	})

	test('Do a "full" rundown', async () => {

		let commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})
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
			externalLog: externalLog,
			initializeAsClear: true,
			getCurrentTime: getCurrentTime
		})
		await myConductor.init()
		await myConductor.addDevice('myCCG', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				timeBase: 50
			}
		})
		myConductor.mapping = myLayerMapping
		advanceTime(1) // 10001

		let device = myConductor.getDevice('myCCG')

		// Check that no commands has been scheduled:
		expect(device['queue']).toHaveLength(0)

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
					value: Date.now()
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
					value: Date.now()
				},
				LLayer: 'cam2'
			},

			// rundown
			{
				id: 'bg_item1_0',
				content: {
					type: 'video',
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
					type: 'video',
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
					value: Date.now()
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
					type: 'video',
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
					type: 'video',
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
					type: 'video',
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
					type: 'video',
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
					type: 'video',
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
					type: 'video',
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

		advanceTime(100) // 10101

		expect(getCurrentTime()).toEqual(10101)

		// PLAY 1-10 ROUTE://3-10
		// PLAY 1-11 OPENER_SHORT
		// PLAY 2-10 BG1
		// PLAY 3-10 DECKLINK 3
		// PLAY 3-20 DECKLINK 4
		expect(commandReceiver0).toHaveBeenCalledTimes(7)
		expect(commandReceiver0.mock.calls[0][1].name).toEqual('PlayRouteCommand')
		expect(commandReceiver0.mock.calls[0][1]._objectParams.command).toEqual('PLAY 1-10 route://3-10')
		expect(commandReceiver0.mock.calls[1][1].name).toEqual('PlayCommand')
		expect(commandReceiver0.mock.calls[1][1]._objectParams).toMatchObject({
			channel: 1,
			layer: 11,
			noClear: false,
			clip: 'opener_short',
			loop: false,
			seek: 0
		})
		expect(commandReceiver0.mock.calls[2][1].name).toEqual('PlayCommand')
		expect(commandReceiver0.mock.calls[2][1]._objectParams).toMatchObject({
			channel: 2,
			layer: 10,
			noClear: false,
			clip: 'BG1',
			loop: true,
			seek: 0
		})
		expect(commandReceiver0.mock.calls[3][1].name).toEqual('PlayDecklinkCommand')
		expect(commandReceiver0.mock.calls[3][1]._objectParams).toMatchObject({
			channel: 3,
			layer: 10,
			noClear: false,
			device: 3,
			format: null,
			channelLayout: null
		})
		expect(commandReceiver0.mock.calls[4][1].name).toEqual('PlayDecklinkCommand')
		expect(commandReceiver0.mock.calls[4][1]._objectParams).toMatchObject({
			channel: 3,
			layer: 20,
			noClear: false,
			device: 4,
			format: null,
			channelLayout: null
		})

		// SCHEDULE SET 1.5s MIXER OPACITY 25
		expect(commandReceiver0.mock.calls[5][1].name).toEqual('ScheduleSetCommand')
		expect(commandReceiver0.mock.calls[5][1]._objectParams.command.name).toEqual('MixerOpacityCommand')
		expect(commandReceiver0.mock.calls[5][1]._objectParams.timecode).toEqual('00:00:11:25')
		expect(commandReceiver0.mock.calls[5][1]._objectParams.command._objectParams).toMatchObject({
			'channel': 1,
			'layer': 11,
			'transition': 'mix',
			'transitionDuration': 25,
			'transitionEasing': 'linear',
			'transitionDirection': 'right',
			'opacity': 0,
			'keyword': 'OPACITY'
		})
		expect(commandReceiver0.mock.calls[6][1]._objectParams.timecode).toEqual('00:00:12:00')
		expect(commandReceiver0.mock.calls[6][1]._objectParams.command._objectParams).toMatchObject({
			'channel': 1,
			'layer': 11
		})

		advanceTime(1000) // 11101
		expect(getCurrentTime()).toEqual(11101)
		expect(commandReceiver0).toHaveBeenCalledTimes(8)
		// SCHEDULE SET 3s CG ADD 1-11 ...
		expect(commandReceiver0.mock.calls[7][1]._objectParams.timecode).toEqual('00:00:13:00')
		expect(commandReceiver0.mock.calls[7][1]._objectParams.command._objectParams).toMatchObject({
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

		advanceTime(1500) // 12601
		expect(getCurrentTime()).toEqual(12601)
		expect(commandReceiver0).toHaveBeenCalledTimes(11)
		// SCHEDULE SET 4.5s CG STOP
		// SCHEDULE SET 4.5s LOADBG 1-11 STINGER
		expect(commandReceiver0.mock.calls[8][1]._objectParams.timecode).toEqual('00:00:14:25')
		expect(commandReceiver0.mock.calls[8][1]._objectParams.command._objectParams).toMatchObject({
			channel: 1,
			layer: 11,
			flashLayer: 1
		})
		expect(commandReceiver0.mock.calls[9][1]._objectParams.timecode).toEqual('00:00:14:25')
		expect(commandReceiver0.mock.calls[9][1]._objectParams.command._objectParams).toMatchObject({
			channel: 1,
			layer: 11,
			noClear: false,
			clip: 'stinger1',
			auto: false
		})

		// SCHEDULE SET 5s PLAY 1-11
		expect(commandReceiver0.mock.calls[10][1]._objectParams.timecode).toEqual('00:00:15:00')
		expect(commandReceiver0.mock.calls[10][1]._objectParams.command._objectParams).toMatchObject({
			channel: 1,
			layer: 11,
			noClear: false
		})

		advanceTime(1399) // 14000
		expect(getCurrentTime()).toEqual(14000)
		expect(commandReceiver0).toHaveBeenCalledTimes(16)
		// SCHEDULE SET 5.5s PLAY 1-10 ROUTE://3-20
		// SCHEDULE SET 5s LOADBG 2-10 BG2
		// SCHEDULE SET 5.5s PLAY 2-10
		expect(commandReceiver0.mock.calls[11][1]._objectParams.timecode).toEqual('00:00:15:25')
		expect(commandReceiver0.mock.calls[11][1]._objectParams.command.name).toEqual('PlayRouteCommand')
		expect(commandReceiver0.mock.calls[11][1]._objectParams.command._objectParams.command).toEqual('PLAY 1-10 route://3-20')

		expect(commandReceiver0.mock.calls[13][1]._objectParams.timecode).toEqual('00:00:15:25')
		expect(commandReceiver0.mock.calls[13][1]._objectParams.command._objectParams).toMatchObject({
			channel: 2,
			layer: 10,
			noClear: false,
			clip: 'BG2',
			auto: false
		})
		expect(commandReceiver0.mock.calls[12][1]._objectParams.timecode).toEqual('00:00:15:25')
		expect(commandReceiver0.mock.calls[12][1]._objectParams.command._objectParams).toMatchObject({
			channel: 2,
			layer: 10,
			noClear: false
		})

		expect(commandReceiver0.mock.calls[14][1]._objectParams.timecode).toEqual('00:00:16:00')
		expect(commandReceiver0.mock.calls[14][1]._objectParams.command._objectParams).toMatchObject({
			'channel': 1,
			'layer': 11
		})
		// SCHEDULE SET 6s LOADBG 1-11 OPENER_FULL PUSH 13
		expect(commandReceiver0.mock.calls[15][1]._objectParams.timecode).toEqual('00:00:16:00')
		expect(commandReceiver0.mock.calls[15][1]._objectParams.command._objectParams).toMatchObject({
			channel: 1,
			layer: 11,
			noClear: false,
			clip: 'opener_full',
			auto: false,
			transition: 'PUSH',
			transitionDuration: 13,
			transitionEasing: 'linear',
			transitionDirection: 'right'
		})

		advanceTime(1000)
		expect(getCurrentTime()).toEqual(15000)
		expect(commandReceiver0).toHaveBeenCalledTimes(20)

		expect(commandReceiver0.mock.calls[16][1]._objectParams.timecode).toEqual('00:00:16:45')
		expect(commandReceiver0.mock.calls[16][1]._objectParams.command._objectParams).toMatchObject({
			channel: 2,
			layer: 10,
			noClear: false
		})

		// SCHEDULE SET 8s PLAY 1-11
		expect(commandReceiver0.mock.calls[17][1]._objectParams.timecode).toEqual('00:00:18:00')
		expect(commandReceiver0.mock.calls[17][1]._objectParams.command._objectParams).toMatchObject({
			channel: 1,
			layer: 11,
			noClear: false
		})
		expect(commandReceiver0.mock.calls[18][1]._objectParams.timecode).toEqual('00:00:18:00')
		expect(commandReceiver0.mock.calls[18][1]._objectParams.command._objectParams).toMatchObject({
			'channel': 1,
			'layer': 10
		})
		expect(commandReceiver0.mock.calls[19][1]._objectParams.timecode).toEqual('00:00:18:00')
		expect(commandReceiver0.mock.calls[19][1]._objectParams.command._objectParams).toMatchObject({
			'channel': 2,
			'layer': 10
		})

		advanceTime(5000)
		expect(getCurrentTime()).toEqual(20000)
		expect(commandReceiver0).toHaveBeenCalledTimes(21)

		expect(commandReceiver0.mock.calls[20][1]._objectParams.timecode).toEqual('00:00:23:00')
		expect(commandReceiver0.mock.calls[20][1]._objectParams.command._objectParams).toMatchObject({
			'channel': 1,
			'layer': 11
		})
	})
})
