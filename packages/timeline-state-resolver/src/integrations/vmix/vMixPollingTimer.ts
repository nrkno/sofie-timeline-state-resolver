import { EventEmitter } from 'eventemitter3'

export type TimerEvents = {
	tick: []
}

/**
 * A timer that once started, ticks in intevals
 * Allows the next tick to be postponed
 */
export class VMixPollingTimer extends EventEmitter<TimerEvents> {
	private pollTimeout: NodeJS.Timeout | null = null

	constructor(private readonly pollIntervalMs: number) {
		super()
		if (pollIntervalMs <= 0) throw Error('Poll interval needs to be > 0')
	}

	start() {
		this.clearTimeout()
		this.pollTimeout = setTimeout(() => this.tick(), this.pollIntervalMs)
	}

	/**
	 * Pauses ticking until `temporaryTimeoutMs` passes
	 * @param temporaryTimeoutMs Time the next tick will execute after
	 */
	postponeNextTick(temporaryTimeoutMs: number) {
		this.clearTimeout()
		this.pollTimeout = setTimeout(() => this.tick(), temporaryTimeoutMs)
	}

	stop() {
		this.clearTimeout()
	}

	private clearTimeout() {
		if (this.pollTimeout) {
			clearTimeout(this.pollTimeout)
			this.pollTimeout = null
		}
	}

	private tick() {
		this.emit('tick')
		this.start()
	}
}
