import { CommandWithContext, Device, DeviceContextAPI } from '../../service/device'
import {
	ActionExecutionResultCode,
	DeviceStatus,
	DeviceType,
	StatusCode,
	Timeline,
	TimelineContentTypeWebSocketClient,
	TSRTimelineContent,
	WebSocketClientOptions,
} from 'timeline-state-resolver-types'
import { WebSocketConnection } from './connection'
import { WebsocketClientActions } from 'timeline-state-resolver-types'

/** this is not an extends but an implementation of the CommandWithContext */
export interface WebSocketCommand extends CommandWithContext {
	command: {
		type: TimelineContentTypeWebSocketClient
		message: string
		isBase64Encoded?: boolean
	}
	context: string
}
export type WebSocketClientDeviceState = Timeline.TimelineState<TSRTimelineContent>

export class WebSocketClientDevice extends Device<
	WebSocketClientOptions,
	WebSocketClientDeviceState,
	WebSocketCommand
> {
	// Use ! as the connection will be initialized in init:
	private connection!: WebSocketConnection

	constructor(context: DeviceContextAPI<any>) {
		super(context)
	}

	public async init(options: WebSocketClientOptions): Promise<boolean> {
		this.connection = new WebSocketConnection(options)
		await this.connection.connect()
		return true
	}

	readonly actions = {
		[WebsocketClientActions.Reconnect]: async (_id: string) => {
			await this.connection.connect()
			return { result: ActionExecutionResultCode.Ok }
		},
		[WebsocketClientActions.ResetState]: async (_id: string) => {
			return { result: ActionExecutionResultCode.Ok }
		},
		[WebsocketClientActions.SendWebSocketMessage]: async (_id: string, payload?: Record<string, any>) => {
			if (!payload?.message) {
				return { result: ActionExecutionResultCode.Error, response: { key: 'Missing message in payload' } }
			}
			await this.sendCommand(payload.message)
			return { result: ActionExecutionResultCode.Ok }
		},
	}

	public get connected(): boolean {
		return this.connection?.connected() ?? false
	}

	public getStatus(): Omit<DeviceStatus, 'active'> {
		return this.connection?.connectionStatus() ?? { statusCode: StatusCode.BAD, messages: ['No Connection'] }
	}

	public convertTimelineStateToDeviceState(state: WebSocketClientDeviceState): WebSocketClientDeviceState {
		// When a new Timeline State is about to be executed
		// This is called to convert the generic Timeline State into a custom "device state".
		// For example:
		// tl obj: { layer: 'abc', content: { type: TimelineContentTypeWebSocketClient::WEBSOCKET_MESSAGE, message: 'hello'} }
		// can be converted into: { websocketMessages: { abc: 'hello } }
		//
		// This is optional and for convenience only (like to simplify the diffing logic in diffStates())

		return state
	}

	// ** Calculate Diffs of state and create the commands
	public diffStates(oldState: WebSocketClientDeviceState, newState: WebSocketClientDeviceState): WebSocketCommand[] {
		// This is called to calculate and creates the commands needed to make olState reflect newState.
		// Note: We DON'T send the commands NOW, but rather we return a list of the commands, to be executed
		// later (send to sendCommand() ).

		const commands: WebSocketCommand[] = []
		for (const [layerName, timelineObject] of Object.entries<
			Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>
		>(newState.layers)) {
			if (timelineObject.content.deviceType !== DeviceType.WEBSOCKET_CLIENT) continue

			// We should send the command whenever the timeline object content has been ADDED or CHANGED
			let changeType = 'N/A'
			if (!oldState.layers[layerName]) {
				changeType = 'added'
			} else if (JSON.stringify(oldState.layers[layerName].content) !== JSON.stringify(timelineObject.content)) {
				//} else if ( isEqual(oldState.layers[layerName].content, timelineObject.content) ) {
				changeType = 'changed'
			} else {
				continue // no changes
			}

			if (timelineObject.content.type === TimelineContentTypeWebSocketClient.WEBSOCKET_MESSAGE) {
				commands.push({
					command: {
						type: TimelineContentTypeWebSocketClient.WEBSOCKET_MESSAGE,
						message: timelineObject.content.message,
						isBase64Encoded: timelineObject.content.isBase64Encoded,
					},
					context: `${changeType} on layer "${layerName}"`,
					timelineObjId: timelineObject.id,
				})
			}
		}

		return commands
	}

	public async sendCommand(sendContext: WebSocketCommand): Promise<void> {
		if (!sendContext.command) return
		let message: string | Buffer = sendContext.command.message

		if (sendContext.command.isBase64Encoded) {
			// convert base64 to binary
			message = Buffer.from(message, 'base64')
		}
		this.connection.sendWebSocketMessage(message)
	}

	public async terminate(): Promise<void> {
		await this.connection.disconnect()
		// Perform any cleanup if needed
	}
}
