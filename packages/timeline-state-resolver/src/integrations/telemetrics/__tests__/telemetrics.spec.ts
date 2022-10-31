import { TelemetricsDevice } from '..'
import {
	DeviceOptionsTelemetrics,
	DeviceType,
	StatusCode,
	TimelineContentTelemetrics,
} from 'timeline-state-resolver-types'
import { Socket } from 'net'
// eslint-disable-next-line node/no-extraneous-import
import { mocked } from 'ts-jest/utils'
import { TimelineState } from 'superfly-timeline'
import { ResolvedTimelineObjectInstance } from 'superfly-timeline/dist/api/api'
import { DoOrderFunctionNothing } from '../../../devices/doOnTime'
import { literal } from '../../../devices/device'

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
	const mockedSocket = mocked(Socket, true)

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

	describe('deviceName', () => {
		it('returns "Telemetrics" plus the device id', () => {
			const deviceId = 'someId'
			device = createTelemetricsDevice(deviceId)

			const result = device.deviceName

			expect(result).toBe(`Telemetrics ${deviceId}`)
		})
	})

	describe('init', () => {
		it('has correct ip, connects to server', () => {
			device = createTelemetricsDevice()

			void device.init({ host: SERVER_HOST })

			expect(MOCKED_SOCKET_CONNECT).toBeCalledWith(SERVER_PORT, SERVER_HOST)
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

	describe('handleState', () => {
		it('has correctly formatted command', () => {
			device = createInitializedTelemetricsDevice()
			const commandPrefix = 'P0C'
			const commandPostFix = '\r'
			const presetNumber = 5

			device.handleState(createTimelineState(presetNumber), {})

			const expectedCommand = `${commandPrefix}${presetNumber}${commandPostFix}`
			expect(MOCKED_SOCKET_WRITE).toBeCalledWith(expectedCommand)
		})

		it('receives preset 1, sends command for preset 1', () => {
			device = createInitializedTelemetricsDevice()
			const presetNumber = 1

			device.handleState(createTimelineState(presetNumber), {})

			const expectedResult = `P0C${presetNumber}\r`
			expect(MOCKED_SOCKET_WRITE).toBeCalledWith(expectedResult)
		})

		it('receives preset 2, sends command for preset 2', () => {
			device = createInitializedTelemetricsDevice()
			const presetNumber = 2

			device.handleState(createTimelineState(presetNumber), {})

			const expectedResult = `P0C${presetNumber}\r`
			expect(MOCKED_SOCKET_WRITE).toBeCalledWith(expectedResult)
		})

		it('receives three presets, sends three commands', () => {
			device = createInitializedTelemetricsDevice()

			device.handleState(createTimelineState([1, 2, 3]), {})

			expect(MOCKED_SOCKET_WRITE).toBeCalledTimes(3)
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
			} as unknown as ResolvedTimelineObjectInstance

			device.handleState(timelineState, {})

			expect(MOCKED_SOCKET_WRITE).toBeCalledTimes(2)
		})

		it('receives the same shot at two different times, it sends both', () => {
			device = createInitializedTelemetricsDevice()

			const timelineState = createTimelineState(1)
			const laterTimelineState = createTimelineState(1)
			laterTimelineState.time = timelineState.time + 100

			device.handleState(timelineState, {})
			device.handleState(laterTimelineState, {})

			expect(MOCKED_SOCKET_WRITE).toBeCalledTimes(2)
		})
	})
})

function createTelemetricsDevice(deviceId?: string): TelemetricsDevice {
	const deviceOptions: DeviceOptionsTelemetrics = {
		type: DeviceType.TELEMETRICS,
	}
	return new TelemetricsDevice(deviceId ?? '', deviceOptions, mockGetCurrentTime)
}

async function mockGetCurrentTime(): Promise<number> {
	return new Promise<number>((resolve) => resolve(1))
}

function createInitializedTelemetricsDevice(): TelemetricsDevice {
	const device = createTelemetricsDevice()
	void device.init({ host: SERVER_HOST })
	return device
}

function createTimelineState(preset: number | number[]): TimelineState {
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
			} as unknown as ResolvedTimelineObjectInstance,
		},
	} as unknown as TimelineState
}
