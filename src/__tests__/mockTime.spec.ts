export class MockTime {
	private _now: number = 10000
	private _hasBeeninit: boolean = false
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
