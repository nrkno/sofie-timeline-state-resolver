import { EventEmitter } from 'events'
import * as _ from 'underscore'

export type DoOrderFunction = (...args: any[]) => void | Promise<any> | any
interface DoOrder {
	time: number
	fcn: DoOrderFunction
	args: any[]
}

export enum SendMode {
	/** Send messages as quick as possible */
	BURST = 1,
	/** Send messages in order, wait for the previous message to be acknowledged before sending the next */
	IN_ORDER = 1
}
export class DoOnTime extends EventEmitter {
	getCurrentTime: () => Promise<number>
	private _i: number = 0
	private _queue: {[id: string]: DoOrder} = {}
	private _checkQueueTimeout: any = 0
	private _sendMode: SendMode
	private _commandsToSendNow: (() => Promise<any>)[] = []
	private _sendingCommands: boolean = false

	constructor (getCurrentTime: () => Promise<number>, sendMode: SendMode = SendMode.BURST) {
		super()
		this.getCurrentTime = getCurrentTime
		this._sendMode = sendMode
	}
	public queue (time: number, fcn: DoOrderFunction, ...args: any[]): string {
		if (!(time > 0)) throw Error('time argument must be > 0')
		if (!_.isFunction(fcn)) throw Error('fcn argument must be a function!')
		let id = '_' + (this._i++)
		this._queue[id] = {
			time: time,
			fcn: fcn,
			args: args
		}
		this._checkQueueTimeout = setTimeout(() => {
			this._checkQueue().catch(e => this.emit('error', e))
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
				time: q.time
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
	private async _checkQueue () {
		clearTimeout(this._checkQueueTimeout)

		let now = await this.getCurrentTime()

		let nextTime = now + 99999

		_.each(this._queue, (o: DoOrder, id: string) => {
			if (o.time <= now) {
				this._commandsToSendNow.push(() => {
					try {
						return Promise.resolve(o.fcn(...o.args))
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
			this._checkQueue().catch(e => this.emit('error', e))
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
}
