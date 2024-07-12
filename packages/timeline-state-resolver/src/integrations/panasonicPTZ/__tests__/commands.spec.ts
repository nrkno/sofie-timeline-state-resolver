import {
	AutoFocusOnOffControl,
	AutoFocusOnOffQuery,
	FocusPositionControl,
	FocusPositionQuery,
	FocusSpeedControl,
	InvalidResponseError,
	OneTouchFocusControl,
	PanTiltPositionControl,
	PanTiltPositionQuery,
	PanTiltSpeedControl,
	PowerMode,
	PowerModeQuery,
	PresetDeleteControl,
	PresetNumberQuery,
	PresetPlaybackControl,
	PresetRegisterControl,
	PresetSpeedControl,
	PresetSpeedQuery,
	ZoomPositionControl,
	ZoomPositionQuery,
	ZoomSpeedControl,
	ZoomSpeedQuery,
} from '../commands'
import { PanasonicFocusMode } from '../connection'

describe('PowerModeQuery', () => {
	test('serialize', () => {
		const command = new PowerModeQuery()
		expect(command.serialize()).toBe('#O')
	})

	test('deserializeResponse', () => {
		const command = new PowerModeQuery()
		expect(command.deserializeResponse('p1')).toBe(PowerMode.POWER_MODE_ON)
		expect(command.deserializeResponse('p0')).toBe(PowerMode.POWER_MODE_STBY)
		expect(command.deserializeResponse('p3')).toBe(PowerMode.POWER_MODE_TURNING_ON)
		expect(() => command.deserializeResponse('px')).toThrow(InvalidResponseError)
	})
})

describe('PresetRegisterControl', () => {
	test('serialize', () => {
		const command = new PresetRegisterControl(1)
		expect(command.serialize()).toBe('#M01')
	})

	test('deserializeResponse', () => {
		const command = new PresetRegisterControl(1)
		expect(command.deserializeResponse('s01')).toBe(1)
		expect(() => command.deserializeResponse('x01')).toThrow(InvalidResponseError)
	})

	it('validatePresetNumber', () => {
		expect(() => new PresetRegisterControl(100)).toThrow(Error)
	})
})

describe('PresetPlaybackControl', () => {
	test('serialize', () => {
		const command = new PresetPlaybackControl(1)
		expect(command.serialize()).toBe('#R01')
	})

	test('deserializeResponse', () => {
		const command = new PresetPlaybackControl(1)
		expect(command.deserializeResponse('s01')).toBe(1)
		expect(() => command.deserializeResponse('x01')).toThrow(InvalidResponseError)
	})

	test('validatePresetNumber', () => {
		expect(() => new PresetPlaybackControl(100)).toThrow(Error)
	})
})

describe('PresetDeleteControl', () => {
	test('serialize', () => {
		const command = new PresetDeleteControl(1)
		expect(command.serialize()).toBe('#C01')
	})

	test('deserializeResponse', () => {
		const command = new PresetDeleteControl(1)
		expect(command.deserializeResponse('s01')).toBe(1)
		expect(() => command.deserializeResponse('x01')).toThrow(InvalidResponseError)
	})

	test('validatePresetNumber', () => {
		expect(() => new PresetDeleteControl(100)).toThrow(Error)
	})
})

describe('PresetNumberQuery', () => {
	test('serialize', () => {
		const command = new PresetNumberQuery()
		expect(command.serialize()).toBe('#S')
	})

	test('deserializeResponse', () => {
		const command = new PresetNumberQuery()
		expect(command.deserializeResponse('s01')).toBe(1)
		expect(() => command.deserializeResponse('x01')).toThrow(InvalidResponseError)
	})
})

