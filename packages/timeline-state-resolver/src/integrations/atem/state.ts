import { TransitionSelection, TransitionStyle } from 'atem-connection/dist/enums'
import { SuperSource, TransitionSettings } from 'atem-connection/dist/state/video'
import { DownstreamKeyer } from 'atem-connection/dist/state/video/downstreamKeyers'
import { UpstreamKeyer } from 'atem-connection/dist/state/video/upstreamKeyers'
import { State as DeviceState } from 'atem-state'
import { assertNever, deepMerge } from '../../lib'
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
export function atemStateToAddressStates(state: AtemDeviceState): Record<string, AnyAddressState> {
	const addressStates: Record<string, AnyAddressState> = {}

	// mix effects
	for (const me of state.video.mixEffects) {
		if (!me) continue

		addressStates['video.mixEffects.' + me.index + '.pgm'] = {
			type: AddressType.ProgramInput,
			controlValue: state.controlValues?.['video.mixEffects.' + me.index + '.pgm'] ?? '',
			index: [me.index],
			state: {
				programInput: 'input' in me ? me.input : me.programInput,
			},
		}

		addressStates['video.mixEffects.' + me.index + '.base'] = {
			type: AddressType.MixEffect,
			controlValue: state.controlValues?.['video.mixEffects.' + me.index + '.base'] ?? '',
			index: [me.index],
			state: {
				previewInput: 'input' in me ? undefined : me.previewInput,
				nextStyle: me.transitionProperties.nextStyle,
				nextSelection: me.transitionProperties.nextSelection,
			},
		}

		addressStates['video.mixEffects.' + me.index + '.transitionSettings'] = {
			type: AddressType.TransitionSettings,
			controlValue: state.controlValues?.['video.mixEffects.' + me.index + '.transitionSettings'] ?? '',
			index: [me.index],
			state: me.transitionSettings,
		}

		// usk's
		for (const usk of me.upstreamKeyers) {
			if (!usk) continue

			addressStates['video.mixEffects.' + me.index + '.keyer.' + usk.upstreamKeyerId] = {
				type: AddressType.UpStreamKey,
				controlValue: state.controlValues?.['video.mixEffects.' + me.index + '.keyer.' + usk.upstreamKeyerId] ?? '',
				index: [me.index, usk.upstreamKeyerId],
				state: usk,
			}
		}
	}

	// dsk's
	for (let i = 0; i < state.video.downstreamKeyers.length; i++) {
		const dsk = state.video.downstreamKeyers[i]
		if (!dsk) continue

		addressStates['video.dsk.' + i] = {
			type: AddressType.DownStreamKey,
			controlValue: state.controlValues?.['video.dsk.' + i] ?? '',
			index: [i],
			state: dsk,
		}
	}

	// supersource
	for (const ss of state.video.superSources) {
		if (!ss) continue

		addressStates['video.superSource.' + ss.index] = {
			type: AddressType.SuperSource,
			controlValue: state.controlValues?.['video.superSource.' + ss.index] ?? '',
			index: [ss.index],
			state: ss,
		}
	}

	// auxiliaries
	for (let i = 0; i < state.video.auxilliaries.length; i++) {
		addressStates['video.auxiliaries.' + i] = {
			type: AddressType.Auxiliary,
			controlValue: state.controlValues?.['video.auxiliaries.' + i] ?? '',
			index: [i],
			state: { source: state.video.auxilliaries[i] },
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

	for (const [address, state] of Object.entries<AnyAddressState>(addressStates)) {
		updateFn(address, state)
	}
}

/**
 * These are the kinds of substates that we track
 */
export enum AddressType {
	MixEffect = 'mixEffect',
	ProgramInput = 'programInput',
	TransitionSettings = 'transitionSettings',
	UpStreamKey = 'upStreamKey',
	DownStreamKey = 'downStreamKey',
	SuperSource = 'superSource',
	Auxiliary = 'auxiliary',
}

/**
 * An AddressState is a substate of a device's state that can be individually
 * tracked for granular state tracking.
 *
 * Note - essentially it should be possible to deduce what part of the state this
 * belongs to based on the address (a string) but that requires a bunch of regex
 * and keeping indexes seemed slightly more efficient, albeit not 100% typesafe
 */
interface AddressState<Type extends AddressType, State> {
	type: Type
	controlValue: string
	index: (number | string)[]

	state: State
}

type MixEffectState = AddressState<
	AddressType.MixEffect,
	{ previewInput?: number; nextStyle: TransitionStyle; nextSelection: TransitionSelection[] }
>
type ProgramInputState = AddressState<AddressType.ProgramInput, { programInput: number }>
type TransitionSettingsState = AddressState<AddressType.TransitionSettings, TransitionSettings>
type UpStreamKeyState = AddressState<AddressType.UpStreamKey, UpstreamKeyer>
type DownStreamKeyState = AddressState<AddressType.DownStreamKey, DownstreamKeyer>
type SuperSourceState = AddressState<AddressType.SuperSource, SuperSource.SuperSource>
type AuxState = AddressState<AddressType.Auxiliary, { source: number | undefined }>

export type AnyAddressState =
	| MixEffectState
	| ProgramInputState
	| TransitionSettingsState
	| UpStreamKeyState
	| DownStreamKeyState
	| SuperSourceState
	| AuxState

export type AtemDeviceState = DeviceState & { controlValues?: Record<string, string> }

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
			if (!('input' in me)) {
				me.previewInput = addrState.state.previewInput ?? me.previewInput
			}
			me.transitionProperties.nextStyle = addrState.state.nextStyle
			me.transitionProperties.nextSelection = addrState.state.nextSelection
			break
		}
		case AddressType.ProgramInput: {
			const me = getMe(addrState.index[0] as number)
			if (!me) break
			if ('input' in me) {
				me.input = addrState.state.programInput
			} else {
				me.programInput = addrState.state.programInput
			}
			break
		}
		case AddressType.TransitionSettings: {
			const me = getMe(addrState.index[0] as number)
			if (!me) break
			deepMerge(me.transitionSettings, addrState.state)
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
		case AddressType.Auxiliary: {
			deviceState.video.auxilliaries[addrState.index[0]] = addrState.state.source
			break
		}
		default: {
			assertNever(addrState)
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
