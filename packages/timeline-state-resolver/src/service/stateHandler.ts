import { Mappings, Timeline, TSRTimelineContent } from 'timeline-state-resolver-types'

export class StateHandler<DeviceState, Command> {
	private stateQueue: {
		commands?: Command[]
		state: Timeline.TimelineState<TSRTimelineContent>
		deviceState: DeviceState
		mappings: Mappings
	}[] = []
	private currentState:
		| {
				commands: Command[]
				state: Timeline.TimelineState<TSRTimelineContent>
				deviceState: DeviceState
				mappings: Mappings
		  }
		| undefined = undefined

	private clock: NodeJS.Timeout

	constructor(
		private convertTimelineStateToDeviceState: (
			state: Timeline.TimelineState<TSRTimelineContent>,
			mappings: Mappings
		) => DeviceState,
		private diffDeviceStates: (oldState: DeviceState, newState: DeviceState, mappings: Mappings) => Command[],
		private executeCommand: (command: Command) => any
	) {
		this.clock = setInterval(() => {
			// main clock to check if next state needs to be sent out
			const nextState = this.stateQueue[0]

			if (this.currentState && nextState && nextState.state.time <= Date.now()) this.executeNextStateChange()
		}, 20) // TODO - 20ms is not subframe accuracy
	}

	async terminate() {
		clearTimeout(this.clock)
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

	async clearFuture() {
		this.stateQueue = []
	}

	private async calculateNextStateChange() {
		if (!this.currentState) return // a change is currently being executed, we'll be called again once it's done

		const nextState = this.stateQueue[0]
		if (!nextState) return

		nextState.commands = this.diffDeviceStates(this.currentState.deviceState, nextState.deviceState, nextState.mappings)

		if (nextState.state.time <= Date.now() && this.currentState) {
			await this.executeNextStateChange()
		}
	}

	private async executeNextStateChange() {
		if (!this.stateQueue[0]) {
			// there is no next to execute
			return
		}

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

		this.currentState = newState as {
			commands: Command[]
			deviceState: DeviceState
			state: Timeline.TimelineState<TSRTimelineContent>
			mappings: Mappings
		}
		this.calculateNextStateChange()
	}
}
