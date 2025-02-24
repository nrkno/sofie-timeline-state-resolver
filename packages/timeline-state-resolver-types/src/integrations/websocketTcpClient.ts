import { DeviceType } from '..'

export enum TimelineContentTypeWebSocketTcpClient {
	WEBSOCKET_MESSAGE = 'websocketMessage',
	TCP_MESSAGE = 'tcpMessage',
}

export interface TimelineContentWebSocketTcpClientBase {
	deviceType: DeviceType.WEBSOCKET_TCP_CLIENT
	type: TimelineContentTypeWebSocketTcpClient
}

export interface TimelineContentWebSocketMessage extends TimelineContentWebSocketTcpClientBase {
  type: TimelineContentTypeWebSocketTcpClient.WEBSOCKET_MESSAGE
  /**  Stringified data to send over TCP */
	message: string
  /** If message contains stringified Base64 binary data or UTF-8 encoded string */
  isBase64Encoded?: boolean
}

export interface TimelineContentTcpCommand extends TimelineContentWebSocketTcpClientBase {
  type: TimelineContentTypeWebSocketTcpClient.TCP_MESSAGE
  /**  Stringified data to send over TCP */
	message: string
  /** If message contains stringified Base64 binary data or UTF-8 encoded string */
  isBase64Encoded?: boolean

}

export type TimelineContentWebSocketTcpClientAny = TimelineContentWebSocketMessage | TimelineContentTcpCommand
