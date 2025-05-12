import { QuantelControlMode, QuantelOutTransition } from 'timeline-state-resolver-types'
import { MonitorPorts } from 'tv-automation-quantel-gateway-client'

export interface QuantelState {
	time: number
	port: {
		[portId: string]: QuantelStatePort
	}
}
export interface QuantelStatePort {
	timelineObjId: string
	clip?: QuantelStatePortClip
	mode: QuantelControlMode

	lookahead: boolean

	channels: number[]

	notOnAir?: boolean
	outTransition?: QuantelOutTransition

	/** Future clips, that should be preloaded */
	lookaheadClip?: QuantelStatePortClipLookahead
}
export interface QuantelStatePortClipContent {
	title?: string
	guid?: string

	clipId?: number
}
export interface QuantelStatePortClip extends QuantelStatePortClipContent {
	playing: boolean
	playTime: number | null
	pauseTime?: number

	inPoint?: number
	length?: number
}
export interface QuantelStatePortClipLookahead extends QuantelStatePortClipContent {
	timelineObjId: string
}

interface QuantelCommandBase {
	type: QuantelCommandType
	portId: string
	timelineObjId: string
	fromLookahead?: boolean
}
export enum QuantelCommandType {
	SETUPPORT = 'setupPort',
	LOADCLIPFRAGMENTS = 'loadClipFragments',
	PLAYCLIP = 'playClip',
	PAUSECLIP = 'pauseClip',
	CLEARCLIP = 'clearClip',
	RELEASEPORT = 'releasePort',
	CANCELWAITING = 'cancelWaiting',
}
export interface QuantelCommandSetupPort extends QuantelCommandBase {
	type: QuantelCommandType.SETUPPORT
	channel: number // todo later: support for multiple channels
}
export interface QuantelCommandLoadClipFragments extends QuantelCommandBase {
	type: QuantelCommandType.LOADCLIPFRAGMENTS
	clip: QuantelStatePortClip
	/** The time the clip is scheduled to play */
	timeOfPlay: number
	/** If allowed to prepare a jump to the fragments */
	allowedToPrepareJump: boolean
}
export interface QuantelCommandClip extends QuantelCommandBase {
	clip: QuantelStatePortClip
	mode: QuantelControlMode
	transition?: QuantelOutTransition
}
export interface QuantelCommandPlayClip extends QuantelCommandClip {
	type: QuantelCommandType.PLAYCLIP
}
export interface QuantelCommandPauseClip extends QuantelCommandClip {
	type: QuantelCommandType.PAUSECLIP
}
export interface QuantelCommandClearClip extends QuantelCommandBase {
	type: QuantelCommandType.CLEARCLIP
	transition?: QuantelOutTransition
}
export interface QuantelCommandReleasePort extends QuantelCommandBase {
	type: QuantelCommandType.RELEASEPORT
}
export interface QuantelCommandCancelWaiting extends QuantelCommandBase {
	type: QuantelCommandType.CANCELWAITING
}

export type QuantelCommand =
	| QuantelCommandSetupPort
	| QuantelCommandLoadClipFragments
	| QuantelCommandPlayClip
	| QuantelCommandPauseClip
	| QuantelCommandClearClip
	| QuantelCommandReleasePort
	| QuantelCommandCancelWaiting

/** Tracked state of an ISA-Zone-Server entity */
export interface QuantelTrackedState {
	port: {
		[portId: string]: QuantelTrackedStatePort
	}
}
export interface QuantelTrackedStatePort {
	/** Reference to the latest loaded fragments of a clip  */
	loadedFragments: {
		[clipId: number]: {
			/** The point (in a port) where the fragments starts [frames] */
			portInPoint: number
			/** The point (in a port) where the fragments ends [frames] */
			portOutPoint: number

			/** The inpoint used when loading the fragments */
			inPoint: number
			/** The outpoint used when loading the fragments */
			outPoint: number
		}
	}
	/** The (SDI)-output channel the port is using */
	channel: number

	/** The current offset of the playhead (only valid when not playing) */
	offset: number
	/** If the playhead is playing or not */
	playing: boolean
	/** When preparing a jump, this is the frame the cursor is set to  */
	jumpOffset: number | null
	/** When preparing a stop, this is the frame the playhead will stop at */
	scheduledStop: number | null
	// /** When a clip is playing and becomes the lookahead, soft jump is prepared but must be made before play. */
	// jumpBeforePlay: boolean
}
export interface MappedPorts extends MonitorPorts {
	[portId: string]: {
		mode: QuantelControlMode
		channels: number[]
	}
}
