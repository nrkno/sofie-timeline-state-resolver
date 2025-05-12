import { QuantelOutTransition } from 'timeline-state-resolver-types'
import { QuantelCommandWithContext } from '.'
import { QuantelCommand, QuantelCommandType, QuantelState, QuantelStatePort, QuantelStatePortClip } from './types'
import _ = require('underscore')

const IDEAL_PREPARE_TIME = 1000
const PREPARE_TIME_WAIT = 50

export function diffStates(
	oldState: QuantelState | undefined,
	newState: QuantelState,
	currentTime: number
): Array<QuantelCommandWithContext> {
	const time = newState.time
	const highPrioCommands: QuantelCommandWithContext[] = []
	const lowPrioCommands: QuantelCommandWithContext[] = []

	const addCommand = (command: QuantelCommand, lowPriority: boolean, context?: string, prelimTime?: number) => {
		;(lowPriority ? lowPrioCommands : highPrioCommands).push({
			command,
			timelineObjId: command.timelineObjId,
			context: context ?? 'Context not specified..',
			preliminary: prelimTime,
		})
	}
	const seenClips: { [identifier: string]: true } = {}
	const loadFragments = (
		portId: string,
		port: QuantelStatePort,
		clip: QuantelStatePortClip,
		timelineObjId: string,
		isPreloading: boolean,
		context?: string
	) => {
		// Only load identical fragments once:
		const clipIdentifier = `${portId}:${clip.clipId}_${clip.guid}_${clip.title}`
		if (!seenClips[clipIdentifier]) {
			seenClips[clipIdentifier] = true
			addCommand(
				{
					type: QuantelCommandType.LOADCLIPFRAGMENTS,
					portId: portId,
					timelineObjId: timelineObjId,
					fromLookahead: isPreloading || port.lookahead,
					clip: clip,
					timeOfPlay: time,
					allowedToPrepareJump: !isPreloading,
				},
				isPreloading || port.lookahead,
				context,
				prelimTime
			)
		}
	}

	/** The time of when to run "preparation" commands */
	const prelimTime = getPreliminaryTime(newState.time, oldState?.time, currentTime)

	const lookaheadPreloadClips: LookaheadPreloadClip[] = []

	for (const [portId, newPort] of Object.entries<QuantelStatePort>(newState.port)) {
		// diff existing ports
		const oldPort = oldState?.port[portId]
		diffPort(portId, newPort, oldPort, prelimTime, addCommand, loadFragments, lookaheadPreloadClips)
	}

	for (const [portId, oldPort] of Object.entries<QuantelStatePort>(oldState?.port ?? {})) {
		// diff old ports that may be removed
		const newPort = newState.port[portId]
		if (!newPort) {
			// removed port
			addCommand(
				{
					type: QuantelCommandType.RELEASEPORT,
					portId: portId,
					timelineObjId: oldPort.timelineObjId,
					fromLookahead: oldPort.lookahead,
				},
				oldPort.lookahead,
				'Port does not exist in new state',
				prelimTime
			)
		}
	}
	// Lookaheads to preload:
	Object.values<LookaheadPreloadClip>(lookaheadPreloadClips).forEach((lookaheadPreloadClip) => {
		// Preloads of lookaheads are handled last, to ensure that any load-fragments of high-prio clips are done first.
		loadFragments(
			lookaheadPreloadClip.portId,
			lookaheadPreloadClip.port,
			lookaheadPreloadClip.clip,
			lookaheadPreloadClip.timelineObjId,
			true,
			'Load from lookahead'
		)
	})

	const allCommands = highPrioCommands.concat(lowPrioCommands)

	allCommands.sort((a, b) => {
		// Release ports should always be done first:
		if (a.command.type === QuantelCommandType.RELEASEPORT && b.command.type !== QuantelCommandType.RELEASEPORT)
			return -1
		if (a.command.type !== QuantelCommandType.RELEASEPORT && b.command.type === QuantelCommandType.RELEASEPORT) return 1
		return 0
	})

	// If we run any play-command, we will need to cancel any delayed/waiting out-transitions for that port:
	const portIdsToCancelWaiting: Set<string> = new Set()
	for (const cmd of allCommands) {
		if (
			(cmd.command.type === QuantelCommandType.PLAYCLIP ||
				cmd.command.type === QuantelCommandType.PAUSECLIP ||
				cmd.command.type === QuantelCommandType.CLEARCLIP ||
				cmd.command.type === QuantelCommandType.RELEASEPORT) &&
			!cmd.command.fromLookahead
		) {
			// We should clear any delayed out-transitions for this port
			portIdsToCancelWaiting.add(cmd.command.portId)
		}
	}

	for (const portId of portIdsToCancelWaiting.values()) {
		// Put first, so that it'll be executed before any other
		allCommands.unshift({
			command: {
				type: QuantelCommandType.CANCELWAITING,
				portId: portId,
				timelineObjId: '',
			},
			timelineObjId: '',
			context: 'Clear all delayed out-transitions',
			// This must be on a unique queueId, so that it "mimics a salvo", ie is executed first thing and not get stuck behind a delayed sequential command.
			queueId: `reset_port_${portId}`,
		})
	}

	// console.log('diff', currentTime, allCommands)

	return allCommands
}
interface LookaheadPreloadClip {
	portId: string
	port: QuantelStatePort
	clip: QuantelStatePortClip
	timelineObjId: string
}

