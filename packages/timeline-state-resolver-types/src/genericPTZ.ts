/*
startPanTilt(panTiltDirection: PanTiltDirection, speed: PanTiltSpeed): void
stopPanTilt(): void // but would be nice to return final position
setPanTiltAbsolutePosition(panTiltPosition: PanTiltAbsolutePosition): void
getPanTiltAbsolutePosition(): PanTiltPosition

startZoom(zoomDirection: ZoomDirection, speed?: number): void
stopZoom(): void // but would be nice to return final position
setZoomPosition(zoomPosition: number): void
getZoomPosition(): number

storePreset(presetNumber: number): void
recallPreset(presetNumber: number): void
resetPreset(presetNumber: number): void

startFocus(focusDirection: FocusDirection, speed?: number): void
stopFocus(): void
setFocusMode(focusMode: FocusMode): void
pushAutoFocus(): void
getFocusMode(): FocusMode
getFocusPosition(): number
*/

export enum PanTiltDirection {
	LEFT = 'left',
	UP_LEFT = 'up_left',
	UP = 'up',
	UP_RIGHT = 'up_right',
	RIGHT = 'right',
	DOWN_RIGHT = 'down_right',
	DOWN = 'down',
	DOWN_LEFT = 'down_left',
}

export interface PanTiltSpeed {
	/**
	 * Pan Speed
	 * Range: [0.0, 100.0]
	 * (each protocol might support a different range, the value will be mapped into the supported range)
	 */
	panSpeed: number
	/**
	 * Tilt Speed
	 * Range: [0.0, 100.0]
	 * (each protocol might support a different range, the value will be mapped into the supported range)
	 */
	tiltSpeed: number
}

export interface PanTiltAbsolutePosition {
	/**
	 * Absolute Pan Position
	 * Range: [-360.0, 360.0]
	 * (each camera may actually support a different range)
	 */
	panPosition: number
	/**
	 * Absolute Tilt Position
	 * Range: [-360.0, 360.0]
	 * (each camera may actually support a different range)
	 */
	tiltPosition: number
}

export enum ZoomDirection {
	TELE = 'tele',
	WIDE = 'wide',
}

export enum FocusDirection {
	NEAR = 'near',
	FAR = 'far',
}