describe('PresetSpeedControl', () => {
	test('serialize', () => {
		const command = new PresetSpeedControl(250)
		expect(command.serialize()).toBe('#UPVS250')
	})

	test('deserializeResponse', () => {
		const command = new PresetSpeedControl(250)
		expect(command.deserializeResponse('uPVS250')).toBe(250)
		expect(() => command.deserializeResponse('xPVS250')).toThrow(InvalidResponseError)
	})

	test('validateSpeed', () => {
		expect(() => new PresetSpeedControl(1000)).toThrow(Error)
		expect(() => new PresetSpeedControl(249)).toThrow(Error)
	})
})

describe('PresetSpeedQuery', () => {
	const command = new PresetSpeedQuery()

	test('serialize', () => {
		expect(command.serialize()).toBe('#UPVS')
	})

	test('deserializeResponse', () => {
		expect(command.deserializeResponse('uPVS250')).toBe(250)
		expect(() => command.deserializeResponse('xPVS250')).toThrow(InvalidResponseError)
	})
})

describe('PanTiltSpeedControl', () => {
	test('serialize', () => {
		const command = new PanTiltSpeedControl(50, 50)
		expect(command.serialize()).toBe('#PTS5050')
	})

	test('deserializeResponse', () => {
		const command = new PanTiltSpeedControl(50, 50)
		expect(command.deserializeResponse('pTS5050')).toEqual({ panSpeed: 50, tiltSpeed: 50 })
		expect(() => command.deserializeResponse('xTS5050')).toThrow(InvalidResponseError)
	})

	test('validatePanTiltSpeed', () => {
		expect(() => new PanTiltSpeedControl(0, 50)).toThrow(Error)
		expect(() => new PanTiltSpeedControl(50, 100)).toThrow(Error)
	})
})

describe('PanTiltPositionControl', () => {
	test('serialize', () => {
		const command = new PanTiltPositionControl(65535, 65535)
		expect(command.serialize()).toBe('#APCffffffff')
	})

	test('deserializeResponse', () => {
		const command = new PanTiltPositionControl(65535, 65535)
		expect(command.deserializeResponse('aPCffff0000')).toEqual({ panPosition: 65535, tiltPosition: 0 })
		expect(() => command.deserializeResponse('xPCffff0000')).toThrow(InvalidResponseError)
	})

	test('validatePanTiltPosition', () => {
		expect(() => new PanTiltPositionControl(-1, 0)).toThrow(Error)
		expect(() => new PanTiltPositionControl(0, 65536)).toThrow(Error)
	})
})

describe('PanTiltPositionQuery', () => {
	const command = new PanTiltPositionQuery()

	test('serialize', () => {
		expect(command.serialize()).toBe('#APC')
	})

	test('deserializeResponse', () => {
		expect(command.deserializeResponse('aPC00010001')).toEqual({ panPosition: 1, tiltPosition: 1 })
		expect(() => command.deserializeResponse('xPC00010001')).toThrow(InvalidResponseError)
	})
})

describe('ZoomSpeedControl', () => {
	test('serialize', () => {
		const command = new ZoomSpeedControl(50)
		expect(command.serialize()).toBe('#Z50')
	})

	test('deserializeResponse', () => {
		const command = new ZoomSpeedControl(50)
		expect(command.deserializeResponse('zS50')).toBe(50)
		expect(() => command.deserializeResponse('xS50')).toThrow(InvalidResponseError)
	})

	test('validateZoomSpeed', () => {
		expect(() => new ZoomSpeedControl(0)).toThrow(Error)
		expect(() => new ZoomSpeedControl(100)).toThrow(Error)
	})
})

describe('ZoomSpeedQuery', () => {
	const command = new ZoomSpeedQuery()

	test('serialize', () => {
		expect(command.serialize()).toBe('#Z')
	})

	test('deserializeResponse', () => {
		expect(command.deserializeResponse('zS50')).toBe(50)
		expect(() => command.deserializeResponse('xS50')).toThrow(InvalidResponseError)
	})
})

