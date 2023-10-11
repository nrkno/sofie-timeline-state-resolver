import {
	EmptyLayer,
	HtmlPageLayer,
	InputLayer,
	Layer,
	LayerContentType,
	MediaLayer,
	RecordLayer,
	RouteLayer,
	TemplateLayer,
	TransitionObject,
	Transition as StateTransition,
	Mixer,
	NextUp,
} from 'casparcg-state'
import deepmerge = require('deepmerge')
import {
	DeviceType,
	Mapping,
	MappingCasparCGLayer,
	Mappings,
	ResolvedTimelineObjectInstanceExtended,
	SomeMappingCasparCG,
	TSRTimelineContent,
	TSRTimelineObjProps,
	Timeline,
	TimelineContentCCGProducerBase,
	TimelineContentCasparCGAny,
	TimelineContentTypeCasparCg,
} from 'timeline-state-resolver-types'
import { literal } from '../../devices/device'

export interface TrackedLayer {
	layer: Layer | undefined
	lookahead: NextUp | undefined
	time: number
}

export type CasparCGDeviceState = { [address: string]: TrackedLayer }

export function convertTimelineStateToAddressStates(
	state: Timeline.TimelineState<TSRTimelineContent>,
	newMappings: Mappings
): CasparCGDeviceState {
	const deviceState: CasparCGDeviceState = {}

	for (const layer of Object.values<Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>>(state.layers)) {
		const lookaheadLayer = isLookaheadLayer(layer)
		const mapping = newMappings[lookaheadLayer ?? layer.layer]
		if (!isValidCasparCGMapping(mapping)) continue

		const address = mappingToAddress(mapping)
		const layerState = convertObjectToCasparState(newMappings, layer, mapping.options, true)

		const addressState: TrackedLayer = deviceState[address] ?? {
			layer: undefined,
			lookahead: undefined,
			time: state.time,
		}

		if (lookaheadLayer) {
			const old = addressState.lookahead
			addressState.lookahead = literal<NextUp>({ ...(old ?? {}), ...(layerState as NextUp) })
		} else {
			const old: Layer | undefined = addressState.layer
			addressState.layer = { ...(old ?? {}), ...(layerState as Layer) }

			// deep merge template data
			if (
				old?.content === LayerContentType.TEMPLATE &&
				old?.templateData &&
				typeof old?.templateData !== 'string' &&
				layerState.content === LayerContentType.TEMPLATE &&
				layerState.templateData &&
				typeof layerState.templateData !== 'string'
			) {
				;(deviceState.layers[address] as TemplateLayer).templateData = deepmerge(
					old.templateData,
					layerState.templateData
				)
			}
		}

		deviceState[address] = addressState
	}

	return deviceState
}

function isLookaheadLayer(
	layer: Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>
): string | number | undefined {
	const l: ResolvedTimelineObjectInstanceExtended = layer

	return l.isLookahead ? l.lookaheadForLayer : undefined
}

function isValidCasparCGMapping(mapping: Mapping<unknown>): mapping is Mapping<SomeMappingCasparCG> {
	return !!mapping && mapping.device === DeviceType.CASPARCG
}

export function mappingToAddress(mapping: Mapping<SomeMappingCasparCG>): string {
	return mapping.options.channel + '-' + mapping.options.layer
}

