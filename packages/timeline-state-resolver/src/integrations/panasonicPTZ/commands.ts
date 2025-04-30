import { sprintf } from 'sprintf-js'
import _ = require('underscore')
import { PanasonicFocusMode } from './connection'

export interface Command<TRes> {
	serialize(): string
	deserializeResponse(response: string): TRes
}

export class InvalidResponseError extends Error {
	constructor(public readonly response: string) {
		super(`Invalid response: ${response}`)
	}
}

export enum PowerMode {
	POWER_MODE_ON = 'p1',
	POWER_MODE_STBY = 'p0',
	POWER_MODE_TURNING_ON = 'p3',
}

export class PowerModeQuery implements Command<PowerMode> {
	serialize(): string {
		return '#O'
	}

	deserializeResponse(response: string): PowerMode {
		switch (response) {
			case 'p1':
				return PowerMode.POWER_MODE_ON
			case 'p0':
				return PowerMode.POWER_MODE_STBY
			case 'p3':
				return PowerMode.POWER_MODE_TURNING_ON
			default:
				throw new InvalidResponseError(response)
		}
	}
}

/**
 * Store camera preset
 */
export class PresetRegisterControl implements Command<number> {
	/**
	 * @param presetNumber The preset to be stored. 0-99
	 */
	constructor(private presetNumber: number) {
		validatePresetNumber(presetNumber)
	}

	serialize(): string {
		return sprintf('#M%02i', this.presetNumber)
	}

	deserializeResponse(response: string): number {
		if (response.startsWith('s')) {
			return parseInt(response.slice(1), 10)
		}
		throw new InvalidResponseError(response)
	}
}

/**
 * Recall camera preset
 */
export class PresetPlaybackControl implements Command<number> {
	/**
	 * @param presetNumber The preset to be recalled. 0-99
	 */
	constructor(private presetNumber: number) {
		validatePresetNumber(presetNumber)
	}

	serialize(): string {
		return sprintf('#R%02i', this.presetNumber)
	}

	deserializeResponse(response: string): number {
		if (response.startsWith('s')) {
			return parseInt(response.slice(1), 10)
		}
		throw new InvalidResponseError(response)
	}
}

/**
 * Reset camera preset
 */
export class PresetDeleteControl implements Command<number> {
	/**
	 * @param presetNumber The preset to be reset. 0-99
	 */
	constructor(private presetNumber: number) {
		validatePresetNumber(presetNumber)
	}

	serialize(): string {
		return sprintf('#C%02i', this.presetNumber)
	}

	deserializeResponse(response: string): number {
		if (response.startsWith('s')) {
			return parseInt(response.slice(1), 10)
		}
		throw new InvalidResponseError(response)
	}
}

function validatePresetNumber(preset: number) {
	if (!_.isFinite(preset)) throw new Error('Camera preset is not a finite number')
	if (preset < 0 || preset > 99) throw new Error('Illegal preset number')
}

/**
 * Get the last preset recalled in the camera
 */
export class PresetNumberQuery implements Command<number> {
	serialize(): string {
		return '#S'
	}

	deserializeResponse(response: string): number {
		if (response.startsWith('s')) {
			return parseInt(response.slice(1), 10)
		}
		throw new InvalidResponseError(response)
	}
}

/**
 * Set camera preset recall speed, within speed table
 */
export class PresetSpeedControl implements Command<number> {
	/**
	 * @param speed Speed to be set for the camera preset recall. 250-999 or 0. 0 is maximum speed
	 */
	constructor(private speed: number) {
		if (!_.isFinite(speed)) throw new Error('Camera speed preset is not a finite number')
		if ((speed < 250 || speed > 999) && speed !== 0)
			throw new Error('Camera speed must be between 250 and 999 or needs to be 0')
	}

	serialize(): string {
		return sprintf('#UPVS%03i', this.speed)
	}

	deserializeResponse(response: string): number {
		if (response.startsWith('uPVS')) {
			return parseInt(response.slice(4), 10)
		}
		throw new InvalidResponseError(response)
	}
}

/**
 * Get camera preset recall speed, within speed table
 */
export class PresetSpeedQuery implements Command<number> {
	serialize(): string {
		return '#UPVS'
	}

	deserializeResponse(response: string): number {
		if (response.startsWith('uPVS')) {
			return parseInt(response.slice(4), 10)
		}
		throw new InvalidResponseError(response)
	}
}

interface PanTiltSpeed {
	panSpeed: number
	tiltSpeed: number
}

