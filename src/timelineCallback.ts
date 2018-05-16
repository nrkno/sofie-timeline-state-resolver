import { EventEmitter } from 'events'

export class TimelineCallback extends EventEmitter {
	getCurrentTime: () => number
	private _queue: Array<any> = []
	private _checkQueueTimeout: any = 0

	constructor (getCurrentTime: () => number) {
		super()
		this.getCurrentTime = getCurrentTime
	}

	public checkQueue () {
		clearTimeout(this._checkQueueTimeout)

		let now = this.getCurrentTime()

		let nextTime = now + 99999

		for (let i = this._queue.length - 1; i >= 0; i--) {
			let o = this._queue[i]
			if (o.time <= now) {
				this.emit('callback', o.time, o.id, o.callbackName, o.data)
				this._queue.splice(i, 1)
			} else {
				if (o.time < nextTime) nextTime = o.time
			}
		}
		// next check
		let timeToNext = Math.min(1000,
			nextTime - now
		)
		this._checkQueueTimeout = setTimeout(() => {
			this.checkQueue()
		}, timeToNext)
	}
	public queue (time, id, callbackName, data) {
		this._queue.push({time, id, callbackName, data})
		this.checkQueue()
	}
}
