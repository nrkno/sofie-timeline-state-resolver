import { FinishedTrace, startTrace, endTrace } from '../lib'
import { Mappings, Timeline, TSRTimelineContent } from 'timeline-state-resolver-types'
import { BaseDeviceAPI, CommandWithContext } from './device'
import { Measurement, StateChangeReport } from './measure'

interface StateChange<DeviceState, Command extends CommandWithContext> {
	commands?: Command[]
	state: Timeline.TimelineState<TSRTimelineContent>
	deviceState: DeviceState
	mappings: Mappings

	measurement?: Measurement
}
interface ExecutedStateChange<DeviceState, Command extends CommandWithContext>
	extends StateChange<DeviceState, Command> {
	commands: Command[]
}

export class StateHandler<DeviceState, Command extends CommandWithContext> {
	private stateQueue: StateChange<DeviceState, Command>[] = []
	private currentState: ExecutedStateChange<DeviceState, Command> | undefined = undefined
	private _executingStateChange = false

	private clock: NodeJS.Timeout

	private convertTimelineStateToDeviceState: BaseDeviceAPI<DeviceState, Command>['convertTimelineStateToDeviceState']
	private diffDeviceStates: BaseDeviceAPI<DeviceState, Command>['diffStates']
	private executeCommand: BaseDeviceAPI<DeviceState, Command>['sendCommand']

	private logger: StateHandlerContext['logger']

	constructor(
		private context: StateHandlerContext,
		private config: StateHandlerConfig,
		device: BaseDeviceAPI<DeviceState, Command>
	) {
		this.logger = context.logger

		this.convertTimelineStateToDeviceState = (s, m) => device.convertTimelineStateToDeviceState(s, m)
		this.diffDeviceStates = (o, n, m) => device.diffStates(o, n, m)
		this.executeCommand = async (c) => device.sendCommand(c)

		this.clock = setInterval(() => {
			// main clock to check if next state needs to be sent out
			const nextStates = this.stateQueue.filter((s) => s.state.time < Date.now() + 20) // any states to be executed before the next tick

			nextStates.forEach((nextState) => {
				const nextTime = Math.max(0, nextState?.state.time - Date.now())
				setTimeout(() => {
					if (!this._executingStateChange && this.stateQueue[0] === nextState) {
						// if this is the next state, execute it
						this.executeNextStateChange().catch((e) => {
							this.logger.error('Error while executing next state change', e)
						})
					}
				}, nextTime)
			})
		}, 20)
	}

	async terminate() {
		clearInterval(this.clock)
		this.stateQueue = []
	}

	async clearFutureStates() {
		this.stateQueue = []
	}

	async handleState(state: Timeline.TimelineState<TSRTimelineContent>, mappings: Mappings) {
		const nextState = this.stateQueue[0]

		const trace = startTrace('device:convertTimelineStateToDeviceState', { deviceId: this.context.deviceId })
		const deviceState = this.convertTimelineStateToDeviceState(state, mappings)
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
				this.logger.error('Error while executing next state change', e)
			})
		}
	}

	async setCurrentState(state: DeviceState) {
		this.currentState = {
			commands: [],
			deviceState: state,
			state: this.currentState?.state || { time: Date.now(), layers: {}, nextEvents: [] },
			mappings: this.currentState?.mappings || {},
		}
		await this.calculateNextStateChange()
	}

	clearFuture(t: number) {
		this.stateQueue = this.stateQueue.filter((s) => s.state.time <= t)
	}

	private async calculateNextStateChange() {
		if (!this.currentState) return // a change is currently being executed, we'll be called again once it's done

		const nextState = this.stateQueue[0]
		if (!nextState) return

		try {
			const trace = startTrace('device:diffDeviceStates', { deviceId: this.context.deviceId })
			nextState.commands = this.diffDeviceStates(
				this.currentState.deviceState,
				nextState.deviceState,
				nextState.mappings
			)
			this.context.emitTimeTrace(endTrace(trace))
		} catch (e) {
			// todo - log an error
			this.logger.error('diffDeviceState failed, t = ' + nextState.state.time, e as Error)
			// we don't want to get stuck, so we should act as if this can be executed anyway
			nextState.commands = []
		}

		if (nextState.state.time <= Date.now() && this.currentState) {
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
			return
		}

		newState.measurement?.executeState()

		this.currentState = undefined

		if (this.config.executionType === 'salvo') {
			Promise.allSettled(
				newState.commands.map(async (command) => {
					newState.measurement?.executeCommand(command)
					return this.executeCommand(command).then(() => {
						newState.measurement?.finishedCommandExecution(command)
						return command
					})
				})
			)
				.then(() => {
					if (newState.measurement) this.context.reportStateChangeMeasurement(newState.measurement.report())
				})
				.catch((e) => {
					this.logger.error('Error while executing next state change', e)
				})
		} else {
			const execAll = async () => {
				for (const command of newState.commands || []) {
					newState.measurement?.executeCommand(command)
					await this.executeCommand(command).catch((e) => {
						this.logger.error('Error while executing command', e)
					})
					newState.measurement?.finishedCommandExecution(command)
				}
			}

			execAll()
				.then(() => {
					if (newState.measurement) this.context.reportStateChangeMeasurement(newState.measurement.report())
				})
				.catch((e) => {
					this.logger.error('Error while executing next state change', e)
				})
		}

		this.currentState = newState as ExecutedStateChange<DeviceState, Command>
		this._executingStateChange = false

		this.calculateNextStateChange().catch((e) => {
			this.logger.error('Error while executing next state change', e)
		})
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
}
