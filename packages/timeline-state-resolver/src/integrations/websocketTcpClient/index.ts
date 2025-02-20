import { CommandWithContext, Device, DeviceContextAPI } from '../../service/device'
import { DeviceStatus, WebSocketTcpClientOptions } from 'timeline-state-resolver-types'
import { WebSocketTcpConnection } from './connection'

interface WebSocketTcpCommand extends CommandWithContext{
	command: any // need to fix command structure
	context: string
	timelineObjId: string
	value?: any // 
}

export class WebSocketTcpClientDevice extends Device<
	WebSocketTcpClientOptions,
	any, //Add state later
	WebSocketTcpCommand
> {
	private connection: WebSocketTcpConnection

	constructor(context: DeviceContextAPI<any>, _options: WebSocketTcpClientOptions) {
		super(context)
		this.connection = new WebSocketTcpConnection(_options)
	}

    public async init(): Promise<boolean> {
        await this.connection.connect()
        return true
    }

	public get actions(): any {
		// Placeholder implementation
		return {}
	}

	public get connected(): boolean {
		return this.connection?.connected() ?? false
	}

	public convertTimelineStateToDeviceState(
		state: any // ToDo
	): any {
		return state
	}

	public diffStates(oldState: any, newState: any): WebSocketTcpCommand[] {
		// ToDo: Implement state diffing
		const commands: WebSocketTcpCommand[] = []
		if (oldState !== newState) {
			commands.push({
				command: 'update',
				context: 'state_change',
				timelineObjId: 'example_id',
				value: newState,
			})
		}
		return commands
	}

	public getStatus(): Omit<DeviceStatus, "active"> {
		return {
			statusCode: this.connected ? 0 : 1, // 0 = GOOD, 1 = BAD (based on StatusCode enum)
			messages: this.connected ? ['Connected'] : ['Disconnected'],
		}
	}

	public async sendCommand(command: WebSocketTcpCommand): Promise<void> {
		// Send the command via the WebSocket connection
		await this.connection.sendWebSocketMessage(command.value)
	}
	// We might end up using just one sendCommand() with a switch-case for the command type:
	public async sendTcpCommand(command: WebSocketTcpCommand): Promise<void> {
		// Send the command via the TCP connection
		await this.connection.sendTcpCommand(command.value)
	}

	public async terminate(): Promise<void> {
		await this.connection.disconnect()
		// Perform any cleanup if needed
	}
}
