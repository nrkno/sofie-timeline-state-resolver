export class MockTime {
	private _now = 10000
	private _hasBeeninit = false
	get now() {
		if (!this._hasBeeninit) throw new Error('Has not been init')
		return this.getCurrentTime()
	}
	getCurrentTime = () => {
		return this._now
	}

	// eslint-disable-next-line @typescript-eslint/promise-function-async
	getCurrentTime2 = (): Promise<number> => {
		// Note: this is intentionally not an async, as we are trying to bypass some hackery that threadedClass forces a promise upon us
		return this._now as any
	}
	setNow = (t: number) => {
		this._now = t
	}
	init = () => {
		this._hasBeeninit = true
		this._now = 10000
		jest.useFakeTimers({ now: this._now })
	}
	advanceTime = (advanceTime: number) => {
		this._now += advanceTime
		jest.advanceTimersByTime(advanceTime)
	}
	advanceTimeTo = (time: number) => {
		const advance = time - this._now
		if (advance < 0) throw new Error('advanceTime must be positive!')
		this.advanceTime(advance)
		expect(this._now).toEqual(time)
	}
	advanceTimeTicks = async (advanceTime: number) => {
		// this._now += advanceTime

		const endTime = this._now + advanceTime

		const chunks = 5 // ms

		while (this._now < endTime) {
			let advanceChunk = chunks
			if (this._now + advanceChunk > endTime) {
				advanceChunk = endTime - this._now
			}
			this._now += advanceChunk

			await this.tick()
			jest.advanceTimersByTime(advanceChunk)
		}
		await this.tick()
	}
	advanceTimeToTicks = async (time: number) => {
		const advance = time - this._now
		if (advance < 0) throw new Error('advanceTime must be positive (' + advance + ')!')
		await this.advanceTimeTicks(advance)
		expect(this._now).toEqual(time)
	}
	tick = async () => {
		return new Promise((resolve) => {
			jest.requireActual('timers').setImmediate(resolve)
		})
	}
}
