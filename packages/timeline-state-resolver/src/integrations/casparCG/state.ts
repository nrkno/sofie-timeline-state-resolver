import {
	EmptyLayer,
	HtmlPageLayer,
	InputLayer,
	LayerContentType,
	MediaLayer,
	RecordLayer,
	RouteLayer,
	TemplateLayer,
	TransitionObject,
	Transition as StateTransition,
	Mixer,
	AMCPCommandWithContext,
	Layer,
} from 'casparcg-state'
import { literal } from '../../devices/device'
import {
	LayerState,
	LayerStatus,
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
import _ = require('underscore')
import deepmerge = require('deepmerge')
import { Commands } from 'casparcg-connection'
import { klona } from 'klona'
import { StateTracker } from './stateTracker'
import { ChannelLayer } from 'casparcg-connection/dist/parameters'

export interface InternalState {
	layers: {
		[address: string]: Layer
	}
	lookaheads: {
		[address: string]: Layer
	}
}

export interface TrackedLayer {
	layer: Layer | undefined
	lookahead: Layer | undefined
}

export function mappingToAddress(mapping: Mapping<SomeMappingCasparCG>): string {
	return mapping.options.channel + '-' + mapping.options.layer
}

export function convertObjectToCasparState(
	mappings: Mappings,
	layer: Timeline.ResolvedTimelineObjectInstance,
	mapping: MappingCasparCGLayer,
	isForeground: boolean
): Layer {
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
		_.each(content.mixer, (value, property) => {
			mixer[property] = value
		})
		stateLayer.mixer = mixer
	}

	stateLayer.layerNo = mapping.layer
	return stateLayer
}

export function isValidCasparCGMapping(mapping: Mapping<unknown>): mapping is Mapping<SomeMappingCasparCG> {
	return !!mapping && mapping.device === DeviceType.CASPARCG
}

export function isLookaheadLayer(
	layer: Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>
): string | number | undefined {
	const l: ResolvedTimelineObjectInstanceExtended = layer

	return l.isLookahead ? l.lookaheadForLayer : undefined
}

export function convertTimelineStateToDeviceState(
	state: Timeline.TimelineState<TSRTimelineContent>,
	newMappings: Mappings
): InternalState {
	const deviceState: InternalState = {
		layers: {},
		lookaheads: {},
	}

	for (const layer of Object.values(state.layers)) {
		const lookaheadLayer = isLookaheadLayer(layer)
		const mapping = newMappings[lookaheadLayer ?? layer.layer]
		if (!isValidCasparCGMapping(mapping)) continue

		const address = mappingToAddress(mapping as Mapping<SomeMappingCasparCG>)
		const layerState = convertObjectToCasparState(newMappings, layer, mapping.options, true)

		if (lookaheadLayer) {
			const old = deviceState.lookaheads[address] ?? {}
			deviceState.lookaheads[address] = { ...old, ...layerState }
		} else {
			const old: Layer = deviceState.layers[address] ?? {}
			deviceState.layers[address] = { ...old, ...layerState }

			// deepmerge template data
			if (
				old.content === LayerContentType.TEMPLATE &&
				old.templateData &&
				typeof old.templateData !== 'string' &&
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
	}

	return deviceState
}

export function stateUpdateFromCommandResult(
	trackedLayer: TrackedLayer,
	expectedlayer: TrackedLayer,
	commands: AMCPCommandWithContext[],
	results: number[]
): TrackedLayer {
	const newTrackedLayer = klona(trackedLayer ?? { lookahead: undefined, layer: undefined })

	for (let i = 0; i < commands.length; i++) {
		const command = commands[i]
		const result = results[i]

		if (!command || !result) continue
		if (!command.command.match(/Loadbg|Play|Load|Clear|Stop|Resume/i)) continue
		if (
			!(
				typeof command.params === 'object' &&
				command.params &&
				'channel' in command.params &&
				command.params.channel !== undefined &&
				'layer' in command.params &&
				command.params.layer !== undefined
			)
		)
			continue
		if (result >= 300) continue

		switch (command.command) {
			case Commands.Play:
			case Commands.Load:
				if (!('clip' in command.params) && !trackedLayer.lookahead) {
					// Ignore, no clip was loaded in confirmedChannelState
				} else {
					// a play/load command without parameters (channel/layer) is only succesful if the nextUp worked
					// a play/load command with params can always be accepted
					newTrackedLayer.layer = klona(expectedlayer.layer)
					newTrackedLayer.lookahead = undefined // a play command always clears nextUp
				}
				break
			case Commands.Loadbg:
				// only loadbg can set nextUp and nextUp can only be set by loadbg
				newTrackedLayer.lookahead = klona(expectedlayer.lookahead)
				break
			case Commands.Stop:
				// note - technically an auto bg + stop => bg to fg but tsr never uses this...
				newTrackedLayer.layer = undefined
				break
			case Commands.Resume:
				// resume does not affect nextup
				newTrackedLayer.layer = klona(expectedlayer.layer)
				break
			case Commands.Clear:
				// Remove both the background and foreground
				newTrackedLayer.layer = undefined
				newTrackedLayer.lookahead = undefined
				break
			default: {
				// Never hit
				// const _a: never = command.params.name
				break
			}
		}
	}

	return newTrackedLayer
}
export function updateStateFromCommands(
	tracker: StateTracker<any, any>,
	commands: AMCPCommandWithContext[],
	results: number[]
): void {
	const addressedCommand = commands.find(
		(command): command is AMCPCommandWithContext & { params: ChannelLayer } =>
			!!(
				typeof command.params === 'object' &&
				command.params &&
				'channel' in command.params &&
				command.params.channel !== undefined &&
				'layer' in command.params &&
				command.params.layer !== undefined
			)
	)

	if (!addressedCommand) return

	const address = addressedCommand.params.channel + '-' + addressedCommand.params.layer

	const expectedState = tracker.getExpectedState(address)
	const currentState = tracker.getCurrentState(address)

	const update = stateUpdateFromCommandResult(currentState, expectedState, commands, results)

	tracker.updateState(address, update)
}

export function getStatus(currentLayer: any, expectedLayer?: any): LayerState {
	const expectedIds: string[] = [
		expectedLayer?.layer?.media?.toString(),
		expectedLayer?.lookahead?.media?.toString(),
	].filter((m) => m !== undefined)

	const fg = currentLayer?.layer?.media
	const bg = currentLayer?.lookahead?.media
	const actualIds = [fg?.toString(), bg?.toString()].filter((m) => m !== undefined)

	return {
		status: fg || bg ? LayerStatus.Loaded : LayerStatus.Empty,
		mediaId: actualIds,
		failedMediaId: expectedIds.filter((id) => !actualIds.includes(id)),
	}
}
