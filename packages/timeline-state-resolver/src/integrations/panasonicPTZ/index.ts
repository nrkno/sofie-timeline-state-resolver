import {
	ActionExecutionResult,
	DeviceStatus,
	Mappings,
	PanasonicPTZOptions,
	StatusCode,
	TSRTimelineContent,
	Timeline,
	TimelineContentTypePanasonicPtz,
} from 'timeline-state-resolver-types'
import { Device } from '../../service/device'
import { PanasonicPtzState, convertStateToPtz, getDefaultState } from './state'
import { PanasonicPtzCommandWithContext, diffStates } from './diff'
import { PanasonicPtzHttpInterface } from './connection'

export class PanasonicPtzDevice extends Device<PanasonicPTZOptions, PanasonicPtzState, PanasonicPtzCommandWithContext> {
	_device: PanasonicPtzHttpInterface

	async init(options: PanasonicPTZOptions): Promise<boolean> {
		this._device = new PanasonicPtzHttpInterface(options.host, options.port, options.https)
		this._device.init()
		this._device.on('error', (e) => this.context.logger.error('Error in PanasonicPtzHttpInterface', e))

		return true
	}

	async terminate(): Promise<void> {
		this._device.dispose()
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
				if (cmd.type === TimelineContentTypePanasonicPtz.PRESET) {
					// recall preset
					if (cmd.preset !== undefined) {
						const res = await this._device.recallPreset(cmd.preset)
						this.context.logger.debug(`Panasonic PTZ result: ${res}`)
					} else throw new Error(`Bad parameter: preset`)
				} else if (cmd.type === TimelineContentTypePanasonicPtz.SPEED) {
					// set speed
					if (cmd.speed !== undefined) {
						const res = await this._device.setSpeed(cmd.speed)
						this.context.logger.debug(`Panasonic PTZ result: ${res}`)
					} else throw new Error(`Bad parameter: speed`)
				} else if (cmd.type === TimelineContentTypePanasonicPtz.ZOOM_SPEED) {
					// set zoom speed
					if (cmd.zoomSpeed !== undefined) {
						// scale -1 - 0 - +1 range to 01 - 50 - 99 range
						const res = await this._device.setZoomSpeed(cmd.zoomSpeed * 49 + 50)
						this.context.logger.debug(`Panasonic PTZ result: ${res}`)
					} else throw new Error(`Bad parameter: zoomSpeed`)
				} else if (cmd.type === TimelineContentTypePanasonicPtz.ZOOM) {
					// set zoom
					if (cmd.zoom !== undefined) {
						// scale 0 - +1 range to 555h - FFFh range
						const res = await this._device.setZoom(cmd.zoom * 0xaaa + 0x555)
						this.context.logger.debug(`Panasonic PTZ result: ${res}`)
					} else throw new Error(`Bad parameter: zoom`)
				} else throw new Error(`PTZ: Unknown type: "${cmd.type}"`)
			} else throw new Error(`PTZ device not set up`)
		} catch (e) {
			this.context.commandError(e as Error, command)
		}
	}

	get connected() {
		return this._device.connected
	}
	getStatus(): Omit<DeviceStatus, 'active'> {
		if (!this._device.connected) {
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

	actions: Record<
		string,
		(id: string, payload?: Record<string, any> | undefined) => Promise<ActionExecutionResult<undefined>>
	> = {}
}
