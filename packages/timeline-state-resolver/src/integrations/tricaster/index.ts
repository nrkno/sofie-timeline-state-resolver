import {
	DeviceType,
	TriCasterOptions,
	DeviceOptionsTriCaster,
	SomeMappingTricaster,
	Timeline,
	TSRTimelineContent,
	Mapping,
	StatusCode,
	DeviceStatus,
	TricasterDeviceTypes,
} from 'timeline-state-resolver-types'
import { WithContext, MappingsTriCaster, TriCasterState, TriCasterStateDiffer } from './triCasterStateDiffer'
import { TriCasterCommandWithContext } from './triCasterCommands'
import { TriCasterConnection } from './triCasterConnection'
import { Device } from '../../service/device'

const DEFAULT_PORT = 5951

export type DeviceOptionsTriCasterInternal = DeviceOptionsTriCaster

export class TriCasterDevice extends Device<
	TricasterDeviceTypes,
	WithContext<TriCasterState>,
	TriCasterCommandWithContext
> {
	readonly actions = null

	private _connected = false
	private _initialized = false
	private _isTerminating = false
	private _connection?: TriCasterConnection
	private _stateDiffer?: TriCasterStateDiffer

	async init(options: TriCasterOptions): Promise<boolean> {
		this._connection = new TriCasterConnection(options.host, options.port ?? DEFAULT_PORT)
		this._connection.on('connected', (info, shortcutStateXml) => {
			this._stateDiffer = new TriCasterStateDiffer(info)
			this._setInitialState(shortcutStateXml)
			this._setConnected(true)
			this._initialized = true
			this.context.logger.info(`Connected to TriCaster ${info.productModel}, session: ${info.sessionName}`)
		})
		this._connection.on('disconnected', (reason) => {
			if (!this._isTerminating) {
				this.context.logger.warning(`TriCaster disconected due to: ${reason}`)
			}
			this._setConnected(false)
		})
		this._connection.on('error', (reason) => {
			this.context.logger.error('TriCasterConnection', reason)
		})
		this._connection.connect()
		return true
	}

	private _setInitialState(shortcutStateXml: string): void {
		if (!this._stateDiffer) {
			throw new Error('State Differ not available')
		}

		const state = this._stateDiffer.shortcutStateConverter.getTriCasterStateFromShortcutState(shortcutStateXml)
		this.context.resetToState(state).catch((e) => {
			this.context.logger.error('Error setting initial TriCaster state', e)
		})
	}

	private _setConnected(connected: boolean): void {
		if (this._connected !== connected) {
			this._connected = connected
			this.context.connectionChanged(this.getStatus())
		}
	}

	/**
	 * Convert a timeline state into an Tricaster state.
	 * @param timelineState The state to be converted
	 */
	convertTimelineStateToDeviceState(
		timelineState: Timeline.TimelineState<TSRTimelineContent>,
		mappings: Record<string, Mapping<SomeMappingTricaster>>
	): WithContext<TriCasterState> {
		if (!this._initialized || !this._stateDiffer) {
			// before it's initialized don't do anything
			throw new Error('TriCaster not initialized yet')
		}

		const triCasterMappings: MappingsTriCaster = this.filterTriCasterMappings(mappings)

		return this._stateDiffer.timelineStateConverter.getTriCasterStateFromTimelineState(timelineState, triCasterMappings)
	}

	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 * @param oldAtemState
	 * @param newAtemState
	 */
	diffStates(
		oldTriCasterState: WithContext<TriCasterState> | undefined,
		newTriCasterState: WithContext<TriCasterState>,
		_mappings: Record<string, Mapping<SomeMappingTricaster>>
	): Array<TriCasterCommandWithContext> {
		if (!this._initialized || !this._stateDiffer) {
			// before it's initialized don't do anything
			this.context.logger.warning('TriCaster not initialized yet')
			return []
		}

		return this._stateDiffer.getCommandsToAchieveState(newTriCasterState, oldTriCasterState)
	}

	private filterTriCasterMappings(newMappings: Record<string, Mapping<SomeMappingTricaster>>): MappingsTriCaster {
		return Object.entries<Mapping<SomeMappingTricaster>>(newMappings).reduce<MappingsTriCaster>(
			(accumulator, [layerName, mapping]) => {
				if (mapping.device === DeviceType.TRICASTER) {
					accumulator[layerName] = mapping
				}
				return accumulator
			},
			{}
		)
	}

	async terminate(): Promise<void> {
		this._isTerminating = true
		this._connection?.close()
	}

	getStatus(): Omit<DeviceStatus, 'active'> {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		}

		return {
			statusCode: statusCode,
			messages: messages,
		}
	}

	get connected(): boolean {
		return this._connected
	}

	async sendCommand(commandWithContext: TriCasterCommandWithContext): Promise<void> {
		this.context.logger.debug(commandWithContext)

		return this._connection?.send(commandWithContext.command)
	}
}
