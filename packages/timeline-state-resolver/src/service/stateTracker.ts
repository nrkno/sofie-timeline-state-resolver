import { LayerState, LayerStatus } from 'timeline-state-resolver-types'

export class StateTracker<State, Command> {
	private _state: {
		[address: string]: {
			status: LayerState
			expectedState: State | undefined
			currentState: State | undefined
		}
	} = {}
	private _diff: (currentState: Record<string, State>, expectedState: Record<string, State>) => Array<Command>
	private _getStatus: (currentState: State, expectedState?: State) => LayerState
	private _onReportedChange: (addres: string, state: LayerState) => void

	constructor(
		diff: (currentState: Record<string, State>, expectedState: Record<string, State>) => Array<Command>,
		getStatus: (currentState: State, expectedState: State) => LayerState,
		onReportedChange: (addres: string, state: LayerState) => void
	) {
		// note - the diff function should only consider
		this._diff = diff
		this._getStatus = getStatus
		this._onReportedChange = onReportedChange
	}

	updateExpectedState(address: string, state: State) {
		this._assertAddressExists(address)
		this._state[address].expectedState = state
	}

	getExpectedState(address: string): State | undefined {
		return this._state[address]?.expectedState
	}

	updateState(address: string, state: State) {
		this._assertAddressExists(address)
		this._state[address].currentState = state

		const status = this._getStatus(state, this._state[address].expectedState)
		this._state[address].status = status

		this._onReportedChange(address, status)
	}
	getCurrentState(address: string): State | undefined {
		return this._state[address]?.currentState
	}
	getCurrentStatus(address: string): LayerState | undefined {
		return this._state[address]?.status
	}

	clearState() {
		this._state = {}
	}

	getDiff(): Command[] {
		const stateEntries = Object.entries(this._state)
		const expectedState = Object.fromEntries(stateEntries.map(([a, s]) => [a, s.expectedState]).filter(([_, s]) => !!s))
		const currentState = Object.fromEntries(stateEntries.map(([a, s]) => [a, s.currentState]).filter(([_, s]) => !!s))

		return this._diff(currentState, expectedState)
	}

	private _assertAddressExists(address: string) {
		if (!this._state[address])
			this._state[address] = {
				status: { status: LayerStatus.Empty, mediaId: [], failedMediaId: [] },
				expectedState: undefined,
				currentState: undefined,
			}
	}
}
