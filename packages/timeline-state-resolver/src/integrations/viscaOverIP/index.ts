import { CommandWithContext, Device } from '../../service/device'
import {
	ActionExecutionResult,
	ActionExecutionResultCode,
	DeviceStatus,
	StatusCode,
	TSRTimelineContent,
	Timeline,
	ViscaOverIPActionMethods,
	ViscaOverIPActions,
	ViscaOverIPDeviceTypes,
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
import { ViscaValueConverter } from './connection/lib/ViscaValueConverter'

export type ViscaDeviceState = Timeline.TimelineState<TSRTimelineContent>

export interface ViscaDeviceCommand extends CommandWithContext {
	command: {}
}

export class ViscaOverIpDevice extends Device<ViscaOverIPDeviceTypes, ViscaDeviceState, ViscaDeviceCommand> {
	protected _terminated = false

	protected connection: ViscaDevice | undefined

	protected converter = new ViscaValueConverter()

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

	readonly actions: ViscaOverIPActionMethods = {
		[ViscaOverIPActions.RecallPreset]: async (payload) => {
			const presetCommand = new PresetCommand(ConnectionEnums.PresetOperation.Recall, payload.presetNumber)
			return this.safelySendActionCommand(presetCommand)
		},
		[ViscaOverIPActions.StorePreset]: async (payload) => {
			const presetCommand = new PresetCommand(ConnectionEnums.PresetOperation.Set, payload.presetNumber)
			return this.safelySendActionCommand(presetCommand)
		},
		[ViscaOverIPActions.ResetPreset]: async (payload) => {
			const presetCommand = new PresetCommand(ConnectionEnums.PresetOperation.Reset, payload.presetNumber)
			return this.safelySendActionCommand(presetCommand)
		},
		[ViscaOverIPActions.SetPanTiltSpeed]: async (payload) => {
			const panTiltCommand = new PanTiltDriveCommand(
				this.converter.mapPanTiltSpeedToViscaDirection(payload.panSpeed, payload.tiltSpeed),
				this.converter.mapPanTiltSpeedToVisca(payload.panSpeed),
				this.converter.mapPanTiltSpeedToVisca(payload.tiltSpeed)
			)
			return this.safelySendActionCommand(panTiltCommand)
		},
		[ViscaOverIPActions.GetPanTiltPosition]: async () =>
			this.safelyExecuteCommand(async () =>
				this.converter.mapPanTiltPositionFromVisca(
					await this.connection!.sendCommand(new PanTiltPositionInquiryCommand())
				)
			),
		[ViscaOverIPActions.SetZoomSpeed]: async (payload) => {
			const zoomCommand = new ZoomCommand(
				this.converter.mapZoomSpeedToViscaDirection(payload.zoomSpeed),
				this.converter.mapZoomSpeedToVisca(payload.zoomSpeed)
			)
			return this.safelySendActionCommand(zoomCommand)
		},
		[ViscaOverIPActions.GetZoomPosition]: async () =>
			this.safelyExecuteCommand(async () =>
				this.converter.mapZoomPositionFromVisca(await this.connection!.sendCommand(new ZoomPositionInquiryCommand()))
			),
		[ViscaOverIPActions.SetFocusSpeed]: async (payload) => {
			const focusCommand = new FocusCommand(
				this.converter.mapFocusSpeedToViscaDirection(payload.focusSpeed),
				this.converter.mapFocusSpeedToVisca(payload.focusSpeed)
			)
			return this.safelySendActionCommand(focusCommand)
		},
		[ViscaOverIPActions.SetFocusMode]: async (payload) => {
			const focusCommand = new FocusModeCommand(this.converter.mapFocusModeToVisca(payload.mode))
			return this.safelySendActionCommand(focusCommand)
		},
		[ViscaOverIPActions.TriggerOnePushFocus]: async () => {
			const focusCommand = new FocusOnePushTriggerCommand()
			return this.safelySendActionCommand(focusCommand)
		},
		[ViscaOverIPActions.GetFocusPosition]: async () =>
			this.safelyExecuteCommand(async () =>
				this.converter.mapFocusPositionFromVisca(await this.connection!.sendCommand(new FocusPositionInquiryCommand()))
			),
		[ViscaOverIPActions.GetFocusMode]: async () =>
			this.safelyExecuteCommand(async () =>
				this.converter.mapFocusModeFromVisca(await this.connection!.sendCommand(new FocusModeInquiryCommand()))
			),
	}

	private async safelyExecuteCommand<TRes>(fun: () => Promise<TRes>): Promise<ActionExecutionResult<TRes>> {
		try {
			const resultData = await fun()
			return {
				result: ActionExecutionResultCode.Ok,
				resultData,
			}
		} catch {
			return {
				result: ActionExecutionResultCode.Error,
			}
		}
	}

	private async safelySendActionCommand(command: ViscaCommand | ViscaInquiryCommand): Promise<ActionExecutionResult> {
		let resultData: any = undefined
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
