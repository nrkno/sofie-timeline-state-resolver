import { FinishedTrace, startTrace, endTrace } from '../lib'
import { Mappings, Timeline, TSRTimelineContent } from 'timeline-state-resolver-types'
import { BaseDeviceAPI, CommandWithContext } from './device'
import { Measurement, StateChangeReport } from './measure'
import { CommandExecutor } from './commandExecutor'

interface StateChange<DeviceState, Command extends CommandWithContext> {
	commands?: Command[]

	/** commands are to be executed x ms _before_ the scheduled time */
	preliminary?: number

	state: Timeline.TimelineState<TSRTimelineContent>
	deviceState: DeviceState
	mappings: Mappings

	timelineHash: string

	measurement?: Measurement
}
interface ExecutedStateChange<DeviceState, Command extends CommandWithContext>
	extends StateChange<DeviceState | undefined, Command> {
	commands: Command[]
}

const CLOCK_INTERVAL = 20

export class StateHandler<DeviceState, Command extends CommandWithContext> {
	/** A list of upcoming state changes. Ordered by $.state.time ascending. */
	private stateQueue: StateChange<DeviceState, Command>[] = []

	/**
	 * Semaphore, is set to undefined (!) while the current state is being executed.
	 * (prevents calculateNextStateChange from running when undefined)
	 */
	private currentState: ExecutedStateChange<DeviceState, Command> | undefined
	/** Semaphore, to ensure that .executeNextStateChange() is only executed one at a time */
	private _executingStateChange = false

	private _calculateNextStateChangeIndex = 0

	private _commandExecutor: CommandExecutor<DeviceState, Command>

	private clock: NodeJS.Timeout

	private logger: StateHandlerContext['logger']

	constructor(
		private context: StateHandlerContext,
		private config: StateHandlerConfig,
		private device: BaseDeviceAPI<DeviceState, Command>
	) {
		this.logger = context.logger

		this.setCurrentState(undefined, 'startup').catch((e) => {
			this.logger.error('Error while creating new StateHandler', e)
		})

		this._commandExecutor = new CommandExecutor(context.logger, this.config.executionType, async (c) =>
			device.sendCommand(c)
		)

		this.clock = setInterval(() => {
			const t = context.getCurrentTime()
			// main clock to check if next state needs to be executed

			const nextState = this.stateQueue[0]
			if (!nextState) return

			const nextTime = Math.max(0, nextState.state.time - (nextState.preliminary ?? 0) - t)
			if (nextTime > CLOCK_INTERVAL) return
			// schedule any states between now and the next tick

			setTimeout(() => {
				if (this.stateQueue[0] === nextState) {
					// if this is still the next state, execute it:
					this.executeNextStateChange().catch((e) => {
						this.logger.error('Error while executing next state change', e)
					})
				}
			}, nextTime)
		}, CLOCK_INTERVAL)
	}

	async terminate() {
		clearInterval(this.clock)
		this.stateQueue = []
	}

	async clearFutureStates() {
		this.stateQueue = []
	}

	async handleState(state: Timeline.TimelineState<TSRTimelineContent>, mappings: Mappings, timelineHash: string) {
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
				timelineHash,

				measurement: new Measurement(state.time),
			},
		]

		if (nextState !== this.stateQueue[0]) {
			// the next state changed
			if (nextState) nextState.commands = undefined
			this.calculateNextStateChange()
		}
	}

	async setCurrentState(state: DeviceState | undefined, reason: string) {
		this.currentState = {
			commands: [],
			deviceState: state,
			state: this.currentState?.state || { time: this.context.getCurrentTime(), layers: {}, nextEvents: [] },
			timelineHash: `reason:${reason}`,
			mappings: this.currentState?.mappings || {},
		}
		this.calculateNextStateChange()
	}

	clearFutureAfterTimestamp(t: number) {
		this.stateQueue = this.stateQueue.filter((s) => s.state.time <= t)
	}

	private calculateNextStateChange() {
		if (!this.currentState) return // a change is currently being executed, we'll be called again once it's done

		const nextState = this.stateQueue[0]
		if (!nextState) return

		this._calculateNextStateChangeIndex++

		try {
			const trace = startTrace('device:diffDeviceStates', { deviceId: this.context.deviceId })
			nextState.commands = this.device.diffStates(
				this.currentState?.deviceState,
				nextState.deviceState,
				nextState.mappings,
				this.context.getCurrentTime(),
				`diff_${this._calculateNextStateChangeIndex}("${nextState.timelineHash}")`
			)
			nextState.preliminary = Math.max(0, ...nextState.commands.map((c) => c.preliminary ?? 0))
			this.context.emitTimeTrace(endTrace(trace))
		} catch (e) {
			// todo - log an error
			this.logger.error('diffDeviceState failed, t = ' + nextState.state.time, e as Error)
			// we don't want to get stuck, so we should act as if this can be executed anyway
			nextState.commands = []
		}

		if (nextState.state.time - (nextState.preliminary ?? 0) <= this.context.getCurrentTime() && this.currentState) {
			// It's time to execute the state asap
			this.executeNextStateChange().catch((e) => {
				this.logger.error('Error while executing next state change', e)
			})
		}
	}

	private async executeNextStateChange() {
		if (!this.stateQueue[0]) {
			// there is no next to execute
			return
		}
		if (this._executingStateChange) {
			// debounce: we are currently executing
			return
		}
		// Set the semaphore:
		this._executingStateChange = true

		const state = this.stateQueue.shift()

		try {
			// Type assertions, this should not be possible given our previous guard
			if (!state) throw new Error('Assertion failed: newState is undefined')
			if (!state.commands) throw new Error('Assertion failed: newState.commands is undefined')

			// Ensure that we have calculated the commands for the state:
			if (!state.commands) {
				this.calculateNextStateChange()
			}

			// Set the semaphore,
			// ie prevent calculateNextStateChange() from running while we're executing, as we're calling it afterwards anyway.
			this.currentState = undefined

			state.measurement?.executeState()

			// Execute the state, ie execute the precalculated commands of the state:
			await this._commandExecutor.executeCommands(state.commands, state.measurement)

			if (state.measurement) this.context.reportStateChangeMeasurement(state.measurement.report())
		} catch (e) {
			this.logger.error('Error while executing next state change', e as any)
		}

		// Release the semaphore:
		this.currentState = state as ExecutedStateChange<DeviceState, Command>
		// Release the semaphore:
		this._executingStateChange = false

		// Prepare and/or execute next state:
		this.calculateNextStateChange()
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

	getCurrentTime: () => number
}
