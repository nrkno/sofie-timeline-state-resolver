import { CommandWithContext, Device } from '../../service/device'
import {
	ActionExecutionResult,
	ActionExecutionResultCode,
	DeviceStatus,
	FocusMode,
	RecallPresetPayload,
	ResetPresetPayload,
	SetFocusModePayload,
	SetFocusSpeedPayload,
	SetPanTiltSpeedPayload,
	SetZoomSpeedPayload,
	StatusCode,
	StorePresetPayload,
	TSRTimelineContent,
	Timeline,
	ViscaOverIPActions,
	ViscaOverIPOptions,
} from 'timeline-state-resolver-types'

import * as ConnectionEnums from './connection/enums'
import { ViscaCommand, ViscaDevice, ViscaInquiryCommand } from './connection'
import { PanTiltDriveCommand, PresetCommand, ZoomCommand } from './connection/commands/visca'
import { FocusCommand } from './connection/commands/visca/focusCommand'
import { FocusModeCommand } from './connection/commands/visca/focusModeCommand'
import { FocusOnePushTriggerCommand } from './connection/commands/visca/focusOnePushTriggerCommand'
import {
	FocusModeInquiryCommand,
	FocusPositionInquiryCommand,
	PanTiltPositionInquiryCommand,
	ZoomPositionInquiryCommand,
} from './connection/commands/inquiry'

export type ViscaDeviceState = Timeline.TimelineState<TSRTimelineContent>

export interface ViscaDeviceCommand extends CommandWithContext {
	command: {}
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
			const presetCommand = new PresetCommand(ConnectionEnums.PresetOperation.Recall, payload.presetNumber)
			return this.safelySendActionCommand(presetCommand)
		},
		[ViscaOverIPActions.StorePreset]: async (_id: string, payload: StorePresetPayload) => {
			const presetCommand = new PresetCommand(ConnectionEnums.PresetOperation.Set, payload.presetNumber)
			return this.safelySendActionCommand(presetCommand)
		},
		[ViscaOverIPActions.ResetPreset]: async (_id: string, payload: ResetPresetPayload) => {
			const presetCommand = new PresetCommand(ConnectionEnums.PresetOperation.Reset, payload.presetNumber)
			return this.safelySendActionCommand(presetCommand)
		},
		[ViscaOverIPActions.SetPanTiltSpeed]: async (_id: string, payload: SetPanTiltSpeedPayload) => {
			const panTiltCommand = new PanTiltDriveCommand(
				this.mapPanTiltSpeedToViscaDirection(payload.panSpeed, payload.tiltSpeed),
				this.mapPanTiltSpeedToVisca(payload.panSpeed),
				this.mapPanTiltSpeedToVisca(payload.tiltSpeed)
			)
			return this.safelySendActionCommand(panTiltCommand)
		},
		[ViscaOverIPActions.GetPanTiltPosition]: async (_id: string) => {
			const panTiltInquiryCommand = new PanTiltPositionInquiryCommand()
			return this.safelySendActionCommand(panTiltInquiryCommand)
		},
		[ViscaOverIPActions.SetZoomSpeed]: async (_id: string, payload: SetZoomSpeedPayload) => {
			const zoomCommand = new ZoomCommand(
				this.mapZoomSpeedToViscaDirection(payload.zoomSpeed),
				this.mapZoomSpeedToVisca(payload.zoomSpeed)
			)
			return this.safelySendActionCommand(zoomCommand)
		},
		[ViscaOverIPActions.GetZoomPosition]: async (_id: string) => {
			const zoomInquiryCommand = new ZoomPositionInquiryCommand()
			return this.safelySendActionCommand(zoomInquiryCommand)
		},
		[ViscaOverIPActions.SetFocusSpeed]: async (_id: string, payload: SetFocusSpeedPayload) => {
			const focusCommand = new FocusCommand(
				this.mapFocusSpeedToViscaDirection(payload.focusSpeed),
				this.mapFocusSpeedToVisca(payload.focusSpeed)
			)
			return this.safelySendActionCommand(focusCommand)
		},
		[ViscaOverIPActions.SetFocusMode]: async (_id: string, payload: SetFocusModePayload) => {
			const focusCommand = new FocusModeCommand(FOCUS_MODE_MAP[payload.mode])
			return this.safelySendActionCommand(focusCommand)
		},
		[ViscaOverIPActions.TriggerOnePushFocus]: async (_id: string) => {
			const focusCommand = new FocusOnePushTriggerCommand()
			return this.safelySendActionCommand(focusCommand)
		},
		[ViscaOverIPActions.GetFocusPosition]: async (_id: string) => {
			const focusInquiryCommand = new FocusPositionInquiryCommand()
			return this.safelySendActionCommand(focusInquiryCommand)
		},
		[ViscaOverIPActions.GetFocusMode]: async (_id: string) => {
			const focusInquiryCommand = new FocusModeInquiryCommand()
			return this.safelySendActionCommand(focusInquiryCommand)
		},
	}

	private async safelySendActionCommand(command: ViscaCommand | ViscaInquiryCommand): Promise<ActionExecutionResult> {
		let resultData = undefined
		try {
			resultData = await this.connection?.sendCommand(command)
		} catch {
			return {
				result: ActionExecutionResultCode.Error,
			}
		}

		return {
			result: ActionExecutionResultCode.Ok,
			resultData,
		}
	}

	private mapPanTiltSpeedToVisca(panTiltSpeed: number) {
		return Math.round(Math.abs(panTiltSpeed) * 24)
	}

	private mapPanTiltSpeedToViscaDirection(panSpeed: number, tiltSpeed: number) {
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

	private mapZoomSpeedToVisca(zoomSpeed: number) {
		return Math.round(Math.abs(zoomSpeed) * 7)
	}

	private mapZoomSpeedToViscaDirection(zoomSpeed: number) {
		if (zoomSpeed > 0) return ConnectionEnums.ZoomDirection.TeleVariable
		if (zoomSpeed < 0) return ConnectionEnums.ZoomDirection.WideVariable
		return ConnectionEnums.ZoomDirection.Stop
	}

	private mapFocusSpeedToVisca(focusSpeed: number) {
		return Math.round(Math.abs(focusSpeed) * 7)
	}

	private mapFocusSpeedToViscaDirection(focusSpeed: number) {
		if (focusSpeed > 0) return ConnectionEnums.FocusDirection.FarVariable
		if (focusSpeed < 0) return ConnectionEnums.FocusDirection.NearVariable
		return ConnectionEnums.FocusDirection.Stop
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
