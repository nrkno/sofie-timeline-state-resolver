import { DeviceType, Mapping, MappingCasparCGType, Mappings, SomeMappingCasparCG } from 'timeline-state-resolver-types'
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

export interface Command extends CommandWithContext {
	command: AMCPCommandWithContext
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

export function diffTrackerStates(currentState, expectedState): Command[] {
	// get addresses
	// todo - this reduce must be very slow...
	const addresses = [...Object.keys(currentState ?? {}), ...Object.keys(expectedState ?? {})]
		.sort()
		.reduce((a, b) => (a.slice(-1)[0] === b ? a : [...a, b]), [])

	const commands = [] as Command[]

	for (const addr of addresses) {
		commands.push(...diffTrackerStatesLayer(addr, currentState[addr], expectedState[addr]))
	}

	return orderCommands(commands)
}

function diffTrackerStatesLayer(addr: string, currentLayer, expectedLayer): Command[] {
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

function orderCommands(commands: Command[]): Array<Command> {
	const fastCommands: Array<Command> = [] // fast to exec, and direct visual impact: PLAY 1-10
	const slowCommands: Array<Command> = [] // slow to exec, but direct visual impact: PLAY 1-10 FILE (needs to have all commands for that layer in the right order)
	const lowPrioCommands: Array<Command> = [] // slow to exec, and no direct visual impact: LOADBG 1-10 FILE

	let containsSlowCommand = false

	// filter out lowPrioCommands
	for (let i = 0; i < commands.length; i++) {
		if (
			commands[i].command.command === Commands.Loadbg ||
			commands[i].command.command === Commands.LoadbgDecklink ||
			commands[i].command.command === Commands.LoadbgRoute ||
			commands[i].command.command === Commands.LoadbgHtml
		) {
			lowPrioCommands.push(commands[i])
			commands.splice(i, 1)
			i-- // next entry now has the same index as this one.
		} else if (
			(commands[i].command.command === Commands.Play && (commands[i].command.params as PlayCommand['params']).clip) ||
			(commands[i].command.command === Commands.PlayDecklink &&
				(commands[i].command.params as PlayDecklinkCommand['params']).device) ||
			(commands[i].command.command === Commands.PlayRoute &&
				(commands[i].command.params as PlayRouteCommand['params']).route) ||
			(commands[i].command.command === Commands.PlayHtml &&
				(commands[i].command.params as PlayHtmlCommand['params']).url) ||
			commands[i].command.command === Commands.Load // ||
			// layer.cmds[i].command === 'LoadDecklinkCommand' ||
			// layer.cmds[i].command === 'LoadRouteCommand' ||
			// layer.cmds[i].command === 'LoadHtmlPageCommand'
		) {
			containsSlowCommand = true
		}
	}

	if (containsSlowCommand) {
		slowCommands.push(...commands)
	} else {
		fastCommands.push(...commands)
	}

	return [...fastCommands, ...slowCommands, ...lowPrioCommands]
}
