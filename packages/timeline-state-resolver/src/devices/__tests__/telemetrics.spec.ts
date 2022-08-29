import { TelemetricsDevice } from '../telemetrics'
import { DeviceOptionsTelemetrics, DeviceType, StatusCode, TimelineObjTelemetrics } from 'timeline-state-resolver-types'
import { Socket } from 'net'
// eslint-disable-next-line node/no-extraneous-import
import { mocked } from 'ts-jest/utils'
import { TimelineState } from 'superfly-timeline'
import { ResolvedTimelineObjectInstance } from 'superfly-timeline/dist/api/api'

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
			}
		}),
	}
})

describe('telemetrics', () => {
	const mockedSocket = mocked(Socket, true)

	beforeEach(() => {
		mockedSocket.mockClear()
		MOCKED_SOCKET_CONNECT.mockClear()
		MOCKED_SOCKET_WRITE.mockClear()
		SOCKET_EVENTS.clear()
	})

	describe('deviceName', () => {
		it('returns "Telemetrics" plus the device id', () => {
			const deviceId = 'someId'
			const device = createTelemetricsDevice(deviceId)

			const result = device.deviceName

			expect(result).toBe(`Telemetrics ${deviceId}`)
		})
	})

	describe('init', () => {
		it('has correct ip, connects to server', () => {
			const device = createTelemetricsDevice()

			void device.init({ host: SERVER_HOST })

			expect(MOCKED_SOCKET_CONNECT).toBeCalledWith(SERVER_PORT, SERVER_HOST)
		})

		it('on error, status is FATAL', () => {
			const device = createTelemetricsDevice()

			void device.init({ host: SERVER_HOST })
			SOCKET_EVENTS.get('error')!(new Error())

			const result = device.getStatus()
			expect(result.statusCode).toBe(StatusCode.FATAL)
		})

		it('on error, error message is included in status', () => {
			const device = createTelemetricsDevice()
			const errorMessage = 'someErrorMessage'

			void device.init({ host: SERVER_HOST })
			SOCKET_EVENTS.get('error')!(new Error(errorMessage))

			const result = device.getStatus()
			expect(result.messages).toContainEqual(errorMessage)
		})

		it('on close, closed with error, status is FATAL', () => {
			const device = createTelemetricsDevice()

			void device.init({ host: SERVER_HOST })
			SOCKET_EVENTS.get('close')!(true)

			const result = device.getStatus()
			expect(result.statusCode).toBe(StatusCode.FATAL)
		})

		it('on close, closed with error, status is BAD', () => {
			const device = createTelemetricsDevice()

			void device.init({ host: SERVER_HOST })
			SOCKET_EVENTS.get('close')!(false)

			const result = device.getStatus()
			expect(result.statusCode).toBe(StatusCode.BAD)
		})

		it('on connect, status is GOOD', () => {
			const device = createTelemetricsDevice()

			void device.init({ host: SERVER_HOST })
			SOCKET_EVENTS.get('connect')!()

			const result = device.getStatus()
			expect(result.statusCode).toBe(StatusCode.GOOD)
		})
	})

	describe('handleState', () => {
		it('has correctly formatted command', () => {
			const device = createInitializedTelemetricsDevice()
			const commandPrefix = 'P0C'
			const commandPostFix = '\r'
			const presetNumber = 5

			device.handleState(createTimelineState(presetNumber), {})

			const expectedCommand = `${commandPrefix}${presetNumber}${commandPostFix}`
			expect(MOCKED_SOCKET_WRITE).toBeCalledWith(expectedCommand)
		})

		it('receives preset 1, sends command for preset 1', () => {
			const device = createInitializedTelemetricsDevice()
			const presetNumber = 1

			device.handleState(createTimelineState(presetNumber), {})

			const expectedResult = `P0C${presetNumber}\r`
			expect(MOCKED_SOCKET_WRITE).toBeCalledWith(expectedResult)
		})

		it('receives preset 2, sends command for preset 2', () => {
			const device = createInitializedTelemetricsDevice()
			const presetNumber = 2

			device.handleState(createTimelineState(presetNumber), {})

			const expectedResult = `P0C${presetNumber}\r`
			expect(MOCKED_SOCKET_WRITE).toBeCalledWith(expectedResult)
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

function createTimelineState(preset?: number): TimelineState {
	return {
		layers: {
			telemetrics_layer: {
				content: {
					presetNumber: preset ?? 1,
				} as unknown as TimelineObjTelemetrics,
			} as unknown as ResolvedTimelineObjectInstance,
		},
	} as unknown as TimelineState
}
