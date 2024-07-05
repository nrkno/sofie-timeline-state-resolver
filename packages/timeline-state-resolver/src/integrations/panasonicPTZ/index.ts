import {
	ActionExecutionResult,
	ActionExecutionResultCode,
	DeviceStatus,
	FocusDirection,
	FocusMode,
	Mappings,
	PanTiltDirection,
	PanasonicPTZActions,
	PanasonicPTZOptions,
	RecallPresetPayload,
	ResetPresetPayload,
	SetFocusModePayload,
	StartFocusPayload,
	StartPanTiltPayload,
	StartZoomPayload,
	StatusCode,
	StorePresetPayload,
	TSRTimelineContent,
	Timeline,
	TimelineContentTypePanasonicPtz,
	ZoomDirection,
} from 'timeline-state-resolver-types'
import { Device } from '../../service/device'
import { PanasonicPtzState, convertStateToPtz, getDefaultState } from './state'
import { PanasonicPtzCommandWithContext, diffStates } from './diff'
import { PanasonicFocusMode, PanasonicPtzHttpInterface } from './connection'
import { t } from '../../lib'
import {
	AutoFocusOnOffControl,
	AutoFocusOnOffQuery,
	Command,
	FocusPositionQuery,
	FocusSpeedControl,
	OneTouchFocusControl,
	PanTiltPositionQuery,
	PanTiltSpeedControl,
	PresetDeleteControl,
	PresetPlaybackControl,
	PresetRegisterControl,
	PresetSpeedControl,
	ZoomPositionControl,
	ZoomPositionQuery,
	ZoomSpeedControl,
} from './commands'

const FOCUS_MODE_MAP = {
	[FocusMode.AUTO]: PanasonicFocusMode.AUTO,
	[FocusMode.MANUAL]: PanasonicFocusMode.MANUAL,
}

export class PanasonicPtzDevice extends Device<PanasonicPTZOptions, PanasonicPtzState, PanasonicPtzCommandWithContext> {
	_device: PanasonicPtzHttpInterface | undefined = undefined

	async init(options: PanasonicPTZOptions): Promise<boolean> {
		this._device = new PanasonicPtzHttpInterface(options.host, options.port, options.https)
		this._device.init()
		this._device.on('error', (e) => this.context.logger.error('Error in PanasonicPtzHttpInterface', e))

		return true
	}

	async terminate(): Promise<void> {
		this._device?.dispose()
	}

	convertTimelineStateToDeviceState(
		state: Timeline.TimelineState<TSRTimelineContent>,
		newMappings: Mappings
	): PanasonicPtzState {
		return convertStateToPtz(state, newMappings)
	}

	diffStates(
		oldState: PanasonicPtzState | undefined,
		newState: PanasonicPtzState
	): Array<PanasonicPtzCommandWithContext> {
		return diffStates(oldState ?? getDefaultState(), newState)
	}
	async sendCommand(command: PanasonicPtzCommandWithContext): Promise<void> {
		this.context.logger.debug(command)

		const cmd = command.command

		try {
			if (this._device) {
				let result: string | number
				if (cmd.type === TimelineContentTypePanasonicPtz.PRESET) {
					// recall preset
					if (cmd.preset !== undefined) {
						result = await this._device.executeCommand(new PresetPlaybackControl(cmd.preset))
					} else throw new Error(`Bad parameter: preset`)
				} else if (cmd.type === TimelineContentTypePanasonicPtz.SPEED) {
					// set speed
					if (cmd.speed !== undefined) {
						result = await this._device.executeCommand(new PresetSpeedControl(cmd.speed))
					} else throw new Error(`Bad parameter: speed`)
				} else if (cmd.type === TimelineContentTypePanasonicPtz.ZOOM_SPEED) {
					// set zoom speed
					if (cmd.zoomSpeed !== undefined) {
						// scale -1 - 0 - +1 range to 01 - 50 - 99 range
						result = await this._device.executeCommand(new ZoomSpeedControl(cmd.zoomSpeed * 49 + 50))
					} else throw new Error(`Bad parameter: zoomSpeed`)
				} else if (cmd.type === TimelineContentTypePanasonicPtz.ZOOM) {
					// set zoom
					if (cmd.zoom !== undefined) {
						// scale 0 - +1 range to 555h - FFFh range
						result = await this._device.executeCommand(new ZoomPositionControl(cmd.zoom * 0xaaa + 0x555))
					} else throw new Error(`Bad parameter: zoom`)
				} else throw new Error(`PTZ: Unknown type: "${cmd.type}"`)
				this.context.logger.debug(`Panasonic PTZ result: ${result}`)
			} else throw new Error(`PTZ device not set up`)
		} catch (e) {
			this.context.commandError(e as Error, command)
		}
	}

	get connected() {
		return this._device?.connected ?? false
	}
	getStatus(): Omit<DeviceStatus, 'active'> {
		if (!this._device?.connected) {
			return {
				statusCode: StatusCode.GOOD,
				messages: [],
			}
		} else {
			return {
				statusCode: StatusCode.BAD,
				messages: ['Not connected'],
			}
		}
	}

