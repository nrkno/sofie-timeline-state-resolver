import {
	ActionExecutionResult,
	ActionExecutionResultCode,
	DeviceStatus,
	Mappings,
	PanasonicPTZActionMethods,
	PanasonicPTZOptions,
	StatusCode,
	TSRTimelineContent,
	Timeline,
	TimelineContentTypePanasonicPtz,
	FocusMode,
	PanasonicPTZDeviceTypes,
	GetFocusModeResult,
	GetFocusPositionResult,
	GetZoomPositionResult,
	PanasonicPTZActions,
} from 'timeline-state-resolver-types'
import { Device } from '../../service/device'
import { PanasonicPtzState, convertStateToPtz, getDefaultState } from './state'
import { PanasonicPtzCommandWithContext, diffStates } from './diff'
import { PanasonicFocusMode, PanasonicPtzHttpInterface } from './connection'
import {
	AutoFocusOnOffControl,
	AutoFocusOnOffQuery,
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
import { t } from '../../lib'

const FOCUS_MODE_MAP = {
	[FocusMode.AUTO]: PanasonicFocusMode.AUTO,
	[FocusMode.MANUAL]: PanasonicFocusMode.MANUAL,
}

export class PanasonicPtzDevice extends Device<
	PanasonicPTZDeviceTypes,
	PanasonicPtzState,
	PanasonicPtzCommandWithContext
> {
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

	readonly actions: PanasonicPTZActionMethods = {
		[PanasonicPTZActions.RecallPreset]: async (payload) => {
			return this.safelyExecuteActionCommand(async (device) => {
				await device.executeCommand(new PresetPlaybackControl(payload.presetNumber))
			})
		},
		[PanasonicPTZActions.StorePreset]: async (payload) => {
			return this.safelyExecuteActionCommand(async (device) => {
				await device.executeCommand(new PresetRegisterControl(payload.presetNumber))
			})
		},
		[PanasonicPTZActions.ResetPreset]: async (payload) => {
			return this.safelyExecuteActionCommand(async (device) => {
				await device.executeCommand(new PresetDeleteControl(payload.presetNumber))
			})
		},
		[PanasonicPTZActions.SetPanTiltSpeed]: async (payload) => {
			const { panSpeed, tiltSpeed } = this.mapPanTiltSpeedToPanasonic(payload.panSpeed, payload.tiltSpeed)
			return this.safelyExecuteActionCommand(async (device) => {
				await device.executeCommand(new PanTiltSpeedControl(panSpeed, tiltSpeed))
			})
		},
		[PanasonicPTZActions.GetPanTiltPosition]: async () => {
			return this.safelyExecuteActionCommand(async (device) => device.executeCommand(new PanTiltPositionQuery()))
		},
		[PanasonicPTZActions.SetZoomSpeed]: async (payload) => {
			const speed = this.mapZoomSpeedToPanasonic(payload.zoomSpeed)
			return this.safelyExecuteActionCommand(async (device) => {
				await device.executeCommand(new ZoomSpeedControl(speed))
			})
		},
		[PanasonicPTZActions.GetZoomPosition]: async () => {
			return this.safelyExecuteActionCommand(async (device) =>
				device.executeCommand(new ZoomPositionQuery()).then((res): GetZoomPositionResult => ({ zoomPosition: res }))
			)
		},
		[PanasonicPTZActions.SetFocusSpeed]: async (payload) => {
			const speed = this.mapFocusSpeedToPanasonic(payload.focusSpeed)
			return this.safelyExecuteActionCommand(async (device) => {
				await device.executeCommand(new FocusSpeedControl(speed))
			})
		},
		[PanasonicPTZActions.SetFocusMode]: async (payload) => {
			const mode = FOCUS_MODE_MAP[payload.mode]
			return this.safelyExecuteActionCommand(async (device) => {
				await device.executeCommand(new AutoFocusOnOffControl(mode))
			})
		},
		[PanasonicPTZActions.TriggerOnePushFocus]: async () => {
			return this.safelyExecuteActionCommand(async (device) => device.executeCommand(new OneTouchFocusControl()))
		},
		[PanasonicPTZActions.GetFocusPosition]: async () => {
			return this.safelyExecuteActionCommand(async (device) =>
				device.executeCommand(new FocusPositionQuery()).then((res): GetFocusPositionResult => ({ focusPosition: res }))
			)
		},
		[PanasonicPTZActions.GetFocusMode]: async () => {
			return this.safelyExecuteActionCommand(async (device) =>
				device
					.executeCommand(new AutoFocusOnOffQuery())
					.then(
						(res): GetFocusModeResult => ({ mode: res === PanasonicFocusMode.AUTO ? FocusMode.AUTO : FocusMode.MANUAL })
					)
			)
		},
	}

	private async safelyExecuteActionCommand<TRes>(
		commandFunc: (device: PanasonicPtzHttpInterface) => Promise<TRes>
	): Promise<ActionExecutionResult<TRes>> {
		if (!this._device) {
			return {
				result: ActionExecutionResultCode.Error,
				response: t('Device not connected'),
			}
		}
		try {
			const data = await commandFunc(this._device)
			return {
				result: ActionExecutionResultCode.Ok,
				resultData: data,
			}
		} catch {
			return {
				result: ActionExecutionResultCode.Error,
			}
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
}
