import { FinishedTrace, startTrace, endTrace } from '../lib'
import { LayerState, Mappings, Timeline, TSRMappingOptions, TSRTimelineContent } from 'timeline-state-resolver-types'
import { BaseDeviceAPI, CommandWithContext } from './device'
import { Measurement, StateChangeReport } from './measure'
import { StateTracker } from './stateTracker'

interface StateChange<AddressState, Command extends CommandWithContext> {
	commands?: Command[]
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
	private _executingStateChange: Promise<void> | undefined = undefined

	private clock: NodeJS.Timeout
	private _stateTracker?: StateTracker<AddressState, Command>
	private logger: StateHandlerContext['logger']

	constructor(
		private context: StateHandlerContext,
		private config: StateHandlerConfig,
		private device: BaseDeviceAPI<AddressState, Command, CommandResult>
	) {
		this.logger = context.logger

		if (device.getLayerStatus)
			this._stateTracker = new StateTracker(device.diffStates, device.getLayerStatus, (address, state) => {
				;(this._executingStateChange ?? Promise.resolve()).then(() => {
					if (!device.mappingToAddress) return

					// now there should be a currentState
					const mappings = this.currentState?.mappings
					if (!mappings) return

					// find all layer names for this address
					for (const [layer, m] of Object.entries(mappings)) {
						const addr = device.mappingToAddress(m)
						if (addr === address) this.context.reportLayerState(layer, state)
					}
				})
			})

		this.setCurrentState({}).catch((e) => {
			this.logger.error('Error while creating new StateHandler', e)
		})

		this.clock = setInterval(async () => {
			// main clock to check if next state needs to be sent out
			for (const state of this.stateQueue) {
				const nextTime = Math.max(0, state?.state.time - (await context.getCurrentTime()))
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
		const deviceState = this.device.convertTimelineStateToAddressStates(state, mappings)
		this.context.emitTimeTrace(endTrace(trace))

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
			state: this.currentState?.state || { time: this.context.getCurrentTime(), layers: {}, nextEvents: [] },
			mappings: this.currentState?.mappings || {},
		}
		await this.calculateNextStateChange()
	}
	getCurrentState(): ExecutedStateChange<AddressState, Command> | undefined {
		return this.currentState
	}

	clearFutureAfterTimestamp(t: number) {
		this.stateQueue = this.stateQueue.filter((s) => s.state.time <= t)
	}

	async resyncFromState(state: Record<string, AddressState>) {
		if (this._executingStateChange) await this._executingStateChange
		const oldState = this.currentState
		if (oldState && oldState.deviceState) {
			this.stateQueue.splice(0, 0, {
				state: oldState.state,
				deviceState: oldState.deviceState,
				mappings: oldState.mappings,
			})
		}
		await this.setCurrentState(state)
	}

	private async calculateNextStateChange() {
		if (!this.currentState) return // a change is currently being executed, we'll be called again once it's done

		const nextState = this.stateQueue[0]
		if (!nextState) return

		try {
			const trace = startTrace('device:diffDeviceStates', { deviceId: this.context.deviceId })
			nextState.commands = this.device.diffStates(this.currentState?.deviceState, nextState.deviceState)
			this.context.emitTimeTrace(endTrace(trace))
		} catch (e) {
			this.logger.error('diffDeviceState failed, t = ' + nextState.state.time, e as Error)
			// we don't want to get stuck, so we should act as if this can be executed anyway
			nextState.commands = []
		}

		if (nextState.state.time <= this.context.getCurrentTime() && this.currentState) {
			await this.executeNextStateChange()
		}
	}

	private async executeNextStateChange() {
		if (!this.stateQueue[0] || this._executingStateChange) {
			// there is no next to execute - or we are currently executing something
			return
		}
		let finished: () => void = () => null
		this._executingStateChange = new Promise((r) => (finished = r))

		if (!this.stateQueue[0].commands) {
			await this.calculateNextStateChange()
		}

		const newState = this.stateQueue.shift()

		if (!newState || !newState.commands) {
			// this should not be possible given our previous guard?
			return
		}

		newState.measurement?.executeState()

		this.currentState = undefined

		if (this._stateTracker && this.device.mappingToAddress) {
			// update the expected state
			for (const m of Object.values(newState.mappings)) {
				const addr = this.device.mappingToAddress(m)

				// const update = this.device.getAddressStateFromDeviceState(addr, newState.deviceState)
				const update = newState.deviceState[addr]
				this._stateTracker.updateExpectedState(addr, update)
			}
		}

		const results: PromiseSettledResult<any>[] = []

		if (this.config.executionType === 'salvo') {
			Promise.allSettled(
				newState.commands.map(async (command) => {
					newState.measurement?.executeCommand(command)
					return this.device.sendCommand(command).then((result) => {
						newState.measurement?.finishedCommandExecution(command)
						return result
					})
				})
			)
				.then((promiseResults) => {
					if (newState.measurement) this.context.reportStateChangeMeasurement(newState.measurement.report())
					if (newState.commands && this._stateTracker)
						this.applyCommandResultsToStateTracker(newState.commands, promiseResults)
				})
				.catch((e) => {
					this.logger.error('Error while executing next state change', e)
				})
		} else {
			const execAll = async () => {
				for (const command of newState.commands || []) {
					newState.measurement?.executeCommand(command)
					const result = await this.device
						.sendCommand(command)
						.then((value) => {
							return { status: 'fulfilled', value } satisfies PromiseSettledResult<any>
						})
						.catch((e) => {
							this.logger.error('Error while executing command', e)
							return { status: 'rejected', reason: e } satisfies PromiseSettledResult<any>
						})
					results.push(result)
					newState.measurement?.finishedCommandExecution(command)
				}
			}

			execAll()
				.then(() => {
					if (newState.measurement) this.context.reportStateChangeMeasurement(newState.measurement.report())
					if (newState.commands && this._stateTracker)
						this.applyCommandResultsToStateTracker(newState.commands, results)
				})
				.catch((e) => {
					this.logger.error('Error while executing next state change', e)
				})
		}

		this.currentState = newState as ExecutedStateChange<AddressState, Command>

		this._executingStateChange = undefined
		finished()

		this.calculateNextStateChange().catch((e) => {
			this.logger.error('Error while executing next state change', e)
		})
	}

	private applyCommandResultsToStateTracker(
		commands: Command[],
		results: PromiseSettledResult<Awaited<CommandResult>>[]
	) {
		if (!this._stateTracker || !this.device.stateUpdatesFromCommands) return

		// group commands by addresses
		const groupedCommands: Record<
			string,
			{ commands: Command[]; results: PromiseSettledResult<Awaited<CommandResult>>[] }
		> = {}
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
		for (const [address, commands] of Object.entries(groupedCommands)) {
			const expectedState = this._stateTracker.getExpectedState(address)
			const currentState = this._stateTracker.getCurrentState(address)

			if (!expectedState) continue

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

	reportLayerState: (layer: string, state: LayerState) => void

	getCurrentTime: () => number
}
