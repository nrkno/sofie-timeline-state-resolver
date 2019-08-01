const setTimeoutOrg = setTimeout
export class MockTime {
	private _now: number = 10000
	private _hasBeeninit: boolean = false
	mockDateNow () {
		Date.now = jest.fn(() => {
			return this.getCurrentTime()
		})
	}
	get now () {
		if (!this._hasBeeninit) throw new Error('Has not been init')
		return this.getCurrentTime()
	}
	getCurrentTime = () => {
		return this._now
	}
	setNow = (t: number) => {
		this._now = t
	}
	init = () => {
		this._hasBeeninit = true
		this._now = 10000
		jest.useFakeTimers()
	}
	advanceTime = (advanceTime: number) => {
		this._now += advanceTime
		jest.advanceTimersByTime(advanceTime)
	}
	advanceTimeTo = (time: number) => {
		let advance = time - this._now
		if (advance < 0) throw new Error('advanceTime must be positive!')
		this.advanceTime(advance)
		expect(this._now).toEqual(time)
	}
	advanceTimeTicks = async (advanceTime: number) => {
		// this._now += advanceTime

		let endTime = this._now + advanceTime

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
		let advance = time - this._now
		if (advance < 0) throw new Error('advanceTime must be positive (' + advance + ')!')
		await this.advanceTimeTicks(advance)
		expect(this._now).toEqual(time)
	}
	tick = () => {
		return new Promise(resolve => {
			process.nextTick(resolve)
		})
	}
}
test('mockTime', () => {
	let mockTime = new MockTime()
	mockTime.init()
	expect(mockTime.now).toEqual(10000)
	expect(mockTime.now).toEqual(10000)

	mockTime.advanceTime(100)
	expect(mockTime.now).toEqual(10100)
	mockTime.advanceTimeTo(12000)
	expect(mockTime.now).toEqual(12000)
	expect(() => {
		mockTime.advanceTimeTo(11000)
	}).toThrowError()
})
test('mockTimeAsync', async done => {
	let mockTime = new MockTime()
	mockTime.init()
	expect(mockTime.now).toEqual(10000)
	expect(mockTime.now).toEqual(10000)

	await mockTime.advanceTimeTicks(100)
	expect(mockTime.now).toEqual(10100)
	await mockTime.advanceTimeToTicks(12000)
	expect(mockTime.now).toEqual(12000)
	mockTime.advanceTimeToTicks(11000).catch((e) => {
		done()
	})
	// expect(() => {
	// 	return
	// }).toThrowError()
})
