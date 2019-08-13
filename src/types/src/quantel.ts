import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'

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
	SPEED = 'speed'
}

export interface QuantelOptions {
	/** Url to the quantel gateway  */
	gatewayUrl: string

	/** Address to the ISA, for the gateway to connect to */
	ISAUrl: string

	/** The ID of the zone to use. If omitted, will be using "default" */
	zoneId?: string
	/** The id of the server to control. An Ingeter */
	serverId: number

	// doAutomaticCloningIfNeeded?: bool // not implemented yet
}

export type TimelineObjQuantelAny = (
	TimelineObjQuantelClip
)
export interface TimelineObjQuantelClip extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.QUANTEL

		/** The title of the clip to be played (example: 'AMB'), either this or guid must be provided */
		title?: string

		/** The GUID of the clip to be played, either this or title must be provided */
		guid?: string

		/** The point where the file starts playing [milliseconds from start of file] */
		seek?: number
		/** The point where the file returns to, when looping [milliseconds from start of file] */
		inPoint?: number
		/** The duration of the file. The playout will either freeze or loop after this time.
		 * Note that for seeking to work when looping, .length has to be provided. [milliseconds]
		 */
		length?: number

		/** When pausing, the unix-time the playout was paused. */
		pauseTime?: number
		/** If the video is playing or is paused (defaults to true) */
		playing?: boolean

		/** If true, the startTime won't be used to SEEK to the correct place in the media */
		noStarttime?: boolean

	}
}
