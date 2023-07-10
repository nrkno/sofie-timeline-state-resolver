import { DeviceType, Mapping, MappingCasparCGType, Mappings, SomeMappingCasparCG } from 'timeline-state-resolver-types'
import { InternalState, isValidCasparCGMapping, mappingToAddress } from './state'
import { literal } from '../../devices/device'

import {
	EmptyLayer,
	Layer,
	LayerContentType,
	State as CcgState,
	AMCPCommandWithContext,
	CasparCGState,
} from 'casparcg-state'
import { InternalState as CcgInternalState } from 'casparcg-state/dist/lib/stateObjectStorage'

type Command = any // @nocommit)

export function diffStates(
	oldState: InternalState | undefined,
	newState: InternalState,
	mappings: Mappings
): Array<Command> {
	const addresses: Record<string, string[]> = {}
	const allCommands: Array<{ layers: string[]; commands: AMCPCommandWithContext[] }> = []

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
			oldLayer = oldState.layers[addr]
		}

		if (newState.lookaheads[addr]) {
			newLayer.nextUp = newState.lookaheads[addr]
		}
		if (oldState?.lookaheads[addr]) {
			oldLayer.nextUp = oldState.lookaheads[addr]
		}

		const commands = CasparCGState.diffStatesOrderedCommands(
			getInternalStateFromLayer(oldLayer, mapping),
			getStateFromLayer(newLayer, mapping),
			Date.now(), // @nocommit ???
			150 // @nocommit - magic number....
		)

		if (commands.length)
			allCommands.push({
				layers: mappingNames,
				commands,
			})
	}

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

export function diffTrackerStates(currentState, expectedState): any[] {
	// get addresses
	// todo - this reduce must be very slow...
	const addresses = [...Object.keys(currentState ?? {}), ...Object.keys(expectedState ?? {})]
		.sort()
		.reduce((a, b) => (a.slice(-1)[0] === b ? a : [...a, b]), [])

	const commands = [] as any[]

	for (const addr of addresses) {
		commands.push(diffTrackerStatesLayer(addr, currentState[addr], expectedState[addr]))
	}

	return commands
}

export function diffTrackerStatesLayer(addr: string, currentLayer, expectedLayer): Command[] {
	const [channel, layer] = addr.split('-').map((v) => parseInt(v))
	const mapping: Mapping<SomeMappingCasparCG> = {
		device: DeviceType.CASPARCG,
		deviceId: '',

		options: {
			mappingType: MappingCasparCGType.Layer,

			channel,
			layer,
		},
	}

	// @nocommit
	let newLayer: any = getEmptyLayer(addr, mapping)
	let oldLayer: any = getEmptyLayer(addr, mapping)

	if (expectedLayer?.layer) {
		newLayer = expectedLayer.layer
	}
	if (currentLayer?.layer) {
		oldLayer = currentLayer.layer
	}

	if (expectedLayer?.lookahead) {
		newLayer.nextUp = expectedLayer.lookahead
	}
	if (currentLayer?.lookahead) {
		oldLayer.nextUp = currentLayer.lookahead
	}

	const commands = CasparCGState.diffStatesOrderedCommands(
		getInternalStateFromLayer(oldLayer, mapping),
		getStateFromLayer(newLayer, mapping),
		Date.now(), // @nocommit ???
		150 // @nocommit - magic number....
	)

	return commands
}
