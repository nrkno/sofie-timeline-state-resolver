import { EventEmitter } from 'events'
import * as _ from 'underscore'

interface DoOrder {
	time: number,
	fcn: () => void
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

	public checkQueue () {
		clearTimeout(this._checkQueueTimeout)

		let now = this.getCurrentTime()

		let nextTime = now + 99999

		_.each(this._queue, (o: DoOrder, id: string) => {
			if (o.time <= now) {
				o.fcn()
				delete this._queue[id]
			} else {
				if (o.time < nextTime) nextTime = o.time
			}
		})
		// next check
		let timeToNext = Math.min(1000,
			nextTime - now
		)
		this._checkQueueTimeout = setTimeout(() => {
			this.checkQueue()
		}, timeToNext)
	}
	public queue (time, fcn: () => void): string {
		if (!(time > 0)) throw Error('time argument must be > 0')
		if (!_.isFunction(fcn)) throw Error('fcn argument must be a function!')
		let id = '_' + (this._i++)
		this._queue[id] = {
			time: time,
			fcn: fcn
		}
		this.checkQueue()
		return id
	}
}
