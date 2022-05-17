import * as _ from 'underscore'
import { AbstractStateDevice, CommandWithContext, StatusCode } from './../../devices/device'
import { DeviceType, HTTPSendCommandContent, DeviceOptionsHTTPSend, Mappings } from 'timeline-state-resolver-types'
import { DoOnTime, SendMode } from '../../devices/doOnTime'
import got, { RequestError } from 'got'

import { TimelineState, ResolvedTimelineObjectInstance } from 'superfly-timeline'

import Debug from 'debug'
import { endTrace, startTrace } from '../../lib'
const debug = Debug('timeline-state-resolver:httpsend')

export interface DeviceOptionsHTTPSendInternal extends DeviceOptionsHTTPSend {
	commandReceiver?: CommandReceiver
}
export type CommandReceiver = (
	time: number,
	cmd: HTTPSendCommandContent,
	context: CommandContext,
	timelineObjId: string,
	layer?: string
) => Promise<any>
interface Command {
	commandName: 'added' | 'changed' | 'removed'
	content: HTTPSendCommandContent
	context: CommandContext
	timelineObjId: string
	layer: string
}
type CommandContext = string

type HTTPSendState = TimelineState

/**
 * This is a HTTPSendDevice, it sends http commands when it feels like it
 */
export class HTTPSendDevice extends AbstractStateDevice<HTTPSendState, DeviceOptionsHTTPSendInternal> {
	private _makeReadyCommands: HTTPSendCommandContent[]
	private _makeReadyDoesReset: boolean
	private _resendTime?: number
	private _doOnTime: DoOnTime

	private _commandReceiver: CommandReceiver
	private activeLayers = new Map<string, string>()

