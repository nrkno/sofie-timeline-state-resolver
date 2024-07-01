import { CommandWithContext, Device } from '../../service/device'
import {
	ActionExecutionResult,
	ActionExecutionResultCode,
	DeviceStatus,
	FocusDirection,
	FocusMode,
	PanTiltDirection,
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
	ViscaOverIPActions,
	ViscaOverIPOptions,
	ZoomDirection,
} from 'timeline-state-resolver-types'

import * as ConnectionEnums from './connection/enums'
import { ViscaCommand, ViscaDevice } from './connection'
import { PanTiltDriveCommand, PresetCommand, ZoomCommand } from './connection/commands/visca'
import { FocusCommand } from './connection/commands/visca/focusCommand'
import { FocusModeCommand } from './connection/commands/visca/focusModeCommand'
import { FocusOnePushTriggerCommand } from './connection/commands/visca/focusOnePushTriggerCommand'

export type ViscaDeviceState = Timeline.TimelineState<TSRTimelineContent>

export interface ViscaDeviceCommand extends CommandWithContext {
	command: {}
}

const PAN_TILT_DIRECTION_MAP = {
	[PanTiltDirection.UP]: ConnectionEnums.PanTiltDirection.Up,
	[PanTiltDirection.UP_RIGHT]: ConnectionEnums.PanTiltDirection.UpRight,
	[PanTiltDirection.RIGHT]: ConnectionEnums.PanTiltDirection.Right,
	[PanTiltDirection.DOWN_RIGHT]: ConnectionEnums.PanTiltDirection.DownRight,
	[PanTiltDirection.DOWN]: ConnectionEnums.PanTiltDirection.Down,
	[PanTiltDirection.DOWN_LEFT]: ConnectionEnums.PanTiltDirection.DownLeft,
	[PanTiltDirection.LEFT]: ConnectionEnums.PanTiltDirection.Left,
	[PanTiltDirection.UP_LEFT]: ConnectionEnums.PanTiltDirection.UpLeft,
}

const ZOOM_DIRECTION_MAP = {
	[ZoomDirection.WIDE]: ConnectionEnums.ZoomDirection.WideVariable,
	[ZoomDirection.TELE]: ConnectionEnums.ZoomDirection.TeleVariable,
}

const FOCUS_DIRECTION_MAP = {
	[FocusDirection.NEAR]: ConnectionEnums.FocusDirection.NearVariable,
	[FocusDirection.FAR]: ConnectionEnums.FocusDirection.FarVariable,
}

const FOCUS_MODE_MAP = {
	[FocusMode.AUTO]: ConnectionEnums.FocusMode.Auto,
	[FocusMode.MANUAL]: ConnectionEnums.FocusMode.Manual,
}

export class ViscaOverIpDevice extends Device<ViscaOverIPOptions, ViscaDeviceState, ViscaDeviceCommand> {
	protected _terminated = false

	protected connection: ViscaDevice | undefined

	async init(options: ViscaOverIPOptions): Promise<boolean> {
		this.connection = new ViscaDevice(options.host, options.port, true, (...args) =>
			this.context.logger.debug(JSON.stringify(args))
		)
		this.connection.connect()
		return true
	}
	async terminate(): Promise<void> {
		this._terminated = true
		this.connection?.disconnect()
	}

	get connected(): boolean {
		return false
	}
	getStatus(): Omit<DeviceStatus, 'active'> {
		return {
			statusCode: StatusCode.GOOD,
			messages: [],
		}
	}

