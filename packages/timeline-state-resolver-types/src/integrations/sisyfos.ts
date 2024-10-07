import { DeviceType } from '..'

/*
 * TRIGGERVALUE is used to SET_CHANNEL in Sisyfos
 * When value is changed to a new value (e.g. Date.now()) Sisyfos will set the channel to
 * the Current TSR State using setSisyfosChannel()
 */
export enum TimelineContentTypeSisyfos {
	CHANNEL = 'channel',
	CHANNELS = 'channels',
	TRIGGERVALUE = 'triggerValue',
}

export type TimelineContentSisyfosAny =
	| TimelineContentSisyfosChannel
	| TimelineContentSisyfosChannels
	| TimelineContentSisyfosTriggerValue

export interface TimelineContentSisyfos {
	deviceType: DeviceType.SISYFOS
	type: TimelineContentTypeSisyfos
}

export interface SisyfosChannelOptions {
	isPgm?: 0 | 1 | 2 // 0=off 1=PGM 2=VO
	faderLevel?: number
	label?: string
	visible?: boolean
	fadeTime?: number
	muteOn?: boolean
	inputGain?: number
	inputSelector?: number
}

export interface TimelineContentSisyfosTriggerValue extends TimelineContentSisyfos {
	type: TimelineContentTypeSisyfos.TRIGGERVALUE

	/**
	 * If this value changes, commands will be sent to set each channel that is
	 * mapped to its expected state regardless of whether that state changed
	 */
	triggerValue: string
}
export interface TimelineContentSisyfosChannel
	extends SisyfosTimelineObjectProps,
		TimelineContentSisyfos,
		SisyfosChannelOptions {
	type: TimelineContentTypeSisyfos.CHANNEL
}
export interface TimelineContentSisyfosChannels extends SisyfosTimelineObjectProps, TimelineContentSisyfos {
	type: TimelineContentTypeSisyfos.CHANNELS
	channels: ({
		/** The mapping layer to look up the channel from */
		mappedLayer: string
	} & SisyfosChannelOptions)[]
}
interface SisyfosTimelineObjectProps {
	/**
	 * When this is set to true it will do a full resync with Sisyfos, first
	 * request the remote end's state and then diffing the local state against that
	 * (depending on channel count this is a slow operation)
	 */
	resync?: boolean
	/**
	 * If you have multiple references to 1 channel in different timeline obejcts,
	 * the one with the highest overridePriority will be used
	 */
	overridePriority?: number // defaults to 0
	/**
	 * If this value changes, commands will be sent to set the channels in this
	 * object to their expected state regardless of wheter the state of these
	 * channels changed
	 */
	triggerValue?: string
}
