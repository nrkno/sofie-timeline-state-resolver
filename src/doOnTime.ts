import { EventEmitter } from 'events'
import * as _ from 'underscore'

export type DoOrderFunction = (...args: any[]) => void | Promise<any> | any
interface DoOrder {
	time: number
	fcn: DoOrderFunction
	args: any[]
}

export class DoOnTime extends EventEmitter {
	getCurrentTime: () => number
	private _i: number = 0
	private _queue: {[id: string]: DoOrder} = {}
	private _checkQueueTimeout: any = 0

	constructor (getCurrentTime: () => number) {
		super()
		this.getCurrentTime = getCurrentTime
	}
	public queue (time, fcn: DoOrderFunction, ...args: any[]): string {
		if (!(time > 0)) throw Error('time argument must be > 0')
		if (!_.isFunction(fcn)) throw Error('fcn argument must be a function!')
		let id = '_' + (this._i++)
		this._queue[id] = {
			time: time,
			fcn: fcn,
			args: args
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
				time: q.time
			}
		})
	}
	public clearQueueAfter (time) {
		_.each(this._queue, (q: DoOrder, id: string) => {
			if (q.time > time) {
				this.remove(id)
			}
		})
	}
	public clearQueueNowAndAfter (time) {
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
				try {
					Promise.resolve(o.fcn(...o.args))
					.catch((e) => {
						this.emit('error', e)
					})
				} catch (e) {
					this.emit('error', e)
				}
				this.remove(id)
			} else {
				if (o.time < nextTime) nextTime = o.time
			}
		})
		// next check
		let timeToNext = Math.min(1000,
			nextTime - now
		)
		this._checkQueueTimeout = setTimeout(() => {
			this._checkQueue()
		}, timeToNext)
	}
}
