import { FinishedTrace, startTrace, endTrace, cloneDeep } from '../lib'
import { Mappings, Timeline, TSRTimelineContent } from 'timeline-state-resolver-types'
import { BaseDeviceAPI, CommandWithContext } from './device'
import { Measurement, StateChangeReport } from './measure'
import { CommandExecutor } from './commandExecutor'
import { StateTracker } from './stateTracker'

interface StateChange<DeviceState, Command extends CommandWithContext, AddressState> {
	commands?: Command[]
	preliminary?: number

	state: Timeline.TimelineState<TSRTimelineContent>
	deviceState: DeviceState
	addressStates?: Record<string, AddressState>
	mappings: Mappings

	measurement?: Measurement
}
interface ExecutedStateChange<DeviceState, Command extends CommandWithContext, AddressState>
	extends StateChange<DeviceState | undefined, Command, AddressState> {
	commands: Command[]
}

const CLOCK_INTERVAL = 20

export class StateHandler<DeviceState extends Object, Command extends CommandWithContext, AddressState = any> {
	private stateQueue: StateChange<DeviceState, Command, AddressState>[] = []
	private currentState: ExecutedStateChange<DeviceState, Command, AddressState> | undefined
	/** Semaphore, to ensure that .executeNextStateChange() is only executed one at a time */
	private _executingStateChange = false
	private _commandExecutor: CommandExecutor<DeviceState, Command>

	private clock: NodeJS.Timeout

	private logger: StateHandlerContext['logger']

