import {
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
import { MappedPorts, QuantelState, QuantelStatePort } from './types'

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
			ports[mapping.options.portId].channels.push(mapping.options.channelId) // todo: support for multiple channels (these should be unique)
		}
	}

	// now sort in place
	for (const port of Object.values<MappedPorts[string]>(ports)) {
		port.channels = port.channels.sort((a, b) => a - b)
	}

	return ports
}

export function convertTimelineStateToQuantelState(
	timelineState: Timeline.TimelineState<TSRTimelineContent>,
	mappings: Mappings<SomeMappingQuantel>
): QuantelState {
	const state: QuantelState = {
		time: timelineState.time,
		port: {},
	}

	// create ports from mappings:
	createPortsFromMappings(state, getMappedPorts(mappings))

	// merge timeline layer states into port states
	for (const [layerName, layer] of Object.entries<Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>>(
		timelineState.layers
	)) {
		const { foundMapping, isLookahead } = getMappingForLayer(layer, mappings, layerName)

		if (foundMapping && 'portId' in foundMapping.options && 'channelId' in foundMapping.options) {
			// mapping exists
			const port: QuantelStatePort = state.port[foundMapping.options.portId]
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
function createPortsFromMappings(state: QuantelState, mappedPorts: MappedPorts) {
	for (const [portId, port] of Object.entries<MappedPorts[string]>(mappedPorts)) {
		state.port[portId] = {
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
