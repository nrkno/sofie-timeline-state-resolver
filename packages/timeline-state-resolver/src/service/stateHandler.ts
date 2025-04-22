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
	 * Contains the most recent state that was used with diffState to generate commands
	 */
	private currentStateMemo: ExecutedStateChange<DeviceState | undefined, Command> | undefined

	/** This used for debugging/logging purposes only */
	private generateCommandsFromStateToStateIndex = 0

	private _commandExecutor: CommandExecutor<DeviceState, Command>

	private clock: NodeJS.Timeout

	private logger: StateHandlerContext['logger']

	private scheduledStateChangeExecutionTimeout: NodeJS.Timeout | undefined = undefined
	/** Semaphore, ensures that we're only calling this.executeNextStateChange() on at a time  */
	private isCurrentlyExecutingStateChange = false
	private flushPromise:
		| {
				promise: Promise<void>
				resolve: () => void
				reject: (e: unknown) => void
		  }
		| undefined = undefined

	constructor(
		private context: StateHandlerContext,
		private config: StateHandlerConfig,
		private device: BaseDeviceAPI<DeviceState, Command>
	) {
		this.logger = context.logger

		this.setCurrentState(undefined, 'startup')

		this._commandExecutor = new CommandExecutor(context.logger, this.config.executionType, async (c) =>
			device.sendCommand(c)
		)

		this.clock = setInterval(() => {
			// main clock to check if next state needs to be executed
			this.scheduleNearestStateChangeExecution()
		}, CLOCK_INTERVAL)
	}

	terminate() {
		clearInterval(this.clock)
		clearTimeout(this.scheduledStateChangeExecutionTimeout)
		this.stateQueue = []
		this.flushPromise?.resolve()
	}

	clearFutureStates() {
		this.stateQueue = []
		this.scheduleNearestStateChangeExecution()
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
			// The next state changed
			if (nextState) nextState.commands = undefined
			this.scheduleNearestStateChangeExecution()
		}
	}

	setCurrentState(state: DeviceState | undefined, reason: string) {
		this.currentStateMemo = {
			commands: [],
			deviceState: state,
			state: this.currentStateMemo?.state || { time: this.context.getCurrentTime(), layers: {}, nextEvents: [] },
			timelineHash: `reason:${reason}`,
			mappings: this.currentStateMemo?.mappings || {},
		}
		// The current state changed, so next state commands need to be regenerated:
		if (this.stateQueue[0]) this.stateQueue[0].commands = undefined

		this.scheduleNearestStateChangeExecution()
	}

	clearFutureAfterTimestamp(t: number) {
		this.stateQueue = this.stateQueue.filter((s) => s.state.time <= t)
		this.scheduleNearestStateChangeExecution()
	}

	/** Returns a promise that will resolve once all pending state changes have been processed */
	async flush(): Promise<void> {
		if (this.flushPromise) return this.flushPromise.promise

		if (this.stateQueue.length === 0) return // Return immediately

		let flushPromiseResolve = () => {
			// noop
		}
		let flushPromiseReject = (_reason?: any) => {
			// noop
		}

		// Set up a new Promise that will resolve some time later:
		const p = new Promise<void>((resolve, reject) => {
			flushPromiseResolve = resolve
			flushPromiseReject = reject
		}).finally(() => {
			// This promise is done now, delete it so that next call to flush() creates a new one.
			delete this.flushPromise
		})

		this.flushPromise = {
			promise: p,
			resolve: flushPromiseResolve,
			reject: flushPromiseReject,
		}
		return this.flushPromise.promise
	}

	/**
	 * Clear the previously scheduled state change execution and schedule a new one if needed.
	 * This can be called anytime. */
	private scheduleNearestStateChangeExecution() {
		// This method can be called at any point in time, by anyone, so semaphores are used to ensure synchronous execution.

		clearTimeout(this.scheduledStateChangeExecutionTimeout) // clear any previously scheduled timeouts

		if (this.isCurrentlyExecutingStateChange) return // return early, scheduleNearestStateChangeExecutions() will be called again when the executeNextStateChange has finished executing

		const nextState = this.stateQueue[0]
		if (!nextState) {
			this.flushPromise?.resolve()
			return
		}

		const t = this.context.getCurrentTime()

		// Pre-generate the commands, to have an updated nextState.preliminary and not waste time when we need to send out commands
		this.generateCommandsInNextStateBasedOnCurrentState()

		const nextTime = Math.max(0, nextState.state.time - (nextState.preliminary ?? 0) - t)
		if (nextTime > CLOCK_INTERVAL) return

		// Schedule the next state between now and the next CLOCK_INTERVAL tick:
		this.scheduledStateChangeExecutionTimeout = setTimeout(() => {
			// trigger an execute at this point in time:

			if (this.isCurrentlyExecutingStateChange) return

			this.isCurrentlyExecutingStateChange = true
			// Note: This must be the only place from which executeNextStateChange() is called, to ensure
			this.executeNextStateChange()
				.catch((e) => {
					this.logger.error('Error while executing next state change', e)
				})
				.finally(() => {
					this.isCurrentlyExecutingStateChange = false
					// this will schedule the next state change to be executed, potentially "too late",
					// if this `executeNextStateChange` took too long
					this.scheduleNearestStateChangeExecution()
				})
		}, nextTime)
	}

	/** This method must only be called once at a time. **The caller must ensure this.** */
	private async executeNextStateChange() {
		if (!this.stateQueue[0]) {
			// there is no next to execute
			return
		}
		try {
			// Generate commands for the next state, if needed:
			const stateWihCommands = this.generateCommandsInNextStateBasedOnCurrentState()

			const state = this.stateQueue.shift()

			// Type assertions, this should not be possible given our previous guard
			if (!state) throw new Error('Assertion failed: state is undefined')
			if (!state.commands) throw new Error('Internal error: state.commands not set!') // Just a type guard, this should never happen.

			state.measurement?.executeState()

			// This is the point where we execute the commands,
			// so this is the point where we can memoize the new state
			this.currentStateMemo = stateWihCommands

			// Execute the state, ie execute the precalculated commands of the state:
			await this._commandExecutor.executeCommands(state.commands, state.measurement)

			if (state.measurement) this.context.reportStateChangeMeasurement(state.measurement.report())
		} catch (e) {
			this.logger.error('Error while executing next state change', e as any)
		}
	}
	private generateCommandsInNextStateBasedOnCurrentState() {
		const nextState = this.stateQueue[0]
		if (!nextState) return
		// if nextState.commands is populated, that means that there's nothing to generate. States can be replaced,
		// but not changed.
		if (nextState.commands) return

		this.generateCommandsFromStateToStateIndex++

		try {
			const trace = startTrace('device:diffDeviceStates', { deviceId: this.context.deviceId })
			nextState.commands = this.device.diffStates(
				this.currentStateMemo?.deviceState,
				nextState.deviceState,
				nextState.mappings,
				this.context.getCurrentTime(),
				`diff_${this.generateCommandsFromStateToStateIndex}("${nextState.timelineHash}")`
			)
			nextState.preliminary = Math.max(0, ...nextState.commands.map((c) => c.preliminary ?? 0))
			this.context.emitTimeTrace(endTrace(trace))
		} catch (e) {
			// todo - log an error
			this.logger.error('diffDeviceState failed, t = ' + nextState.state.time, e as Error)

			// we don't want to get stuck, so we should act as if this can be executed anyway:
			nextState.commands = []
			nextState.preliminary = 0
		}

		return nextState as ExecutedStateChange<DeviceState | undefined, Command>
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
