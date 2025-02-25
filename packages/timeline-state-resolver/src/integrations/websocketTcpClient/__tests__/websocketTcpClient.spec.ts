import { jest } from '@jest/globals'
import {} from 'timeline-state-resolver-types/dist/integrations/websocketTcpClient'
import { WebSocketTcpConnection } from '../connection'
import { WebSocketTcpClientDevice, WebSocketTcpCommand } from '../index'
import {
	Timeline,
	DeviceType,
	WebSocketTCPClientOptions,
	TimelineContentTypeWebSocketTcpClient,
	StatusCode,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { MockTime } from '../../../__tests__/mockTime'
import { TimelineContentWebSocketTcpClientAny } from 'timeline-state-resolver-types/src'

// Mock the WebSocketTcpConnection??
jest.mock('../connection')

const MockWebSocketTcpConnection = WebSocketTcpConnection as jest.MockedClass<typeof WebSocketTcpConnection>

describe('WebSocketTcpClientDevice', () => {
	const mockTime = new MockTime()
	let device: WebSocketTcpClientDevice

	beforeEach(() => {
		jest.clearAllMocks()
		mockTime.init()

		// Create device context
		const deviceContext = {
			getCurrentTime: mockTime.getCurrentTime,
			getTimeSinceStart: 0,
			logger: {
				info: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
				debug: jest.fn(),
			},
			emit: jest.fn(),
			resetStateCheck: jest.fn(),
			timeTrace: jest.fn(),
			commandError: jest.fn(),
			resetToState: jest.fn(),
		}

		// Create mock options
		const options: WebSocketTCPClientOptions = {
			webSocket: {
				uri: 'ws://localhost:8080',
				reconnectInterval: 5000,
			},
			tcp: {
				host: '127.0.0.1',
				port: 1234,
				bufferEncoding: 'utf8',
			},
		}

		device = new WebSocketTcpClientDevice(deviceContext as any, options)

		// Mock connection methods
		MockWebSocketTcpConnection.prototype.connect.mockResolvedValue()
		MockWebSocketTcpConnection.prototype.disconnect.mockResolvedValue()
		MockWebSocketTcpConnection.prototype.connected.mockReturnValue(true)
		MockWebSocketTcpConnection.prototype.sendWebSocketMessage.mockImplementation(() => {})
		MockWebSocketTcpConnection.prototype.sendTcpMessage.mockImplementation(() => {})
	})

	afterEach(() => {
		//Are there something like??:
		//mockTime.dispose()
		// Or can we just ignore this
	})

	describe('Connections', () => {
		test('init', async () => {
			await device.init()
			expect(MockWebSocketTcpConnection.prototype.connect).toHaveBeenCalled()
		})

		test('terminate', async () => {
			await device.terminate()
			expect(MockWebSocketTcpConnection.prototype.disconnect).toHaveBeenCalled()
		})

		test('connected', () => {
			expect(device.connected).toBe(true)
			MockWebSocketTcpConnection.prototype.connected.mockReturnValue(false)
			expect(device.connected).toBe(false)
		})

		test('getStatus', () => {
			MockWebSocketTcpConnection.prototype.connected.mockReturnValue(true)
			expect(device.getStatus()).toEqual({
				statusCode: StatusCode.GOOD,
				messages: ["Connected"],
			})
			
			MockWebSocketTcpConnection.prototype.connected.mockReturnValue(false)
			expect(device.getStatus()).toEqual({
				statusCode: StatusCode.BAD,
				messages: ["Disconnected"],
			})
		})
	})

	describe('Timeline', () => {
		test('convertTimelineStateToDeviceState', () => {
			const timelineState: Timeline.TimelineState<TSRTimelineContent> = createTimelineState(
				createWsCommandObject('layer1', 'test ws message')
			)
			expect(device.convertTimelineStateToDeviceState(timelineState)).toBe(timelineState)
		})

		test('diffStates with WebSocket message command', () => {
			const oldState = createTimelineState(createWsCommandObject('layer1', 'old ws state'))
			const newState = createTimelineState(createWsCommandObject('layer1', 'new test ws message state'))

			const commands = device.diffStates(oldState, newState)


			expect(commands).toHaveLength(1)
			expect(commands[0].command.type).toBe(TimelineContentTypeWebSocketTcpClient.WEBSOCKET_MESSAGE)
			expect(commands[0].command.message).toBe('new test ws message state')
		})

		test('diffStates with TCP message command', () => {
			const oldState = createTimelineState(createWsCommandObject('layer1', 'old tcp tate'))
			const newState = createTimelineState(createTcpCommandObject('layer1', 'new test tcp message state'))

			const commands = device.diffStates(oldState, newState)

			expect(commands).toHaveLength(1)
			expect(commands[0].command.type).toBe(TimelineContentTypeWebSocketTcpClient.TCP_MESSAGE)
			expect(commands[0].command.message).toBe('new test tcp message state')
		})

		test('sendCommand with WebSocket message', async () => {
			const command: WebSocketTcpCommand = {
				context: 'context',
				timelineObjId: 'obj1',
				command: {
					type: TimelineContentTypeWebSocketTcpClient.WEBSOCKET_MESSAGE,
					message: 'test ws message',
				},
			}

			await device.sendCommand(command)

			expect(MockWebSocketTcpConnection.prototype.sendWebSocketMessage).toHaveBeenCalledWith('test ws message')
		})

		test('sendCommand with TCP command', async () => {
			const message: WebSocketTcpCommand = {
				context: 'context',
				timelineObjId: 'obj1',
				command: {
					type: TimelineContentTypeWebSocketTcpClient.TCP_MESSAGE,
					message: 'test tcp message',
				},
			}

			await device.sendCommand(message)

			expect(MockWebSocketTcpConnection.prototype.sendTcpMessage).toHaveBeenCalledWith('test tcp message')
		})
	})
})

// Helper functions to create test objects:
function createTimelineState(
	objs: Record<string, { id: string; content: TimelineContentWebSocketTcpClientAny }>
): Timeline.TimelineState<TSRTimelineContent> {
	const state: Timeline.TimelineState<TimelineContentWebSocketTcpClientAny> = {
		time: 1000,
		layers: objs as any,
		nextEvents: [],
	}
	return state
}

function createWsCommandObject(
	layerId: string,
	message: string
): Record<string, { id: string; content: TimelineContentWebSocketTcpClientAny }> {
	return {
		[`tcp_${layerId}`]: {
			id: `tcp_${layerId}`,
			content: {
				deviceType: DeviceType.WEBSOCKET_TCP_CLIENT,
				type: TimelineContentTypeWebSocketTcpClient.WEBSOCKET_MESSAGE,
				message: message, // Changed from 'command' to 'message' to match the interface
			},
		},
	}
}

function createTcpCommandObject(
	layerId: string,
	message: string
): Record<string, { id: string; content: TimelineContentWebSocketTcpClientAny }> {
	return {
		[`tcp_${layerId}`]: {
			id: `tcp_${layerId}`,
			content: {
				deviceType: DeviceType.WEBSOCKET_TCP_CLIENT,
				type: TimelineContentTypeWebSocketTcpClient.TCP_MESSAGE,
				message: message, // Changed from 'command' to 'message' to match the interface
			},
		},
	}
}
