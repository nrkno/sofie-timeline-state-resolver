import { CommandWithContext, Device } from '../../service/device'
import {
	ActionExecutionResult,
	ActionExecutionResultCode,
	DeviceStatus,
	HTTPSendCommandContent,
	HTTPSendOptions,
	HttpSendActions,
	SendCommandResult,
	StatusCode,
	TSRTimelineContent,
	Timeline,
	TimelineContentTypeHTTP,
	TimelineContentTypeHTTPParamType,
} from 'timeline-state-resolver-types'
import _ = require('underscore')
import got, { OptionsOfTextResponseBody, RequestError } from 'got'
import { t } from '../../lib'
import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent'
import CacheableLookup from 'cacheable-lookup'

export type HttpSendDeviceState = Timeline.TimelineState<TSRTimelineContent>

export interface HttpSendDeviceCommand extends CommandWithContext {
	command: {
		commandName: 'added' | 'changed' | 'removed' | 'retry' | 'manual'
		content: HTTPSendCommandContent
		layer: string
	}
}

export class HTTPSendDevice extends Device<HTTPSendOptions, HttpSendDeviceState, HttpSendDeviceCommand> {
	/** Setup in init */
	protected options!: HTTPSendOptions
	/** Maps layers -> sent command-hashes */
	protected trackedState = new Map<string, string>()
	protected readonly cacheable = new CacheableLookup()
	protected _terminated = false

	async init(options: HTTPSendOptions): Promise<boolean> {
		this.options = options
		return true
	}
	async terminate(): Promise<void> {
		this.trackedState.clear()
		this._terminated = true
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
	readonly actions: {
		[id in HttpSendActions]: (id: string, payload?: Record<string, any>) => Promise<ActionExecutionResult<any>>
	} = {
		[HttpSendActions.Resync]: async (_id) => this.executeResyncAction(),
		[HttpSendActions.SendCommand]: async (_id: string, payload?: Record<string, any>) =>
			this.executeSendCommandAction(payload as HTTPSendCommandContent | undefined),
	}

	private async executeResyncAction(): Promise<ActionExecutionResult<undefined>> {
		this.context.resetResolver()
		return { result: ActionExecutionResultCode.Ok }
	}

	private async executeSendCommandAction(
		cmd?: HTTPSendCommandContent
	): Promise<ActionExecutionResult<SendCommandResult>> {
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

		const response = await this.sendCommandWithResult({
			timelineObjId: '',
			context: 'makeReady',
			command: {
				commandName: 'manual',
				content: cmd,
				layer: '',
			},
		}).catch(() => this.context.logger.warning('Manual command failed: ' + JSON.stringify(cmd)))

		return (
			response ?? {
				result: ActionExecutionResultCode.Error,
			}
		)
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
					timelineObjId: newLayer.id,
					context: `added: ${newLayer.id}`,
					command: {
						commandName: 'added',
						content: newLayer.content as HTTPSendCommandContent,
						layer: layerKey,
					},
					queueId: (newLayer.content as HTTPSendCommandContent)?.queueId,
				})
			} else {
				// changed?
				if (!_.isEqual(oldLayer.content, newLayer.content)) {
					// changed!
					commands.push({
						timelineObjId: newLayer.id,
						context: `changed: ${newLayer.id} (previously: ${oldLayer.id})`,
						command: {
							commandName: 'changed',
							content: newLayer.content as HTTPSendCommandContent,
							layer: layerKey,
						},
						queueId: (newLayer.content as HTTPSendCommandContent)?.queueId,
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
					timelineObjId: oldLayer.id,
					context: `removed: ${oldLayer.id}`,
					command: { commandName: 'removed', content: oldLayer.content as HTTPSendCommandContent, layer: layerKey },
					queueId: (oldLayer.content as HTTPSendCommandContent)?.queueId,
				})
			}
		})

		commands.sort((a, b) => a.command.layer.localeCompare(b.command.layer))
		commands.sort((a, b) => {
			return (a.command.content.temporalPriority || 0) - (b.command.content.temporalPriority || 0)
		})

		return commands
	}
	async sendCommand({ timelineObjId, context, command }: HttpSendDeviceCommand): Promise<void> {
		await this.sendCommandWithResult({ timelineObjId, context, command })
	}
	async sendCommandWithResult({
		timelineObjId,
		context,
		command,
	}: HttpSendDeviceCommand): Promise<ActionExecutionResult<SendCommandResult>> {
		const commandHash = this.getTrackedStateHash(command)

		if (command.commandName === 'added' || command.commandName === 'changed') {
			this.trackedState.set(command.layer, commandHash)
		} else if (command.commandName === 'removed') {
			this.trackedState.delete(command.layer)
		}

		// Avoid sending multiple identical commands for the same state:
		if (command.layer && command.commandName !== 'manual') {
			const trackedHash = this.trackedState.get(command.layer)
			if (commandHash !== trackedHash)
				return {
					result: ActionExecutionResultCode.IgnoredNotRelevant,
				} // command is no longer relevant to state
		}
		if (this._terminated) {
			return {
				result: ActionExecutionResultCode.Error,
			}
		}

		const cwc: CommandWithContext = {
			context,
			command,
			timelineObjId,
		}
		this.context.logger.debug({ context, timelineObjId, command })

		const t = Date.now()

		const httpReq = got[command.content.type]
		try {
			const options: OptionsOfTextResponseBody = {
				dnsCache: this.cacheable,
				retry: 0,
				headers: command.content.headers,
			}

			const url = new URL(command.content.url)
			if (!this.options.noProxy?.includes(url.host)) {
				if (url.protocol === 'http:' && this.options.httpProxy) {
					options.agent = {
						http: new HttpProxyAgent({
							proxy: this.options.httpProxy,
						}),
					}
				} else if (url.protocol === 'https:' && this.options.httpsProxy) {
					options.agent = {
						https: new HttpsProxyAgent({
							proxy: this.options.httpsProxy,
						}),
					}
				}
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

			if (response.statusCode >= 200 && response.statusCode < 300) {
				this.context.logger.debug(
					`HTTPSend: ${command.content.type}: Good statuscode response on url "${command.content.url}": ${response.statusCode} (${context})`
				)
			} else {
				this.context.logger.warning(
					`HTTPSend: ${command.content.type}: Bad statuscode response on url "${command.content.url}": ${response.statusCode} (${context})`
				)
			}

			return {
				result: ActionExecutionResultCode.Ok,
				resultData: {
					body: response.body,
					statusCode: response.statusCode,
					headers: response.headers as Record<string, string | string[]>,
				},
			}
		} catch (error) {
			const err = error as RequestError // make typescript happy

			this.context.logger.error(
				`HTTPSend.response error on ${command.content.type} "${command.content.url}" (${context})`,
				err
			)
			this.context.commandError(err, cwc)

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
							timelineObjId,
							context,
							command: {
								...command,
								commandName: 'retry',
							},
						}).catch(() => null) // errors will be emitted
					}, timeLeft)
				}
			}

			return {
				result: ActionExecutionResultCode.Error,
			}
		}
	}
	private getTrackedStateHash(command: HttpSendDeviceCommand['command']): string {
		return JSON.stringify(command.content)
	}
}
