import {
	ActionExecutionResult,
	CasparCGOptions,
	DeviceStatus,
	Mappings,
	StatusCode,
	TSRTimelineContent,
	Timeline,
} from 'timeline-state-resolver-types'
import { Device } from '../../service/device'
import { EventEmitter } from 'eventemitter3'
import { convertTimelineStateToDeviceState } from './state'
import { diffStates } from './diff'
import { CasparCG, Commands, Response } from 'casparcg-connection'

type DeviceOptions = CasparCGOptions
type DeviceState = any
type Command = any

export class CasparCGDevice extends EventEmitter implements Device<DeviceOptions, DeviceState, Command> {
	private _connection: CasparCG
	private _options: DeviceOptions

	async init(options: DeviceOptions): Promise<boolean> {
		this._options = options

		// first setup a connection and handle it's events
		this._connection = new CasparCG({
			host: options.host,
			port: options.port,
		})
		this._connection.connect()

		this._connection.on('connect', () => {
			this.emit('connectionChanged', this.getStatus())

			// do a virgin check

			Promise.resolve()
				.then(async () => {
					// a "virgin server" was just restarted (so it is cleared & black).
					// Otherwise it was probably just a loss of connection

					const { error, request } = await this._connection.executeCommand({ command: Commands.Info, params: {} })
					if (error) return true

					const response = await request

					const channelPromises: Promise<Response>[] = []
					const channelLength: number = response?.data?.['length'] ?? 0

					// Issue commands
					for (let i = 1; i <= channelLength; i++) {
						// 1-based index for channels

						const { error, request } = await this._connection.executeCommand({
							command: Commands.Info,
							params: { channel: i },
						})
						if (error) {
							// We can't return here, as that will leave anything in channelPromises as potentially unhandled
							channelPromises.push(Promise.reject('execute failed'))
							break
						}
						channelPromises.push(request)
					}

					// Wait for all commands
					const channelResults = await Promise.all(channelPromises)

					// Resync if all channels have no stage object (no possibility of anything playing)
					return !channelResults.find((ch) => ch.data['stage'])
				})
				.catch((e) => {
					this.emit('error', 'connect virgin check failed', e)
					// Something failed, force the resync as glitching playback is better than black output
					return true
				})
				.then((doResync) => {
					// Finally we can report it as connected
					this.emit('connectionChanged', this.getStatus())

					if (doResync) {
						// this._currentState = { channels: {} }
						// this.clearStates()
						this.emit('resetResolver')
					}
				})
				.catch((e) => {
					this.emit('error', 'connect state resync failed', e)
					// Some unknwon error occured, report the connection as failed
					this.emit('connectionChanged', this.getStatus())
				})
		})

		this._connection.on('disconnect', () => {
			this.emit('connectionChanged', this.getStatus())
		})

		this._connection.on('error', (e) => {
			this.emit('error', e)
		})

		// then find out info about the server

		return true
	}
	async terminate(): Promise<boolean> {
		return true
	}

	get connected(): boolean {
		return false
	}
	getStatus(): Omit<DeviceStatus, 'active'> {
		if (this._connection.connected) {
			return {
				statusCode: StatusCode.GOOD,
				messages: [],
			}
		} else {
			return {
				statusCode: StatusCode.BAD,
				messages: [],
			}
		}
	}

	actions: Record<string, (id: string, payload?: Record<string, any>) => Promise<ActionExecutionResult>> = {}

	convertTimelineStateToDeviceState(
		state: Timeline.TimelineState<TSRTimelineContent>,
		newMappings: Mappings
	): DeviceState {
		return convertTimelineStateToDeviceState(state, newMappings)
	}
	diffStates(oldState: DeviceState | undefined, newState: DeviceState, mappings: Mappings): Array<Command> {
		return diffStates(oldState, newState, mappings)
	}
	async sendCommand(command: Command): Promise<any> {
		// executes all commands on a layer so we can say something about the state of the layer

		const execSingleCommand = async (command: any) => {
			const { request, error } = await this._connection.executeCommand(command)
			if (error) {
				this.emit('commandError', error)
			}

			try {
				const response = await request

				// Why would this response ever be undefined?
				if (!response) return

				// this._changeTrackedStateFromCommand(cmd, response, time)

				// if (response.responseCode === 504 && !this._queueOverflow) {
				// 	this._queueOverflow = true
				// 	this._connectionChanged()
				// } else if (this._queueOverflow) {
				// 	this._queueOverflow = false
				// 	this._connectionChanged()
				// }

				// if (response.responseCode >= 400) {
				// 	// this is an error code:
				// 	let errorString = `${response.responseCode} ${cmd.command} ${response.type}: ${response.type}`

				// 	if (Object.keys(cmd.params).length) {
				// 		errorString += ' ' + JSON.stringify(cmd.params)
				// 	}

				// 	this.emit('commandError', new Error(errorString), cwc)
				// }
			} catch (e) {
				// This shouldn't really happen
				this.emit('commandError', Error('Command not sent: ' + e), cwc)
			}
		}

		const executedCommands = command.commands.map((c) => execSingleCommand(c))

		await Promise.allSettled(executedCommands)

		// now we know something about what state the layer is in
		return true
	}
}
