import { CommandWithContext, Device, DeviceEvents } from '../../service/device'
import {
	ActionExecutionResult,
	ActionExecutionResultCode,
	DeviceStatus,
	HTTPSendCommandContent,
	HTTPSendOptions,
	HttpSendActions,
	StatusCode,
	TSRTimelineContent,
	Timeline,
	TimelineContentTypeHTTP,
	TimelineContentTypeHTTPParamType,
} from 'timeline-state-resolver-types'
import _ = require('underscore')
import got, { OptionsOfTextResponseBody, RequestError } from 'got'
import { t } from '../../lib'
import EventEmitter = require('eventemitter3')

export type HttpSendDeviceState = Timeline.TimelineState<TSRTimelineContent>

export interface HttpSendDeviceCommand extends CommandWithContext {
	command: {
		commandName: 'added' | 'changed' | 'removed' | 'retry' | 'manual'
		content: HTTPSendCommandContent
		layer: string
	}
}

export class HTTPSendDevice
	extends EventEmitter<DeviceEvents>
	implements Device<HTTPSendOptions, HttpSendDeviceState, HttpSendDeviceCommand>
{
	private options: HTTPSendOptions
	/** Maps layers -> sent command-hashes */
	private trackedState = new Map<string, string>()
	private _terminated = false

	async init(options: HTTPSendOptions): Promise<boolean> {
		this.options = options
		return true
	}
	async terminate(): Promise<boolean> {
		this.trackedState.clear()
		this._terminated = true

		return true
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

	actions: Record<string, (id: HttpSendActions, payload?: Record<string, any>) => Promise<ActionExecutionResult>> = {
		[HttpSendActions.Resync]: async () => {
			this.emit('resetResolver')
			return { result: ActionExecutionResultCode.Ok }
		},
		[HttpSendActions.SendCommand]: async (_id: HttpSendActions.SendCommand, payload?: HTTPSendCommandContent) =>
			this.sendManualCommand(payload),
	}

	private async sendManualCommand(cmd?: HTTPSendCommandContent): Promise<ActionExecutionResult> {
		if (!cmd)
			return {
				result: ActionExecutionResultCode.Error,
				response: t('Failed to send command: Missing payloadurl'),
			}
		if (!cmd.url) {
			return {
				result: ActionExecutionResultCode.Error,
				response: t('Failed to send command: Missing url'),
			}
		}
		if (!Object.values<TimelineContentTypeHTTP>(TimelineContentTypeHTTP).includes(cmd.type)) {
			return {
				result: ActionExecutionResultCode.Error,
				response: t('Failed to send command: type is invalid'),
			}
		}
		if (!cmd.params) {
			return {
				result: ActionExecutionResultCode.Error,
				response: t('Failed to send command: Missing params'),
			}
		}
		if (cmd.paramsType && !(cmd.type in TimelineContentTypeHTTPParamType)) {
			return {
				result: ActionExecutionResultCode.Error,
				response: t('Failed to send command: params type is invalid'),
			}
		}

		await this.sendCommand({
			tlObjId: '',
			context: 'makeReady',
			command: {
				commandName: 'manual',
				content: cmd,
				layer: '',
			},
		}).catch(() => this.emit('warning', 'Manual command failed: ' + JSON.stringify(cmd)))

		return {
			result: ActionExecutionResultCode.Ok,
		}
	}

	convertTimelineStateToDeviceState(state: Timeline.TimelineState<TSRTimelineContent>): HttpSendDeviceState {
		return state
	}
	diffStates(oldState: HttpSendDeviceState | undefined, newState: HttpSendDeviceState): Array<HttpSendDeviceCommand> {
		const commands: Array<HttpSendDeviceCommand> = []

		_.each(newState.layers, (newLayer, layerKey: string) => {
			const oldLayer = oldState?.layers[layerKey]
			if (!oldLayer) {
				// added!
				commands.push({
					tlObjId: newLayer.id,
					context: `added: ${newLayer.id}`,
					command: {
						commandName: 'added',
						content: newLayer.content as HTTPSendCommandContent,
						layer: layerKey,
					},
				})
			} else {
				// changed?
				if (!_.isEqual(oldLayer.content, newLayer.content)) {
					// changed!
					commands.push({
						tlObjId: newLayer.id,
						context: `changed: ${newLayer.id} (previously: ${oldLayer.id})`,
						command: {
							commandName: 'changed',
							content: newLayer.content as HTTPSendCommandContent,
							layer: layerKey,
						},
					})
				}
			}
		})
		// removed
		_.each(oldState?.layers ?? {}, (oldLayer, layerKey) => {
			const newLayer = newState.layers[layerKey]
			if (!newLayer) {
				// removed!
				commands.push({
					tlObjId: oldLayer.id,
					context: `removed: ${oldLayer.id}`,
					command: { commandName: 'removed', content: oldLayer.content as HTTPSendCommandContent, layer: layerKey },
				})
			}
		})

		commands.sort((a, b) => a.command.layer.localeCompare(b.command.layer))
		commands.sort((a, b) => {
			return (a.command.content.temporalPriority || 0) - (b.command.content.temporalPriority || 0)
		})

		return commands
	}
	async sendCommand({ tlObjId, context, command }: HttpSendDeviceCommand): Promise<void> {
		const commandHash = this.getTrackedStateHash(command)

		if (command.commandName === 'added' || command.commandName === 'changed') {
			this.trackedState.set(command.layer, commandHash)
		} else if (command.commandName === 'removed') {
			this.trackedState.delete(command.layer)
		}

		// Avoid sending multiple identical commands for the same state:
		if (command.layer && command.commandName !== 'manual') {
			const trackedHash = this.trackedState.get(command.layer)
			if (commandHash !== trackedHash) return Promise.resolve() // command is no longer relevant to state
		}
		if (this._terminated) {
			return Promise.resolve()
		}

		const cwc: CommandWithContext = {
			context,
			command,
			tlObjId,
		}
		this.emit('debug', { context, tlObjId, command })

		const t = Date.now()

		const httpReq = got[command.content.type]
		try {
			const options: OptionsOfTextResponseBody = {
				retry: 0,
				headers: command.content.headers,
			}

			const params =
				'params' in command.content && !_.isEmpty(command.content.params) ? command.content.params : undefined
			if (params) {
				if (command.content.type === TimelineContentTypeHTTP.GET) {
					options.searchParams = params as Record<string, any>
				} else {
					if (command.content.paramsType === TimelineContentTypeHTTPParamType.FORM) {
						options.form = params
					} else {
						// Default is json:
						options.json = params
					}
				}
			}

			const response = await httpReq(command.content.url, options)

			if (response.statusCode === 200) {
				this.emit(
					'debug',
					`HTTPSend: ${command.content.type}: Good statuscode response on url "${command.content.url}": ${response.statusCode} (${context})`
				)
			} else {
				this.emit(
					'warning',
					`HTTPSend: ${command.content.type}: Bad statuscode response on url "${command.content.url}": ${response.statusCode} (${context})`
				)
			}
		} catch (error) {
			const err = error as RequestError // make typescript happy

			this.emit(
				'error',
				`HTTPSend.response error on ${command.content.type} "${command.content.url}" (${context})`,
				err
			)
			this.emit('commandError', err, cwc)

			if ('code' in err) {
				const retryCodes = [
					'ETIMEDOUT',
					'ECONNRESET',
					'EADDRINUSE',
					'ECONNREFUSED',
					'EPIPE',
					'ENOTFOUND',
					'ENETUNREACH',
					'EHOSTUNREACH',
					'EAI_AGAIN',
				]

				if (retryCodes.includes(err.code) && this.options?.resendTime && command.commandName !== 'manual') {
					const timeLeft = Math.max(this.options.resendTime - (Date.now() - t), 0)
					setTimeout(() => {
						this.sendCommand({
							tlObjId,
							context,
							command: {
								...command,
								commandName: 'retry',
							},
						}).catch(() => null) // errors will be emitted
					}, timeLeft)
				}
			}
		}
	}
	private getTrackedStateHash(command: HttpSendDeviceCommand['command']): string {
		return JSON.stringify(command.content)
	}
}
