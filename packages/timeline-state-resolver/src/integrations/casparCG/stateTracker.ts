export enum LayerStatus {
	Empty = 'EMPTY',
	Loaded = 'LOADED',
	Playing = 'PLAYING',
	LoadedAndPlaying = 'LOADED_PLAYING', // some devices can preload and play at the same time. i.e. casparcg.
}

export class StateTracker<State, Command> {
	private _state: {
		[address: string]: {
			status: LayerStatus
			expectedState: State | undefined
			currentState: State | undefined
		}
	} = {}
	private _diff: (address: string, currentState: State | undefined, expectedState: State) => Command[]
	private _getStatus: (
		currentState: State,
		expectedState?: State
	) => { status: LayerStatus; mediaId: string | undefined }

	constructor(
		diff: (address: string, currentState: State | undefined, expectedState: State) => Command[],
		getStatus: (currentState: State, expectedState: State) => { status: LayerStatus; mediaId: string | undefined }
	) {
		// note - the diff function should only consider
		this._diff = diff
		this._getStatus = getStatus
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
		this._state[address].status = status.status

		// todo - report new status + mediaId
		console.log('updated status', address, status)
	}
	getCurrentState(address: string): State | undefined {
		return this._state[address]?.currentState
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
				status: LayerStatus.Empty,
				expectedState: undefined,
				currentState: undefined,
			}
	}
}