	constructor(deviceId: string, deviceOptions: DeviceOptionsHTTPSendInternal, getCurrentTime: () => Promise<number>) {
		super(deviceId, deviceOptions, getCurrentTime)
		if (deviceOptions.options) {
			if (deviceOptions.commandReceiver) this._commandReceiver = deviceOptions.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver.bind(this)
		}
		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.IN_ORDER,
			deviceOptions
		)
		this.handleDoOnTime(this._doOnTime, 'HTTPSend')
	}
	async init(): Promise<boolean> {
		const initOptions = this.getOptions()
		this._makeReadyCommands = initOptions.makeReadyCommands || []
		this._makeReadyDoesReset = initOptions.makeReadyDoesReset || false
		this._resendTime = initOptions.resendTime && initOptions.resendTime > 1 ? initOptions.resendTime : undefined

		return Promise.resolve(true) // This device doesn't have any initialization procedure
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	handleState(newState: TimelineState, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		// Handle this new state, at the point in time specified
		const deviceId = this.deviceProperties.deviceId

		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		const oldState: TimelineState = (
			this.getStateBefore(previousStateTime) || { state: { time: 0, layers: {}, nextEvents: [] } }
		).state

		const convertTrace = startTrace(`device:convertState`, { deviceId: deviceId })
		const oldHttpSendState = oldState
		const newHttpSendState = this.convertStateToHttpSend(newState)
		this.emit('timeTrace', endTrace(convertTrace))

		const diffTrace = startTrace(`device:diffState`, { deviceId: deviceId })
		const commandsToAchieveState: Array<any> = this._diffStates(oldHttpSendState, newHttpSendState)
		this.emit('timeTrace', endTrace(diffTrace))

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newState, newState.time)
	}
	clearFuture(clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	async terminate() {
		this._doOnTime.dispose()
		return Promise.resolve(true)
	}
	_getStatus() {
		// Good, since this device has no status, really
		return {
			statusCode: StatusCode.GOOD,
			messages: [],
		}
	}
	async makeReady(okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			const time = this.getCurrentTime()

			if (this._makeReadyDoesReset) {
				this.clearStates()
				this._doOnTime.clearQueueAfter(0)
			}

			for (const cmd of this._makeReadyCommands || []) {
				await this._commandReceiver(time, cmd, 'makeReady', '')
			}
		}
	}

	get _canConnect(): boolean {
		return false
	}
	get _connected(): boolean {
		return false
	}
	convertStateToHttpSend(state: TimelineState) {
		// convert the timeline state into something we can use
		// (won't even use this.mapping)
		return state
	}
	get _deviceType() {
		return DeviceType.HTTPSEND
	}
	get _deviceName(): string {
		return 'HTTP-Send ' + this._deviceId
	}
	get queue() {
		return this._doOnTime.getQueue()
	}
	/**
	 * Add commands to queue, to be executed at the right time
	 */
	private _addToQueue(commandsToAchieveState: Array<Command>, time: number) {
		_.each(commandsToAchieveState, (cmd: Command) => {
			// add the new commands to the queue:
			this._doOnTime.queue(
				time,
				cmd.content.queueId,
				(cmd: Command) => {
					if (cmd.commandName === 'added' || cmd.commandName === 'changed') {
						this.activeLayers.set(cmd.layer, JSON.stringify(cmd.content))
						return this._commandReceiver(time, cmd.content, cmd.context, cmd.timelineObjId, cmd.layer)
					} else {
						this.activeLayers.delete(cmd.layer)
						return null
					}
				},
				cmd
			)
		})
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 */
	private _diffStates(oldhttpSendState: TimelineState, newhttpSendState: TimelineState): Array<Command> {
		// in this httpSend class, let's just cheat:

		const commands: Array<Command> = []

		_.each(newhttpSendState.layers, (newLayer: ResolvedTimelineObjectInstance, layerKey: string) => {
			const oldLayer = oldhttpSendState.layers[layerKey]
			if (!oldLayer) {
				// added!
				commands.push({
					timelineObjId: newLayer.id,
					commandName: 'added',
					content: newLayer.content as HTTPSendCommandContent,
					context: `added: ${newLayer.id}`,
					layer: layerKey,
				})
			} else {
				// changed?
				if (!_.isEqual(oldLayer.content, newLayer.content)) {
					// changed!
					commands.push({
						timelineObjId: newLayer.id,
						commandName: 'changed',
						content: newLayer.content as HTTPSendCommandContent,
						context: `changed: ${newLayer.id} (previously: ${oldLayer.id})`,
						layer: layerKey,
					})
				}
			}
		})
		// removed
		_.each(oldhttpSendState.layers, (oldLayer: ResolvedTimelineObjectInstance, layerKey) => {
			const newLayer = newhttpSendState.layers[layerKey]
			if (!newLayer) {
				// removed!
				commands.push({
					timelineObjId: oldLayer.id,
					commandName: 'removed',
					content: oldLayer.content as HTTPSendCommandContent,
					context: `removed: ${oldLayer.id}`,
					layer: layerKey,
				})
			}
		})

		commands.sort((a, b) => a.layer.localeCompare(b.layer))
		commands.sort((a, b) => {
			return (a.content.temporalPriority || 0) - (b.content.temporalPriority || 0)
		})

		return commands
	}

	private async _defaultCommandReceiver(
		_time: number,
		cmd: HTTPSendCommandContent,
		context: CommandContext,
		timelineObjId: string,
		layer?: string
	): Promise<void> {
		if (layer) {
			const hash = this.activeLayers.get(layer)
			if (JSON.stringify(cmd) !== hash) return Promise.resolve() // command is no longer relevant to state
		}
		const cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId,
		}
		this.emitLog('debug', cwc)

		const t = Date.now()
		debug(`${cmd.type}: ${cmd.url} ${JSON.stringify(cmd.params)} (${timelineObjId})`)

		const httpReq = got[cmd.type]
		try {
			const response = await httpReq(cmd.url, {
				json: 'params' in cmd ? cmd.params : undefined,
			})

			if (response.statusCode === 200) {
				this.emitLog(
					'debug',
					`HTTPSend: ${cmd.type}: Good statuscode response on url "${cmd.url}": ${response.statusCode} (${context})`
				)
			} else {
				debug(`Bad response for ${cmd.url}: ${response.statusCode}`)
				this.emitLog(
					'warning',
					`HTTPSend: ${cmd.type}: Bad statuscode response on url "${cmd.url}": ${response.statusCode} (${context})`
				)
			}
		} catch (error) {
			const err = error as RequestError // make typescript happy

			this.emitLog('error', `HTTPSend.response error ${cmd.type} (${context}`, err)
			this.emit('commandError', err, cwc)
			debug(`Failed ${cmd.url}: ${error} (${timelineObjId})`)

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

				if (retryCodes.includes(err.code) && this._resendTime) {
					const timeLeft = Math.max(this._resendTime - (Date.now() - t), 0)
					await new Promise<void>((resolve) => setTimeout(() => resolve(), timeLeft))
					this._defaultCommandReceiver(_time, cmd, context, timelineObjId, layer).catch(() => null) // errors will be emitted
				}
			}
		}
	}
}
