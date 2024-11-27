import {
	ActionExecutionResult,
	ActionExecutionResultCode,
	DeviceStatus,
	Mappings,
	PanasonicPTZActions,
	PanasonicPTZOptions,
	StatusCode,
	TSRTimelineContent,
	Timeline,
	TimelineContentTypePanasonicPtz,
	RecallPresetPayload,
	StorePresetPayload,
	ResetPresetPayload,
	SetFocusModePayload,
	FocusMode,
	SetPanTiltSpeedPayload,
	SetZoomSpeedPayload,
	SetFocusSpeedPayload,
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
				switch (cmd.type) {
					case TimelineContentTypePanasonicPtz.PRESET:
						// recall preset
						if (cmd.preset !== undefined) {
							result = await this._device.executeCommand(new PresetPlaybackControl(cmd.preset))
						} else throw new Error(`Bad parameter: preset`)
						break
					case TimelineContentTypePanasonicPtz.SPEED:
						// set speed
						if (cmd.speed !== undefined) {
							result = await this._device.executeCommand(new PresetSpeedControl(cmd.speed))
						} else throw new Error(`Bad parameter: speed`)
						break
					case TimelineContentTypePanasonicPtz.ZOOM_SPEED:
						// set zoom speed
						if (cmd.zoomSpeed !== undefined) {
							// scale -1 - 0 - +1 range to 01 - 50 - 99 range
							result = await this._device.executeCommand(new ZoomSpeedControl(cmd.zoomSpeed * 49 + 50))
						} else throw new Error(`Bad parameter: zoomSpeed`)
						break
					case TimelineContentTypePanasonicPtz.ZOOM:
						// set zoom
						if (cmd.zoom !== undefined) {
							// scale 0 - +1 range to 555h - FFFh range
							result = await this._device.executeCommand(new ZoomPositionControl(cmd.zoom * 0xaaa + 0x555))
						} else throw new Error(`Bad parameter: zoom`)
						break
					default:
						throw new Error(`PTZ: Unknown type: "${cmd.type}"`)
				}
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
		[PanasonicPTZActions.SetPanTiltSpeed]: async (_id: string, payload: SetPanTiltSpeedPayload) => {
			const { panSpeed, tiltSpeed } = this.mapPanTiltSpeedToPanasonic(payload.panSpeed, payload.tiltSpeed)
			return this.safelyExecuteActionCommand(() => new PanTiltSpeedControl(panSpeed, tiltSpeed))
		},
		[PanasonicPTZActions.GetPanTiltPosition]: async (_id: string) => {
			return this.safelyExecuteActionCommand(() => new PanTiltPositionQuery())
		},
		[PanasonicPTZActions.SetZoomSpeed]: async (_id: string, payload: SetZoomSpeedPayload) => {
			const speed = this.mapZoomSpeedToPanasonic(payload.zoomSpeed)
			return this.safelyExecuteActionCommand(() => new ZoomSpeedControl(speed))
		},
		[PanasonicPTZActions.GetZoomPosition]: async (_id: string) => {
			return this.safelyExecuteActionCommand(() => new ZoomPositionQuery())
		},
		[PanasonicPTZActions.SetFocusSpeed]: async (_id: string, payload: SetFocusSpeedPayload) => {
			const speed = this.mapFocusSpeedToPanasonic(payload.focusSpeed)
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

	private mapPanTiltSpeedToPanasonic(panSpeed: number, tiltSpeed: number) {
		panSpeed = Math.round(panSpeed * 49 + 50)
		tiltSpeed = Math.round(tiltSpeed * 49 + 50)
		return {
			panSpeed,
			tiltSpeed,
		}
	}

	private mapZoomSpeedToPanasonic(speed: number) {
		return Math.round(speed * 49 + 50)
	}

	private mapFocusSpeedToPanasonic(speed: number) {
		return Math.round(speed * 49 + 50)
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
