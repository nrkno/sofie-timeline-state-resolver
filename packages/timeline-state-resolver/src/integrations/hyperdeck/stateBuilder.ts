import { Commands as HyperdeckCommands, TransportStatus } from 'hyperdeck-connection'
import _ = require('underscore')
import {
	DeviceType,
	Mapping,
	MappingHyperdeckType,
	Mappings,
	SomeMappingHyperdeck,
	TSRTimelineContent,
	Timeline,
	TimelineContentTypeHyperdeck,
} from 'timeline-state-resolver-types'

const DEFAULT_SPEED = 100 // 1x speed
const DEFAULT_LOOP = false
const DEFAULT_SINGLE_CLIP = true
const DEFAULT_CLIP_ID = null

export interface HyperdeckDeviceTransportState {
	status: TransportStatus
	speed: number
	singleClip: boolean
	loop: boolean
	clipId: number | null
	recordFilename?: string
}
export interface HyperdeckDeviceState {
	notify: HyperdeckCommands.NotifyCommandResponse
	transport: HyperdeckDeviceTransportState
	/** The timelineObject this state originates from */
	timelineObjId: string
}

export function getDefaultHyperdeckState(): HyperdeckDeviceState {
	const res: HyperdeckDeviceState = {
		notify: {
			// TODO - this notify block will want configuring per device or will the state lib always want it the same?
			remote: false,
			transport: false,
			slot: false,
			configuration: false,
			droppedFrames: false,
		},
		transport: {
			status: TransportStatus.STOPPED,
			speed: DEFAULT_SPEED,
			loop: DEFAULT_LOOP,
			singleClip: DEFAULT_SINGLE_CLIP,
			clipId: DEFAULT_CLIP_ID,
		},
		timelineObjId: '',
	}

	return res
}

export function convertTimelineStateToHyperdeckState(
	state: Timeline.TimelineState<TSRTimelineContent>,
	mappings: Mappings
): HyperdeckDeviceState {
	// Convert the timeline state into something we can use easier:
	const deviceState = getDefaultHyperdeckState()

	const sortedLayers = _.map(state.layers, (tlObject, layerName) => ({ layerName, tlObject })).sort((a, b) =>
		a.layerName.localeCompare(b.layerName)
	)
	_.each(sortedLayers, ({ tlObject, layerName }) => {
		const content = tlObject.content

		const mapping = mappings[layerName] as Mapping<SomeMappingHyperdeck>

		if (mapping && content.deviceType === DeviceType.HYPERDECK) {
			switch (mapping.options.mappingType) {
				case MappingHyperdeckType.Transport:
					if (content.type === TimelineContentTypeHyperdeck.TRANSPORT) {
						if (!deviceState.transport) {
							switch (content.status) {
								case TransportStatus.PREVIEW:
								case TransportStatus.STOPPED:
								case TransportStatus.FORWARD:
								case TransportStatus.REWIND:
								case TransportStatus.JOG:
								case TransportStatus.SHUTTLE:
									deviceState.transport = {
										status: content.status,
										speed: DEFAULT_SPEED,
										loop: DEFAULT_LOOP,
										singleClip: DEFAULT_SINGLE_CLIP,
										clipId: DEFAULT_CLIP_ID,
									}
									break
								case TransportStatus.PLAY:
									deviceState.transport = {
										status: content.status,
										speed: content.speed ?? DEFAULT_SPEED,
										loop: content.loop ?? DEFAULT_LOOP,
										singleClip: content.singleClip ?? DEFAULT_SINGLE_CLIP,
										clipId: content.clipId,
									}
									break
								case TransportStatus.RECORD:
									deviceState.transport = {
										status: content.status,
										speed: DEFAULT_SPEED,
										loop: DEFAULT_LOOP,
										singleClip: DEFAULT_SINGLE_CLIP,
										clipId: DEFAULT_CLIP_ID,
										recordFilename: content.recordFilename,
									}
									break
								default:
									// @ts-ignore never
									throw new Error(`Unsupported status "${content.status}"`)
							}
						}

						deviceState.transport.status = content.status
						if (content.status === TransportStatus.RECORD) {
							deviceState.transport.recordFilename = content.recordFilename
						} else if (content.status === TransportStatus.PLAY) {
							deviceState.transport.speed = content.speed ?? DEFAULT_SPEED
							deviceState.transport.loop = content.loop ?? DEFAULT_LOOP
							deviceState.transport.singleClip = content.singleClip ?? DEFAULT_SINGLE_CLIP
							deviceState.transport.clipId = content.clipId
						}
					}
					break
			}
		}
	})
	return deviceState
}