	actions: { [id in ViscaOverIPActions]: (id: string, payload?: any) => Promise<ActionExecutionResult> } = {
		[ViscaOverIPActions.RecallPreset]: async (_id: string, payload: RecallPresetPayload) => {
			const presetCommand = new PresetCommand()
			presetCommand.operation = ConnectionEnums.PresetOperation.Recall
			presetCommand.memoryNumber = payload.presetNumber
			return this.safelySendActionCommand(presetCommand)
		},
		[ViscaOverIPActions.StorePreset]: async (_id: string, payload: StorePresetPayload) => {
			const presetCommand = new PresetCommand()
			presetCommand.operation = ConnectionEnums.PresetOperation.Set
			presetCommand.memoryNumber = payload.presetNumber
			return this.safelySendActionCommand(presetCommand)
		},
		[ViscaOverIPActions.ResetPreset]: async (_id: string, payload: ResetPresetPayload) => {
			const presetCommand = new PresetCommand()
			presetCommand.operation = ConnectionEnums.PresetOperation.Reset
			presetCommand.memoryNumber = payload.presetNumber
			return this.safelySendActionCommand(presetCommand)
		},
		[ViscaOverIPActions.StartPanTilt]: async (_id: string, payload: StartPanTiltPayload) => {
			const panTiltCommand = new PanTiltDriveCommand()
			panTiltCommand.direction = PAN_TILT_DIRECTION_MAP[payload.direction]
			panTiltCommand.panSpeed = this.mapPanTiltSpeedToVisca(payload.panSpeed)
			panTiltCommand.tiltSpeed = this.mapPanTiltSpeedToVisca(payload.tiltSpeed)
			return this.safelySendActionCommand(panTiltCommand)
		},
		[ViscaOverIPActions.StopPanTilt]: async () => {
			const panTiltCommand = new PanTiltDriveCommand()
			panTiltCommand.direction = ConnectionEnums.PanTiltDirection.Stop
			panTiltCommand.panSpeed = 0
			panTiltCommand.tiltSpeed = 0
			return this.safelySendActionCommand(panTiltCommand)
		},
		[ViscaOverIPActions.StartZoom]: async (_id: string, payload: StartZoomPayload) => {
			const zoomCommand = new ZoomCommand()
			zoomCommand.direction = ZOOM_DIRECTION_MAP[payload.direction]
			zoomCommand.speed = this.mapZoomSpeedToVisca(payload.zoomSpeed)
			return this.safelySendActionCommand(zoomCommand)
		},
		[ViscaOverIPActions.StopZoom]: async () => {
			const zoomCommand = new ZoomCommand()
			zoomCommand.direction = ConnectionEnums.ZoomDirection.Stop
			zoomCommand.speed = 0
			return this.safelySendActionCommand(zoomCommand)
		},
		[ViscaOverIPActions.StartFocus]: async (_id: string, payload: StartFocusPayload) => {
			const focusCommand = new FocusCommand()
			focusCommand.direction = FOCUS_DIRECTION_MAP[payload.direction]
			focusCommand.speed = this.mapFocusSpeedToVisca(payload.focusSpeed)
			return this.safelySendActionCommand(focusCommand)
		},
		[ViscaOverIPActions.StopFocus]: async (_id: string) => {
			const focusCommand = new FocusCommand()
			focusCommand.direction = ConnectionEnums.FocusDirection.Stop
			focusCommand.speed = 0
			return this.safelySendActionCommand(focusCommand)
		},
		[ViscaOverIPActions.SetFocusMode]: async (_id: string, payload: SetFocusModePayload) => {
			const focusCommand = new FocusModeCommand()
			focusCommand.mode = FOCUS_MODE_MAP[payload.mode]
			return this.safelySendActionCommand(focusCommand)
		},
		[ViscaOverIPActions.TriggerOnePushFocus]: async (_id: string) => {
			const focusCommand = new FocusOnePushTriggerCommand()
			return this.safelySendActionCommand(focusCommand)
		},
	}

	private async safelySendActionCommand(command: ViscaCommand): Promise<ActionExecutionResult> {
		try {
			await this.connection.sendCommand(command)
		} catch {
			return {
				result: ActionExecutionResultCode.Error,
			}
		}

		return {
			result: ActionExecutionResultCode.Ok,
		}
	}

	private mapPanTiltSpeedToVisca(speed: number) {
		return Math.round((speed / 100.0) * 24)
	}

	private mapZoomSpeedToVisca(speed: number) {
		return Math.round((speed / 100.0) * 7)
	}

	private mapFocusSpeedToVisca(speed: number) {
		return Math.round((speed / 100.0) * 7)
	}

	convertTimelineStateToDeviceState(state: Timeline.TimelineState<TSRTimelineContent>): ViscaDeviceState {
		return state
	}
	diffStates(_oldState: ViscaDeviceState | undefined, _newState: ViscaDeviceState): Array<ViscaDeviceCommand> {
		const commands: Array<ViscaDeviceCommand> = []

		return commands
	}
	async sendCommand(): Promise<void> {
		return Promise.resolve()
	}
}
