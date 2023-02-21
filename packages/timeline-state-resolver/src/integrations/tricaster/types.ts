import {
	DeviceType,
	TimelineContentTriCasterAny,
	TimelineContentTriCasterAudioChannel,
	TimelineContentTriCasterDSK,
	TimelineContentTriCasterInput,
	TimelineContentTriCasterME,
	TimelineContentTriCasterMixOutput,
	TimelineContentTypeTriCaster,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'

export function isTimelineObjTriCaster(content: TSRTimelineContent): content is TimelineContentTriCasterAny {
	return content.deviceType === DeviceType.TRICASTER
}

export function isTimelineObjTriCasterME(content: TSRTimelineContent): content is TimelineContentTriCasterME {
	return isTimelineObjTriCaster(content) && content.type === TimelineContentTypeTriCaster.ME
}

export function isTimelineObjTriCasterInput(content: TSRTimelineContent): content is TimelineContentTriCasterInput {
	return isTimelineObjTriCaster(content) && content.type === TimelineContentTypeTriCaster.INPUT
}

export function isTimelineObjTriCasterDSK(content: TSRTimelineContent): content is TimelineContentTriCasterDSK {
	return isTimelineObjTriCaster(content) && content.type === TimelineContentTypeTriCaster.DSK
}

export function isTimelineObjTriCasterAudioChannel(
	content: TSRTimelineContent
): content is TimelineContentTriCasterAudioChannel {
	return isTimelineObjTriCaster(content) && content.type === TimelineContentTypeTriCaster.AUDIO_CHANNEL
}

export function isTimelineObjTriCasterMixOutput(
	content: TSRTimelineContent
): content is TimelineContentTriCasterMixOutput {
	return isTimelineObjTriCaster(content) && content.type === TimelineContentTypeTriCaster.MIX_OUTPUT
}
