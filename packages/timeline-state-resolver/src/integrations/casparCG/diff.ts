import { DeviceType, Mapping, MappingCasparCGType, Mappings, SomeMappingCasparCG } from 'timeline-state-resolver-types'
import { InternalState, isValidCasparCGMapping, mappingToAddress } from './state'
import { CommandWithContext } from '../../service/device'
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
import { Commands, PlayCommand, PlayDecklinkCommand, PlayHtmlCommand, PlayRouteCommand } from 'casparcg-connection'

type Command = CommandWithContext // @nocommit)

export function diffStates(
	oldState: InternalState | undefined,
	newState: InternalState,
	mappings: Mappings
): Array<Command> {
	const addresses: Record<string, string[]> = {}
	const unorderedCommands: { commands: AMCPCommandWithContext[]; address: string; layers: string[] }[] = []

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

		const commands = CasparCGState.diffStates(
			getInternalStateFromLayer(oldLayer, mapping),
			getStateFromLayer(newLayer, mapping),
			Date.now(), // @nocommit ???
			150 // @nocommit - magic number....
		)

		if (commands.length) {
			unorderedCommands.push(
				...commands.map((group) => ({ commands: group.cmds, address: addr, layers: mappingNames }))
			)
		}
	}

	return orderCommands(unorderedCommands)
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

	return commands.map((c) => ({
		command: c,
		context: c.context.context,
		tlObjId: c.context.layerId,
		address: addr,
	}))
}

function orderCommands(
	diff: { commands: AMCPCommandWithContext[]; address: string; layers: string[] }[]
): Array<{ command: AMCPCommandWithContext } & Command> {
	const fastCommands: Array<{ command: AMCPCommandWithContext } & Command> = [] // fast to exec, and direct visual impact: PLAY 1-10
	const slowCommands: Array<{ command: AMCPCommandWithContext } & Command> = [] // slow to exec, but direct visual impact: PLAY 1-10 FILE (needs to have all commands for that layer in the right order)
	const lowPrioCommands: Array<{ command: AMCPCommandWithContext } & Command> = [] // slow to exec, and no direct visual impact: LOADBG 1-10 FILE

	for (const layer of diff) {
		let containsSlowCommand = false

		// filter out lowPrioCommands
		for (let i = 0; i < layer.commands.length; i++) {
			if (
				layer.commands[i].command === Commands.Loadbg ||
				layer.commands[i].command === Commands.LoadbgDecklink ||
				layer.commands[i].command === Commands.LoadbgRoute ||
				layer.commands[i].command === Commands.LoadbgHtml
			) {
				lowPrioCommands.push({
					command: layer.commands[i],
					context: layer.commands[i].context.context,
					tlObjId: layer.commands[i].context.layerId,
					address: layer.address,
				})
				layer.commands.splice(i, 1)
				i-- // next entry now has the same index as this one.
			} else if (
				(layer.commands[i].command === Commands.Play && (layer.commands[i].params as PlayCommand['params']).clip) ||
				(layer.commands[i].command === Commands.PlayDecklink &&
					(layer.commands[i].params as PlayDecklinkCommand['params']).device) ||
				(layer.commands[i].command === Commands.PlayRoute &&
					(layer.commands[i].params as PlayRouteCommand['params']).route) ||
				(layer.commands[i].command === Commands.PlayHtml &&
					(layer.commands[i].params as PlayHtmlCommand['params']).url) ||
				layer.commands[i].command === Commands.Load // ||
				// layer.cmds[i].command === 'LoadDecklinkCommand' ||
				// layer.cmds[i].command === 'LoadRouteCommand' ||
				// layer.cmds[i].command === 'LoadHtmlPageCommand'
			) {
				containsSlowCommand = true
			}
		}

		if (containsSlowCommand) {
			slowCommands.push(
				...layer.commands.map((c) => ({
					command: c,
					context: c.context.context,
					tlObjId: c.context.layerId,
					address: layer.address,
				}))
			)
		} else {
			fastCommands.push(
				...layer.commands.map((c) => ({
					command: c,
					context: c.context.context,
					tlObjId: c.context.layerId,
					address: layer.address,
				}))
			)
		}
	}

	return [...fastCommands, ...slowCommands, ...lowPrioCommands]
}
