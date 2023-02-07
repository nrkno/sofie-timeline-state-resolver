import * as _ from 'underscore'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode } from './../../devices/device'
import {
	DeviceType,
	NoraNRKOptions,
	NoraNRKCommandContent,
	DeviceOptionsNoraNRK,
	Mappings,
} from 'timeline-state-resolver-types'
import { DoOnTime, SendMode } from '../../devices/doOnTime'
import got, { OptionsOfTextResponseBody, RequestError } from 'got'

import { TimelineState, ResolvedTimelineObjectInstance } from 'superfly-timeline'

import Debug from 'debug'
import { endTrace, startTrace } from '../../lib'
const debug = Debug('timeline-state-resolver:httpsend')

export interface DeviceOptionsNoraNRKInternal extends DeviceOptionsNoraNRK {
	commandReceiver?: CommandReceiver
}
export type CommandReceiver = (
	time: number,
	cmd: NoraNRKCommandContent,
	context: CommandContext,
	timelineObjId: string,
	layer?: string
) => Promise<any>
interface Command {
	commandName: 'added' | 'changed' | 'removed'
	content: NoraNRKCommandContent
	context: CommandContext
	timelineObjId: string
	layer: string
}
type CommandContext = string

type NoraNRKState = TimelineState

/**
 * This is a Nora (NRK) device, it uses http to control a Nora channel
 */
export class NoraNRKDevice extends DeviceWithState<NoraNRKState, DeviceOptionsNoraNRKInternal> {
	private _makeReadyCommands: NoraNRKCommandContent[]
	private _resendTime?: number
	private _doOnTime: DoOnTime

	private _commandReceiver: CommandReceiver
	private targetState = new Map<string, string>()

	constructor(deviceId: string, deviceOptions: DeviceOptionsNoraNRKInternal, getCurrentTime: () => Promise<number>) {
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
			this._deviceOptions
		)
		this.handleDoOnTime(this._doOnTime, 'NoraNRK')
	}
	async init(initOptions: NoraNRKOptions): Promise<boolean> {
		this._makeReadyCommands = initOptions.makeReadyCommands || []
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

		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		const oldState: TimelineState = (
			this.getStateBefore(previousStateTime) || { state: { time: 0, layers: {}, nextEvents: [] } }
		).state

		const convertTrace = startTrace(`device:convertState`, { deviceId: this.deviceId })
		const oldHttpSendState = oldState
		const newHttpSendState = this.convertStateToHttpSend(newState)
		this.emit('timeTrace', endTrace(convertTrace))

		const diffTrace = startTrace(`device:diffState`, { deviceId: this.deviceId })
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
	getStatus(): DeviceStatus {
		// Good, since this device has no status, really
		return {
			statusCode: StatusCode.GOOD,
			messages: [],
			active: this.isActive,
		}
	}
	async makeReady(okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			const time = this.getCurrentTime()

			this.clearStates()
			this._doOnTime.clearQueueAfter(0)

			for (const cmd of this._makeReadyCommands || []) {
				await this._commandReceiver(time, cmd, 'makeReady', '')
			}
		}
	}

	get canConnect(): boolean {
		return false
	}
	get connected(): boolean {
		return false
	}
	convertStateToHttpSend(state: TimelineState) {
		// convert the timeline state into something we can use
		// (won't even use this.mapping)
		return state
	}
	get deviceType() {
		return DeviceType.NORA_NRK
	}
	get deviceName(): string {
		return 'NORA Core (NRK) ' + this.deviceId
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
						this.targetState.set(cmd.layer, JSON.stringify(cmd.content))
						return this._commandReceiver(time, cmd.content, cmd.context, cmd.timelineObjId, cmd.layer)
					} else {
						this.targetState.delete(cmd.layer)
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
					content: newLayer.content as NoraNRKCommandContent,
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
						content: newLayer.content as NoraNRKCommandContent,
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
					content: oldLayer.content as NoraNRKCommandContent,
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
		cmd: NoraNRKCommandContent,
		context: CommandContext,
		timelineObjId: string,
		layer?: string
	): Promise<void> {
		if (layer) {
			const hash = this.targetState.get(layer)
			if (JSON.stringify(cmd) !== hash) return Promise.resolve() // command is no longer relevant to state
		}
		const cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId,
		}
		this.emitDebug(cwc)

		let request = got.post
		let method = 'POST'

		let rebasedUrl = new URL(
			`/renders/${cmd.group}${cmd.groupSuffix ?? ''}/${cmd.channel}`,
			this._deviceOptions.options?.coreUrl
		)
		let payload: Record<string, any> = cmd.payload

		// this is a "clear-layer" command
		if (cmd.payload.template.event === 'takeout' && !('name' in cmd.payload.template)) {
			method = 'PUT'
			request = got.put
			rebasedUrl = new URL(
				`/renders/${cmd.group}${cmd.groupSuffix ?? ''}/${cmd.channel}/${cmd.payload.template.layer}`,
				this._deviceOptions.options?.coreUrl
			)
			payload = {
				template: {
					event: 'takeout',
				},
			}
		}

		if (this._deviceOptions.options?.apiKey) {
			rebasedUrl.searchParams.append('apiKey', this._deviceOptions.options?.apiKey)
		}

		const t = Date.now()
		debug(`${method}: ${rebasedUrl} ${JSON.stringify(cmd.payload)} (${timelineObjId})`)

		try {
			const options: OptionsOfTextResponseBody = {}

			options.json = payload ?? undefined

			const response = await request(rebasedUrl, options)

			if (response.statusCode === 200) {
				this.emitDebug(
					`NoraNRK: ${method}: Good statuscode response on url "${rebasedUrl}": ${response.statusCode} (${context})`
				)
			} else {
				debug(`Bad response for ${rebasedUrl}: ${response.statusCode}`)
				this.emit(
					'warning',
					`NoraNRK: ${method}: Bad statuscode response on url "${rebasedUrl}": ${response.statusCode} (${context})`
				)
			}
		} catch (error) {
			const err = error as RequestError // make typescript happy

			this.emit('error', `NoraNRK.response error on ${method} "${rebasedUrl}" (${context})`, err)
			this.emit('commandError', err, cwc)
			debug(`Failed ${rebasedUrl}: ${error} (${timelineObjId})`)

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
