import { CommandWithContext, Device } from '../../service/device'
import {
	ActionExecutionResult,
	ActionExecutionResultCode,
	DeviceStatus,
	StatusCode,
	TSRTimelineContent,
	Timeline,
	TcpSendCommandContent,
	TCPSendOptions,
	TcpSendActions,
} from 'timeline-state-resolver-types'
import { t } from '../../lib'
import _ = require('underscore')
import { TcpConnection } from './tcpConnection'

export type TcpSendDeviceState = Timeline.TimelineState<TSRTimelineContent>

export interface TcpSendDeviceCommand extends CommandWithContext {
	command: {
		commandName: 'added' | 'changed' | 'removed' | 'manual'
		content: TcpSendCommandContent
		layer: string
	}
}
export class TcpSendDevice extends Device<TCPSendOptions, TcpSendDeviceState, TcpSendDeviceCommand> {
	private activeLayers = new Map<string, string>()
	private _terminated = false

	private tcpConnection = new TcpConnection()

	async init(options: TCPSendOptions): Promise<boolean> {
		this.tcpConnection.activate(options)
		return true
	}
	async terminate(): Promise<void> {
		this._terminated = true
		this.activeLayers.clear()
		await this.tcpConnection.deactivate()
	}

	get connected(): boolean {
		return this.tcpConnection.connected
	}
	getStatus(): Omit<DeviceStatus, 'active'> {
		return {
			statusCode: StatusCode.GOOD,
			messages: [],
		}
	}

	actions: Record<string, (id: TcpSendActions, payload?: Record<string, any>) => Promise<ActionExecutionResult>> = {
		[TcpSendActions.Reconnect]: async () => {
			await this.tcpConnection.reconnect()
			return { result: ActionExecutionResultCode.Ok }
		},
		[TcpSendActions.ResetState]: async () => {
			await this.actionResetState()
			return { result: ActionExecutionResultCode.Ok }
		},
		[TcpSendActions.SendTcpCommand]: async (_id: TcpSendActions.SendTcpCommand, payload?: TcpSendCommandContent) => {
			return this.actionSendTcpCommand(payload)
		},
	}

	convertTimelineStateToDeviceState(state: Timeline.TimelineState<TSRTimelineContent>): TcpSendDeviceState {
		return state
	}
	diffStates(oldState: TcpSendDeviceState | undefined, newState: TcpSendDeviceState): Array<TcpSendDeviceCommand> {
		const commands: Array<TcpSendDeviceCommand> = []

		for (const [layerKey, newLayer] of Object.entries<Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>>(
			newState.layers
		)) {
			const oldLayer = oldState?.layers[layerKey]
			// added/changed
			if (newLayer.content) {
				if (!oldLayer) {
					// added!
					commands.push({
						command: {
							commandName: 'added',
							content: newLayer.content as TcpSendCommandContent,
							layer: layerKey,
						},
						context: `added: ${newLayer.id}`,
						timelineObjId: newLayer.id,
					})
				} else {
					// changed?
					if (!_.isEqual(oldLayer.content, newLayer.content)) {
						// changed!
						commands.push({
							command: {
								commandName: 'changed',
								content: newLayer.content as TcpSendCommandContent,
								layer: layerKey,
							},
							context: `changed: ${newLayer.id}`,
							timelineObjId: newLayer.id,
						})
					}
				}
			}
		}
		// removed
		for (const [layerKey, oldLayer] of Object.entries<Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>>(
			oldState?.layers ?? {}
		)) {
			const newLayer = newState.layers[layerKey]
			if (!newLayer) {
				// removed!
				commands.push({
					command: {
						commandName: 'removed',
						content: oldLayer.content as TcpSendCommandContent,
						layer: layerKey,
					},
					context: `removed: ${oldLayer.id}`,
					timelineObjId: oldLayer.id,
				})
			}
		}
		commands.sort((a, b) => a.command.layer.localeCompare(b.command.layer))
		commands.sort((a, b) => {
			return (a.command.content.temporalPriority || 0) - (b.command.content.temporalPriority || 0)
		})
		return commands
	}
	async sendCommand({ timelineObjId, context, command }: TcpSendDeviceCommand): Promise<void> {
		if (command.commandName === 'added' || command.commandName === 'changed') {
			this.activeLayers.set(command.layer, this.getActiveLayersHash(command))
		} else if (command.commandName === 'removed') {
			this.activeLayers.delete(command.layer)
		}

		if (command.layer && command.commandName !== 'manual') {
			const hash = this.activeLayers.get(command.layer)
			if (this.getActiveLayersHash(command) !== hash) return Promise.resolve() // command is no longer relevant to state
		}
		if (this._terminated) {
			return Promise.resolve()
		}

		this.context.logger.debug({ context, timelineObjId, command })

		await this.tcpConnection.sendTCPMessage(command.content.message)
	}
	private async actionSendTcpCommand(cmd?: TcpSendCommandContent): Promise<ActionExecutionResult> {
		if (!cmd)
			return {
				result: ActionExecutionResultCode.Error,
				response: t('Failed to send command: Missing payload'),
			}
		if (!cmd.message) {
			return {
				result: ActionExecutionResultCode.Error,
				response: t('Failed to send command: Missing message'),
			}
		}
		try {
			await this.sendCommand({
				timelineObjId: '',
				context: 'makeReady',
				command: {
					commandName: 'manual',
					content: cmd,
					layer: '',
				},
			})
		} catch (error) {
			this.context.logger.warning('Manual TCP command failed: ' + JSON.stringify(cmd))
			return {
				result: ActionExecutionResultCode.Error,
				response: t('Error when sending TCP command: {{errorMessage}}', { errorMessage: `${error}` }),
			}
		}

		return { result: ActionExecutionResultCode.Ok }
	}
	private async actionResetState() {
		this.activeLayers.clear()
		await this.context.resetState()
	}
	private getActiveLayersHash(command: TcpSendDeviceCommand['command']): string {
		return JSON.stringify(command.content)
	}
}
