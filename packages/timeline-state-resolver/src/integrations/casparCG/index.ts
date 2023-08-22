import {
	LayerState,
	ActionExecutionResult,
	CasparCGActions,
	CasparCGOptions,
	DeviceStatus,
	Mappings,
	SomeMappingCasparCG,
	StatusCode,
	TSRTimelineContent,
	Timeline,
} from 'timeline-state-resolver-types'
import { CommandWithContext, Device } from '../../service/device'
import { EventEmitter } from 'eventemitter3'
import { convertTimelineStateToDeviceState, getStatus, mappingToAddress, updateStateFromCommands } from './state'
import { diffStates, diffTrackerStatesLayer } from './diff'
import { CasparCG, Commands, Response } from 'casparcg-connection'
import { DeviceEvents } from '../../service/device'
import { clearAllChannels, restartServer } from './actions'
import { StateTracker } from './stateTracker'
import { AMCPCommandWithContext } from 'casparcg-state'

type DeviceOptions = CasparCGOptions
type DeviceState = any
type Command = { command: AMCPCommandWithContext } & CommandWithContext

export class CasparCGDevice extends EventEmitter<DeviceEvents> implements Device<DeviceOptions, DeviceState, Command> {
	private _connection: CasparCG
	private _stateTracker: StateTracker<any, Command> = new StateTracker(
		diffTrackerStatesLayer,
		getStatus,
		(address: string, state: LayerState) => {
			this.emit('getMappings', (mappings: Mappings<SomeMappingCasparCG>) => {
				// convert mappings to addresses
				for (const [layer, m] of Object.entries(mappings)) {
					const addr = mappingToAddress(m)
					if (addr === address) this.emit('layerState', layer, state)
				}
			})
		}
	)
	private _options: DeviceOptions
	private _queueOverflow = false

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
						this.emit('resetFromState', { layers: {}, lookaheads: {} })
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
			this.emit('error', 'Error in casparcg-connection', e)
		})

		// @nocommit - hardcoded mess for testing retries
		setInterval(() => {
			const diff = this._stateTracker.getDiff()

			for (const cmds of Object.values(diff)) {
				Promise.allSettled(
					cmds.filter((c) => c.command.command.match(/PLAY|LOADBG|LOAD/i)).map((c) => this.sendCommand(c))
				).then((results) => {
					updateStateFromCommands(
						this._stateTracker,
						cmds.map((c) => c.command),
						results.map((r) => (r.status === 'fulfilled' ? r.value : 500))
					)
				})
			}
		}, 3000)

		return true
	}
	async terminate(): Promise<boolean> {
		this._connection.discard()

		return true
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

	actions: Record<string, (id: string, payload?: Record<string, any>) => Promise<ActionExecutionResult>> = {
		[CasparCGActions.ClearAllChannels]: async () => {
			return clearAllChannels(this._connection, () => this.emit('resetFromState', { layers: {}, lookaheads: {} }))
		},
		[CasparCGActions.RestartServer]: async () => {
			return restartServer(this._options)
		},
	}

	convertTimelineStateToDeviceState(
		state: Timeline.TimelineState<TSRTimelineContent>,
		newMappings: Mappings
	): DeviceState {
		return convertTimelineStateToDeviceState(state, newMappings)
	}
	diffStates(oldState: DeviceState | undefined, newState: DeviceState, mappings: Mappings): Array<Command> {
		return diffStates(oldState, newState, mappings)
	}
	async sendCommand({ command }: Command): Promise<any> {
		// console.log(command)
		// executes all commands on a layer so we can say something about the state of the layer

		const { request, error } = await this._connection.executeCommand(command)
		if (error) {
			this.emit('commandError', error, command)
		}

		try {
			const response = await request

			// Why would this response ever be undefined?
			if (!response) return 500

			if (response.responseCode === 504 && !this._queueOverflow) {
				this._queueOverflow = true
				this.emit('connectionChanged', this.getStatus())
			} else if (this._queueOverflow) {
				this._queueOverflow = false
				this.emit('connectionChanged', this.getStatus())
			}

			if (response.responseCode >= 400) {
				// this is an error code:
				let errorString = `${response.responseCode} ${command.command} ${response.type}: ${response.message}`

				if (Object.keys(command.params).length) {
					errorString += ' ' + JSON.stringify(command.params)
				}

				this.emit('commandError', new Error(errorString), command)
			}

			return response.responseCode
		} catch (e) {
			// This shouldn't really happen
			this.emit('commandError', Error('Command not sent: ' + e), command)
			return 500
		}
	}

	updateExpectedState(state: DeviceState, mappings: Mappings<SomeMappingCasparCG>): void {
		const addresses = Object.values(mappings).map((m) => mappingToAddress(m))

		for (const addr of addresses) {
			this._stateTracker.updateExpectedState(addr, { layer: state.layers[addr], lookahead: state.lookaheads[addr] })
		}
	}
	finishedStateChange(commands: Command[], results: PromiseSettledResult<any>[]): void {
		updateStateFromCommands(
			this._stateTracker,
			commands.map((c) => c.command), // note - a little weird we ignore the address here, no?
			results.map((r) => (r.status === 'fulfilled' ? r.value : 500))
		)
	}
}
