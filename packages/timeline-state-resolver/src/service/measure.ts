export class Measurement {
	private _added: number
	private _scheduled: number

	private _stateExecution: number | undefined
	private _stateDelay: number | undefined

	private _commandExecutions = new Map<any, StateChangeReport['commands'][any]>()

	constructor(scheduled: number) {
		this._added = Date.now()
		this._scheduled = scheduled
	}

	executeState() {
		this._stateExecution = Date.now()
		this._stateDelay = this._stateExecution - this._scheduled
	}

	executeCommand(command: any) {
		this._commandExecutions.set(command, {
			args: JSON.stringify(command),

			executed: Date.now(),
			executeDelay: Date.now() - this._scheduled,
		})
	}

	finishedCommandExecution(command: any) {
		const execution = this._commandExecutions.get(command)

		if (execution) {
			this._commandExecutions.set(command, {
				...execution,

				fulfilled: Date.now(),
				fulfilledDelay: Date.now() - execution.executed,
			})
		}
	}

	report(): StateChangeReport {
		return {
			added: this._added,
			prepareTime: this._scheduled - this._added,
			scheduled: this._scheduled,

			executed: this._stateExecution,
			executionDelay: this._stateDelay,

			commands: Array.from(this._commandExecutions.values()),
		}
	}
}

export interface StateChangeReport {
	added: number
	prepareTime: number
	scheduled: number

	executed?: number
	executionDelay?: number

	commands: Array<{
		args: string

		executed: number
		executeDelay: number
		fulfilled?: number
		fulfilledDelay?: number
	}>
}
