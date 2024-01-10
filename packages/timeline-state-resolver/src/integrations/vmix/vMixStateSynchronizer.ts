import { VMixInput, VMixState, VMixStateExtended } from './vMixStateDiffer'
import { EnforceableVMixInputStateKeys } from '.'
import { VMixInputOverlays, VMixTransform } from 'timeline-state-resolver-types'

/**
 * Applies selected properties from the real state to allow retrying to achieve the state
 */
export class VMixStateSynchronizer {
	applyRealState(expectedState: VMixStateExtended, realState: VMixState): VMixStateExtended {
		this.applyInputsState(expectedState.reportedState.existingInputs, realState.existingInputs)

		this.applyInputsState(expectedState.reportedState.inputsAddedByUs, realState.inputsAddedByUs)

		// If inputs that we were supposed to add are not in vMix, delete them from state, so that they are re-added.
		// Hopefully next time they will be available.
		// This is potentially dangerous if for some reason inputs failed to rename due to undiscovered bugs
		// It might be better to use responses to AddInput
		// this.removeMissingInputs(expectedState.reportedState.inputsAddedByUs, realState.inputsAddedByUs)

		return expectedState
	}

	private applyInputsState(expectedInputs: Record<string, VMixInput>, realInputs: Record<string, VMixInput>) {
		// This is where "enforcement" of expected state occurs.
		// There is only a small number of properties which are safe to enforce.
		// Enforcing others can lead to issues such as clips replaying, seeking back to the start,
		// or even outright preventing Sisyfos from working.
		for (const inputKey of Object.keys(realInputs)) {
			if (expectedInputs[inputKey] == null) continue
			const cherryPickedRealState: Pick<VMixInput, EnforceableVMixInputStateKeys> = {
				duration: realInputs[inputKey].duration,
				loop: realInputs[inputKey].loop,
				transform:
					realInputs[inputKey].transform && expectedInputs[inputKey].transform
						? {
								...realInputs[inputKey].transform!,
								alpha: expectedInputs[inputKey].transform!.alpha, // we don't know the value of alpha - we have to assume it hasn't changed, otherwise we will be sending commands for it all the time
						  }
						: realInputs[inputKey].transform,
				overlays: realInputs[inputKey].overlays,

				// This particular key is what enables the ability to re-load failed/missing media in a List Input.
				listFilePaths: realInputs[inputKey].listFilePaths,
			}

			// Shallow merging is sufficient.
			for (const [key, value] of Object.entries<string | number | boolean | VMixTransform | VMixInputOverlays>(
				cherryPickedRealState
			)) {
				expectedInputs[inputKey][key] = value
			}
		}
	}

	// TODO: enable this in release51 where VMixInputHandler is available
	// private removeMissingInputs(expectedInputs: Record<string, VMixInput>, realInputs: Record<string, VMixInput>) {
	// 	for (const inputKey of Object.keys(expectedInputs)) {
	// 		if (realInputs[inputKey] == null) {
	// 			delete expectedInputs[inputKey]
	// 		}
	// 	}
	// }
}
