import { Mapping, Mappings, SomeMappingCasparCG } from 'timeline-state-resolver-types'
import { InternalState, isValidCasparCGMapping, mappingToAddress } from './state'
import { literal } from '../../devices/device'

import { EmptyLayer, Layer, LayerContentType, NextUp, State as CcgState, AMCPCommandWithContext } from 'casparcg-state'
import { resolveForegroundState } from 'casparcg-state/dist/lib/resolvers/foreground'
import { InternalState as CcgInternalState } from 'casparcg-state/dist/lib/stateObjectStorage'

type Command = any // @nocommit)

export function diffStates(
	oldState: InternalState | undefined,
	newState: InternalState,
	mappings: Mappings
): Array<Command> {
	const addresses: Record<string, string[]> = {}
	const allCommands: Array<AMCPCommandWithContext> = []

	for (const [mappingName, mapping] of Object.entries(mappings)) {
		if (!isValidCasparCGMapping(mapping)) continue

		const address = mappingToAddress(mapping)

		if (!addresses[address]) {
			addresses[address] = [mappingName]
		} else {
			addresses[address].push(mappingName)
		}
	}

	for (const [addr, mappingNames] of Object.entries(addresses)) {
		// @nocommit - add back the preview when empty thingamjig
		const mapping = mappings[mappingNames[0]] as Mapping<SomeMappingCasparCG>

		// @nocommit
		let newLayer: any = getEmptyLayer(addr, mapping)
		let oldLayer: any = getEmptyLayer(addr, mapping)

		if (newState.layers[addr]) {
			newLayer = newState.layers[addr]
		}
		if (oldState?.layers[addr]) {
			oldLayer = newState.layers[addr]
		}

		if (newState.lookaheads[addr]) {
			newLayer.nextUp = newState.lookaheads[addr]
		}
		if (oldState?.lookaheads[addr]) {
			oldLayer.nextUp = oldState.lookaheads[addr]
		}

		const { commands, bgCleared } = resolveForegroundState(
			getInternalStateFromLayer(oldLayer, mapping),
			getStateFromLayer(newLayer, mapping),
			mapping.options.channel + '',
			mapping.options.layer + '',
			Date.now(), // @nocommit ???
			150 // @nocommit - magic number....
		)

		allCommands.push(...commands.cmds)
	}

	// @nocommmit - check ordering of commands
	return allCommands
}

function getEmptyLayer(addr: string, mapping: Mapping<SomeMappingCasparCG>) {
	return literal<EmptyLayer>({
		id: `${addr}_empty_base`,
		layerNo: mapping.options.layer,
		content: LayerContentType.NOTHING,
		playing: false,
	})
}

function getStateFromLayer(layer: Layer, mapping: Mapping<SomeMappingCasparCG>): CcgState {
	return literal<CcgState>(getInternalStateFromLayer(layer, mapping))
}
function getInternalStateFromLayer(layer: Layer, mapping: Mapping<SomeMappingCasparCG>): CcgInternalState {
	return literal<CcgInternalState>({
		channels: {
			[mapping.options.channel]: {
				channelNo: mapping.options.channel,
				videoMode: 'PAL', // todo - hardcoded
				fps: 25, // @nocommit - hardcoded
				layers: {
					[mapping.options.layer]: layer,
				},
			},
		},
	})
}
