import { FinishedTrace, startTrace, endTrace } from '../lib'
import {
	LayerState,
	Mapping,
	Mappings,
	Timeline,
	TSRMappingOptions,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { BaseDeviceAPI, CommandWithContext } from './device'
import { Measurement, StateChangeReport } from './measure'
import { CommandQueue } from './commandQueue'
import { StateTracker } from './stateTracker'

interface StateChange<AddressState, Command extends CommandWithContext> {
	commands?: Command[]
	preliminary?: number

	state: Timeline.TimelineState<TSRTimelineContent>
	deviceState: Record<string, AddressState>
	mappings: Mappings<TSRMappingOptions>

	measurement?: Measurement
}
interface ExecutedStateChange<AddressState, Command extends CommandWithContext>
	extends StateChange<AddressState, Command> {
	commands: Command[]
}

const CLOCK_INTERVAL = 20

export class StateHandler<AddressState, Command extends CommandWithContext, CommandResult = void> {
	private stateQueue: StateChange<AddressState, Command>[] = []
	private currentState: ExecutedStateChange<AddressState, Command> | undefined
	/** Semaphore, to ensure that .executeNextStateChange() is only executed one at a time */
	private _executingStateChange = false
	private _commandQueue: CommandQueue<AddressState, Command, CommandResult>

	private clock: NodeJS.Timeout
	private logger: StateHandlerContext['logger']
	private _stateTracker?: StateTracker<AddressState, Command>

	constructor(
		private context: StateHandlerContext,
		private config: StateHandlerConfig,
		private device: BaseDeviceAPI<AddressState, Command, CommandResult>
	) {
		this.logger = context.logger

		this.setCurrentState({}).catch((e) => {
			this.logger.error('Error while creating new StateHandler', e)
		})

		if (device.getLayerStatus) {
			this._stateTracker = new StateTracker(
				(o, n) => device.diffStates(o, n, this.currentState?.mappings ?? {}),
				(c, e) => {
					if (device.getLayerStatus) return device.getLayerStatus(c, e)
					throw new Error('Could not find implementation for device.getLayerStatus')
				},
				(address, state) => {
					// todo - this relies on waiting till the state change has finished...
					// ;(this._executingStateChange ?? Promise.resolve()).then(() => {
					if (!device.mappingToAddress) return

					// now there should be a currentState
					const mappings = this.currentState?.mappings
					if (!mappings) return

					// find all layer names for this address
					for (const [layer, m] of Object.entries<Mapping<TSRMappingOptions>>(mappings)) {
						const addr = device.mappingToAddress(m as any)
						if (addr === address) this.context.reportLayerState(layer, state)
					}
					// })
				}
			)
		}

		this._commandQueue = new CommandQueue(this.config.executionType, async (c) => device.sendCommand(c))

		this.clock = setInterval(() => {
			context
				.getCurrentTime()
				.then((t) => {
					// main clock to check if next state needs to be sent out
					for (const state of this.stateQueue) {
						const nextTime = Math.max(0, state?.state.time - (state?.preliminary ?? 0) - t)
						if (nextTime > CLOCK_INTERVAL) break
						// schedule any states between now and the next tick

						setTimeout(() => {
							if (!this._executingStateChange && this.stateQueue[0] === state) {
								// if this is the next state, execute it
								this.executeNextStateChange().catch((e) => {
									this.logger.error('Error while executing next state change', e)
								})
							}
						}, nextTime)
					}
				})
				.catch((e) => {
					this.logger.error('Error in main StateHandler loop', e)
				})
		}, CLOCK_INTERVAL)
	}

	async terminate() {
		clearInterval(this.clock)
		this.stateQueue = []
	}

	async clearFutureStates() {
		this.stateQueue = []
	}

	async handleState(state: Timeline.TimelineState<TSRTimelineContent>, mappings: Mappings<TSRMappingOptions>) {
		const nextState = this.stateQueue[0]

		const trace = startTrace('device:convertTimelineStateToDeviceState', { deviceId: this.context.deviceId })
		const deviceState = this.device.convertTimelineStateToDeviceState(state, mappings)
		this.context.emitTimeTrace(endTrace(trace))

		// Discard any states that comes after this one,
		//  and append this one to the end:
		this.stateQueue = [
			...this.stateQueue.filter((s) => s.state.time < state.time), // TODO - can we smuggle a little and execute something for the next frame?
			{
				deviceState,
				state,
				mappings,

				measurement: new Measurement(state.time),
			},
		]

		if (nextState !== this.stateQueue[0]) {
			// the next state changed
			if (nextState) nextState.commands = undefined
			this.calculateNextStateChange().catch((e) => {
				this.logger.error('Error while calculating next state change', e)
			})
		}
	}

	async setCurrentState(state: Record<string, AddressState>) {
		this.currentState = {
			commands: [],
			deviceState: state,
			state: this.currentState?.state || { time: await this.context.getCurrentTime(), layers: {}, nextEvents: [] },
			mappings: this.currentState?.mappings || {},
		}
		await this.calculateNextStateChange()
	}

	clearFutureAfterTimestamp(t: number) {
		this.stateQueue = this.stateQueue.filter((s) => s.state.time <= t)
	}

	private async calculateNextStateChange() {
		if (!this.currentState) return // a change is currently being executed, we'll be called again once it's done

		const nextState = this.stateQueue[0]
		if (!nextState) return

		try {
			const trace = startTrace('device:diffDeviceStates', { deviceId: this.context.deviceId })
			nextState.commands = this.device.diffStates(
				this.currentState?.deviceState,
				nextState.deviceState,
				nextState.mappings
			)
			nextState.preliminary = Math.max(0, ...nextState.commands.map((c) => c.preliminary ?? 0))
			this.context.emitTimeTrace(endTrace(trace))
		} catch (e) {
			// todo - log an error
			this.logger.error('diffDeviceState failed, t = ' + nextState.state.time, e as Error)
			// we don't want to get stuck, so we should act as if this can be executed anyway
			nextState.commands = []
		}

		if (
			nextState.state.time - (nextState.preliminary ?? 0) <= (await this.context.getCurrentTime()) &&
			this.currentState
		) {
			await this.executeNextStateChange()
		}
	}

	private async executeNextStateChange() {
		if (!this.stateQueue[0] || this._executingStateChange) {
			// there is no next to execute - or we are currently executing something
			return
		}
		this._executingStateChange = true

		if (!this.stateQueue[0].commands) {
			await this.calculateNextStateChange()
		}

		const newState = this.stateQueue.shift()

		if (!newState || !newState.commands) {
			// this should not be possible given our previous guard?
			this._executingStateChange = false
			return
		}

		newState.measurement?.executeState()

		this.currentState = undefined

		if (this._stateTracker && this.device.mappingToAddress) {
			// update the expected state
			for (const m of Object.values<Mapping<TSRMappingOptions>>(newState.mappings)) {
				const addr = this.device.mappingToAddress(m)

				// const update = this.device.getAddressStateFromDeviceState(addr, newState.deviceState)
				const update = newState.deviceState[addr]
				this._stateTracker.updateExpectedState(addr, update)
			}
		}

		this._commandQueue
			.queueCommands(newState.commands, newState.measurement)
			.then((promiseResults) => {
				if (newState.measurement) this.context.reportStateChangeMeasurement(newState.measurement.report())
				if (newState.commands && this._stateTracker)
					this.applyCommandResultsToStateTracker(newState.commands, promiseResults)
			})
			.catch((e) => {
				this.logger.error('Error while executing next state change', e)
			})

		this.currentState = newState as ExecutedStateChange<AddressState, Command>
		this._executingStateChange = false

		this.calculateNextStateChange().catch((e) => {
			this.logger.error('Error while executing next state change', e)
		})
	}

	private applyCommandResultsToStateTracker(commands: Command[], results: PromiseSettledResult<CommandResult>[]) {
		if (!this._stateTracker || !this.device.stateUpdatesFromCommands) return

		// group commands by addresses
		const groupedCommands: Record<string, { commands: Command[]; results: PromiseSettledResult<CommandResult>[] }> = {}
		for (let i = 0; i < commands.length && i < results.length; i++) {
			const command = commands[i]
			const result = results[i]

			if (!command.address) continue

			const group =
				groupedCommands[command.address] ?? (groupedCommands[command.address] = { commands: [], results: [] })
			group.commands.push(command)
			group.results.push(result)
		}

		// apply updates for every address
		for (const [address, commands] of Object.entries<(typeof groupedCommands)[keyof typeof groupedCommands]>(
			groupedCommands
		)) {
			const expectedState = this._stateTracker.getExpectedState(address)
			const currentState = this._stateTracker.getCurrentState(address)

			const update = this.device.stateUpdatesFromCommands(
				currentState,
				expectedState,
				commands.commands,
				commands.results
			)

			this._stateTracker.updateState(address, update)
		}
	}
}

export interface StateHandlerConfig {
	executionType: 'salvo' | 'sequential'
}

export interface StateHandlerContext {
	deviceId: string

	logger: {
		debug: (...args: any[]) => void
		info: (info: string) => void
		warn: (warning: string) => void
		error: (context: string, err: Error) => void
	}

	emitTimeTrace: (trace: FinishedTrace) => void
	reportStateChangeMeasurement: (report: StateChangeReport) => void

	getCurrentTime: () => Promise<number>

	reportLayerState(layer: string, state: LayerState): void
}