	constructor(
		private context: StateHandlerContext,
		private config: StateHandlerConfig,
		private device: BaseDeviceAPI<DeviceState, any, Command>,
		private _stateTracker?: StateTracker<any>
	) {
		this.logger = context.logger

		this.setCurrentState(undefined).catch((e) => {
			this.logger.error('Error while creating new StateHandler', e)
		})

		this._commandExecutor = new CommandExecutor(context.logger, this.config.executionType, async (c) =>
			device.sendCommand(c)
		)

		this.clock = setInterval(() => {
			const t = context.getCurrentTime()
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
		}, CLOCK_INTERVAL)
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
		const deviceState = this.device.convertTimelineStateToDeviceState(state, mappings)
		this.context.emitTimeTrace(endTrace(trace))

		// Discard any states that comes after this one,
		//  and append this one to the end:
		this.stateQueue = [
			...this.stateQueue.filter((s) => s.state.time < state.time), // TODO - can we smuggle a little and execute something for the next frame?
			{
				deviceState: 'deviceState' in deviceState ? deviceState.deviceState : deviceState,
				addressStates: 'addressStates' in deviceState ? deviceState.addressStates : undefined,
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

	/**
	 * Sets the current state and makes sure the commands to get to the next state are still corrects
	 **/
	async setCurrentState(state: DeviceState | undefined) {
		this.currentState = {
			commands: [],
			deviceState: state,
			state: this.currentState?.state || { time: this.context.getCurrentTime(), layers: {}, nextEvents: [] },
			mappings: this.currentState?.mappings || {},
		}
		await this.calculateNextStateChange()
	}

	/**
	 * This takes in a DeviceState and then updates the commands such that the device
	 * will be put back into its intended state as designated by the timeline
	 * @todo: this may need to be tied into _executingStateChange variable
	 * @todo: add address states?
	 */
	async updateStateFromDeviceState(state: DeviceState | undefined) {
		// update the current state to the state we received
		const timelineState = this.currentState?.state || {
			time: this.context.getCurrentTime(),
			layers: {},
			nextEvents: [],
		}
		const currentMappings = this.currentState?.mappings || {}

		this.currentState = {
			commands: [],
			deviceState: state,
			state: timelineState,
			mappings: currentMappings,
		}

		// calculate how to get to the timeline state (because the device state may have changed based on device config changes or something)
		const trace = startTrace('device:convertTimelineStateToDeviceState', { deviceId: this.context.deviceId })
		const deviceState = this.device.convertTimelineStateToDeviceState(timelineState, currentMappings) // @todo - we should probably be recalculating all of these :x
		this.context.emitTimeTrace(endTrace(trace))

		// push a new state
		this.stateQueue.unshift({
			deviceState: 'deviceState' in deviceState ? deviceState.deviceState : deviceState,
			addressStates: 'addressStates' in deviceState ? deviceState.addressStates : undefined,
			state: this.currentState?.state || { time: this.context.getCurrentTime(), layers: {}, nextEvents: [] },
			mappings: this.currentState?.mappings || {},
		})

		// now we let it calculate commands to get into the right state, which should be executed immediately given this state is from the past
		await this.calculateNextStateChange()
	}

	clearFutureAfterTimestamp(t: number) {
		this.stateQueue = this.stateQueue.filter((s) => s.state.time <= t)
	}

	recalcDiff() {
		this.calculateNextStateChange().catch((e) => {
			this.logger.warn('Failed to calculate state change ' + e)
		})
	}

	private async calculateNextStateChange() {
		if (!this.currentState) return // a change is currently being executed, we'll be called again once it's done

		const nextState = this.stateQueue[0]
		if (!nextState) return

		let oldState = this.currentState?.deviceState
		let newState = nextState.deviceState

		if (
			this.device.applyAddressState &&
			this.device.addressStateReassertsControl &&
			this.device.diffAddressStates &&
			this._stateTracker
		) {
			oldState = cloneDeep(oldState)
			newState = cloneDeep(newState)
			const addresses = this._stateTracker.getAllAddresses()

			for (const addr of addresses) {
				const isAhead = this._stateTracker.isDeviceAhead(addr)

				if (isAhead) {
					const currentState = this._stateTracker.getCurrentState(addr)
					if (!currentState) continue // nothing to take from here

					if (oldState) this.device.applyAddressState(oldState, addr, currentState)

					const addrState = nextState.addressStates?.[addr]
					const curExpectedState = this._stateTracker.getExpectedState(addr)
					if (
						addrState &&
						!(
							this.device.addressStateReassertsControl(curExpectedState, addrState) ||
							this.device.diffAddressStates(curExpectedState, addrState)
						)
					) {
						this.device.applyAddressState(newState, addr, currentState)
					}
				}
			}
		}

		try {
			const trace = startTrace('device:diffDeviceStates', { deviceId: this.context.deviceId })
			nextState.commands = this.device.diffStates(oldState, newState, nextState.mappings, this.context.getCurrentTime())
			nextState.preliminary = Math.max(0, ...nextState.commands.map((c) => c.preliminary ?? 0))
			this.context.emitTimeTrace(endTrace(trace))
		} catch (e) {
			// todo - log an error
			this.logger.error('diffDeviceState failed, t = ' + nextState.state.time, e as Error)
			// we don't want to get stuck, so we should act as if this can be executed anyway
			nextState.commands = []
		}

		if (nextState.state.time - (nextState.preliminary ?? 0) <= this.context.getCurrentTime() && this.currentState) {
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

		this._commandExecutor
			.executeCommands(newState.commands, newState.measurement)
			.then(() => {
				if (newState.measurement) this.context.reportStateChangeMeasurement(newState.measurement.report())
			})
			.catch((e) => {
				this.logger.error('Error while executing next state change', e)
			})

		if (this._stateTracker && newState.addressStates && this.device.diffAddressStates) {
			for (const [a, s] of Object.entries<AddressState>(newState.addressStates)) {
				const currentAddrState = this._stateTracker.getExpectedState(a)
				const reassertsControl = this.device.addressStateReassertsControl
					? this.device.addressStateReassertsControl(currentAddrState, s)
					: this.device.diffAddressStates(currentAddrState, s)

				this._stateTracker.updateExpectedState(a, s, reassertsControl)
			}
		}

		this.currentState = newState as ExecutedStateChange<DeviceState, Command, AddressState>
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

	getCurrentTime: () => number
}
