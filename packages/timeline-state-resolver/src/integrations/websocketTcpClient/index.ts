import { CommandWithContext, Device, DeviceContextAPI } from '../../service/device'
import { ActionExecutionResultCode, DeviceStatus, DeviceType, Timeline, TimelineContentTypeWebSocketTcpClient, TSRTimelineContent, WebSocketTCPClientOptions } from 'timeline-state-resolver-types'
import { WebSocketTcpConnection } from './connection'
import { WebsocketTcpClientActions } from 'timeline-state-resolver-types'
import { isEqual } from 'underscore'


/** this is not an extends but an implementation of the CommandWithContext */
export interface WebSocketTcpCommand extends CommandWithContext {
	command: {
		type: TimelineContentTypeWebSocketTcpClient
		message: string
		isBase64Encoded?: boolean
	}
	context: string
  }
export type WebSocketTcpClientDeviceState = Timeline.TimelineState<TSRTimelineContent>

  export class WebSocketTcpClientDevice extends Device<
	WebSocketTCPClientOptions,
	WebSocketTcpClientDeviceState,
	WebSocketTcpCommand
> {
	private connection: WebSocketTcpConnection

	constructor(context: DeviceContextAPI<any>, _options: WebSocketTCPClientOptions) {
		super(context)
		this.connection = new WebSocketTcpConnection(_options)
	}

    public async init(): Promise<boolean> {
        await this.connection.connect()
        return true
    }

	readonly actions = {
		[WebsocketTcpClientActions.Reconnect]: async (_id: string) => {
			await this.connection.connect()
			return { result: ActionExecutionResultCode.Ok }
		},
		[WebsocketTcpClientActions.ResetState]: async (_id: string) => {
			return { result: ActionExecutionResultCode.Ok }
		},
		[WebsocketTcpClientActions.SendWebSocketMessage]: async (_id: string, payload?: Record<string, any>) => {
			if (!payload?.message) {
				return { result: ActionExecutionResultCode.Error, response: { key: 'Missing message in payload' } }
			}
			await this.sendCommand(payload.message)
			return { result: ActionExecutionResultCode.Ok }
		},
		[WebsocketTcpClientActions.SendTcpMessage]: async (_id: string, payload?: Record<string, any>) => {
			if (!payload?.command) {
				return { result: ActionExecutionResultCode.Error, response: { key: 'Missing command in payload' } }
			}
			await this.sendCommand(payload.command)
			return { result: ActionExecutionResultCode.Ok }
		},
	}

	public get connected(): boolean {
		return this.connection?.connected() ?? false
	}

	public convertTimelineStateToDeviceState(
		state: WebSocketTcpClientDeviceState 
	): WebSocketTcpClientDeviceState {
		// When a new Timeline State is about to be executed
		// This is called to convert the generic Timeline State into a custom "device state".
		// For example:
		// tl obj: { layer: 'abc', content: { type: TimelineContentTypeWebSocketTcpClient::TCP_MESSAGE, message: 'hello'} }
		// can be converted into: { tcpMessages: { abc: 'hello } }
		//
		// This is optional and for convenience only (like to simplify the diffing logic in diffStates())

		return state
	}

	// ** Calculate Diffs of state and create the commands
	public diffStates(oldState: WebSocketTcpClientDeviceState, newState: WebSocketTcpClientDeviceState): WebSocketTcpCommand[] {
		// This is called to calculate and creates the commands needed to make olState reflect newState.
		// Note: We DON'T send the commands NOW, but rather we return a list of the commands, to be executed
		// later (send to sendCommand() ).


		const commands: WebSocketTcpCommand[] = []
		for (const [layerName, timelineObject] of Object.entries(newState.layers)) {
			if (timelineObject.content.deviceType !== DeviceType.WEBSOCKET_TCP_CLIENT) continue


			// We should send the command whenever the timeline object content has been ADDED or CHANGED
			let changeType = 'N/A'
			if (!oldState.layers[layerName]) {
				changeType = 'added'
			} else if ( isEqual(oldState.layers[layerName].content, timelineObject.content) ) {
				changeType = 'changed'
			} else {
				continue // no changes
			}


			if (timelineObject.content.type === TimelineContentTypeWebSocketTcpClient.WEBSOCKET_MESSAGE ) {
				commands.push({
					command: {
						type: TimelineContentTypeWebSocketTcpClient.WEBSOCKET_MESSAGE,
						message: timelineObject.content.message,
						isBase64Encoded: timelineObject.content.isBase64Encoded
					},
					context: `${changeType} on layer "${layerName}"`,
					timelineObjId: timelineObject.id,
				})

			} else if (timelineObject.content.type === TimelineContentTypeWebSocketTcpClient.TCP_MESSAGE ) {

				commands.push({
					command: {
						type: TimelineContentTypeWebSocketTcpClient.TCP_MESSAGE,
						message: timelineObject.content.message,
						isBase64Encoded: timelineObject.content.isBase64Encoded
					},
					context: `${changeType} on layer "${layerName}"`,
					timelineObjId: timelineObject.id,
				})
			}
		}
		
		return commands
	}

	public getStatus(): Omit<DeviceStatus, "active"> {
		return {
			statusCode: this.connected ? 0 : 1, // 0 = GOOD, 1 = BAD (based on StatusCode enum)
			messages: [


				'Probably okay, todo :)'
				//this.connection.isTCPConnected ? 'TCP is Connected' : 'TCP is Disconnected',
				//this.connection.isTCPConnected ? 'TCP is Connected' : 'TCP is Disconnected',
			]
			
			//  connected ? ['Connected'] : ['Disconnected'],
		}
	}

	public async sendCommand(sendContext: WebSocketTcpCommand): Promise<void> {
		if (!sendContext.command) return
		let message: string | Buffer = sendContext.command.message
	
		if (sendContext.command.isBase64Encoded) {
			// convert base64 to binary
			message = Buffer.from(message, 'base64')
		}

		if (sendContext.command.type === TimelineContentTypeWebSocketTcpClient.WEBSOCKET_MESSAGE) {
			await this.connection.sendWebSocketMessage(message)
		} else if (sendContext.command.type === TimelineContentTypeWebSocketTcpClient.TCP_MESSAGE ) {
		  await this.connection.sendTcpMessage(message)
		}
	}

	public async terminate(): Promise<void> {
		await this.connection.disconnect()
		// Perform any cleanup if needed
	}
}
