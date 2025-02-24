import { WebSocketTcpClientDevice, WebSocketTcpCommand } from '../index'
import { WebSocketTcpConnection } from '../connection'
import { StatusCode, WebSocketTCPClientOptions } from 'timeline-state-resolver-types'
import * as WebSocket from 'ws'
import { Socket } from 'net'
import { jest } from '@jest/globals'

jest.mock('ws')
jest.mock('net')

describe('WebSocketTCPClientDevice', () => {
	const mockContext = {
		logger: {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		},
	}

	const mockOptions: WebSocketTCPClientOptions = {
		webSocket: {
			uri: 'ws://localhost:8080',
			reconnectInterval: 5000,
		},
		tcp: {
			host: 'localhost',
			port: 3000,
			bufferEncoding: 'utf8',
		},
	}

	let device: WebSocketTcpClientDevice
	let mockWs: jest.Mocked<WebSocket>
	let mockTcp: jest.Mocked<Socket>

	beforeEach(() => {
		jest.clearAllMocks()
		device = new WebSocketTcpClientDevice(mockContext as any, mockOptions)
		mockWs = new WebSocket('') as jest.Mocked<WebSocket>
		mockTcp = new Socket() as jest.Mocked<Socket>
	})

	describe('init()', () => {
		it('should initialize successfully', async () => {
			const initResult = await device.init()
			expect(initResult).toBe(true)
		})
	})

	describe('terminate()', () => {
		it('should terminate successfully', async () => {
			await device.init()
			await device.terminate()
			// Verify cleanup was done
		})
	})

	describe('connection status', () => {
		it('should report correct connection status', () => {
			expect(device.connected).toBe(false)
			// Mock connection
			//device['connection'].connected = jest.fn().mockReturnValue(true)
			expect(device.connected).toBe(true)
		})

		it('should report correct device status', () => {
			const status = device.getStatus()
			expect(status.statusCode).toBe(StatusCode.UNKNOWN)

			// Mock good connection
			//device['connection'].connected = jest.fn().mockReturnValue(true)
			expect(device.getStatus().statusCode).toBe(StatusCode.GOOD)
		})
	})

	describe('sendCommand()', () => {
		it('should handle WebSocket messages', async () => {
			await device.init()
			const command: WebSocketTcpCommand = {
                // Commans is not yet implemented correctly in websocketTcpClient
				command: 'added',
				context: 'test',
				timelineObjId: 'obj1',
				content: {
					command: 'webSocket',
					message: 'test message',
				},
			}
			await device.sendCommand(command)
			// Verify message was sent
		})

		it('should handle TCP messages', async () => {
			await device.init()
			// const command: WebSocketTcpCommand = {
			// 	context: 'test',
			// 	timelineObjId: 'obj2',
			// 	command: {
			// 		type: 'tcp',
			// 		command: 'test command',
			// 	},
			// }
			// await device.sendCommand(command)
			// Verify command was sent
		})
	})
})

describe('WebSocketTcpConnection', () => {
	const mockOptions: WebSocketTCPClientOptions = {
		webSocket: {
			uri: 'ws://localhost:8080',
			reconnectInterval: 5000,
		},
		tcp: {
			host: 'localhost',
			port: 3000,
			bufferEncoding: 'utf8',
		},
	}

	let connection: WebSocketTcpConnection
	let mockWs: jest.Mocked<WebSocket>
	let mockTcp: jest.Mocked<Socket>

	beforeEach(() => {
		jest.clearAllMocks()
		connection = new WebSocketTcpConnection(mockOptions)
		mockWs = new WebSocket('') as jest.Mocked<WebSocket>
		mockTcp = new Socket() as jest.Mocked<Socket>
	})

	describe('connect()', () => {
		it('should establish WebSocket and TCP connections', async () => {
			const connectPromise = connection.connect()

			// ToDo

			await connectPromise
			expect(connection.connected()).toBe(true)
		})

		it('should handle connection failures', async () => {
			const connectPromise = connection.connect()

			// ToDo

			await expect(connectPromise).rejects.toThrow()
			expect(connection.connected()).toBe(false)
		})
	})

	describe('send messages', () => {
		beforeEach(async () => {
			await connection.connect()
		})

		it('should send WebSocket messages', () => {
			const message = 'test message'
			connection.sendWebSocketMessage(message)
			expect(mockWs.send).toHaveBeenCalledWith(message)
		})

		it('should send TCP messages', () => {
			const message = 'test command'
			connection.sendTcpMessage(message)
			expect(mockTcp.write).toHaveBeenCalledWith(message)
		})

		it('should handle WebSocket send errors', () => {
			mockWs.send = jest.fn().mockImplementation(() => {
				throw new Error('Send failed')
			})
			expect(() => connection.sendWebSocketMessage('test')).toThrow()
		})

		it('should handle TCP send errors', () => {
            // ToDo:
			expect(() => connection.sendTcpMessage('test')).toThrow()
		})
	})

	describe('disconnect()', () => {
		it('should close both connections', async () => {
			await connection.connect()
			await connection.disconnect()

			expect(mockWs.close).toHaveBeenCalled()
			expect(mockTcp.end).toHaveBeenCalled()
			expect(connection.connected()).toBe(false)
		})
	})
})
