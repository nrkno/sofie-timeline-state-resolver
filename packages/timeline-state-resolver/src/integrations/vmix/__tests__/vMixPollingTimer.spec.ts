import { VMixPollingTimer } from '../vMixPollingTimer'

describe('VMixPollingTimer', () => {
	beforeEach(() => {
		jest.useFakeTimers()
	})

	it('ticks in set intervals', () => {
		const interval = 1500
		const timer = new VMixPollingTimer(interval)

		const onTick = jest.fn()
		timer.on('tick', onTick)

		timer.start()
		expect(onTick).not.toHaveBeenCalled()

		jest.advanceTimersByTime(interval - 10)
		expect(onTick).not.toHaveBeenCalled()

		jest.advanceTimersByTime(10) // 1500
		expect(onTick).toHaveBeenCalledTimes(1)
		onTick.mockClear()

		jest.advanceTimersByTime(interval - 10) // 2990
		expect(onTick).not.toHaveBeenCalled()

		jest.advanceTimersByTime(10) // 3500
		expect(onTick).toHaveBeenCalledTimes(1)
	})

	test('calling start() multiple times does not produce excessive events', () => {
		const interval = 1500
		const timer = new VMixPollingTimer(interval)

		const onTick = jest.fn()
		timer.on('tick', onTick)

		timer.start()
		timer.start()
		expect(onTick).not.toHaveBeenCalled()

		jest.advanceTimersByTime(interval - 10)
		expect(onTick).not.toHaveBeenCalled()

		jest.advanceTimersByTime(10) // 1500
		expect(onTick).toHaveBeenCalledTimes(1)
		onTick.mockClear()

		timer.start()
		expect(onTick).not.toHaveBeenCalled()

		jest.advanceTimersByTime(interval - 10) // 2990
		expect(onTick).not.toHaveBeenCalled()

		jest.advanceTimersByTime(10) // 3500
		expect(onTick).toHaveBeenCalledTimes(1)
	})

	it('can be stopped', () => {
		const interval = 1500
		const timer = new VMixPollingTimer(interval)

		const onTick = jest.fn()
		timer.on('tick', onTick)

		timer.start()
		expect(onTick).not.toHaveBeenCalled()

		jest.advanceTimersByTime(interval) // 1500
		expect(onTick).toHaveBeenCalledTimes(1)
		onTick.mockClear()

		timer.stop()

		jest.advanceTimersByTime(interval) // 3000
		expect(onTick).not.toHaveBeenCalled()

		jest.advanceTimersByTime(interval) // 4500
		expect(onTick).not.toHaveBeenCalled()
	})

	it('can be postponed', () => {
		const interval = 1500
		const timer = new VMixPollingTimer(interval)

		const onTick = jest.fn()
		timer.on('tick', onTick)

		timer.start()
		expect(onTick).not.toHaveBeenCalled()

		jest.advanceTimersByTime(interval) // 1500
		expect(onTick).toHaveBeenCalledTimes(1)
		onTick.mockClear()

		const postponeTime = 5000
		timer.postponeNextTick(postponeTime)

		jest.advanceTimersByTime(interval) // 3000
		expect(onTick).not.toHaveBeenCalled()

		jest.advanceTimersByTime(postponeTime - interval - 10) // 6490
		expect(onTick).not.toHaveBeenCalled()

		jest.advanceTimersByTime(10) // 6500
		expect(onTick).toHaveBeenCalledTimes(1)
		onTick.mockClear()

		// it should return to normal interval
		jest.advanceTimersByTime(interval) // 8010
		expect(onTick).toHaveBeenCalledTimes(1)
	})
})
