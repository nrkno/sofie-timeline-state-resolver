import {
	DeviceType,
	Mapping,
	MappingLawoFullpath,
	MappingLawoSource,
	Mappings,
	TSRTimelineContent,
	Timeline,
	TimelineContentLawoEmberProperty,
	TimelineContentLawoSource,
	TimelineContentLawoSources,
	TimelineContentTypeLawo,
} from 'timeline-state-resolver-types'

import { EmberValue } from 'emberplus-connection/dist/types'
import { Model as EmberModel } from 'emberplus-connection'

export interface LawoState {
	faders: {
		identifier: string
		value: EmberValue
		transitionDuration?: number
		priority: number
		timelineObjId: string
	}[]
	nodes: {
		identifier: string
		value: EmberValue
		valueType?: EmberModel.ParameterType
		priority: number
		timelineObjId: string
	}[]
	triggerValue?: string
}

export function convertTimelineStateToLawoState(
	state: Timeline.TimelineState<TSRTimelineContent>,
	mappings: Mappings
): LawoState {
	const lawoState: LawoState = {
		faders: [],
		nodes: [],
	}
	// const attrName = this._rampMotorFunctionPath || !this._dbPropertyName ? 'Fader.Motor dB Value' : this._dbPropertyName

	// iterate over mappings
	//   multiple sources
	//     push faders
	//   source
	//   fullpath
	//   triggerValue

	for (const layer of Object.values<Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>>(state.layers)) {
		const mapping = mappings[layer.layer]
		if (!mapping || mapping.device !== DeviceType.LAWO) continue

		if (layer.content.deviceType !== DeviceType.LAWO) continue

		switch (layer.content.type) {
			case TimelineContentTypeLawo.SOURCES:
				// push faders
				pushFaders(lawoState, layer.id, layer.content, mappings)
				break
			case TimelineContentTypeLawo.SOURCE:
				// push fader
				pushFader(lawoState, layer.id, layer.content, mapping as Mapping<MappingLawoSource>)
				break
			case TimelineContentTypeLawo.EMBER_PROPERTY:
				// push node / fullpath
				pushNode(lawoState, layer.id, layer.content, mapping as Mapping<MappingLawoFullpath>)
				break
			case TimelineContentTypeLawo.TRIGGER_VALUE:
				// set trigger value
				lawoState.triggerValue = layer.content.triggerValue
				break
		}
	}

	return lawoState
}

function pushFaders(state: LawoState, timelineObjId: string, layer: TimelineContentLawoSources, mappings: Mappings) {
	for (const source of layer.sources) {
		const mapping = mappings[source.mappingName]
		if (mapping.device !== DeviceType.LAWO) continue

		pushFader(
			state,
			timelineObjId,
			{
				deviceType: DeviceType.LAWO,
				type: TimelineContentTypeLawo.SOURCE,
				...source,
				overridePriority: layer.overridePriority,
			},
			mapping as Mapping<MappingLawoSource>
		)
	}
}
function pushFader(
	state: LawoState,
	timelineObjId: string,
	layer: TimelineContentLawoSource,
	mapping: Mapping<MappingLawoSource>
) {
	const fader = {
		identifier: mapping.options.identifier,
		value: layer.faderValue,
		transitionDuration: layer.transitionDuration,
		priority: layer.overridePriority ?? 0,
		timelineObjId,
	}

	const found = state.faders.findIndex((fader) => fader.identifier === mapping.options.identifier)
	if (found === -1) {
		// insert new
		state.faders.push(fader)
	} else if (state.faders[found].priority <= fader.priority) {
		// replace existing
		state.faders[found] = fader
	}
}
function pushNode(
	state: LawoState,
	timelineObjId: string,
	layer: TimelineContentLawoEmberProperty,
	mapping: Mapping<MappingLawoFullpath>
) {
	if (!mapping.options.identifier) return

	const emberType =
		mapping.options.emberType &&
		Object.values<EmberModel.ParameterType>(EmberModel.ParameterType).includes(mapping.options.emberType as any)
			? (mapping.options.emberType as unknown as EmberModel.ParameterType)
			: EmberModel.ParameterType.Real

	const node = {
		identifier: mapping.options.identifier,
		value: layer.value,
		valueType: emberType,
		priority: mapping.options.priority ?? 0,
		timelineObjId,
	}

	const found = state.nodes.findIndex((node) => node.identifier === mapping.options.identifier)
	if (found === -1) {
		// insert new
		state.nodes.push(node)
	} else if (state.nodes[found].priority <= node.priority) {
		// replace existing
		state.nodes[found] = node
	}
}
