import {
	FocusMode,
	GetFocusModeResult,
	GetFocusPositionResult,
	GetPanTiltPositionResult,
	GetZoomPositionResult,
} from 'timeline-state-resolver-types'
import * as ConnectionEnums from '../enums'
import { PanTiltPosition } from '../commands/inquiry'

export class ViscaValueConverter {
	// -- to --

	public mapPanTiltSpeedToVisca(panTiltSpeed: number): number {
		return Math.round(Math.abs(panTiltSpeed) * 24)
	}

	public mapPanTiltSpeedToViscaDirection(panSpeed: number, tiltSpeed: number): ConnectionEnums.PanTiltDirection {
		let horizontalDirection: 'left' | 'right' | undefined
		let verticalDirection: 'up' | 'down' | undefined

		if (panSpeed < 0) {
			horizontalDirection = 'left'
		} else if (panSpeed > 0) {
			horizontalDirection = 'right'
		}

		if (tiltSpeed < 0) {
			verticalDirection = 'down'
		} else if (tiltSpeed > 0) {
			verticalDirection = 'up'
		}

		switch (horizontalDirection) {
			case 'left':
				switch (verticalDirection) {
					case 'up':
						return ConnectionEnums.PanTiltDirection.UpLeft
					case 'down':
						return ConnectionEnums.PanTiltDirection.DownLeft
					default:
						return ConnectionEnums.PanTiltDirection.Left
				}
			case 'right':
				switch (verticalDirection) {
					case 'up':
						return ConnectionEnums.PanTiltDirection.UpRight
					case 'down':
						return ConnectionEnums.PanTiltDirection.DownRight
					default:
						return ConnectionEnums.PanTiltDirection.Right
				}
			default:
				switch (verticalDirection) {
					case 'up':
						return ConnectionEnums.PanTiltDirection.Up
					case 'down':
						return ConnectionEnums.PanTiltDirection.Down
					default:
						return ConnectionEnums.PanTiltDirection.Stop
				}
		}
	}

	public mapZoomSpeedToVisca(zoomSpeed: number): number {
		return Math.round(Math.abs(zoomSpeed) * 7)
	}

	public mapZoomSpeedToViscaDirection(zoomSpeed: number): ConnectionEnums.ZoomDirection {
		if (zoomSpeed > 0) return ConnectionEnums.ZoomDirection.TeleVariable
		if (zoomSpeed < 0) return ConnectionEnums.ZoomDirection.WideVariable
		return ConnectionEnums.ZoomDirection.Stop
	}

	public mapFocusSpeedToVisca(focusSpeed: number): number {
		return Math.round(Math.abs(focusSpeed) * 7)
	}

	public mapFocusModeToVisca(focusMode: FocusMode): ConnectionEnums.FocusMode {
		if (focusMode === FocusMode.AUTO) return ConnectionEnums.FocusMode.Auto
		return ConnectionEnums.FocusMode.Manual
	}

	// -- from --

	public mapFocusSpeedToViscaDirection(focusSpeed: number): ConnectionEnums.FocusDirection {
		if (focusSpeed > 0) return ConnectionEnums.FocusDirection.FarVariable
		if (focusSpeed < 0) return ConnectionEnums.FocusDirection.NearVariable
		return ConnectionEnums.FocusDirection.Stop
	}

	public mapFocusPositionFromVisca(focusPosition: number): GetFocusPositionResult {
		return {
			focusPosition: focusPosition / 0xffff,
		}
	}

	public mapZoomPositionFromVisca(zoomPosition: number): GetZoomPositionResult {
		return {
			zoomPosition: zoomPosition / 0x6000,
		}
	}

	public mapPanTiltPositionFromVisca(position: PanTiltPosition): GetPanTiltPositionResult {
		return {
			panPosition: position.panPosition / 0x14bbc,
			tiltPosition: position.tiltPosition / 0x14bbc,
		}
	}

	public mapFocusModeFromVisca(focusMode: ConnectionEnums.FocusMode): GetFocusModeResult {
		return {
			mode: focusMode === ConnectionEnums.FocusMode.Auto ? FocusMode.AUTO : FocusMode.MANUAL,
		}
	}
}
