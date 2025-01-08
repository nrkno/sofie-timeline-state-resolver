import * as _ from 'underscore'
import { EventEmitter } from 'eventemitter3'

const SETTLE_TIME = 200 // ms

export interface StateTrackerEvents {
	blocked: [address: string]
}

/**
 * A StateTracker tracks addressable substates of a whole device's state.
 * For every Address it tracks both the expected state - i.e. the state that
 * TSR thinks the device should be in as well as the actual state - i.e. what
 * the device has reported back to us
 *
 * An Address can be any string, typically you want it to be a form of a hash
 * for what part of the device's state it is for, for an Atem it may look something
 * like video.mixEffect.0.upstreamKeyer.1 to indicate the second keyer on the
 * first ME.
 *
 * An Address is "blocked" when the device reports the state for that Address
 * is different than the expected state. To ensure we are not seeing a one-off
 * issue we make sure to wait 200ms to see if any other state updates come through
 * before marking something as "blocked".
 *
 * Every AddressState can also track a "ControlValue", this is a string. When
 * this string changes it indicates that TSR wants to take control back over
 * the AddressState.
 */
export class StateTracker<State> extends EventEmitter<StateTrackerEvents> {
	private _state: {
		[address: string]: InternalAddressState<State>
	} = {}
	private waitToSettle = new Map<string, NodeJS.Timeout>()

	constructor(private diff: (state1: State, state2: State) => boolean) {
		super()
	}

	isBlocked(address: string): boolean {
		return this._state[address]?.blocked ?? false
	}
	getControlValue(address: string): string | undefined {
		return this._state[address]?.controlValue
	}
	setControlValue(address: string, value: string): void {
		this._assertAddressExists(address)
		this._state[address].controlValue = value
	}

	updateExpectedState(address: string, state: State, controlValue?: string) {
		this._assertAddressExists(address)
		this._state[address].expectedState = state

		if (this._state[address].controlValue !== controlValue) {
			// unblock when control value changes
			if (this._state[address].blocked) console.log('unblock', address)
			this._state[address].blocked = false
		}
		this._state[address].controlValue = controlValue
	}

	getExpectedState(address: string): State | undefined {
		return this._state[address]?.expectedState
	}

	updateState(address: string, state: State) {
		this._assertAddressExists(address)
		this._state[address].currentState = state

		if (this.waitToSettle.get(address)) clearTimeout(this.waitToSettle.get(address))
		this.waitToSettle.set(
			address,
			setTimeout(() => {
				if (this.waitToSettle.get(address)) clearTimeout(this.waitToSettle.get(address))

				const expectedState = this.getExpectedState(address)
				if (!this._state[address].blocked && (!expectedState || this.diff(state, expectedState))) {
					this._state[address].blocked = true
					this.emit('blocked', address)
					// console.log(Date.now(), 'address blocked: ' + address, JSON.stringify(expectedState), JSON.stringify(state))
					console.log('address blocked: ' + address)
				}
			}, SETTLE_TIME)
		)
	}
	getCurrentState(address: string): State | undefined {
		return this._state[address]?.currentState
	}

	getAllAddresses(): string[] {
		return Object.keys(this._state)
	}

	clearState() {
		this._state = {}
	}

	private _assertAddressExists(address: string) {
		if (!this._state[address])
			this._state[address] = {
				expectedState: undefined,
				currentState: undefined,
				blocked: false,
			}
	}
}

interface InternalAddressState<State> {
	expectedState: State | undefined
	currentState: State | undefined
	blocked: boolean
	controlValue?: string
}
