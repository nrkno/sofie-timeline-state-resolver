import { ViscaValueConverter } from '../ViscaValueConverter'
import { FocusMode } from 'timeline-state-resolver-types'
import * as ConnectionEnums from '../../enums'
import { PanTiltPosition } from '../../commands/inquiry'

describe('ViscaValueConverter', () => {
	let converter: ViscaValueConverter

	beforeEach(() => {
		converter = new ViscaValueConverter()
	})

	describe('mapPanTiltSpeedToVisca', () => {
		it('should map pan-tilt speed to Visca scale', () => {
			expect(converter.mapPanTiltSpeedToVisca(0)).toBe(0)
			expect(converter.mapPanTiltSpeedToVisca(1)).toBe(24)
			expect(converter.mapPanTiltSpeedToVisca(-1)).toBe(24)
			expect(converter.mapPanTiltSpeedToVisca(0.5)).toBe(12)
		})
	})

	describe('mapPanTiltSpeedToViscaDirection', () => {
		it('should map pan and tilt speeds to Visca direction', () => {
			expect(converter.mapPanTiltSpeedToViscaDirection(0, 0)).toBe(ConnectionEnums.PanTiltDirection.Stop)
			expect(converter.mapPanTiltSpeedToViscaDirection(1, 0)).toBe(ConnectionEnums.PanTiltDirection.Right)
			expect(converter.mapPanTiltSpeedToViscaDirection(-1, 0)).toBe(ConnectionEnums.PanTiltDirection.Left)
			expect(converter.mapPanTiltSpeedToViscaDirection(0, 1)).toBe(ConnectionEnums.PanTiltDirection.Up)
			expect(converter.mapPanTiltSpeedToViscaDirection(0, -1)).toBe(ConnectionEnums.PanTiltDirection.Down)
			expect(converter.mapPanTiltSpeedToViscaDirection(1, 1)).toBe(ConnectionEnums.PanTiltDirection.UpRight)
			expect(converter.mapPanTiltSpeedToViscaDirection(-1, -1)).toBe(ConnectionEnums.PanTiltDirection.DownLeft)
		})
	})

	describe('mapZoomSpeedToVisca', () => {
		it('should map zoom speed to Visca scale', () => {
			expect(converter.mapZoomSpeedToVisca(0)).toBe(0)
			expect(converter.mapZoomSpeedToVisca(1)).toBe(7)
			expect(converter.mapZoomSpeedToVisca(-1)).toBe(7)
			expect(converter.mapZoomSpeedToVisca(0.5)).toBe(4)
		})
	})

	describe('mapZoomSpeedToViscaDirection', () => {
		it('should map zoom speed to Visca direction', () => {
			expect(converter.mapZoomSpeedToViscaDirection(0)).toBe(ConnectionEnums.ZoomDirection.Stop)
			expect(converter.mapZoomSpeedToViscaDirection(1)).toBe(ConnectionEnums.ZoomDirection.TeleVariable)
			expect(converter.mapZoomSpeedToViscaDirection(-1)).toBe(ConnectionEnums.ZoomDirection.WideVariable)
		})
	})

	describe('mapFocusSpeedToVisca', () => {
		it('should map focus speed to Visca scale', () => {
			expect(converter.mapFocusSpeedToVisca(0)).toBe(0)
			expect(converter.mapFocusSpeedToVisca(1)).toBe(7)
			expect(converter.mapFocusSpeedToVisca(-1)).toBe(7)
			expect(converter.mapFocusSpeedToVisca(0.5)).toBe(4)
		})
	})

	describe('mapFocusSpeedToViscaDirection', () => {
		it('should map focus speed to Visca direction', () => {
			expect(converter.mapFocusSpeedToViscaDirection(0)).toBe(ConnectionEnums.FocusDirection.Stop)
			expect(converter.mapFocusSpeedToViscaDirection(1)).toBe(ConnectionEnums.FocusDirection.FarVariable)
			expect(converter.mapFocusSpeedToViscaDirection(-1)).toBe(ConnectionEnums.FocusDirection.NearVariable)
		})
	})

	describe('mapFocusPositionFromVisca', () => {
		it('should map focus position from Visca scale to normalized', () => {
			expect(converter.mapFocusPositionFromVisca(0x8000).focusPosition).toBeCloseTo(0.5)
			expect(converter.mapFocusPositionFromVisca(0xffff).focusPosition).toBeCloseTo(1)
			expect(converter.mapFocusPositionFromVisca(0x0000).focusPosition).toBeCloseTo(0)
		})
	})

	describe('mapZoomPositionFromVisca', () => {
		it('should map zoom position from Visca scale to normalized', () => {
			expect(converter.mapZoomPositionFromVisca(0x3000).zoomPosition).toBeCloseTo(0.5)
			expect(converter.mapZoomPositionFromVisca(0x6000).zoomPosition).toBeCloseTo(1)
			expect(converter.mapZoomPositionFromVisca(0x0000).zoomPosition).toBeCloseTo(0)
		})
	})

	describe('mapPanTiltPositionFromVisca', () => {
		it('should map pan-tilt position from Visca scale to normalized', () => {
			const input: PanTiltPosition = { panPosition: 0x00dd2, tiltPosition: 0x0b3b0 }

			const result = converter.mapPanTiltPositionFromVisca(input)

			expect(result.panPosition).toBeCloseTo(15 / 360)
			expect(result.tiltPosition).toBeCloseTo(195 / 360)
		})
	})

	describe('mapFocusModeToVisca', () => {
		it('should map focus mode to Visca focus mode', () => {
			expect(converter.mapFocusModeToVisca(FocusMode.AUTO)).toBe(ConnectionEnums.FocusMode.Auto)
			expect(converter.mapFocusModeToVisca(FocusMode.MANUAL)).toBe(ConnectionEnums.FocusMode.Manual)
		})
	})

	describe('mapFocusModeFromVisca', () => {
		it('should map Visca focus mode to focus mode', () => {
			expect(converter.mapFocusModeFromVisca(ConnectionEnums.FocusMode.Auto).mode).toBe(FocusMode.AUTO)
			expect(converter.mapFocusModeFromVisca(ConnectionEnums.FocusMode.Manual).mode).toBe(FocusMode.MANUAL)
		})
	})
})
