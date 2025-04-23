import { EventEmitter } from 'eventemitter3'
import * as _ from 'underscore'
import { SlowReportOptions } from 'timeline-state-resolver-types'
import type { SlowSentCommandInfo, SlowFulfilledCommandInfo, CommandReport } from 'timeline-state-resolver-api'

export type { SlowSentCommandInfo, SlowFulfilledCommandInfo, CommandReport }

export type DoOrderFunction = (...args: any[]) => void | Promise<any> | any
export type DoOrderFunctionNothing = () => void | Promise<any> | any
export type DoOrderFunction0<A> = (arg0: A) => void | Promise<any> | any
export type DoOrderFunction1<A, B> = (arg0: A, arg1: B) => void | Promise<any> | any
export type DoOrderFunction2<A, B, C> = (arg0: A, arg1: B, arg2: C) => void | Promise<any> | any

interface DoOrder {
	/** The time the command is scheduled to run */
	time: number
	fcn: DoOrderFunction
	args: any[]
	/** The time at which point the command was added to the queue */
	addedTime: number
	prepareTime: number
}

export type DoOnTimeEvents = {
	error: [err: Error]
	slowCommand: [commandInfo: string]
	slowSentCommand: [info: SlowSentCommandInfo]
	slowFulfilledCommand: [info: SlowFulfilledCommandInfo]
	commandReport: [commandReport: CommandReport]
}

export enum SendMode {
	/** Send messages as quick as possible */
	BURST = 1,
	/** Send messages in order, wait for the previous message to be acknowledged before sending the next */
	IN_ORDER = 2,
}
export type DoOnTimeOptions = SlowReportOptions
export class DoOnTime extends EventEmitter<DoOnTimeEvents> {
	getCurrentTime: () => number
	private _i = 0
	private _queues: {
		[queueId: string]: { [id: string]: DoOrder }
	} = {}

	private _checkQueueTimeout: any = 0
	private _sendMode: SendMode
	private _commandsToSendNow: {
		[queueId: string]: (() => Promise<any>)[]
	} = {}

	private _sendingCommands: {
		[queueId: string]: boolean
	} = {}
	private _options: DoOnTimeOptions

