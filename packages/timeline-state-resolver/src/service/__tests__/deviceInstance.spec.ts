import { DeviceType, StatusCode } from 'timeline-state-resolver-types'
import { DeviceInstanceWrapper } from '../DeviceInstance'
import { ActionExecutionResultCode } from 'timeline-state-resolver-types'
import { t } from '../../lib'
import { DevicesDict } from '../devices'

const StateHandler = {
	terminate: jest.fn(),
	clearFutureStates: jest.fn(),
	handleState: jest.fn(),
	setCurrentState: jest.fn(),
	clearFutureAfterTimestamp: jest.fn(),
}
jest.mock('../stateHandler', () => ({
	StateHandler: class Statehandler {
		terminate = StateHandler.terminate
		clearFutureStates = StateHandler.clearFutureStates
		handleState = jest.fn(async () => {
			// some shenanigans required to get the mock impl to work
			StateHandler.handleState()
			return Promise.resolve()
		})
		setCurrentState = StateHandler.setCurrentState
		clearFutureAfterTimestamp = StateHandler.clearFutureAfterTimestamp
	},
}))

const AbstractDeviceMock = {
	init: jest.fn(),
	terminate: jest.fn(),
	action: jest.fn(),
	convertTimelineStateToDeviceState: jest.fn(),
	getStatus: jest.fn(),
	diffStates: jest.fn(),
	sendCommand: jest.fn(),
	on: jest.fn(),
}
jest.mock('../../integrations/abstract/index', () => ({
	AbstractDevice: class AbstractDevice {
		actions = {
			action: AbstractDeviceMock.action,
		}
		init = AbstractDeviceMock.init
		terminate = AbstractDeviceMock.terminate
		convertTimelineStateToDeviceState = AbstractDeviceMock.convertTimelineStateToDeviceState
		getStatus = () => {
			AbstractDeviceMock.getStatus()
			return { statusCode: StatusCode.GOOD, messages: [] }
		}
		diffStates = AbstractDeviceMock.diffStates
		sendCommand = AbstractDeviceMock.sendCommand
		on = AbstractDeviceMock.on
	},
}))

function getDeviceInstance(getTime = async () => Date.now()): DeviceInstanceWrapper {
	return new DeviceInstanceWrapper('wrapper0', Date.now(), { type: DeviceType.ABSTRACT }, getTime)
}

describe('DeviceInstance', () => {
	afterEach(() => {
		jest.resetAllMocks()
	})

	test('constructor', () => {
		const dev = getDeviceInstance()
		expect(dev).toBeTruthy()

		// @ts-expect-error
		expect(dev._stateHandler).toBeTruthy()
		// @ts-expect-error
		expect(dev._device).toBeTruthy()
	})

	test('initDevice', async () => {
		const dev = getDeviceInstance()
		await dev.initDevice()
		expect(AbstractDeviceMock.init).toHaveBeenCalled()
	})

	test('terminate', async () => {
		const dev = getDeviceInstance()
		await dev.terminate()

		expect(StateHandler.terminate).toHaveBeenCalled()
		expect(AbstractDeviceMock.terminate).toHaveBeenCalled()
	})

	describe('executeAction', () => {
		test('execute action', async () => {
			const dev = getDeviceInstance()
			await dev.executeAction('action', { payload: 1 })

			expect(AbstractDeviceMock.action).toHaveBeenCalledWith({ payload: 1 })
		})

		test('unknown id', async () => {
			const dev = getDeviceInstance()
			const result = await dev.executeAction('doesnt exist', { payload: 1 })

			expect(AbstractDeviceMock.action).not.toHaveBeenCalled()
			expect(result).toEqual({
				result: ActionExecutionResultCode.Error,
				response: t('Action "{{id}}" not found', { id: 'doesnt exist' }),
			})
		})
	})

	test('handleState', () => {
		const dev = getDeviceInstance()
		dev.handleState({ time: 100, layers: {}, nextEvents: [] }, {})

		expect(StateHandler.handleState).toHaveBeenCalled()
	})

	test('clearFuture', () => {
		const dev = getDeviceInstance()
		dev.clearFuture(1)

		expect(StateHandler.clearFutureAfterTimestamp).toHaveBeenCalledWith(1)
	})

	test('getDetails', () => {
		const dev = getDeviceInstance()
		const details = dev.getDetails()

		expect(details).toEqual({
			deviceId: 'wrapper0',
			deviceType: DeviceType.ABSTRACT,
			deviceName: DevicesDict[DeviceType.ABSTRACT].deviceName('wrapper0', {}),
			instanceId: expect.any(Number),
			startTime: expect.any(Number),

			supportsExpectedPlayoutItems: false,
			canConnect: DevicesDict[DeviceType.ABSTRACT].canConnect,
		})
	})

	test('getStatus', () => {
		const dev = getDeviceInstance()
		const status = dev.getStatus()

		expect(AbstractDeviceMock.getStatus).toHaveBeenCalled()
		expect(status).toEqual({
			statusCode: StatusCode.GOOD,
			messages: [],
			active: false, // because it has no mappings
		})

		dev.handleState(
			{ time: 1, layers: {}, nextEvents: [] },
			{ test: { device: DeviceType.ABSTRACT, deviceId: 'wrapper0', options: {} } }
		)
		const status2 = dev.getStatus()

		expect(AbstractDeviceMock.getStatus).toHaveBeenCalledTimes(2)
		expect(status2).toEqual({
			statusCode: StatusCode.GOOD,
			messages: [],
			active: true, // because it has mappings now
		})
	})

	test('getCurrentTime', async () => {
		const getRemoteTime = jest.fn(async () => Date.now() - 10)
		const dev = getDeviceInstance(getRemoteTime) // simulate 10ms ipc delay
		// wait for the first sync to happen
		await new Promise<void>((r) => setTimeout(() => r(), 10))
		expect(getRemoteTime).toHaveBeenCalledTimes(1)

		const t = dev.getCurrentTime()
		// it may be a bit delayed
		expect(t).toBeGreaterThanOrEqual(Date.now() - 12)
		// it should never be faster
		expect(t).toBeLessThanOrEqual(Date.now() - 10)

		// check that this still works after a bit of delay
		await new Promise<void>((r) => setTimeout(() => r(), 250))
		expect(getRemoteTime).toHaveBeenCalledTimes(1)

		const t2 = dev.getCurrentTime()
		expect(t2).toBeGreaterThanOrEqual(Date.now() - 12)
		expect(t2).toBeLessThanOrEqual(Date.now() - 10)
	})

	// todo - test event handlers
})
