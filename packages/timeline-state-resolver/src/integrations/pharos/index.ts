import {
	PharosOptions,
	Mappings,
	TSRTimelineContent,
	Timeline,
	ActionExecutionResult,
	DeviceStatus,
	StatusCode,
} from 'timeline-state-resolver-types'
import { Pharos } from './connection'
import { Device, CommandWithContext, DeviceContextAPI } from '../../service/device'
import { diffStates } from './diffStates'

export interface PharosCommandWithContext extends CommandWithContext {
	command: CommandContent
}
export type PharosState = Timeline.StateInTime<TSRTimelineContent>

interface CommandContent {
	fcn: (pharos: Pharos) => Promise<unknown>
}

/**
 * This is a wrapper for a Pharos-devices,
 * https://www.pharoscontrols.com/downloads/documentation/application-notes/
 */
export class PharosDevice extends Device<PharosOptions, PharosState, PharosCommandWithContext> {
	readonly actions: {
		[id: string]: (id: string, payload?: Record<string, any>) => Promise<ActionExecutionResult>
	} = {}

	private _pharos: Pharos

	constructor(context: DeviceContextAPI<PharosState>) {
		super(context)

		this._pharos = new Pharos()
		this._pharos.on('error', (e) => this.context.logger.error('Pharos', e))
		this._pharos.on('connected', () => {
			this._connectionChanged()
		})
		this._pharos.on('disconnected', () => {
			this._connectionChanged()
		})
	}

	/**
	 * Initiates the connection with Pharos through the PharosAPI.
	 */
	async init(initOptions: PharosOptions): Promise<boolean> {
		// This is where we would do initialization, like connecting to the devices, etc
		this._pharos
			.connect(initOptions)
			.then(() => {
				this._pharos
					.getProjectInfo()
					.then((info) => {
						this.context.logger.info(`Current project: ${info.name}`)
						this.context.resetToState({}).catch((e) => this.context.logger.error('Failed to reset state', e))
					})
					.catch((e) => this.context.logger.error('Failed to query project', e))
			})
			.catch((e) => this.context.logger.error('Failed to connect', e))

		return true
	}

	async terminate() {
		await this._pharos.dispose()
	}

	get connected(): boolean {
		return this._pharos.connected
	}

	convertTimelineStateToDeviceState(
		timelineState: Timeline.TimelineState<TSRTimelineContent>,
		_mappings: Mappings
	): PharosState {
		return timelineState.layers
	}

	getStatus(): Omit<DeviceStatus, 'active'> {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._pharos.connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		}

		return {
			statusCode: statusCode,
			messages: messages,
		}
	}

	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 * @param oldAtemState
	 * @param newAtemState
	 */
	diffStates(
		oldPharosState: PharosState | undefined,
		newPharosState: PharosState,
		mappings: Mappings
	): Array<PharosCommandWithContext> {
		return diffStates(oldPharosState, newPharosState, mappings)
	}

	async sendCommand({ command, context, timelineObjId }: PharosCommandWithContext): Promise<void> {
		const cwc: CommandWithContext = {
			context,
			command,
			timelineObjId,
		}
		this.context.logger.debug(cwc)

		// Skip attempting send if not connected
		if (!this.connected) return

		try {
			await command.fcn(this._pharos)
		} catch (error: any) {
			this.context.commandError(error, cwc)
		}
	}

	private _connectionChanged() {
		this.context.connectionChanged(this.getStatus())
	}
}
