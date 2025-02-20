import { DeviceType } from 'timeline-state-resolver-types/src'

export enum TimelineContentTypeWebSocketTcpClient {
	WEBSOCKET_MESSAGE = 'websocketMessage',
	TCP_COMMAND = 'tcpCommand',
}

export interface TimelineContentWebSocketTcpClientBase {
	deviceType: DeviceType.WEBSOCKET_TCP_CLIENT
	type: TimelineContentTypeWebSocketTcpClient
}

// We might end up using only 1 datatype as it's the same data being sent over different channels:
export interface TimelineContentWebSocketMessage extends TimelineContentWebSocketTcpClientBase {
	type: TimelineContentTypeWebSocketTcpClient.WEBSOCKET_MESSAGE
	message: string | Uint8Array // Data to send over WebSocket
}

export interface TimelineContentTcpCommand extends TimelineContentWebSocketTcpClientBase {
	type: TimelineContentTypeWebSocketTcpClient.TCP_COMMAND
	command: string | Uint8Array // Data to send over TCP
}

export type TimelineContentWebSocketTcpClientAny = TimelineContentWebSocketMessage | TimelineContentTcpCommand
