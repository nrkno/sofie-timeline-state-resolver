import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType, TimelineDatastoreReferencesContent } from '.'

export interface MappingHyperdeck extends Mapping {
	device: DeviceType.HYPERDECK
	mappingType: MappingHyperdeckType
	index?: number
}
export enum MappingHyperdeckType {
	TRANSPORT = 'transport',
}

export interface HyperdeckOptions {
	host: string
	port?: number
	minRecordingTime?: number
	/** If true, no warnings will be emitted when storage slots are empty. */
	suppressEmptySlotWarnings?: boolean
}

export enum TimelineContentTypeHyperdeck {
	TRANSPORT = 'transport',
}

// Note: These are copied from hyperdeck-connection -----------
export enum TransportStatus {
	PREVIEW = 'preview',
	STOPPED = 'stopped',
	PLAY = 'play',
	FORWARD = 'forward',
	REWIND = 'rewind',
	JOG = 'jog',
	SHUTTLE = 'shuttle',
	RECORD = 'record',
}
export enum SlotId {
	ONE = 1,
	TWO = 2,
}
export enum SlotStatus {
	EMPTY = 'empty',
	MOUNTING = 'mounting',
	ERROR = 'error',
	MOUNTED = 'mounted',
}
export enum VideoFormat {
	NTSC = 'NTSC',
	PAL = 'PAL',
	NTSCp = 'NTSCp',
	PALp = 'PALp',
	_720p50 = '720p50',
	_720p5994 = '720p5994',
	_720p60 = '720p60',
	_1080p23976 = '1080p23976',
	_1080p24 = '1080p24',
	_1080p25 = '1080p25',
	_1080p2997 = '1080p2997',
	_1080p30 = '1080p30',
	_1080i50 = '1080i50',
	_1080i5994 = '1080i5994',
	_1080i60 = '1080i60',
	_4Kp23976 = '4Kp23976',
	_4Kp24 = '4Kp24',
	_4Kp25 = '4Kp25',
	_4Kp2997 = '4Kp2997',
	_4Kp30 = '4Kp30',
	_4Kp50 = '4Kp50',
	_4Kp5994 = '4Kp5994',
	_4Kp60 = '4Kp60',
}
// -------------------------------------------------------------

export type TimelineObjHyperdeckAny = TimelineObjHyperdeckTransport

export interface TimelineObjHyperdeck extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.HYPERDECK
		/** The type of control of the Hyperdeck */
		type: TimelineContentTypeHyperdeck
	} & TimelineDatastoreReferencesContent
}
export interface TimelineObjHyperdeckTransport extends TimelineObjHyperdeck {
	content: {
		deviceType: DeviceType.HYPERDECK
		type: TimelineContentTypeHyperdeck.TRANSPORT
	} & (
		| {
				status: TransportStatus.PREVIEW
		  }
		| {
				status: TransportStatus.STOPPED
		  }
		| {
				status: TransportStatus.PLAY
				/** How fast to play the currently-playing clip [-5000 - 5000]. 1x speed is 100. 0 is stopped. Negative values are rewind. Values above 100 are fast-forward. */
				speed?: number
				/** Whether or not to loop the currently-playing clip */
				loop?: boolean
				/** Whether or not to stop playback when the currently-playing clip is finished */
				singleClip?: boolean
				/** The numeric ID of the clip to play. If already playing, null means continue playing the current clip. If not playing, null means play last played clip. */
				clipId: number | null
		  }
		| {
				status: TransportStatus.FORWARD
		  }
		| {
				status: TransportStatus.REWIND
		  }
		| {
				status: TransportStatus.JOG
		  }
		| {
				status: TransportStatus.SHUTTLE
		  }
		| {
				status: TransportStatus.RECORD

				/** The filename to record to */
				recordFilename?: string
		  }
	) &
		TimelineDatastoreReferencesContent
}
