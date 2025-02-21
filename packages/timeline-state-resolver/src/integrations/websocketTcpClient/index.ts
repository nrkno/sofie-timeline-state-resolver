import { CommandWithContext, Device, DeviceContextAPI } from '../../service/device'
import { ActionExecutionResultCode, DeviceStatus, WebSocketTCPClientOptions } from 'timeline-state-resolver-types'
import { WebSocketTcpConnection } from './connection'
import { WebsocketTcpClientActions } from 'timeline-state-resolver-types'

export interface WebSocketTcpCommand extends CommandWithContext {
	command: 'added' | 'changed' | 'removed' | 'manual'
	content: {
	  message?: string
	  command?: string
	}
  }

  export class WebSocketTcpClientDevice extends Device<
	WebSocketTCPClientOptions,
	any, //Add state later
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
			await this.connection.sendWebSocketMessage(payload.message)
			return { result: ActionExecutionResultCode.Ok }
		},
		[WebsocketTcpClientActions.SendTcpMessage]: async (_id: string, payload?: Record<string, any>) => {
			if (!payload?.command) {
				return { result: ActionExecutionResultCode.Error, response: { key: 'Missing command in payload' } }
			}
			await this.connection.sendTcpMessage(payload.command)
			return { result: ActionExecutionResultCode.Ok }
		},
	}

	public get connected(): boolean {
		return this.connection?.connected() ?? false
	}

	public convertTimelineStateToDeviceState(
		state: any // ToDo
	): any {
		return state
	}

	public diffStates(_oldState: any, _newState: any): WebSocketTcpCommand[] {		
		return []
	}

	public getStatus(): Omit<DeviceStatus, "active"> {
		return {
			statusCode: this.connected ? 0 : 1, // 0 = GOOD, 1 = BAD (based on StatusCode enum)
			messages: this.connected ? ['Connected'] : ['Disconnected'],
		}
	}

	public async sendCommand(command: WebSocketTcpCommand): Promise<void> {
		if (!command.content) return
	
		if (command.content.message) {
		  await this.connection.sendWebSocketMessage(command.content.message)
		}
	
		if (command.content.command) {
		  await this.connection.sendTcpMessage(command.content.command)
		}
	  }

	public async terminate(): Promise<void> {
		await this.connection.disconnect()
		// Perform any cleanup if needed
	}
}