/**
 * Set camera pan and tilt speed (essentially, current virtual joystick position)
 */
export class PanTiltSpeedControl implements Command<PanTiltSpeed> {
	/**
	 * @param panSpeed Acceptable values are 1-99. 50 is pan stop, 49 is slowest LEFT, 51 is slowest RIGHT, 1 is fastest LEFT, 99 is fastest RIGHT
	 * @param tiltSpeed Acceptable values are 1-99. 50 is tilt stop, 49 is slowest DOWN, 51 is slowest UP, 1 is fastest DOWN, 99 is fastest UP
	 */
	constructor(private panSpeed: number, private tiltSpeed: number) {
		if (!_.isFinite(panSpeed)) throw new Error('Camera pan speed is not a finite number')
		if (panSpeed < 1 || panSpeed > 99) throw new Error('Camera pan speed must be between 1 and 99')
		if (!_.isFinite(tiltSpeed)) throw new Error('Camera tilt speed is not a finite number')
		if (tiltSpeed < 1 || tiltSpeed > 99) throw new Error('Camera tilt speed must be between 1 and 99')
	}

	serialize(): string {
		return sprintf('#PTS%02i%02i', this.panSpeed, this.tiltSpeed)
	}

	deserializeResponse(response: string): PanTiltSpeed {
		if (response.startsWith('pTS')) {
			return { panSpeed: parseInt(response.slice(3, 5), 10), tiltSpeed: parseInt(response.slice(5), 10) }
		}
		throw new InvalidResponseError(response)
	}
}

interface PanTiltPosition {
	panPosition: number
	tiltPosition: number
}

/**
 * Set absolute camera pan and tilt position
 */
export class PanTiltPositionControl implements Command<PanTiltPosition> {
	/**
	 * @param panPosition
	 * @param tiltPosition
	 */
	constructor(private panPosition: number, private tiltPosition: number) {
		if (!_.isFinite(panPosition)) throw new Error('Camera pan position is not a finite number')
		if (panPosition < 0 || panPosition > 0xffff) throw new Error('Camera pan position must be between 0 and 65535')
		if (!_.isFinite(tiltPosition)) throw new Error('Camera tilt speed is not a finite number')
		if (tiltPosition < 0 || tiltPosition > 0xffff) throw new Error('Camera tilt speed must be between 0 and 65535')
	}

	serialize(): string {
		return sprintf('#APC%04x%04x', this.panPosition, this.tiltPosition)
	}

	deserializeResponse(response: string): PanTiltPosition {
		if (response.startsWith('aPC')) {
			return { panPosition: parseInt(response.slice(3, 7), 16), tiltPosition: parseInt(response.slice(7), 16) }
		}
		throw new InvalidResponseError(response)
	}
}

/**
 * Get absolute camera pan and tilt position
 */
export class PanTiltPositionQuery implements Command<PanTiltPosition> {
	serialize(): string {
		return '#APC'
	}

	deserializeResponse(response: string): PanTiltPosition {
		if (response.startsWith('aPC')) {
			return { panPosition: parseInt(response.slice(3, 7), 16), tiltPosition: parseInt(response.slice(7), 16) }
		}
		throw new InvalidResponseError(response)
	}
}

/**
 * Set camera lens zoom speed (essentially, current virtual zoom rocker position)
 */
export class ZoomSpeedControl implements Command<number> {
	/**
	 * @param speed Speed to be set for the camera zoom. Acceptable values are 1-99. 50 is zoom stop, 49 is slowest WIDE, 51 is slowest TELE, 1 is fastest WIDE, 99 is fastest TELE
	 */
	constructor(private speed: number) {
		if (!_.isFinite(speed)) throw new Error('Camera zoom speed is not a finite number')
		if (speed < 1 || speed > 99) throw new Error('Camera zoom speed must be between 1 and 99')
	}

	serialize(): string {
		return sprintf('#Z%02i', this.speed)
	}

	deserializeResponse(response: string): number {
		if (response.startsWith('zS')) {
			return parseInt(response.slice(2), 10)
		}
		throw new InvalidResponseError(response)
	}
}

/**
 * Get camera lens zoom speed (essentially, current virtual zoom rocker position)
 */
export class ZoomSpeedQuery implements Command<number> {
	serialize(): string {
		return '#Z'
	}

	deserializeResponse(response: string): number {
		if (response.startsWith('zS')) {
			return parseInt(response.slice(2), 10)
		}
		throw new InvalidResponseError(response)
	}
}

