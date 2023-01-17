import { Mappings, Timeline, TSRTimelineContent } from 'timeline-state-resolver-types'
import { BaseDeviceAPI, CommandWithContext } from './device'

interface StateChange<DeviceState, Command extends CommandWithContext> {
	commands?: Command[]
	state: Timeline.TimelineState<TSRTimelineContent>
	deviceState: DeviceState
	mappings: Mappings
}
interface ExecutedStateChange<DeviceState, Command extends CommandWithContext>
	extends StateChange<DeviceState, Command> {
	commands: Command[]
}

// const logState = (state: any) =>
// 	JSON.stringify(
// 		{
// 			time: state.time,
// 			layers: Object.fromEntries(Object.entries(state.layers).map(([id, lyr]) => [id, lyr.id])),
// 		},
// 		null,
// 		2
// 	)

export class StateHandler<DeviceState, Command extends CommandWithContext> {
	private stateQueue: StateChange<DeviceState, Command>[] = []
	private currentState: ExecutedStateChange<DeviceState, Command> | undefined = undefined
	private _executingStateChange = false

	private clock: NodeJS.Timeout

	private convertTimelineStateToDeviceState: (
		state: Timeline.TimelineState<TSRTimelineContent>,
		mappings: Mappings
	) => DeviceState
	private diffDeviceStates: (oldState: DeviceState, newState: DeviceState, mappings: Mappings) => Command[]
	private executeCommand: (command: Command) => any

	constructor(device: BaseDeviceAPI<DeviceState, Command>) {
		this.convertTimelineStateToDeviceState = (s, m) => device.convertTimelineStateToDeviceState(s, m)
		this.diffDeviceStates = (o, n, m) => device.diffStates(o, n, m)
		this.executeCommand = (c) => device.sendCommand(c)

		this.clock = setInterval(() => {
			// main clock to check if next state needs to be sent out
			const nextState = this.stateQueue[0]

			if (!this._executingStateChange && nextState && nextState.state.time <= Date.now()) {
				// -20 so visually it will be shown on the next frame?
				this.executeNextStateChange()
			}
		}, 20) // TODO - 20ms is not subframe accuracy
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

		this.stateQueue = [
			...this.stateQueue.filter((s) => s.state.time < state.time), // TODO - can we smuggle a little and execute something for the next frame?
			{
				deviceState: this.convertTimelineStateToDeviceState(state, mappings),
				state,
				mappings,
			},
		]

		if (nextState !== this.stateQueue[0]) {
			// the next state changed
			if (nextState) nextState.commands = undefined
			this.calculateNextStateChange()
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

	async clearFuture(t: number) {
		this.stateQueue = this.stateQueue.filter((s) => s.state.time <= t)
	}

	private async calculateNextStateChange() {
		if (!this.currentState) return // a change is currently being executed, we'll be called again once it's done

		const nextState = this.stateQueue[0]
		if (!nextState) return

		try {
			nextState.commands = this.diffDeviceStates(
				this.currentState.deviceState,
				nextState.deviceState,
				nextState.mappings
			)
		} catch {
			// todo - log an error
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

		this.currentState = undefined

		for (let command of newState.commands) {
			this.executeCommand(command) // should these be awaited? what if they time out?
		}

		this.currentState = newState as ExecutedStateChange<DeviceState, Command>
		this._executingStateChange = false

		this.calculateNextStateChange()
	}
}
