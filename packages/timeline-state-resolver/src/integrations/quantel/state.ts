import {
	LayerState,
	LayerStatus,
	Mapping,
	MappingQuantelPort,
	Mappings,
	QuantelControlMode,
	ResolvedTimelineObjectInstanceExtended,
	SomeMappingQuantel,
	TSRTimelineContent,
	Timeline,
	TimelineContentQuantelClip,
} from 'timeline-state-resolver-types'
import { MappedPorts, QuantelAddressState, QuantelCommandType, QuantelStatePort } from './types'
import { QuantelCommandWithContext } from '.'
import { literal } from '../../devices/device'

export function getMappedPorts(mappings: Mappings<SomeMappingQuantel>): MappedPorts {
	const ports: MappedPorts = {}

	for (const mapping of Object.values<Mapping<SomeMappingQuantel>>(mappings)) {
		if (mapping && 'portId' in mapping.options && 'channelId' in mapping.options) {
			if (!ports[mapping.options.portId]) {
				ports[mapping.options.portId] = {
					mode: mapping.options.mode || QuantelControlMode.QUALITY,
					channels: [],
				}
			}

			// push now, sort later
			ports[mapping.options.portId].channels.push(mapping.options.channelId)
		}
	}

	// now sort in place
	for (const port of Object.values<MappedPorts[string]>(ports)) {
		port.channels.sort()
	}

	return ports
}

export function convertTimelineStateToQuantelState(
	timelineState: Timeline.TimelineState<TSRTimelineContent>,
	mappings: Mappings<SomeMappingQuantel>
): Record<string, QuantelAddressState> {
	const state: Record<string, QuantelAddressState> = {}

	// create ports from mappings:
	createPortsFromMappings(state, getMappedPorts(mappings), timelineState.time)

	// merge timeline layer states into port states
	for (const [layerName, layer] of Object.entries<Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>>(
		timelineState.layers
	)) {
		const { foundMapping, isLookahead } = getMappingForLayer(layer, mappings, layerName)

		if (foundMapping && 'portId' in foundMapping.options && 'channelId' in foundMapping.options) {
			// mapping exists
			const port: QuantelStatePort = state[foundMapping.options.portId]
			if (!port) throw new Error(`Port "${foundMapping.options.portId}" not found`)
			// port exists

			const content = layer.content as TimelineContentQuantelClip
			if (content && (content.title || content.guid)) {
				// content exists and has title or guid
				setPortStateFromLayer(port, isLookahead, content, layer)
			}
		}
	}

	return state
}

/** Creates port on state object from mappedPorts */
function createPortsFromMappings(state: Record<string, QuantelAddressState>, mappedPorts: MappedPorts, time: number) {
	for (const [portId, port] of Object.entries<MappedPorts[string]>(mappedPorts)) {
		state[portId] = {
			time: time,
			channels: port.channels,
			timelineObjId: '',
			mode: port.mode,
			lookahead: false,
		}
	}
}

/** finds the correct mapping for a layer state and if the state is for a lookahead */
function getMappingForLayer(
	layerExt: ResolvedTimelineObjectInstanceExtended,
	mappings: Mappings<SomeMappingQuantel>,
	layerName: string
): {
	foundMapping: Mapping<MappingQuantelPort> | undefined
	isLookahead: boolean
} {
	let foundMapping = mappings[layerName]

	let isLookahead = false
	if (!foundMapping && layerExt.isLookahead && layerExt.lookaheadForLayer) {
		foundMapping = mappings[layerExt.lookaheadForLayer]
		isLookahead = true
	}

	return { foundMapping, isLookahead }
}

/** merges a layer state into a port state */
function setPortStateFromLayer(
	port: QuantelStatePort,
	isLookahead: boolean,
	content: TimelineContentQuantelClip,
	layer: ResolvedTimelineObjectInstanceExtended
) {
	// Note on lookaheads:
	// If there is ONLY a lookahead on a port, it'll be treated as a "paused (real) clip"
	// If there is a lookahead alongside the a real clip, its fragments will be preloaded

	if (isLookahead) {
		port.lookaheadClip = {
			title: content.title,
			guid: content.guid,
			timelineObjId: layer.id,
		}
	}

	if (isLookahead && port.clip) {
		// There is already a non-lookahead on the port
		// Do nothing more with this then
	} else {
		const startTime = layer.instance.originalStart || layer.instance.start

		port.timelineObjId = layer.id
		port.notOnAir = content.notOnAir || isLookahead
		port.outTransition = content.outTransition
		port.lookahead = isLookahead

		port.clip = {
			title: content.title,
			guid: content.guid,
			// clipId // set later

			pauseTime: content.pauseTime,
			playing: isLookahead ? false : content.playing ?? true,

			inPoint: content.inPoint,
			length: content.length,

			playTime: (content.noStarttime || isLookahead ? null : startTime) || null,
		}
	}
}

export function stateUpdatesFromCommands(
	currentState: QuantelAddressState | undefined,
	expectedState: QuantelAddressState,
	commands: QuantelCommandWithContext[],
	results: PromiseSettledResult<boolean>[]
): QuantelAddressState {
	const resultingState = literal<QuantelAddressState>({
		time: expectedState?.time ?? 0,
		timelineObjId: expectedState?.timelineObjId ?? 0,

		channels: currentState?.channels ?? [],
		mode: currentState?.mode ?? QuantelControlMode.QUALITY,
		lookahead: false,

		clip: currentState?.clip,
		notOnAir: currentState?.notOnAir,
		outTransition: currentState?.outTransition,
		lookaheadClip: currentState?.lookaheadClip,
	})

	for (let i = 0; i < commands.length; i++) {
		const result = results[i]
		if (!(result && result.status === 'fulfilled' && result.value === true)) continue // skip any unfinished commands
		const command = commands[i]
		if (!command) continue

		if (
			command.command.type === QuantelCommandType.SETUPPORT ||
			command.command.type === QuantelCommandType.RELEASEPORT
		) {
			resultingState.channels = expectedState.channels
			// todo: should we reset other props?
		}

		if (command.command.type === QuantelCommandType.LOADCLIPFRAGMENTS) {
			// load comes either from lookahead or actual clip
			if (command.command.fromLookahead && !expectedState?.lookahead) {
				resultingState.lookaheadClip = expectedState.lookaheadClip
			} else {
				resultingState.clip = expectedState.clip // todo - this copies over the playing state as well, should that be inferred from play/pause commands?
			}
		}

		if (command.command.type === QuantelCommandType.PLAYCLIP || QuantelCommandType.PAUSECLIP) {
			// this is on the foreground (presumably?)
			if (resultingState.clip) {
				resultingState.clip.playing = expectedState.clip?.playing ?? false
				// todo: any other implied props like timing?
			}
		}

		if (command.command.type === QuantelCommandType.CLEARCLIP) {
			// todo: does this clear fg and bg?
			resultingState.clip = undefined
		}
	}

	return resultingState
}

export function getLayerStatus(currentState: QuantelAddressState, expectedState: QuantelAddressState): LayerState {
	const expectedID = [expectedState.clip?.guid, expectedState.lookaheadClip?.guid].filter(
		(id): id is string => id !== undefined
	)
	const loadedID = [currentState.clip?.guid, currentState.lookaheadClip?.guid].filter(
		(id): id is string => id !== undefined
	)

	return {
		status: loadedID.length > 0 ? LayerStatus.Loaded : LayerStatus.Empty,
		mediaId: loadedID,
		failedMediaId: expectedID.filter((id) => !loadedID.includes(id)),
	}
}
