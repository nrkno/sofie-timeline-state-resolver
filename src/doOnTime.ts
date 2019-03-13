import { EventEmitter } from 'events'
import * as _ from 'underscore'
import { SlowReportOptions } from './types/src/mapping'

export type DoOrderFunction = (...args: any[]) => void | Promise<any> | any
interface DoOrder {
	time: number
	fcn: DoOrderFunction
	args: any[]
	addedTime: number
	prepareTime: number
}

export enum SendMode {
	/** Send messages as quick as possible */
	BURST = 1,
	/** Send messages in order, wait for the previous message to be acknowledged before sending the next */
	IN_ORDER = 2
}
export interface DoOnTimeOptions extends SlowReportOptions {
}
export class DoOnTime extends EventEmitter {
	getCurrentTime: () => number
	private _i: number = 0
	private _queue: {[id: string]: DoOrder} = {}
	private _checkQueueTimeout: any = 0
	private _sendMode: SendMode
	private _commandsToSendNow: (() => Promise<any>)[] = []
	private _sendingCommands: boolean = false
	private _options: DoOnTimeOptions

	constructor (getCurrentTime: () => number, sendMode: SendMode = SendMode.BURST, options?: DoOnTimeOptions) {
		super()
		this.getCurrentTime = getCurrentTime
		this._sendMode = sendMode
		this._options = options || {}
	}
	public queue (time: number, fcn: DoOrderFunction, ...args: any[]): string {
		if (!(time >= 0)) throw Error(`DoOnTime: time argument must be >= 0 (${time})`)
		if (!_.isFunction(fcn)) throw Error(`DoOnTime: fcn argument must be a function! (${typeof fcn})`)
		let id = '_' + (this._i++)
		this._queue[id] = {
			time: time,
			fcn: fcn,
			args: args,
			addedTime: this.getCurrentTime(),
			prepareTime: 0
		}
		this._checkQueueTimeout = setTimeout(() => {
			this._checkQueue()
		},0)
		return id
	}
	public remove (id: string) {
		delete this._queue[id]
	}
	public getQueue () {
		return _.map(this._queue, (q, id) => {
			return {
				id: id,
				time: q.time,
				args: q.args
			}
		})
	}
	public clearQueueAfter (time: number) {
		_.each(this._queue, (q: DoOrder, id: string) => {
			if (q.time > time) {
				this.remove(id)
			}
		})
	}
	public clearQueueNowAndAfter (time: number) {
		_.each(this._queue, (q: DoOrder, id: string) => {
			if (q.time >= time) {
				this.remove(id)
			}
		})
	}
	dispose (): void {
		this.clearQueueAfter(0) // clear all
		clearTimeout(this._checkQueueTimeout)
	}
	private _checkQueue () {
		clearTimeout(this._checkQueueTimeout)

		let now = this.getCurrentTime()

		let nextTime = now + 99999

		_.each(this._queue, (o: DoOrder, id: string) => {
			if (o.time <= now) {
				o.prepareTime = this.getCurrentTime()
				this._commandsToSendNow.push(() => {
					try {
						let startSend = this.getCurrentTime()
						let endSend: number = 0
						let sentTooSlow: boolean = false
						let p = Promise.resolve(o.fcn(...o.args))
						.then(() => {
							if (!sentTooSlow) this._verifyFulfillCommand(o, startSend, endSend)
						})
						endSend = this.getCurrentTime()
						sentTooSlow = this._verifySendCommand(o, startSend, endSend)
						return p
					} catch (e) {
						this.emit('error', e)
						return Promise.reject(e)
					}
				})
				this.remove(id)
			} else {
				if (o.time < nextTime) nextTime = o.time
			}
		})
		// Go through the commands to be sent:
		this._sendNextCommand()

		// schedule next check:
		let timeToNext = Math.min(1000,
			nextTime - now
		)
		this._checkQueueTimeout = setTimeout(() => {
			this._checkQueue()
		}, timeToNext)
	}
	private _sendNextCommand () {
		if (this._sendingCommands) {
			return
		}
		this._sendingCommands = true

		try {
			const commandToSend = this._commandsToSendNow.shift()
			if (commandToSend) {
				if (this._sendMode === SendMode.BURST) {
					// send all at once:
					commandToSend()
					.catch((e) => {
						this.emit('error', e)
					})
					this._sendingCommands = false
					// send next message:
					setTimeout(() => {
						this._sendNextCommand()
					}, 0)
				} else { // SendMode.IN_ORDER
					// send one, wait for it to finish, then send next:
					commandToSend()
					.catch((e) => {
						this.emit('error', e)
					})
					.then(() => {
						this._sendingCommands = false
						// send next message:
						this._sendNextCommand()
					})
					.catch((e) => {
						this._sendingCommands = false
						this.emit('error', e)
					})
				}
			} else {
				this._sendingCommands = false
			}
		} catch (e) {
			this._sendingCommands = false
			throw e
		}
	}
	private representArguments (o: DoOrder) {
		if (o.args[0] && o.args[0].serialize) {
			return o.args[0].serialize
		} else {
			return o.args
		}
	}
	private _verifySendCommand (o: DoOrder, startSend: number, endSend: number): boolean {
		if (this._options.limitSlowSentCommand) {
			let dt: number = endSend - o.time
			let beforeTime: number = o.time - o.addedTime
			if (dt > this._options.limitSlowSentCommand) {
				let output = {
					added: o.addedTime,
					prepareTime: o.prepareTime,
					plannedSend: o.time,
					startSend: startSend,
					endSend: endSend,
					args: this.representArguments(o)
				}
				this.emit('slowCommand', `Slow sent command, should have been sent at ${o.time}, was ${dt} ms slow (was added ${beforeTime} ms before planned), sendMode: ${SendMode[this._sendMode]}. Command: ${JSON.stringify(output)}`)
				return true
			}
		}
		return false
	}
	private _verifyFulfillCommand (o: DoOrder, startSend: number, endSend: number) {
		if (this._options.limitSlowFulfilledCommand) {
			let fullfilled = this.getCurrentTime()
			let dt: number = fullfilled - o.time
			if (dt > this._options.limitSlowFulfilledCommand) {
				let output = {
					added: o.addedTime,
					prepareTime: o.prepareTime,
					plannedSend: o.time,
					startSend: startSend,
					endSend: endSend,
					fullfilled: fullfilled,
					args: this.representArguments(o)
				}
				this.emit('slowCommand', `Slow fulfilled command, should have been fulfilled at ${o.time}, was ${dt} ms slow. Command: ${JSON.stringify(output)}`)
			}
		}
	}
}
