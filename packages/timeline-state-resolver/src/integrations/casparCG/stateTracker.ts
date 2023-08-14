export enum LayerStatus {
	Empty = 'EMPTY',
	Loaded = 'LOADED',
}

export interface LayerState {
	status: LayerStatus
	mediaId: string[]
}

export class StateTracker<State, Command> {
	private _state: {
		[address: string]: {
			status: LayerState
			expectedState: State | undefined
			currentState: State | undefined
		}
	} = {}
	private _diff: (address: string, currentState: State | undefined, expectedState: State) => Command[]
	private _getStatus: (currentState: State, expectedState?: State) => { status: LayerStatus; mediaId: string[] }
	private _onReportedChange: (addres: string, state: { status: LayerStatus; mediaId: string[] }) => void

	constructor(
		diff: (address: string, currentState: State | undefined, expectedState: State) => Command[],
		getStatus: (currentState: State, expectedState: State) => { status: LayerStatus; mediaId: string[] },
		onReportedChange: (addres: string, state: { status: LayerStatus; mediaId: string[] }) => void
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

	getDiff(): { [address: string]: Command[] } {
		const diff: { [address: string]: Command[] } = {}

		for (const [address, state] of Object.entries(this._state)) {
			if (!state.expectedState) continue // note - should this be interpreted as empty/unloaded instead?

			const commands = this._diff(address, state.currentState, state.expectedState)
			diff[address] = commands
		}

		return diff
	}

	private _assertAddressExists(address: string) {
		if (!this._state[address])
			this._state[address] = {
				status: { status: LayerStatus.Empty, mediaId: [] },
				expectedState: undefined,
				currentState: undefined,
			}
	}
}
