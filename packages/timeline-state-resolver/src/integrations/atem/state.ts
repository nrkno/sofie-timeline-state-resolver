import { TransitionSelection, TransitionStyle } from 'atem-connection/dist/enums'
import { SuperSource, TransitionSettings } from 'atem-connection/dist/state/video'
import { DownstreamKeyer } from 'atem-connection/dist/state/video/downstreamKeyers'
import { UpstreamKeyer } from 'atem-connection/dist/state/video/upstreamKeyers'
import { State as DeviceState } from 'atem-state'
import { StateTracker } from './stateTracker'
import { cloneDeep } from '../../lib'
import { AtemStateUtil } from 'atem-connection'
import * as _ from 'underscore'

/**
 * This function converts a full device state into substates that can be addressed
 * separately (AddressStates). Currently it divides out the sources and transition
 * properties of a mix effect, upstream keys, downstream keys and supersources.
 *
 * @param state A DeviceState as is reported by atem-connection
 * @returns A record of AddressStates
 */
export function atemStateToAddressStates(state: DeviceState): Record<string, AnyAddressState> {
	const addressStates: Record<string, AnyAddressState> = {}

	// mix effects
	for (const me of state.video.mixEffects) {
		if (!me) continue

		addressStates['video.mixEffects.' + me.index + '.base'] = {
			type: AddressType.MixEffect,
			index: [me.index],
			state: {
				programInput: 'input' in me ? me.input : me.programInput,
				previewInput: 'input' in me ? undefined : me.previewInput,
				nextStyle: me.transitionProperties.nextStyle,
				nextSelection: me.transitionProperties.nextSelection,
			},
		}

		addressStates['video.mixEffects.' + me.index + '.transitionSettings'] = {
			type: AddressType.TransitionSettings,
			index: [me.index],
			state: me.transitionSettings,
		}

		// usk's
		for (let i in me.upstreamKeyers) {
			if (!me.upstreamKeyers[i]) continue

			addressStates['video.mixEffects.' + me.index + '.keyer.' + i] = {
				type: AddressType.UpStreamKey,
				index: [me.index, i],
				state: me.upstreamKeyers[i],
			}
		}
	}

	// dsk's
	for (let i in state.video.downstreamKeyers) {
		if (!state.video.downstreamKeyers[i]) continue

		addressStates['video.dsk.' + i] = {
			type: AddressType.DownStreamKey,
			index: [i],
			state: state.video.downstreamKeyers[i],
		}
	}

	// supersource
	for (let i in state.video.superSources) {
		if (!state.video.superSources[i]) continue

		addressStates['video.superSource.' + i] = {
			type: AddressType.SuperSource,
			index: [i],
			state: state.video.superSources[i],
		}
	}

	return addressStates
}

/**
 * This function takes in a full DeviceState, converts that to smaller substates for MixEffects,
 * Keyers etc. and then calls a update function for each substate
 */
export function updateFromAtemState(updateFn: (address: any, state: any) => void, state: DeviceState): void {
	const addressStates = atemStateToAddressStates(state)

	for (const [address, state] of Object.entries(addressStates)) {
		updateFn(address, state)
	}
}

/**
 * These are the kinds of substates that we track
 */
export enum AddressType {
	MixEffect = 'mixEffect',
	TransitionSettings = 'transitionSettings',
	UpStreamKey = 'upStreamKey',
	DownStreamKey = 'downStreamKey',
	SuperSource = 'superSource',
}

/**
 * An AddressState is a substate of a device's state that can be individually
 * tracked for granular state tracking.
 *
 * Note - essentially it should be possible to deduce what part of the state this
 * belongs to based on the address (a string) but that requires a bunch of regex
 * and keeping indexes seemed slightly more efficient, albeit not 100% typesafe
 */
interface AddressState<Type extends AddressType, State extends any> {
	type: Type
	index: (number | string)[]

	state: State
}

type MixEffectState = AddressState<
	AddressType.MixEffect,
	{ programInput: number; previewInput?: number; nextStyle: TransitionStyle; nextSelection: TransitionSelection[] }
>
type TransitionSettingsState = AddressState<AddressType.TransitionSettings, TransitionSettings>
type UpStreamKeyState = AddressState<AddressType.UpStreamKey, UpstreamKeyer>
type DownStreamKeyState = AddressState<AddressType.DownStreamKey, DownstreamKeyer>
type SuperSourceState = AddressState<AddressType.SuperSource, SuperSource.SuperSource>

