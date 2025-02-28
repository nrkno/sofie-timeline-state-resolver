import { DeviceType } from '..'

export enum TimelineContentTypeWebSocketClient {
	WEBSOCKET_MESSAGE = 'websocketMessage',
}

export interface TimelineContentWebSocketClientBase {
	deviceType: DeviceType.WEBSOCKET_CLIENT
	type: TimelineContentTypeWebSocketClient
}

export interface TimelineContentWebSocketMessage extends TimelineContentWebSocketClientBase {
	type: TimelineContentTypeWebSocketClient.WEBSOCKET_MESSAGE
	/**  Stringified data to send over Websocket connection */
	message: string
	/** If message contains stringified Base64 binary data or UTF-8 encoded string */
	isBase64Encoded?: boolean
}

export type TimelineContentWebSocketClientAny = TimelineContentWebSocketMessage
