import {
	DeviceStatus,
	Mappings,
	ObsOptions,
	ObsDeviceTypes,
	StatusCode,
	TSRTimelineContent,
	Timeline,
} from 'timeline-state-resolver-types'
import { Device } from '../../service/device'
import { OBSDeviceState, convertStateToOBS, getDefaultState } from './state'
import { OBSRequestTypes } from 'obs-websocket-js'
import { diffStates } from './diff'
import { OBSConnection, OBSConnectionEvents } from './connection'

export type OBSCommandWithContext = OBSCommandWithContextTyped<keyof OBSRequestTypes>
export interface OBSCommandWithContextTyped<Type extends keyof OBSRequestTypes> {
	command: {
		requestName: Type
		args?: OBSRequestTypes[Type]
	}
	context: string
	timelineObjId: string
}

export class OBSDevice extends Device<ObsDeviceTypes, OBSDeviceState, OBSCommandWithContext> {
	private _options: ObsOptions | undefined = undefined
	private _obs: OBSConnection | undefined = undefined

	async init(options: ObsOptions): Promise<boolean> {
		this._options = options
		this._obs = new OBSConnection()
		this._obs.on(OBSConnectionEvents.Connected, () => {
			this.context.logger.debug('OBS Connected')
			this.context.connectionChanged(this.getStatus())
			this.context.resetToState(getDefaultState(this.context.getCurrentTime())).catch((e) => {
				this.context.logger.error('OBS: error while resetting state to default', e)
			})
		})
		this._obs.on(OBSConnectionEvents.Disconnected, () => {
			this.context.logger.debug('OBS Disconnected')
			this.context.connectionChanged(this.getStatus())
		})
		this._obs.on(OBSConnectionEvents.Error, (c, e) => this.context.logger.error('OBS: ' + c, e))

		this._obs.connect(this._options.host, this._options.port, this._options.password)

		return true
	}

	async terminate(): Promise<void> {
		this._obs?.disconnect()
	}

	get connected() {
		return this._obs?.connected ?? false
	}

	getStatus(): Omit<DeviceStatus, 'active'> {
		if (this._obs?.connected) {
			return {
				statusCode: StatusCode.GOOD,
				messages: [],
			}
		}

		return {
			statusCode: StatusCode.BAD,
			messages: this._obs?.error ? ['Disconnected', this._obs.error] : ['Disconnected'],
		}
	}

	readonly actions = null

	convertTimelineStateToDeviceState(
		state: Timeline.TimelineState<TSRTimelineContent>,
		newMappings: Mappings
	): OBSDeviceState {
		return convertStateToOBS(state, newMappings)
	}

	diffStates(oldState: OBSDeviceState | undefined, newState: OBSDeviceState): Array<OBSCommandWithContext> {
		return diffStates(oldState ?? getDefaultState(newState.time), newState, (scene, source) =>
			this._obs?.getSceneItemId(scene, source)
		)
	}

	async sendCommand(command: OBSCommandWithContext): Promise<void> {
		if (!this._obs?.connected) return

		this.context.logger.debug(command)

		this._obs?.call(command.command.requestName, command.command.args).catch((e) => {
			this.context.commandError(e, command)
		})
	}
}
