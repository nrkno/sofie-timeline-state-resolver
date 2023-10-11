import { QuantelOutTransition } from 'timeline-state-resolver-types'
import { QuantelCommandWithContext } from '.'
import { QuantelCommand, QuantelCommandType, QuantelState, QuantelStatePort, QuantelStatePortClip } from './types'
import _ = require('underscore')

const IDEAL_PREPARE_TIME = 1000
const PREPARE_TIME_WAIT = 50

export function diffStates(
	oldState: QuantelState | undefined,
	newState: QuantelState
): Array<QuantelCommandWithContext> {
	const time = newState.time
	const highPrioCommands: QuantelCommandWithContext[] = []
	const lowPrioCommands: QuantelCommandWithContext[] = []

	const addCommand = (command: QuantelCommand, lowPriority: boolean, context?: string) => {
		;(lowPriority ? lowPrioCommands : highPrioCommands).push({
			command,
			timelineObjId: command.timelineObjId,
			context: context ?? 'Context not specified..',
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
					time: prepareTime,
					portId: portId,
					timelineObjId: timelineObjId,
					fromLookahead: isPreloading || port.lookahead,
					clip: clip,
					timeOfPlay: time,
					allowedToPrepareJump: !isPreloading,
				},
				isPreloading || port.lookahead,
				context
			)
		}
	}

	/** The time of when to run "preparation" commands */
	const prepareTime = getPrepareTime(newState.time, oldState?.time)

	const lookaheadPreloadClips: {
		portId: string
		port: QuantelStatePort
		clip: QuantelStatePortClip
		timelineObjId: string
	}[] = []

	for (const [portId, newPort] of Object.entries<QuantelStatePort>(newState.port)) {
		// diff existing ports
		const oldPort = oldState?.port[portId]
		diffPort(portId, newPort, oldPort, newState.time, prepareTime, addCommand, loadFragments, lookaheadPreloadClips)
	}

	for (const [portId, oldPort] of Object.entries<QuantelStatePort>(oldState?.port ?? {})) {
		// diff old ports that may be removed
		const newPort = newState.port[portId]
		if (!newPort) {
			// removed port
			addCommand(
				{
					type: QuantelCommandType.RELEASEPORT,
					time: prepareTime,
					portId: portId,
					timelineObjId: oldPort.timelineObjId,
					fromLookahead: oldPort.lookahead,
				},
				oldPort.lookahead,
				'Port does not exist in new state'
			)
		}
	}
	// Lookaheads to preload:
	_.each(lookaheadPreloadClips, (lookaheadPreloadClip) => {
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
	return allCommands
}

/** The time of when to run "preparation" commands */
function getPrepareTime(time: number, oldTime?: number): number {
	let prepareTime = Math.min(
		time,
		Math.max(
			time - IDEAL_PREPARE_TIME,
			(oldTime ?? Date.now()) + PREPARE_TIME_WAIT // earliset possible prepareTime
		)
	)
	if (prepareTime < Date.now()) {
		// todo - is this a good usage of date.now vs getTime()
		// Only to not emit an unnessesary slowCommand event
		prepareTime = Date.now()
	}
	if (time < prepareTime) {
		prepareTime = time - 10
	}

	return prepareTime
}

/** diff an existing port */
function diffPort(
	portId: string,
	newPort: QuantelStatePort,
	oldPort: QuantelStatePort | undefined,
	time: number,
	prepareTime: number,
	addCommand: (command: QuantelCommand, lowPriority: boolean, context?: string) => void,
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
					time: prepareTime,
					portId: portId,
					timelineObjId: newPort.timelineObjId,
					channel: channel,
				},
				newPort.lookahead,
				'Old state did not have port'
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
						time: time,
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
						time: time,
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
			addCommand(
				{
					type: QuantelCommandType.CLEARCLIP,
					time: time,
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
