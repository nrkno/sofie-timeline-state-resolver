import { Mapping } from './mapping'
import { DeviceType } from '.'

export interface MappingQuantel extends Mapping {
	device: DeviceType.QUANTEL

	/** The port to use  */
	portId: string
	/** The channel to connect the port to */
	channelId: number
	// keyChannelID: number // not implemented yet, used when outputting Key + Fill

	/** Which strategy to use during "busy times" (defaults to QUALITY) */
	mode?: QuantelControlMode
}
export enum QuantelControlMode {
	/** Try to avoid freeze-frames when playing */
	QUALITY = 'quality',
	/** Try to play as fast as possible */
	SPEED = 'speed',
}

export type TimelineContentQuantelAny = TimelineContentQuantelClip
export interface TimelineContentQuantelClip {
	deviceType: DeviceType.QUANTEL
	notOnAir?: boolean

	/** The title of the clip to be played (example: 'AMB'), either this or guid must be provided */
	title?: string

	/** The GUID of the clip to be played, either this or title must be provided */
	guid?: string

	/** The point in the clip where to start playing. When looping, will return to this point. [milliseconds from start of file] */
	inPoint?: number
	/** The duration of the file. The playout will either freeze after this time. */
	length?: number

	/** When pausing, the unix-time the playout was paused. */
	pauseTime?: number
	/** If the video is playing or is paused (defaults to true) */
	playing?: boolean

	/** If true, the startTime won't be used to SEEK to the correct place in the media */
	noStarttime?: boolean

	// inTransition?: QuantelTransition
	outTransition?: QuantelOutTransition
}
export type QuantelOutTransition = QuantelTransitionDelay
export interface QuantelTransitionBase {
	type: QuantelTransitionType
}
export enum QuantelTransitionType {
	DELAY = 0,
}
export interface QuantelTransitionDelay {
	type: QuantelTransitionType.DELAY

	// For how long to delay the stop (ms)
	delay: number
}
