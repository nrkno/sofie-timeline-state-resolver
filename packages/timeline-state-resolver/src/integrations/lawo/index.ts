import {
	DeviceStatus,
	LawoDeviceTypes,
	LawoOptions,
	Mappings,
	SomeMappingLawo,
	StatusCode,
	Timeline,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { Device } from '../../service/device'

import Debug from 'debug'
import { convertTimelineStateToLawoState, LawoState } from './state'
import { LawoCommandWithContext, diffLawoStates, LawoCommandType } from './diff'
import { LawoConnection } from './connection'
const debug = Debug('timeline-state-resolver:lawo')

export class LawoDevice extends Device<LawoDeviceTypes, LawoState, LawoCommandWithContext> {
	private _lawo: LawoConnection | undefined

	async init(options: LawoOptions): Promise<boolean> {
		this._lawo = new LawoConnection(options, this.context.getCurrentTime)
		this._lawo.on('error', (e) => this.context.logger.error('Lawo.LawoConnection', e))
		this._lawo.on('debug', (...debug) => this.context.logger.debug('Lawo.LawoConnection', ...debug))
		this._lawo.on('connected', (firstConnection) => {
			if (firstConnection) {
				// reset state
				this.context
					.resetToState({ faders: [], nodes: [] })
					.catch((e) => this.context.logger.error('Lawo: Error when resetting state', e))
			}
			this.context.connectionChanged(this.getStatus())
		})
		this._lawo.on('disconnected', () => {
			this.context.connectionChanged(this.getStatus())
		})

		return Promise.resolve(true)
	}
	async terminate(): Promise<void> {
		this._lawo?.terminate().catch((e) => this.context.logger.error('Error when terminating', e))
	}

	convertTimelineStateToDeviceState(
		timelineState: Timeline.TimelineState<TSRTimelineContent>,
		mappings: Mappings<SomeMappingLawo>
	): LawoState {
		return convertTimelineStateToLawoState(timelineState, mappings)
	}
	diffStates(oldState: LawoState | undefined, newState: LawoState): Array<LawoCommandWithContext> {
		return diffLawoStates(oldState, newState)
	}
	async sendCommand(cwc: LawoCommandWithContext): Promise<any> {
		const { command } = cwc
		this.context.logger.debug(cwc)
		debug(command)

		try {
			const cmdType = command.type
			if (command.type === LawoCommandType.FaderRamp) {
				await this._lawo?.rampFader(command, cwc.timelineObjId)
			} else if (command.type === LawoCommandType.SetValue) {
				await this._lawo?.setValue(command, cwc.timelineObjId)
			} else {
				throw new Error(`Unsupported command type "${cmdType}"`)
			}
		} catch (e) {
			const error = e as Error
			let errorString = error && error.message ? error.message : error.toString()
			if (error?.stack) {
				errorString += error.stack
			}
			this.context.commandError(new Error(errorString), cwc)
		}
	}

	get connected(): boolean {
		return this._lawo?.connected ?? false
	}
	getStatus(): Omit<DeviceStatus, 'active'> {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._lawo?.connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		}

		return {
			statusCode: statusCode,
			messages: messages,
		}
	}

	readonly actions = null
}
