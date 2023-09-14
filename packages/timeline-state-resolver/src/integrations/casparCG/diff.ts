import {
	AMCPCommandWithContext,
	CasparCGState,
	EmptyLayer,
	Layer,
	LayerContentType,
	State as CcgState,
} from 'casparcg-state'
import { CommandWithContext } from '../../service/device'
import { CasparCGDeviceState, TrackedLayer } from './state'
import { DeviceType, Mapping, MappingCasparCGType, SomeMappingCasparCG } from 'timeline-state-resolver-types'
import { literal } from '../../devices/device'
import { InternalState as CcgInternalState } from 'casparcg-state/dist/lib/stateObjectStorage'
import { Commands, PlayCommand, PlayDecklinkCommand, PlayHtmlCommand, PlayRouteCommand } from 'casparcg-connection'

export interface CasparCGCommand extends CommandWithContext {
	command: AMCPCommandWithContext
}

export function diffStates(
	currentState: CasparCGDeviceState | undefined,
	expectedState: CasparCGDeviceState,
	fps: number
): CasparCGCommand[] {
	// get addresses
	const addresses = new Set([...Object.keys(currentState ?? {}), ...Object.keys(expectedState ?? {})]).values()

	const commands = [] as CasparCGCommand[]

	for (const addr of addresses) {
		commands.push(
			...diffTrackerStatesLayer(
				addr,
				currentState?.[addr],
				expectedState[addr],
				expectedState[addr]?.time ?? currentState?.[addr]?.time ?? 0,
				fps
			)
		)
	}

	return orderCommands(commands)
}

function diffTrackerStatesLayer(
	addr: string,
	currentLayer: TrackedLayer | undefined,
	expectedLayer: TrackedLayer | undefined,
	time: number,
	fps: number
): CasparCGCommand[] {
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

	let newLayer: Layer = getEmptyLayer(addr, mapping)
	let oldLayer: Layer = getEmptyLayer(addr, mapping)

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
		getInternalStateFromLayer(oldLayer, mapping, fps),
		getStateFromLayer(newLayer, mapping, fps),
		time
	)

	return commands.map((c) => ({
		command: c,
		context: c.context.context,
		tlObjId: c.context.layerId,
	}))
}

function getEmptyLayer(addr: string, mapping: Mapping<SomeMappingCasparCG>) {
	return literal<EmptyLayer>({
		id: `${addr}_empty_base`,
		layerNo: mapping.options.layer,
		content: LayerContentType.NOTHING,
		playing: false,
	})
}
function getInternalStateFromLayer(layer: Layer, mapping: Mapping<SomeMappingCasparCG>, fps: number): CcgInternalState {
	return literal<CcgInternalState>({
		channels: {
			[mapping.options.channel]: {
				channelNo: mapping.options.channel,
				videoMode: 'PAL', // hardcoded but doesn't look like ccg-state is using it anyway
				fps: fps,
				layers: {
					[mapping.options.layer]: layer,
				},
			},
		},
	})
}
function getStateFromLayer(layer: Layer, mapping: Mapping<SomeMappingCasparCG>, fps: number): CcgState {
	return literal<CcgState>(getInternalStateFromLayer(layer, mapping, fps))
}

function orderCommands(commands: CasparCGCommand[]): Array<CasparCGCommand> {
	const fastCommands: Array<CasparCGCommand> = [] // fast to exec, and direct visual impact: PLAY 1-10
	const slowCommands: Array<CasparCGCommand> = [] // slow to exec, but direct visual impact: PLAY 1-10 FILE (needs to have all commands for that layer in the right order)
	const lowPrioCommands: Array<CasparCGCommand> = [] // slow to exec, and no direct visual impact: LOADBG 1-10 FILE

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
			commands[i].command.command === Commands.Load
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
