import {
	ActionExecutionResult,
	ActionExecutionResultCode,
	DeviceStatus,
	DeviceType,
	Mapping,
	MappingQuantelPort,
	Mappings,
	OSCMessageCommandContent,
	QuantelActions,
	QuantelOptions,
	SomeMappingQuantel,
	StatusCode,
	Timeline,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { CommandWithContext, Device } from '../../service/device'

import Debug from 'debug'
import { QuantelCommand, QuantelCommandType, QuantelState } from './types'
import { QuantelGateway } from 'tv-automation-quantel-gateway-client'
import { QuantelManager } from './connection'
import { convertTimelineStateToQuantelState } from './state'
import { diffStates } from './diff'
const debug = Debug('timeline-state-resolver:quantel')

export interface OscDeviceState {
	[address: string]: OSCDeviceStateContent
}
interface OSCDeviceStateContent extends OSCMessageCommandContent {
	fromTlObject: string
}

export interface QuantelCommandWithContext {
	command: QuantelCommand
	context: string
	timelineObjId: string
}

export class QuantelDevice extends Device<QuantelOptions, QuantelState, QuantelCommandWithContext, SomeMappingQuantel> {
	// TODO - monitor ports: this._quantel.setMonitoredPorts(this._getMappedPorts(newMappings))

	private _quantel: QuantelGateway
	private _quantelManager: QuantelManager

	async init(options: QuantelOptions): Promise<boolean> {
		this._quantel = new QuantelGateway()
		this._quantel.on('error', (e) => this.context.logger.error('Quantel.QuantelGateway', e))
		// this._quantelManager = new QuantelManager(this._quantel, () => this.getCurrentTime(), {
		// todo - obv
		this._quantelManager = new QuantelManager(this._quantel, () => Date.now(), {
			allowCloneClips: options.allowCloneClips,
		})
		this._quantelManager.on('info', (x) =>
			this.context.logger.info(`Quantel: ${typeof x === 'string' ? x : JSON.stringify(x)}`)
		)
		this._quantelManager.on('warning', (x) =>
			this.context.logger.warning(`Quantel: ${typeof x === 'string' ? x : JSON.stringify(x)}`)
		)
		this._quantelManager.on('error', (e) => this.context.logger.error('Quantel: ', e))
		this._quantelManager.on('debug', (...args) => this.context.logger.debug(...args))

		const ISAUrlMaster: string = options.ISAUrlMaster || options['ISAUrl'] // tmp: ISAUrl for backwards compatibility, to be removed later
		if (!options.gatewayUrl) throw new Error('Quantel bad connection option: gatewayUrl')
		if (!ISAUrlMaster) throw new Error('Quantel bad connection option: ISAUrlMaster')
		if (!options.serverId) throw new Error('Quantel bad connection option: serverId')

		const isaURLs: string[] = []
		if (ISAUrlMaster) isaURLs.push(ISAUrlMaster)
		if (options.ISAUrlBackup) isaURLs.push(options.ISAUrlBackup)

		await this._quantel.init(options.gatewayUrl, isaURLs, options.zoneId, options.serverId) // todo - maybe not to be awaited...

		this._quantel.monitorServerStatus((_connected: boolean) => {
			this.context.connectionChanged(this.getStatus())
		})

		return Promise.resolve(true)
	}
	async terminate(): Promise<void> {
		this._quantel.dispose()
	}

	convertTimelineStateToDeviceState(
		timelineState: Timeline.TimelineState<TSRTimelineContent>,
		mappings: Mappings<SomeMappingQuantel>
	): { quantel: QuantelState } {
		return { quantel: convertTimelineStateToQuantelState(timelineState, mappings) }
	}
	diffStates(
		oldState: { quantel: QuantelState | undefined },
		newState: { quantel: QuantelState }
	): Array<QuantelCommandWithContext> {
		return diffStates(oldState.quantel, newState.quantel)
	}
	async sendCommand({ command, context, timelineObjId }: QuantelCommandWithContext): Promise<any> {
		const cwc: CommandWithContext = {
			context: context,
			command: command,
			timelineObjId: timelineObjId,
		}
		this.context.logger.debug(cwc)
		debug(command)

		try {
			const cmdType = command.type
			if (command.type === QuantelCommandType.SETUPPORT) {
				await this._quantelManager.setupPort(command)
			} else if (command.type === QuantelCommandType.RELEASEPORT) {
				await this._quantelManager.releasePort(command)
			} else if (command.type === QuantelCommandType.LOADCLIPFRAGMENTS) {
				await this._quantelManager.tryLoadClipFragments(command)
			} else if (command.type === QuantelCommandType.PLAYCLIP) {
				await this._quantelManager.playClip(command)
			} else if (command.type === QuantelCommandType.PAUSECLIP) {
				await this._quantelManager.pauseClip(command)
			} else if (command.type === QuantelCommandType.CLEARCLIP) {
				await this._quantelManager.clearClip(command)
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
	mappingToAddress(_mapping: Mapping<MappingQuantelPort, DeviceType>): string {
		return 'quantel'
	}

	get connected(): boolean {
		return this._quantel.connected
	}
	getStatus(): Omit<DeviceStatus, 'active'> {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._quantel.connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		}
		if (this._quantel.statusMessage) {
			statusCode = StatusCode.BAD
			messages.push(this._quantel.statusMessage)
		}

		if (!this._quantel.initialized) {
			statusCode = StatusCode.BAD
			messages.push(`Quantel device connection not initialized (restart required)`)
		}

		return {
			statusCode: statusCode,
			messages: messages,
		}
	}

	actions: Record<QuantelActions, (id: QuantelActions) => Promise<ActionExecutionResult>> = {
		[QuantelActions.ClearStates]: async () => {
			this.context.resetResolver()
			return {
				result: ActionExecutionResultCode.Ok,
			}
		},
		[QuantelActions.RestartGateway]: async () => {
			if (this._quantel) {
				try {
					await this._quantel.kill()
					return { result: ActionExecutionResultCode.Ok }
				} catch (e) {
					this.context.logger.error('Error killing quantel gateway', new Error(e as any)) // todo - what to do here...
				}
			}
			return { result: ActionExecutionResultCode.Error }
		},
	}
}
