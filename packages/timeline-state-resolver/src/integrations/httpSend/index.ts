import { EventEmitter } from 'eventemitter3'
import { CommandWithContext, Device, DeviceEvents } from '../../service/device'
import {
	ActionExecutionResult,
	ActionExecutionResultCode,
	DeviceOptionsHTTPSend,
	DeviceStatus,
	HTTPSendCommandContent,
	HTTPSendOptions,
	HttpSendActions,
	SendCommandPayload,
	StatusCode,
	TSRTimelineContent,
	Timeline,
	TimelineContentTypeHTTP,
	TimelineContentTypeHTTPParamType,
} from 'timeline-state-resolver-types'
import _ = require('underscore')
import got, { OptionsOfTextResponseBody, RequestError } from 'got'
import { t } from '../../lib'
import CacheableLookup from 'cacheable-lookup'

type DeviceOptions = HTTPSendOptions
export type HttpSendDeviceState = Timeline.TimelineState<TSRTimelineContent>

export interface HttpSendDeviceCommand extends CommandWithContext {
	command: {
		commandName: 'added' | 'changed' | 'removed' | 'retry' | 'manual'
		content: HTTPSendCommandContent
		layer: string
	}
}

export type DeviceOptionsHTTPSendInternal = DeviceOptionsHTTPSend

export class HTTPSendDevice
	extends EventEmitter<DeviceEvents>
	implements Device<DeviceOptions, HttpSendDeviceState, HttpSendDeviceCommand>
{
	private options: DeviceOptions
	private activeLayers = new Map<string, string>()
	private cacheable: CacheableLookup

	async init(options: DeviceOptions): Promise<boolean> {
		this.options = options
		this.cacheable = new CacheableLookup()
		return true
	}
	async terminate(): Promise<boolean> {
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
		[HttpSendActions.SendCommand]: async (_id: HttpSendActions.SendCommand, payload?: SendCommandPayload) =>
			this.sendManualCommand(payload),
	}

	private async sendManualCommand(cmd?: SendCommandPayload): Promise<ActionExecutionResult> {
		if (!cmd)
			return {
				result: ActionExecutionResultCode.Error,
				response: t('Failed to send command: Missing upayloadrl'),
			}
		if (!cmd.url) {
			return {
				result: ActionExecutionResultCode.Error,
				response: t('Failed to send command: Missing url'),
			}
		}
		if (Object.values<TimelineContentTypeHTTP>(TimelineContentTypeHTTP).includes(cmd.type as TimelineContentTypeHTTP)) {
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
				content: cmd as HTTPSendCommandContent,
				layer: '',
			},
		})

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
	async sendCommand({ tlObjId, context, command }: HttpSendDeviceCommand): Promise<any> {
		if (command.commandName === 'added' || command.commandName === 'changed') {
			this.activeLayers.set(command.layer, JSON.stringify(command.content))
		} else if (command.commandName === 'removed') {
			this.activeLayers.delete(command.layer)
		}

		if (command.layer) {
			const hash = this.activeLayers.get(command.layer)
			if (JSON.stringify(command.content) !== hash) return Promise.resolve() // command is no longer relevant to state
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
				dnsCache: this.cacheable,
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

				if (retryCodes.includes(err.code) && this.options?.resendTime) {
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
}