	constructor(getCurrentTime: () => number, sendMode: SendMode = SendMode.BURST, options?: DoOnTimeOptions) {
		super()
		this.getCurrentTime = getCurrentTime
		this._sendMode = sendMode
		this._options = options || {}
	}
	public queue(time: number, queueId: string | undefined, fcn: DoOrderFunctionNothing): string
	public queue<A>(time: number, queueId: string | undefined, fcn: DoOrderFunction0<A>, arg0: A): string
	public queue<A, B>(time: number, queueId: string | undefined, fcn: DoOrderFunction1<A, B>, arg0: A, arg1: B): string
	public queue<A, B, C>(
		time: number,
		queueId: string | undefined,
		fcn: DoOrderFunction2<A, B, C>,
		arg0: A,
		arg1: B,
		arg2: C
	): string
	public queue(time: number, queueId: string | undefined, fcn: DoOrderFunction, ...args: any[]): string {
		if (!(time >= 0)) throw Error(`DoOnTime: time argument must be >= 0 (${time})`)
		if (!_.isFunction(fcn)) throw Error(`DoOnTime: fcn argument must be a function! (${typeof fcn})`)
		const id = '_' + this._i++

		if (!queueId) queueId = '_' // default
		if (!this._queues[queueId]) this._queues[queueId] = {}
		this._queues[queueId][id] = {
			time: time,
			fcn: fcn,
			args: args,
			addedTime: this.getCurrentTime(),
			prepareTime: 0,
		}
		this._checkQueueTimeout = setTimeout(() => {
			this._checkQueue()
		}, 0)
		return id
	}
	public getQueue(): Array<{ id: string; queueId: string; time: number; args: any[] }> {
		const fullQueue: Array<{ id: string; queueId: string; time: number; args: any[] }> = []

		_.each(this._queues, (queue, queueId) => {
			_.each(queue, (q, id) => {
				fullQueue.push({
					id: id,
					queueId: queueId,
					time: q.time,
					args: q.args,
				})
			})
		})

		return fullQueue
	}
	public clearQueueAfter(time: number): void {
		_.each(this._queues, (queue, queueId: string) => {
			_.each(queue, (q: DoOrder, id: string) => {
				if (q.time > time) {
					this._remove(queueId, id)
				}
			})
		})
	}
	public clearQueueNowAndAfter(time: number): number {
		let removed = 0
		_.each(this._queues, (queue, queueId: string) => {
			_.each(queue, (q: DoOrder, id: string) => {
				if (q.time >= time) {
					this._remove(queueId, id)
					removed++
				}
			})
		})
		return removed
	}
	dispose(): void {
		this.clearQueueAfter(0) // clear all
		clearTimeout(this._checkQueueTimeout)
	}
	private _remove(queueId: string, id: string) {
		delete this._queues[queueId][id]
	}
	private _checkQueue() {
		clearTimeout(this._checkQueueTimeout)

		const now = this.getCurrentTime()
		if (isNaN(now)) {
			throw new Error('DoOnTime.getCurrentTime is broken, and is not returning a number')
		}

		let nextTime = now + 99999

		_.each(this._queues, (queue, queueId: string) => {
			_.each(queue, (o: DoOrder, id: string) => {
				if (o.time <= now) {
					o.prepareTime = this.getCurrentTime()
					if (!this._commandsToSendNow[queueId]) this._commandsToSendNow[queueId] = []
					this._commandsToSendNow[queueId].push(async () => {
						try {
							const startSend = this.getCurrentTime()
							let sentTooSlow = false
							const p = Promise.resolve(o.fcn(...o.args)).then(() => {
								if (!sentTooSlow) this._verifyFulfillCommand(o, startSend, queueId)

								this._sendCommandReport(o, startSend, queueId)
							})
							sentTooSlow = this._verifySendCommand(o, startSend, queueId)
							return p
						} catch (e) {
							return Promise.reject(e)
						}
					})
					this._remove(queueId, id)
				} else {
					if (o.time < nextTime) nextTime = o.time
				}
			})
			// Go through the commands to be sent:
			this._sendNextCommand(queueId)
		})

		// schedule next check:
		const timeToNext = Math.min(1000, nextTime - now)
		this._checkQueueTimeout = setTimeout(() => {
			this._checkQueue()
		}, timeToNext)
	}
	private _sendNextCommand(queueId: string) {
		if (this._sendingCommands[queueId]) {
			return
		}
		this._sendingCommands[queueId] = true

		try {
			if (!this._commandsToSendNow[queueId]) this._commandsToSendNow[queueId] = []

			if (this._sendMode === SendMode.BURST) {
				this._sendingCommands[queueId] = false

				const commandsToSend = this._commandsToSendNow[queueId]
				this._commandsToSendNow[queueId] = []

				for (const commandToSend of commandsToSend) {
					// send all at once:
					commandToSend().catch((e) => {
						this.emit('error', e)
					})
				}
			} else {
				const commandToSend = this._commandsToSendNow[queueId].shift()
				if (commandToSend) {
					// SendMode.IN_ORDER
					// send one, wait for it to finish, then send next:
					commandToSend()
						.catch((e) => {
							this.emit('error', e)
						})
						.then(() => {
							this._sendingCommands[queueId] = false
							// send next message:
							this._sendNextCommand(queueId)
						})
						.catch((e) => {
							this._sendingCommands[queueId] = false
							this.emit('error', e)
						})
				} else {
					this._sendingCommands[queueId] = false
				}
			}
		} catch (e) {
			this._sendingCommands[queueId] = false
			throw e
		}
	}
	private representArguments(o: DoOrder) {
		if (o.args && o.args[0] && o.args[0].serialize && _.isFunction(o.args[0].serialize)) {
			return o.args[0].serialize()
		} else {
			return o.args
		}
	}
	private _verifySendCommand(o: DoOrder, send: number, queueId: string): boolean {
		// A positive value indicates that the command was sent late, compared to when it was planned to be sent
		const sendDelay: number = send - o.time
		// A positive value indicates that the command was added (to TSR) late.
		const addedDelay: number = o.addedTime - o.time
		// A posivite value indicates the time it took to generate the command internally in TSR.
		const internalDelay = send - o.addedTime

		if (this._options.limitSlowSentCommand) {
			if (sendDelay > this._options.limitSlowSentCommand) {
				const output: SlowSentCommandInfo = {
					added: o.addedTime,
					prepareTime: o.prepareTime,
					plannedSend: o.time,
					send: send,
					queueId: queueId,
					sendDelay,
					addedDelay,
					internalDelay,
					args: JSON.stringify(this.representArguments(o)),
				}
				this.emit('slowSentCommand', output)
				// Keep the old one, for backwards compatibility:
				this.emit(
					'slowCommand',
					`Slow sent command, should have been sent at ${o.time}, was ${sendDelay} ms slow (was added ${
						addedDelay >= 0 ? `${addedDelay} ms before` : `${-addedDelay} ms after`
					} planned), sendMode: ${SendMode[this._sendMode]}. Command: ${output.args}`
				)
			}
		}
		if (this._options.limitSlowSentCommand && sendDelay > this._options.limitSlowSentCommand) {
			return true
		}
		return false
	}
	private _verifyFulfillCommand(o: DoOrder, send: number, queueId: string) {
		if (this._options.limitSlowFulfilledCommand) {
			const fullfilled = this.getCurrentTime()
			const fulfilledDelay: number = fullfilled - o.time
			if (fulfilledDelay > this._options.limitSlowFulfilledCommand) {
				const output: SlowFulfilledCommandInfo = {
					added: o.addedTime,
					prepareTime: o.prepareTime,
					plannedSend: o.time,
					send: send,
					queueId: queueId,
					fullfilled: fullfilled,
					fulfilledDelay,
					args: JSON.stringify(this.representArguments(o)),
				}
				this.emit('slowFulfilledCommand', output)
				// Keep the old one, for backwards compatibility:
				this.emit(
					'slowCommand',
					`Slow fulfilled command, should have been fulfilled at ${o.time}, was ${fulfilledDelay} ms slow. Command: ${output.args}`
				)
			}
		}
	}
	private _sendCommandReport(o: DoOrder, send: number, queueId: string) {
		const fullfilled = this.getCurrentTime()
		if (this.listenerCount('commandReport') > 0) {
			const output: CommandReport = {
				added: o.addedTime,
				prepareTime: o.prepareTime,
				plannedSend: o.time,
				send: send,
				queueId: queueId,
				fullfilled: fullfilled,
				args: this.representArguments(o),
			}
			this.emit('commandReport', output)
		}
	}
}
