import { TelemetricsDevice } from '..'
import {
	DeviceType,
	Mappings,
	StatusCode,
	Timeline,
	TimelineContentTelemetrics,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { Socket } from 'net'
import { DoOrderFunctionNothing } from '../../../devices/doOnTime'
import { literal } from '../../../lib'
import { getDeviceContext } from '../../__tests__/testlib'

const SERVER_PORT = 5000
const SERVER_HOST = '1.1.1.1'

const MOCKED_SOCKET_CONNECT = jest.fn()
const MOCKED_SOCKET_WRITE = jest.fn()
const SOCKET_EVENTS: Map<string, (...args: any[]) => void> = new Map()

jest.mock('net', () => {
	return {
		Socket: jest.fn().mockImplementation(() => {
			return {
				connect: MOCKED_SOCKET_CONNECT,
				write: MOCKED_SOCKET_WRITE,
				on: (event: string, listener: (...args: any[]) => void) => {
					SOCKET_EVENTS.set(event, listener)
				},
				destroy: jest.fn(),
			}
		}),
	}
})

jest.mock('../../../devices/doOnTime', () => {
	return {
		DoOnTime: jest.fn().mockImplementation(() => {
			return {
				queue: (_time: number, _queueId: string | undefined, fcn: DoOrderFunctionNothing) => {
					fcn()
				},
				on: jest.fn(),
				dispose: jest.fn(),
				clearQueueNowAndAfter: jest.fn(),
			}
		}),
	}
})

describe('telemetrics', () => {
	const mockedSocket = jest.mocked(Socket)

	let device: TelemetricsDevice

	beforeEach(() => {
		mockedSocket.mockClear()
		MOCKED_SOCKET_CONNECT.mockClear()
		MOCKED_SOCKET_WRITE.mockClear()
		SOCKET_EVENTS.clear()
	})

	afterEach(() => {
		void device.terminate()
	})

	afterAll(() => {
		jest.restoreAllMocks()
	})

	describe('init', () => {
		it('has correct ip, connects to server', () => {
			device = createTelemetricsDevice()

			void device.init({ host: SERVER_HOST })

			expect(MOCKED_SOCKET_CONNECT).toHaveBeenCalledWith(SERVER_PORT, SERVER_HOST)
		})

		it('on error, status is BAD', () => {
			device = createTelemetricsDevice()

			void device.init({ host: SERVER_HOST })
			SOCKET_EVENTS.get('error')!(new Error())

			const result = device.getStatus()
			expect(result.statusCode).toBe(StatusCode.BAD)
		})

		it('on error, error message is included in status', () => {
			device = createTelemetricsDevice()
			const errorMessage = 'someErrorMessage'

			void device.init({ host: SERVER_HOST })
			SOCKET_EVENTS.get('error')!(new Error(errorMessage))

			const result = device.getStatus()
			expect(result.messages).toContainEqual(errorMessage)
		})

		it('on close, closed with error, status is BAD', () => {
			device = createTelemetricsDevice()

			void device.init({ host: SERVER_HOST })
			SOCKET_EVENTS.get('close')!(true)

			const result = device.getStatus()
			expect(result.statusCode).toBe(StatusCode.BAD)
		})

		it('on close, closed without error, status is UNKNOWN', () => {
			device = createTelemetricsDevice()

			void device.init({ host: SERVER_HOST })
			SOCKET_EVENTS.get('close')!(false)

			const result = device.getStatus()
			expect(result.statusCode).toBe(StatusCode.UNKNOWN)
		})

		it('on connect, status is GOOD', () => {
			device = createTelemetricsDevice()

			void device.init({ host: SERVER_HOST })
			SOCKET_EVENTS.get('connect')!()

			const result = device.getStatus()
			expect(result.statusCode).toBe(StatusCode.GOOD)
		})
	})

	function handleState(
		device: TelemetricsDevice,
		state: Timeline.TimelineState<TSRTimelineContent>,
		mappings: Mappings<unknown>
	) {
		const deviceState = device.convertTimelineStateToDeviceState(state, mappings)
		const commands = device.diffStates(undefined, deviceState, mappings, 1)
		for (const command of commands) {
			void device.sendCommand(command)
		}
	}

	describe('handleState', () => {
		it('has correctly formatted command', () => {
			device = createInitializedTelemetricsDevice()
			const commandPrefix = 'P0C'
			const commandPostFix = '\r'
			const presetNumber = 5

			handleState(device, createTimelineState(presetNumber), {})

			const expectedCommand = `${commandPrefix}${presetNumber}${commandPostFix}`
			expect(MOCKED_SOCKET_WRITE).toHaveBeenCalledWith(expectedCommand)
		})

		it('receives preset 1, sends command for preset 1', () => {
			device = createInitializedTelemetricsDevice()
			const presetNumber = 1

			handleState(device, createTimelineState(presetNumber), {})

			const expectedResult = `P0C${presetNumber}\r`
			expect(MOCKED_SOCKET_WRITE).toHaveBeenCalledWith(expectedResult)
		})

		it('receives preset 2, sends command for preset 2', () => {
			device = createInitializedTelemetricsDevice()
			const presetNumber = 2

			handleState(device, createTimelineState(presetNumber), {})

			const expectedResult = `P0C${presetNumber}\r`
			expect(MOCKED_SOCKET_WRITE).toHaveBeenCalledWith(expectedResult)
		})

		it('receives three presets, sends three commands', () => {
			device = createInitializedTelemetricsDevice()

			handleState(device, createTimelineState([1, 2, 3]), {})

			expect(MOCKED_SOCKET_WRITE).toHaveBeenCalledTimes(3)
		})

		it('receives two layers with different shots, sends two commands', () => {
			device = createInitializedTelemetricsDevice()

			const timelineState = createTimelineState(1)
			timelineState.layers['randomLayer'] = {
				id: 'random_layer_id',
				content: literal<TimelineContentTelemetrics>({
					deviceType: DeviceType.TELEMETRICS,
					presetShotIdentifiers: [3],
				}),
			} as unknown as Timeline.ResolvedTimelineObjectInstance<any>

			handleState(device, timelineState, {})

			expect(MOCKED_SOCKET_WRITE).toHaveBeenCalledTimes(2)
		})

		it('receives the same shot at two different times, it sends both', () => {
			device = createInitializedTelemetricsDevice()

			const timelineState = createTimelineState(1)
			const laterTimelineState = createTimelineState(1)
			laterTimelineState.time = timelineState.time + 100

			handleState(device, timelineState, {})
			handleState(device, laterTimelineState, {})

			expect(MOCKED_SOCKET_WRITE).toHaveBeenCalledTimes(2)
		})
	})
})

function createTelemetricsDevice(): TelemetricsDevice {
	return new TelemetricsDevice(getDeviceContext())
}

function createInitializedTelemetricsDevice(): TelemetricsDevice {
	const device = createTelemetricsDevice()
	void device.init({ host: SERVER_HOST })
	return device
}

function createTimelineState(preset: number | number[]): Timeline.TimelineState<TSRTimelineContent> {
	const presetIdentifiers: number[] = Array.isArray(preset) ? preset : [preset]
	return {
		time: 10,
		layers: {
			telemetrics_layer: {
				id: `telemetrics_layer_id_${Math.random() * 1000}`,
				content: literal<TimelineContentTelemetrics>({
					deviceType: DeviceType.TELEMETRICS,
					presetShotIdentifiers: presetIdentifiers,
				}),
			} as unknown as Timeline.ResolvedTimelineObjectInstance<any>,
		},
		nextEvents: [],
	}
}
