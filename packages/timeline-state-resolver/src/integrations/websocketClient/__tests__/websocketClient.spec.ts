import {} from 'timeline-state-resolver-types/dist/integrations/websocketClient'
import { WebSocketConnection } from '../connection'
import { WebSocketClientDevice, WebSocketCommand } from '../index'
import {
	Timeline,
	DeviceType,
	WebSocketClientOptions,
	TimelineContentTypeWebSocketClient,
	StatusCode,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { MockTime } from '../../../__tests__/mockTime'
import { TimelineContentWebSocketClientAny } from 'timeline-state-resolver-types/src'

// Mock the WebSocketConnection??
jest.mock('../connection')

const MockWebSocketConnection = WebSocketConnection as jest.MockedClass<typeof WebSocketConnection>

describe('WebSocketClientDevice', () => {
	const mockTime = new MockTime()
	let device: WebSocketClientDevice

	beforeEach(async () => {
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
		const options: WebSocketClientOptions = {
			webSocket: {
				uri: 'ws://localhost:8080',
				reconnectInterval: 5000,
			},
		}

		device = new WebSocketClientDevice(deviceContext as any)

		// Mock connection methods
		MockWebSocketConnection.prototype.connect.mockResolvedValue()
		MockWebSocketConnection.prototype.disconnect.mockResolvedValue()
		MockWebSocketConnection.prototype.connected.mockReturnValue(true)
		MockWebSocketConnection.prototype.sendWebSocketMessage.mockImplementation()

		// Initialize device
		await device.init(options)
	})

	afterEach(() => {
		//Are there something like??:
		//mockTime.dispose()
		// Or can we just ignore this
	})

	describe('Connections', () => {
		test('init', async () => {
			expect(MockWebSocketConnection.prototype.connect).toHaveBeenCalled()
		})

		test('terminate', async () => {
			await device.terminate()
			expect(MockWebSocketConnection.prototype.disconnect).toHaveBeenCalled()
		})

		test('connected', () => {
			expect(device.connected).toBe(true)

			MockWebSocketConnection.prototype.connected.mockReturnValue(false)
			expect(device.connected).toBe(false)
		})

		test('getStatus', () => {
			MockWebSocketConnection.prototype.connected.mockReturnValue(true)
			expect(device.getStatus()).toEqual({
				statusCode: StatusCode.BAD,
				messages: ['No Connection'],
			})

			//@ts-expect-error - is set to private
			MockWebSocketConnection.prototype.isWsConnected = true
			jest.spyOn(WebSocketConnection.prototype, 'connectionStatus').mockReturnValue({
				statusCode: StatusCode.GOOD,
				messages: ['WS Connected'],
			})

			//@ts-expect-error - is set to private
			MockWebSocketConnection.prototype.isWsConnected = false
			jest.spyOn(WebSocketConnection.prototype, 'connectionStatus').mockReturnValue({
				statusCode: StatusCode.BAD,
				messages: ['WS DisConnected'],
			})
		})
	})

	describe('Timeline', () => {
		test('convertTimelineStateToDeviceState', () => {
			const timelineState: Timeline.TimelineState<TSRTimelineContent> = createTimelineState(
				createCommandObject('layer1', 'test ws message')
			)
			// As nothings is converted in this device, the result should be the same as the input:
			expect(device.convertTimelineStateToDeviceState(timelineState)).toBe(timelineState)
		})

		test('diffStates with WebSocket message command', () => {
			const oldState = createTimelineState(createCommandObject('layer1', 'old ws state'))
			const newState = createTimelineState(createCommandObject('layer1', 'new test ws message state'))

			const commands = device.diffStates(oldState, newState)

			expect(commands).toHaveLength(1)
			expect(commands[0].command.type).toBe(TimelineContentTypeWebSocketClient.WEBSOCKET_MESSAGE)
			expect(commands[0].command.message).toBe('new test ws message state')
		})

		test('sendCommand with WebSocket message', async () => {
			const command: WebSocketCommand = {
				context: 'context',
				timelineObjId: 'obj1',
				command: {
					type: TimelineContentTypeWebSocketClient.WEBSOCKET_MESSAGE,
					message: 'test ws message',
				},
			}

			await device.sendCommand(command)

			expect(MockWebSocketConnection.prototype.sendWebSocketMessage).toHaveBeenCalledWith('test ws message')
		})
	})
})

// Helper functions to create test objects:
function createTimelineState(
	objs: Record<string, { id: string; content: TimelineContentWebSocketClientAny }>
): Timeline.TimelineState<TSRTimelineContent> {
	const state: Timeline.TimelineState<TimelineContentWebSocketClientAny> = {
		time: 1000,
		layers: objs as any,
		nextEvents: [],
	}
	return state
}

function createCommandObject(
	layerId: string,
	message: string
): Record<string, { id: string; content: TimelineContentWebSocketClientAny }> {
	return {
		[`tcp_${layerId}`]: {
			id: `tcp_${layerId}`,
			content: {
				deviceType: DeviceType.WEBSOCKET_CLIENT,
				type: TimelineContentTypeWebSocketClient.WEBSOCKET_MESSAGE,
				message: message, // Changed from 'command' to 'message' to match the interface
			},
		},
	}
}
