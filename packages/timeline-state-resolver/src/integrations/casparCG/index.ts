import {
	ActionExecutionResult,
	CasparCGActions,
	CasparCGOptions,
	DeviceStatus,
	Mappings,
	StatusCode,
	Timeline,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { Device } from '../../service/device'

import Debug from 'debug'
import { AMCPCommand, CasparCG, Commands, Response } from 'casparcg-connection'
import { CasparCGDeviceState, convertTimelineStateToAddressStates } from './state'
import { CasparCGCommand, diffStates } from './diff'
import { clearAllChannels, restartServer } from './actions'
const debug = Debug('timeline-state-resolver:casparcg')

export class CasparCGDevice extends Device<CasparCGOptions, CasparCGDeviceState, CasparCGCommand> {
	private _connection: CasparCG
	private _options: CasparCGOptions | undefined
	private _queueOverflow = false

	async init(options: CasparCGOptions): Promise<boolean> {
		this._options = options

		// first setup a connection and handle it's events
		this._connection = new CasparCG({
			host: options.host,
			port: options.port,
		})
		this._connection.connect()

		this._connection.on('connect', () => {
			this.context.connectionChanged(this.getStatus())

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
					this.context.logger.error('connect virgin check failed', e)
					// Something failed, force the resync as glitching playback is better than black output
					return true
				})
				.then((doResync) => {
					// Finally we can report it as connected
					this.context.connectionChanged(this.getStatus())

					if (doResync) {
						// this.emit('resetFromState', { layers: {}, lookaheads: {} })
						this.context.resetResolver() // todo - use the correct reset
					}
				})
				.catch((e) => {
					this.context.logger.error('connect state resync failed', e)
					// Some unknown error occurred, report the connection as failed
					this.context.connectionChanged(this.getStatus())
				})
		})

		this._connection.on('disconnect', () => {
			this.context.connectionChanged(this.getStatus())
		})

		this._connection.on('error', (e) => {
			this.context.logger.error('Error in casparcg-connection', e)
		})

		return Promise.resolve(true) // This device doesn't have any initialization procedure
	}
	async terminate(): Promise<void> {
		this._connection.discard()
	}

	convertTimelineStateToDeviceState(
		state: Timeline.TimelineState<TSRTimelineContent>,
		newMappings: Mappings
	): CasparCGDeviceState {
		return convertTimelineStateToAddressStates(state, newMappings)
	}
	diffStates(oldState: CasparCGDeviceState | undefined, newState: CasparCGDeviceState): Array<CasparCGCommand> {
		return diffStates(oldState, newState, this._options?.fps || 25)
	}
	async sendCommand(cwc: CasparCGCommand): Promise<void> {
		const command = cwc.command as AMCPCommand
		this.context.logger.debug(cwc)
		debug(command)

		if (!this._connection.connected) return

		const { request, error } = await this._connection.executeCommand(command)
		if (error) {
			this.context.commandError(error, cwc)
		}

		try {
			const response = await request

			// Why would this response ever be undefined?
			if (!response) return

			if (response.responseCode === 504 && !this._queueOverflow) {
				this._queueOverflow = true
				this.context.connectionChanged(this.getStatus())
			} else if (this._queueOverflow) {
				this._queueOverflow = false
				this.context.connectionChanged(this.getStatus())
			}

			if (response.responseCode >= 400) {
				// this is an error code:
				let errorString = `${response.responseCode} ${command.command} ${response.type}: ${response.message}`

				if (Object.keys(command.params).length) {
					errorString += ' ' + JSON.stringify(command.params)
				}

				this.context.commandError(new Error(errorString), cwc)
			}
		} catch (e) {
			// This shouldn't really happen
			this.context.commandError(Error('Command not sent: ' + e), cwc)
		}
	}

	get connected(): boolean {
		return this._connection.connected
	}
	getStatus(): Omit<DeviceStatus, 'active'> {
		const status = {
			statusCode: StatusCode.GOOD,
			messages: [] as string[],
		}

		if (this._queueOverflow) {
			status.statusCode = StatusCode.BAD
			status.messages.push('Command queue overflow: CasparCG server has to be restarted')
		}

		if (!this._connection.connected) {
			status.statusCode = StatusCode.BAD
		}

		return status
	}

	actions: Record<
		CasparCGActions,
		(id: CasparCGActions, payload: Record<string, any>) => Promise<ActionExecutionResult>
	> = {
		[CasparCGActions.ClearAllChannels]: async () => {
			// return clearAllChannels(this._connection, () => this.emit('resetFromState', { layers: {}, lookaheads: {} }))
			return clearAllChannels(this._connection, () => this.context.resetResolver()) // todo use correct reset
		},
		[CasparCGActions.RestartServer]: async () => {
			return restartServer(this._options)
		},
	}
}