describe('ZoomPositionControl', () => {
	test('serialize', () => {
		const command = new ZoomPositionControl(0x555)
		expect(command.serialize()).toBe('#AXZ555')
	})

	test('deserializeResponse', () => {
		const command = new ZoomPositionControl(0x555)
		expect(command.deserializeResponse('axz555')).toBe(1365)
		expect(() => command.deserializeResponse('xxz555')).toThrow(InvalidResponseError)
	})

	test('validateZoomPosition', () => {
		expect(() => new ZoomPositionControl(1364)).toThrow(Error)
		expect(() => new ZoomPositionControl(4096)).toThrow(Error)
	})
})

describe('ZoomPositionQuery', () => {
	const command = new ZoomPositionQuery()

	test('serialize', () => {
		expect(command.serialize()).toBe('#GZ')
	})

	test('deserializeResponse', () => {
		expect(command.deserializeResponse('gz555')).toBe(1365)
		expect(() => command.deserializeResponse('xz555')).toThrow(InvalidResponseError)
	})
})

describe('FocusSpeedControl', () => {
	test('serialize', () => {
		const command = new FocusSpeedControl(50)
		expect(command.serialize()).toBe('#F50')
	})

	test('deserializeResponse', () => {
		const command = new FocusSpeedControl(50)
		expect(command.deserializeResponse('fS50')).toBe(50)
		expect(() => command.deserializeResponse('xS50')).toThrow(InvalidResponseError)
	})

	test('validateFocusSpeed', () => {
		expect(() => new FocusSpeedControl(0)).toThrow(Error)
		expect(() => new FocusSpeedControl(100)).toThrow(Error)
	})
})

describe('AutoFocusOnOffControl', () => {
	test('serialize', () => {
		const command = new AutoFocusOnOffControl(PanasonicFocusMode.AUTO)
		expect(command.serialize()).toBe('#D11')
	})

	test('deserializeResponse', () => {
		const command = new AutoFocusOnOffControl(PanasonicFocusMode.AUTO)
		expect(command.deserializeResponse('d10')).toBe(PanasonicFocusMode.MANUAL)
		expect(() => command.deserializeResponse('x11')).toThrow(InvalidResponseError)
	})
})

describe('AutoFocusOnOffQuery', () => {
	const command = new AutoFocusOnOffQuery()

	test('serialize', () => {
		expect(command.serialize()).toBe('#D1')
	})

	test('deserializeResponse', () => {
		expect(command.deserializeResponse('d11')).toBe(PanasonicFocusMode.AUTO)
		expect(command.deserializeResponse('d10')).toBe(PanasonicFocusMode.MANUAL)
		expect(() => command.deserializeResponse('x11')).toThrow(InvalidResponseError)
	})
})

describe('OneTouchFocusControl', () => {
	const command = new OneTouchFocusControl()

	test('serialize', () => {
		expect(command.serialize()).toBe('OSE:69:1')
	})

	test('deserializeResponse', () => {
		expect(() => command.deserializeResponse('OSE:69:1')).not.toThrow()
		expect(() => command.deserializeResponse('OSE:69:0')).toThrow(InvalidResponseError)
	})
})

describe('FocusPositionControl', () => {
	test('serialize', () => {
		const command = new FocusPositionControl(0x555)
		expect(command.serialize()).toBe('#AXF555')
	})

	test('deserializeResponse', () => {
		const command = new FocusPositionControl(0x555)
		expect(command.deserializeResponse('axf555')).toBe(1365)
		expect(() => command.deserializeResponse('xxf555')).toThrow(InvalidResponseError)
	})

	test('validateFocusPosition', () => {
		expect(() => new FocusPositionControl(1364)).toThrow(Error)
		expect(() => new FocusPositionControl(4096)).toThrow(Error)
	})
})

describe('FocusPositionQuery', () => {
	const command = new FocusPositionQuery()

	test('serialize', () => {
		expect(command.serialize()).toBe('#GF')
	})

	test('deserializeResponse', () => {
		expect(command.deserializeResponse('gf555')).toBe(1365)
		expect(() => command.deserializeResponse('xf555')).toThrow(InvalidResponseError)
	})
})
