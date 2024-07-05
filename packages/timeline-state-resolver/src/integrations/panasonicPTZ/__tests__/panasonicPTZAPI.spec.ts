import { PanasonicFocusMode, PanasonicPtzHttpInterface } from '../../../integrations/panasonicPTZ/connection'
import got from '../../../__mocks__/got'
import { URL } from 'url'
import { OptionsOfJSONResponseBody, Response } from 'got'
import {
	PresetRegisterControl,
	PresetDeleteControl,
	PresetPlaybackControl,
	PresetSpeedControl,
	ZoomSpeedControl,
	ZoomPositionControl,
	PanTiltSpeedControl,
	FocusSpeedControl,
	AutoFocusOnOffControl,
	OneTouchFocusControl,
	PresetNumberQuery,
	PresetSpeedQuery,
	ZoomSpeedQuery,
	ZoomPositionQuery,
	PowerMode,
} from '../commands'

const orgSetTimeout = setTimeout

interface MockDevice {
	returnError: string | null
	zoom: number
	zoomSpeed: number
	speed: number
	preset: number
	powerMode: 'p1' | 'p0' | 'p3'
}
function mockReply(mockDevice: MockDevice, urlString: string) {
	const url = new URL(urlString)

	const cmd = url.searchParams.get('cmd') || ''
	// console.log('mockReply', cmd)

	if (mockDevice.returnError) return mockDevice.returnError

	const presetStore = cmd.match(/#M(\d+)/) // #M%02i
	const presetRecall = cmd.match(/#R(\d+)/) // #R%02i
	const presetDelete = cmd.match(/#C(\d+)/) // #C%02i
	const speed = cmd.match(/#UPVS(\d+)/) // #UPVS%03i
	const zoomSpeed = cmd.match(/#Z(\w+)/) // #Z%02i
	const zoom = cmd.match(/#AXZ(\w+)/) // #AXZ%03X
	const panTiltDrive = cmd.match(/#PTS(\d{2})(\d{2})/) // #PTS%02i%02i
	const focusSpeed = cmd.match(/#F(\d+)/) // #F%02i
	const focusMode = cmd.match(/#D1(\d+)/) // #D1%d
	const oneTouchFocus = cmd.match(/OSE:69:1/) // #OSE:69:1

	if (cmd === '#O') {
		// POWER_MODE_QUERY
		return mockDevice.powerMode
	} else if (presetRecall) {
		// PRESET_NUMBER_CONTROL_TPL
		mockDevice.preset = Number(presetRecall[1])
		return 's' + mockDevice.preset
	} else if (presetStore) {
		mockDevice.preset = Number(presetStore[1])
		return 's' + mockDevice.preset
	} else if (presetDelete) {
		return 's' + presetDelete[1]
	} else if (panTiltDrive) {
		const speeds = panTiltDrive[1] + panTiltDrive[2]
		return 'pTS' + speeds
	} else if (cmd === '#S') {
		// PRESET_NUMBER_QUERY
		return 's' + mockDevice.preset
	} else if (speed) {
		// PRESET_SPEED_CONTROL_TPL
		mockDevice.speed = Number(speed[1])
		return 'uPVS' + mockDevice.speed
	} else if (cmd === '#UPVS') {
		// PRESET_SPEED_QUERY
		return 'uPVS' + mockDevice.speed
	} else if (zoomSpeed) {
		// ZOOM_SPEED_CONTROL_TPL
		mockDevice.zoomSpeed = Number(zoomSpeed[1])
		return 'zS' + mockDevice.zoomSpeed
	} else if (cmd === '#Z') {
		// ZOOM_SPEED_QUERY
		return 'zS' + mockDevice.zoomSpeed
	} else if (zoom) {
		// ZOOM_CONTROL_TPL
		mockDevice.zoom = Number.parseInt(zoom[1], 16)
		return 'axz' + mockDevice.zoom.toString(16)
	} else if (focusSpeed) {
		return 'fS' + focusSpeed[1]
	} else if (focusMode) {
		return 'd1' + focusMode[1]
	} else if (oneTouchFocus) {
		return oneTouchFocus[0]
	} else if (cmd === '#GZ') {
		// ZOOM_QUERY
		return 'gz' + mockDevice.zoom.toString(16)
	} else {
		return 'Mock: Unknown Command ' + cmd
	}
}
describe('PanasonicAPI', () => {
	jest.mock('got', () => got)

	const mockDevice: MockDevice = {
		powerMode: 'p1',
		preset: 0,
		speed: 0,
		zoomSpeed: 0,
		zoom: 0,
		returnError: null,
	}

	// let requestReturnsOK = true
	async function handleRequest(url: string, _options?: OptionsOfJSONResponseBody) {
		return new Promise<Pick<Response, 'body'>>((resolve) => {
			orgSetTimeout(() => {
				resolve({ body: mockReply(mockDevice, url) })
			}, 1)
		})
	}

	const onGet = jest.fn(handleRequest)
	const onPost = jest.fn(handleRequest)
	const onPut = jest.fn(handleRequest)
	const onHead = jest.fn(handleRequest)
	const onPatch = jest.fn(handleRequest)
	const onDel = jest.fn(handleRequest)
	const onDelete = jest.fn(handleRequest)

	got.setMockGet(onGet)
	got.setMockPost(onPost)
	got.setMockPut(onPut)
	got.setMockHead(onHead)
	got.setMockPatch(onPatch)
	got.setMockDel(onDel)
	got.setMockDelete(onDelete)

	beforeEach(() => {
		// jest.useFakeTimers()
		onGet.mockClear()
		onPost.mockClear()
		onPut.mockClear()
		onHead.mockClear()
		onPatch.mockClear()
		onDel.mockClear()
		onDelete.mockClear()
	})
	test('Basic methods', async () => {
		const onError = jest.fn()
		const onDisconnected = jest.fn()

		const panasonicPTZ = new PanasonicPtzHttpInterface('127.0.0.1')
		panasonicPTZ.on('error', onError)
		panasonicPTZ.on('disconnected', onDisconnected)

		mockDevice.powerMode = 'p0'
		expect(await panasonicPTZ.ping()).toEqual(PowerMode.POWER_MODE_STBY)

		mockDevice.powerMode = 'p3'
		expect(await panasonicPTZ.ping()).toEqual(PowerMode.POWER_MODE_TURNING_ON)

		mockDevice.powerMode = 'p1'
		expect(await panasonicPTZ.ping()).toEqual(PowerMode.POWER_MODE_ON)

		expect(await panasonicPTZ.executeCommand(new PresetRegisterControl(23))).toEqual(23)
		expect(await panasonicPTZ.executeCommand(new PresetDeleteControl(31))).toEqual(31)
		expect(await panasonicPTZ.executeCommand(new PresetPlaybackControl(7))).toEqual(7)

		expect(await panasonicPTZ.executeCommand(new PresetSpeedControl(0))).toEqual(0)
		expect(await panasonicPTZ.executeCommand(new PresetSpeedControl(250))).toEqual(250)
		expect(await panasonicPTZ.executeCommand(new ZoomSpeedControl(49 + 50))).toEqual(49 + 50)
		expect(await panasonicPTZ.executeCommand(new ZoomSpeedControl(25 + 50))).toEqual(25 + 50)
		expect(await panasonicPTZ.executeCommand(new ZoomPositionControl(0x555))).toEqual(0x555)
		expect(await panasonicPTZ.executeCommand(new ZoomPositionControl(1 * 0xaaa + 0x555))).toEqual(1 * 0xaaa + 0x555)

		expect(await panasonicPTZ.executeCommand(new PanTiltSpeedControl(50, 50))).toEqual({ panSpeed: 50, tiltSpeed: 50 })
		expect(await panasonicPTZ.executeCommand(new PanTiltSpeedControl(50 + 22, 50 - 5))).toEqual({
			panSpeed: 50 + 22,
			tiltSpeed: 45,
		})

		expect(await panasonicPTZ.executeCommand(new FocusSpeedControl(50))).toEqual(50)
		expect(await panasonicPTZ.executeCommand(new FocusSpeedControl(50 + 22))).toEqual(72)

		expect(await panasonicPTZ.executeCommand(new AutoFocusOnOffControl(PanasonicFocusMode.AUTO))).toEqual(
			PanasonicFocusMode.AUTO
		)
		expect(await panasonicPTZ.executeCommand(new AutoFocusOnOffControl(PanasonicFocusMode.MANUAL))).toEqual(
			PanasonicFocusMode.MANUAL
		)

		expect(await panasonicPTZ.executeCommand(new OneTouchFocusControl())).toEqual(undefined)

		expect(await panasonicPTZ.executeCommand(new PresetNumberQuery())).toEqual(7)
		expect(await panasonicPTZ.executeCommand(new PresetSpeedQuery())).toEqual(250)
		expect(await panasonicPTZ.executeCommand(new ZoomSpeedQuery())).toEqual(75) // 25 + 50 = 75
		expect(await panasonicPTZ.executeCommand(new ZoomPositionQuery())).toEqual(1 * 0xaaa + 0x555)

		// test that queueing works:
		// mockDevice.preset = 0
		// const p0 = panasonicPTZ.recallPreset(42)
		// const p1 = panasonicPTZ.recallPreset(7)
		// console.log('a')

		// expect(mockDevice.preset).toEqual(0)
		// await p0
		// console.log('b')
		// expect(mockDevice.preset).toEqual(42)
		// await p1
		// console.log('c')
		// expect(mockDevice.preset).toEqual(7)

		// return error:
		mockDevice.returnError = 'E1'

		await expect(async () => await panasonicPTZ.executeCommand(new PresetPlaybackControl(42))).rejects.toThrow(
			'Device returned an error: E1'
		)

		mockDevice.returnError = null

		expect(onDisconnected).toHaveBeenCalledTimes(0)
		panasonicPTZ.dispose()

		expect(onError).toHaveBeenCalledTimes(0)
	})
})