/**
 * Set camera lens zoom (an absolute number)
 */
export class ZoomPositionControl implements Command<number> {
	/**
	 * @param position Absolute zoom position to be set. Range: 0x555 (WIDE) - 0xfff (TELE)
	 */
	constructor(private position: number) {
		if (!_.isFinite(position)) throw new Error('Camera zoom position is not a finite number')
		if (position < 0x555 || position > 0xfff) throw new Error('Camera zoom position must be between 1365 and 4095')
	}

	serialize(): string {
		return sprintf('#AXZ%03X', this.position)
	}

	deserializeResponse(response: string): number {
		if (response.startsWith('axz')) {
			return parseInt(response.slice(3), 16)
		}
		throw new InvalidResponseError(response)
	}
}

/**
 * Get camera lens zoom (an absolute number)
 */
export class ZoomPositionQuery implements Command<number> {
	serialize(): string {
		return '#GZ'
	}

	deserializeResponse(response: string): number {
		if (response.startsWith('gz')) {
			return parseInt(response.slice(2), 16)
		}
		throw new InvalidResponseError(response)
	}
}

/**
 * Set camera focus speed
 */
export class FocusSpeedControl implements Command<number> {
	/**
	 * @param speed Speed to be set for the camera focus. Acceptable values are 1-99. 50 is focus stop, 49 is slowest NEAR, 51 is slowest FAR, 1 is fastest NEAR, 99 is fastest FAR
	 */
	constructor(private speed: number) {
		if (!_.isFinite(speed)) throw new Error('Camera focus speed is not a finite number')
		if (speed < 1 || speed > 99) throw new Error('Camera focus speed must be between 1 and 99')
	}

	serialize(): string {
		return sprintf('#F%02i', this.speed)
	}

	deserializeResponse(response: string): number {
		if (response.startsWith('fS')) {
			return parseInt(response.slice(2), 10)
		}
		throw new InvalidResponseError(response)
	}
}

/**
 * Set camera focus mode (AUTO/MANUAL)
 */
export class AutoFocusOnOffControl implements Command<PanasonicFocusMode> {
	/**
	 * @param mode Mode to be set for the camera focus
	 */
	constructor(private mode: PanasonicFocusMode) {}

	serialize(): string {
		return sprintf('#D1%d', this.mode)
	}

	deserializeResponse(response: string): PanasonicFocusMode {
		if (response.startsWith('d1')) {
			return response.slice(2) === '1' ? PanasonicFocusMode.AUTO : PanasonicFocusMode.MANUAL
		}
		throw new InvalidResponseError(response)
	}
}

/**
 * Get camera focus mode (AUTO/MANUAL)
 */
export class AutoFocusOnOffQuery implements Command<PanasonicFocusMode> {
	serialize(): string {
		return sprintf('#D1')
	}

	deserializeResponse(response: string): PanasonicFocusMode {
		if (response.startsWith('d1')) {
			return response.slice(2) === '1' ? PanasonicFocusMode.AUTO : PanasonicFocusMode.MANUAL
		}
		throw new InvalidResponseError(response)
	}
}

/**
 * Trigger one-touch focus
 */
export class OneTouchFocusControl implements Command<void> {
	serialize(): string {
		return 'OSE:69:1'
	}

	deserializeResponse(response: string): void {
		if (response === 'OSE:69:1') {
			return
		}
		throw new InvalidResponseError(response)
	}
}

/**
 * Set camera focus distance (an absolute number)
 */
export class FocusPositionControl implements Command<number> {
	/**
	 * @param position Absolute focus position to be set. Range: 0x555 (NEAR) - 0xfff (FAR)
	 */
	constructor(private position: number) {
		if (!_.isFinite(position)) throw new Error('Camera focus position is not a finite number')
		if (position < 0x555 || position > 0xfff) throw new Error('Camera focus position must be between 1365 and 4095')
	}

	serialize(): string {
		return sprintf('#AXF%03x', this.position)
	}

	deserializeResponse(response: string): number {
		if (response.startsWith('axf')) {
			return parseInt(response.slice(3), 16)
		}
		throw new InvalidResponseError(response)
	}
}

/**
 * Get camera focus distance (an absolute number)
 */
export class FocusPositionQuery implements Command<number> {
	serialize(): string {
		return '#GF'
	}

	deserializeResponse(response: string): number {
		if (response.startsWith('gf')) {
			return parseInt(response.slice(2), 16)
		}
		throw new InvalidResponseError(response)
	}
}