function convertObjectToCasparState(
	mappings: Mappings,
	layer: Timeline.ResolvedTimelineObjectInstance,
	mapping: MappingCasparCGLayer,
	isForeground: boolean
): Layer | NextUp {
	let startTime = layer.instance.originalStart || layer.instance.start
	if (startTime === 0) startTime = 1 // @todo: startTime === 0 will make ccg-state seek to the current time

	const layerProps = layer as Timeline.ResolvedTimelineObjectInstance & TSRTimelineObjProps
	const content = layer.content as TimelineContentCasparCGAny

	let stateLayer: Layer | null = null
	if (content.type === TimelineContentTypeCasparCg.MEDIA) {
		const holdOnFirstFrame = !isForeground || layerProps.isLookahead
		const loopingPlayTime = content.loop && !content.seek && !content.inPoint && !content.length

		stateLayer = literal<MediaLayer>({
			id: layer.id,
			layerNo: mapping.layer,
			content: LayerContentType.MEDIA,
			media: content.file,
			playTime: !holdOnFirstFrame && (content.noStarttime || loopingPlayTime) ? null : startTime,

			pauseTime: holdOnFirstFrame ? startTime : content.pauseTime || null,
			playing: !layerProps.isLookahead && (content.playing !== undefined ? content.playing : isForeground),

			looping: content.loop,
			seek: content.seek,
			inPoint: content.inPoint,
			length: content.length,

			channelLayout: content.channelLayout,
			clearOn404: true,

			vfilter: content.videoFilter,
			afilter: content.audioFilter,
		})
		// this.emitDebug(stateLayer)
	} else if (content.type === TimelineContentTypeCasparCg.IP) {
		stateLayer = literal<MediaLayer>({
			id: layer.id,
			layerNo: mapping.layer,
			content: LayerContentType.MEDIA,
			media: content.uri,
			channelLayout: content.channelLayout,
			playTime: null, // ip inputs can't be seeked // layer.resolved.startTime || null,
			playing: true,
			seek: 0, // ip inputs can't be seeked

			vfilter: content.videoFilter,
			afilter: content.audioFilter,
		})
	} else if (content.type === TimelineContentTypeCasparCg.INPUT) {
		stateLayer = literal<InputLayer>({
			id: layer.id,
			layerNo: mapping.layer,
			content: LayerContentType.INPUT,
			media: 'decklink',
			input: {
				device: content.device,
				channelLayout: content.channelLayout,
				format: content.deviceFormat,
			},
			playing: true,
			playTime: null,

			vfilter: content.videoFilter || content.filter,
			afilter: content.audioFilter,
		})
	} else if (content.type === TimelineContentTypeCasparCg.TEMPLATE) {
		stateLayer = literal<TemplateLayer>({
			id: layer.id,
			layerNo: mapping.layer,
			content: LayerContentType.TEMPLATE,
			media: content.name,

			playTime: startTime || null,
			playing: true,

			templateType: content.templateType || 'html',
			templateData: content.data,
			cgStop: content.useStopCommand,
		})
	} else if (content.type === TimelineContentTypeCasparCg.HTMLPAGE) {
		stateLayer = literal<HtmlPageLayer>({
			id: layer.id,
			layerNo: mapping.layer,
			content: LayerContentType.HTMLPAGE,
			media: content.url,

			playTime: startTime || null,
			playing: true,
		})
	} else if (content.type === TimelineContentTypeCasparCg.ROUTE) {
		if (content.mappedLayer) {
			const routeMapping = mappings[content.mappedLayer] as Mapping<SomeMappingCasparCG>
			if (routeMapping) {
				content.channel = routeMapping.options.channel
				content.layer = routeMapping.options.layer
			}
		}
		stateLayer = literal<RouteLayer>({
			id: layer.id,
			layerNo: mapping.layer,
			content: LayerContentType.ROUTE,
			media: 'route',
			route: {
				channel: content.channel || 0,
				layer: content.layer,
				channelLayout: content.channelLayout,
			},
			mode: content.mode || undefined,
			delay: content.delay || undefined,
			playing: true,
			playTime: null, // layer.resolved.startTime || null,

			vfilter: content.videoFilter,
			afilter: content.audioFilter,
		})
	} else if (content.type === TimelineContentTypeCasparCg.RECORD) {
		if (startTime) {
			stateLayer = literal<RecordLayer>({
				id: layer.id,
				layerNo: mapping.layer,
				content: LayerContentType.RECORD,
				media: content.file,
				encoderOptions: content.encoderOptions,
				playing: true,
				playTime: startTime,
			})
		}
	}

	// if no appropriate layer could be created, make it an empty layer
	if (!stateLayer) {
		const l: EmptyLayer = {
			id: layer.id,
			layerNo: mapping.layer,
			content: LayerContentType.NOTHING,
			playing: false,
		}
		stateLayer = l
	} // now it holds that stateLayer is truthy

	const baseContent = content as TimelineContentCCGProducerBase
	if (baseContent.transitions) {
		// add transitions to the layer obj
		switch (baseContent.type) {
			case TimelineContentTypeCasparCg.MEDIA:
			case TimelineContentTypeCasparCg.IP:
			case TimelineContentTypeCasparCg.TEMPLATE:
			case TimelineContentTypeCasparCg.INPUT:
			case TimelineContentTypeCasparCg.ROUTE:
			case TimelineContentTypeCasparCg.HTMLPAGE: {
				// create transition object
				const media = stateLayer.media
				const transitions = {} as any
				if (baseContent.transitions.inTransition) {
					transitions.inTransition = new StateTransition(baseContent.transitions.inTransition)
				}
				if (baseContent.transitions.outTransition) {
					transitions.outTransition = new StateTransition(baseContent.transitions.outTransition)
				}
				// todo - not a fan of this type assertion but think it's ok
				stateLayer.media = new TransitionObject(media as string, {
					inTransition: transitions.inTransition,
					outTransition: transitions.outTransition,
				})
				break
			}
			default:
				// create transition using mixer
				break
		}
	}
	if ('mixer' in content && content.mixer) {
		// add mixer properties
		// just pass through values here:
		const mixer: Mixer = {}
		// the mixer object is apparently too complex so we lose typings here, at the same time we cannot just reassign because the types are subtly different
		// an alternative would be to add _transition to the tsr types, but that forces the tsr user to change property.
		// or casparcg-state should remove the _transition property since it is unused anyway?
		for (const [k, v] of Object.entries<any>(content.mixer)) {
			mixer[k] = v
		}
		stateLayer.mixer = mixer
	}

	stateLayer.layerNo = mapping.layer
	return stateLayer
}