function getPreliminaryTime(time: number, oldTime: number | undefined, currentTime: number) {
	// we want to be at least PREPARE_TIME_WAIT ms after the old state
	const earliest = Math.max((oldTime ?? 0) + PREPARE_TIME_WAIT, currentTime)

	// time - earliest = the most delay we can use
	const maxPrelim = Math.max(0, time - earliest)

	// the best time is IDEAL_PREPARE_TIME, but we cannot use it if the oldState was too short ago
	return Math.min(maxPrelim, IDEAL_PREPARE_TIME)
}

/** diff an existing port */
function diffPort(
	portId: string,
	newPort: QuantelStatePort,
	oldPort: QuantelStatePort | undefined,
	prelimTime: number,
	addCommand: (command: QuantelCommand, lowPriority: boolean, context?: string, prelimTime?: number) => void,
	loadFragments: (
		portId: string,
		port: QuantelStatePort,
		clip: QuantelStatePortClip,
		timelineObjId: string,
		isPreloading: boolean,
		context?: string
	) => void,
	lookaheadPreloadClips: {
		portId: string
		port: QuantelStatePort
		clip: QuantelStatePortClip
		timelineObjId: string
	}[]
) {
	if (!oldPort || !_.isEqual(newPort.channels, oldPort.channels)) {
		const channel = newPort.channels[0] as number | undefined
		if (channel !== undefined) {
			// todo: support for multiple channels
			addCommand(
				{
					type: QuantelCommandType.SETUPPORT,
					portId: portId,
					timelineObjId: newPort.timelineObjId,
					channel: channel,
				},
				newPort.lookahead,
				'Old state did not have port',
				prelimTime
			)
		}
	}

	if (!oldPort || !_.isEqual(newPort.clip, oldPort.clip)) {
		if (newPort.clip) {
			// Load (and play) the clip:

			let transition: QuantelOutTransition | undefined

			if (oldPort && !oldPort.notOnAir && newPort.notOnAir) {
				// When the previous content was on-air, we use the out-transition (so that mix-effects look good).
				// But when the previous content wasn't on-air, we don't wan't to use the out-transition (for example; when cuing previews)
				transition = oldPort.outTransition
			}

			loadFragments(portId, newPort, newPort.clip, newPort.timelineObjId, false, 'Load from current state')
			if (newPort.clip.playing) {
				addCommand(
					{
						type: QuantelCommandType.PLAYCLIP,
						portId: portId,
						timelineObjId: newPort.timelineObjId,
						fromLookahead: newPort.lookahead,
						clip: newPort.clip,
						mode: newPort.mode,
						transition: transition,
					},
					newPort.lookahead,
					'New clip is playing'
				)
			} else {
				addCommand(
					{
						type: QuantelCommandType.PAUSECLIP,
						portId: portId,
						timelineObjId: newPort.timelineObjId,
						fromLookahead: newPort.lookahead,
						clip: newPort.clip,
						mode: newPort.mode,
						transition: transition,
					},
					newPort.lookahead,
					'New clip is paused'
				)
			}
		} else {
			// Stop / Clear the clip
			addCommand(
				{
					type: QuantelCommandType.CLEARCLIP,
					portId: portId,
					timelineObjId: newPort.timelineObjId,
					fromLookahead: newPort.lookahead,
					transition: oldPort && oldPort.outTransition,
				},
				newPort.lookahead,
				'New clip is empty'
			)
		}
	}
	if (!oldPort || !_.isEqual(newPort.lookaheadClip, oldPort.lookaheadClip)) {
		if (
			newPort.lookaheadClip &&
			(!newPort.clip ||
				newPort.lookaheadClip.clipId !== newPort.clip.clipId ||
				newPort.lookaheadClip.title !== newPort.clip.title ||
				newPort.lookaheadClip.guid !== newPort.clip.guid)
		) {
			// Also preload lookaheads later:
			lookaheadPreloadClips.push({
				portId: portId,
				port: newPort,
				clip: {
					...newPort.lookaheadClip,
					playTime: 0,
					playing: false,
				},
				timelineObjId: newPort.lookaheadClip.timelineObjId,
			})
		}
	}
}
