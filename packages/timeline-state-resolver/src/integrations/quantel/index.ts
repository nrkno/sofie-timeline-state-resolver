import {
	ActionExecutionResult,
	ActionExecutionResultCode,
	DeviceStatus,
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
import { convertTimelineStateToQuantelState, getMappedPorts } from './state'
import { diffStates } from './diff'
const debug = Debug('timeline-state-resolver:quantel')

export interface OscDeviceState {
	[address: string]: OSCDeviceStateContent
}
interface OSCDeviceStateContent extends OSCMessageCommandContent {
	fromTlObject: string
}

export interface QuantelCommandWithContext extends CommandWithContext {
	command: QuantelCommand
	context: string
}

export class QuantelDevice extends Device<QuantelOptions, QuantelState, QuantelCommandWithContext> {
	/** Setup in init */
	private _quantel!: QuantelGateway
	/** Setup in init */
	private _quantelManager!: QuantelManager
	/** Setup in init */
	private options!: QuantelOptions

	private _disconnectedSince: number | undefined = undefined

	async init(options: QuantelOptions): Promise<boolean> {
		this.options = options
		this._quantel = new QuantelGateway()
		this._quantel.on('error', (e) => this.context.logger.error('Quantel.QuantelGateway', e))
		this._quantelManager = new QuantelManager(this._quantel, () => this.context.getCurrentTime(), {
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

		this._quantel
			.init(options.gatewayUrl, isaURLs, options.zoneId, options.serverId)
			.then(() => {
				this._quantel.monitorServerStatus((connected: boolean) => {
					if (!this._disconnectedSince && connected === false) {
						this._disconnectedSince = Date.now()

						if (options.suppressDisconnectTime) {
							// trigger another update after debounce
							setTimeout(() => {
								if (!this._quantel.connected) {
									this.context.connectionChanged(this.getStatus())
								}
							}, options.suppressDisconnectTime)
						}
					} else if (connected === true) {
						if (!this._disconnectedSince) {
							// this must be our first time connecting, so let's resend any commands we missed
							this.context
								.resetToState({ time: 0, port: {} })
								.catch((e) =>
									this.context.logger.warning(
										'Failed to reset to state after first connection, device may be in unknown state (reason: ' +
											e +
											')'
									)
								)
						}

						this._disconnectedSince = undefined
					}

					this.context.connectionChanged(this.getStatus())
				})
			})
			.catch((e) => this.context.logger.error('Error initialising quantel', e))

		return Promise.resolve(true)
	}
	async terminate(): Promise<void> {
		this._quantel.dispose()
	}

	convertTimelineStateToDeviceState(
		timelineState: Timeline.TimelineState<TSRTimelineContent>,
		mappings: Mappings<SomeMappingQuantel>
	): QuantelState {
		return convertTimelineStateToQuantelState(timelineState, mappings)
	}
	diffStates(
		oldState: QuantelState | undefined,
		newState: QuantelState,
		mappings: Mappings<SomeMappingQuantel>,
		currentTime: number
	): Array<QuantelCommandWithContext> {
		this._quantel.setMonitoredPorts(getMappedPorts(mappings))

		return diffStates(oldState, newState, currentTime)
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

	get connected(): boolean {
		return this._quantel.connected
	}
	getStatus(): Omit<DeviceStatus, 'active'> {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []
		const suppressServerDownWarning =
			Date.now() < (this._disconnectedSince ?? 0) + (this.options?.suppressDisconnectTime ?? 0)

		if (!this._quantel.connected && !suppressServerDownWarning) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		}
		if (this._quantel.statusMessage && !suppressServerDownWarning) {
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

	readonly actions: {
		[id in QuantelActions]: (id: string, payload?: Record<string, any>) => Promise<ActionExecutionResult>
	} = {
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
					this.context.logger.error('Error killing quantel gateway', new Error(e as any)) // note - not 100% sure this is correct?
				}
			}
			return { result: ActionExecutionResultCode.Error }
		},
	}
}