export type AnyAddressState =
	| MixEffectState
	| TransitionSettingsState
	| UpStreamKeyState
	| DownStreamKeyState
	| SuperSourceState

/**
 * This function takes in a full DeviceState and returns a full DeviceState with overrides coming from  the StateTrackers state if a AddressState is blocked
 *
 * @param deviceState A full DeviceState
 * @param tracker A StateTracker instance
 * @param shouldBeBlocked If an AddressState has been blocked because it received an external update, should it still be blocked? To be used in conjunction with ControlValues
 */
export function getDeviceStateWithBlockedStates(
	deviceState: DeviceState,
	tracker: StateTracker<AnyAddressState>,
	shouldBeBlocked: (address: string) => boolean
) {
	const newDeviceState = cloneDeep(deviceState)
	const addresses = tracker.getAllAddresses()

	for (const addr of addresses) {
		const blocked = tracker.isBlocked(addr)

		if (blocked && shouldBeBlocked(addr)) {
			// in this case we want to override with the current state (as reported by the device itself)

			const currentState = tracker.getCurrentState(addr)
			if (!currentState) continue // nothing to take from here

			applyAddressStateToAtemState(newDeviceState, currentState)
		}
	}

	return newDeviceState
}

/**
 * This function takes in an AddressState and **correctly** (if there are no bugs in the
 * code😉) overrides the DeviceState with it.
 */
export function applyAddressStateToAtemState(deviceState: DeviceState, addrState: AnyAddressState) {
	const getMe = (index: number) => {
		return AtemStateUtil.getMixEffect(deviceState as any, index)
	}

	switch (addrState.type) {
		case AddressType.MixEffect: {
			const me = getMe(addrState.index[0] as number)
			if (!me) break
			if ('input' in me) {
				me.input = addrState.state.programInput
			} else {
				me.programInput = addrState.state.programInput
				me.previewInput = addrState.state.previewInput ?? me.previewInput
			}
			me.transitionProperties.nextStyle = addrState.state.nextStyle
			me.transitionProperties.nextSelection = addrState.state.nextSelection
			break
		}
		case AddressType.TransitionSettings: {
			const me = getMe(addrState.index[0] as number)
			if (!me) break
			for (const [key, obj] of Object.entries(addrState.state)) me.transitionSettings[key] = obj
			break
		}
		case AddressType.UpStreamKey: {
			const me = getMe(addrState.index[0] as number)
			if (!me) break
			me.upstreamKeyers[addrState.index[1]] = addrState.state
			break
		}
		case AddressType.DownStreamKey: {
			deviceState.video.downstreamKeyers[addrState.index[0]] = addrState.state
			break
		}
		case AddressType.SuperSource: {
			deviceState.video.superSources[addrState.index[0]] = addrState.state
			break
		}
	}
}

/**
 * Compare two AddressStates and return true if they are not equal. In practice this is used to
 * figure out if the state coming from the device is different from the state inside the
 * TSR and if so, we conclude someone (something) else is controlling the external device
 */
export function diffAddressStates(state1: AnyAddressState, state2: AnyAddressState) {
	if (!state1 || !state2 || state1.type !== state2.type) return false // report not different because it's kind of weird

	if (state1.type === AddressType.MixEffect && state2.type === AddressType.MixEffect) {
		if (!_.isEqual(_.omit(state1.state, 'previewInput'), _.omit(state2.state, 'previewInput'))) return true

		if (
			state1.state.previewInput !== undefined &&
			state2.state.previewInput !== undefined &&
			state1.state.previewInput !== state2.state.previewInput
		)
			return true

		return false
	} else if (state1.type === AddressType.TransitionSettings && state2.type === AddressType.TransitionSettings) {
		if (state1.state.DVE && state2.state.DVE && !_.isEqual(state1.state.DVE, state2.state.DVE)) return true
		if (state1.state.dip && state2.state.dip && !_.isEqual(state1.state.dip, state2.state.dip)) return true
		if (state1.state.mix && state2.state.mix && !_.isEqual(state1.state.mix, state2.state.mix)) return true
		if (state1.state.stinger && state2.state.stinger && !_.isEqual(state1.state.stinger, state2.state.stinger))
			return true
		if (state1.state.wipe && state2.state.wipe && !_.isEqual(state1.state.wipe, state2.state.wipe)) return true
		return false
	}

	return !_.isEqual(state1.state, state2.state)
}