	actions: { [id in PanasonicPTZActions]: (id: string, payload?: any) => Promise<ActionExecutionResult> } = {
		[PanasonicPTZActions.RecallPreset]: async (_id: string, payload: RecallPresetPayload) => {
			return this.safelyExecuteActionCommand(() => new PresetPlaybackControl(payload.presetNumber))
		},
		[PanasonicPTZActions.StorePreset]: async (_id: string, payload: StorePresetPayload) => {
			return this.safelyExecuteActionCommand(() => new PresetRegisterControl(payload.presetNumber))
		},
		[PanasonicPTZActions.ResetPreset]: async (_id: string, payload: ResetPresetPayload) => {
			return this.safelyExecuteActionCommand(() => new PresetDeleteControl(payload.presetNumber))
		},
		[PanasonicPTZActions.StartPanTilt]: async (_id: string, payload: StartPanTiltPayload) => {
			const { panSpeed, tiltSpeed } = this.mapPanTiltSpeedToPanasonic(
				payload.panSpeed,
				payload.tiltSpeed,
				payload.direction
			)
			return this.safelyExecuteActionCommand(() => new PanTiltSpeedControl(panSpeed, tiltSpeed))
		},
		[PanasonicPTZActions.StopPanTilt]: async (_id: string) => {
			const { panSpeed, tiltSpeed } = this.mapPanTiltSpeedToPanasonic(0, 0)
			return this.safelyExecuteActionCommand(() => new PanTiltSpeedControl(panSpeed, tiltSpeed))
		},
		[PanasonicPTZActions.GetPanTiltPosition]: async (_id: string) => {
			return this.safelyExecuteActionCommand(() => new PanTiltPositionQuery())
		},
		[PanasonicPTZActions.StartZoom]: async (_id: string, payload: StartZoomPayload) => {
			const speed = this.mapZoomSpeedToPanasonic(payload.zoomSpeed, payload.direction)
			return this.safelyExecuteActionCommand(() => new ZoomSpeedControl(speed))
		},
		[PanasonicPTZActions.StopZoom]: async (_id: string) => {
			const speed = this.mapZoomSpeedToPanasonic(0)
			return this.safelyExecuteActionCommand(() => new ZoomSpeedControl(speed))
		},
		[PanasonicPTZActions.GetZoomPosition]: async (_id: string) => {
			return this.safelyExecuteActionCommand(() => new ZoomPositionQuery())
		},
		[PanasonicPTZActions.StartFocus]: async (_id: string, payload: StartFocusPayload) => {
			const speed = this.mapFocusSpeedToPanasonic(payload.focusSpeed, payload.direction)
			return this.safelyExecuteActionCommand(() => new FocusSpeedControl(speed))
		},
		[PanasonicPTZActions.StopFocus]: async (_id: string) => {
			const speed = this.mapFocusSpeedToPanasonic(0)
			return this.safelyExecuteActionCommand(() => new FocusSpeedControl(speed))
		},
		[PanasonicPTZActions.SetFocusMode]: async (_id: string, payload: SetFocusModePayload) => {
			const mode = FOCUS_MODE_MAP[payload.mode]
			return this.safelyExecuteActionCommand(() => new AutoFocusOnOffControl(mode))
		},
		[PanasonicPTZActions.TriggerOnePushFocus]: async (_id: string) => {
			return this.safelyExecuteActionCommand(() => new OneTouchFocusControl())
		},
		[PanasonicPTZActions.GetFocusPosition]: async (_id: string) => {
			return this.safelyExecuteActionCommand(() => new FocusPositionQuery())
		},
		[PanasonicPTZActions.GetFocusMode]: async (_id: string) => {
			return this.safelyExecuteActionCommand(() => new AutoFocusOnOffQuery())
		},
	}

	private async safelyExecuteActionCommand(createCommandFun: () => Command): Promise<ActionExecutionResult> {
		try {
			const command = createCommandFun()
			await this._device?.executeCommand(command)
		} catch {
			return {
				result: ActionExecutionResultCode.Error,
			}
		}

		return {
			result: ActionExecutionResultCode.Ok,
		}
	}

	private mapPanTiltSpeedToPanasonic(panSpeed: number, tiltSpeed: number, direction?: PanTiltDirection) {
		panSpeed = Math.round((panSpeed / 100.0) * 49)
		tiltSpeed = Math.round((tiltSpeed / 100.0) * 49)
		if (
			direction === PanTiltDirection.DOWN_LEFT ||
			direction === PanTiltDirection.LEFT ||
			direction === PanTiltDirection.UP_LEFT
		) {
			panSpeed *= -1
		}
		panSpeed += 50
		if (
			direction === PanTiltDirection.DOWN ||
			direction === PanTiltDirection.DOWN_LEFT ||
			direction === PanTiltDirection.DOWN_RIGHT
		) {
			tiltSpeed *= -1
		}
		tiltSpeed += 50
		return {
			panSpeed,
			tiltSpeed,
		}
	}

	private mapZoomSpeedToPanasonic(speed: number, direction?: ZoomDirection) {
		speed = Math.round((speed / 100.0) * 49)
		if (direction === ZoomDirection.WIDE) {
			speed *= -1
		}
		speed += 50
		return speed
	}

	private mapFocusSpeedToPanasonic(speed: number, direction?: FocusDirection) {
		speed = Math.round((speed / 100.0) * 49)
		if (direction === FocusDirection.NEAR) {
			speed *= -1
		}
		speed += 50
		return speed
	}

	async executeAction(actionId: PanasonicPTZActions, payload?: Record<string, any>): Promise<ActionExecutionResult> {
		const actionFun = this.actions[actionId]

		if (actionFun) {
			return actionFun(actionId, payload)
		}

		return {
			result: ActionExecutionResultCode.Error,
			response: t('Device does not implement an action handler for this action ID'),
		}
	}
}
