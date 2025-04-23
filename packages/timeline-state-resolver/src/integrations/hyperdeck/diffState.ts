import { Commands as HyperdeckCommands, TransportStatus } from 'hyperdeck-connection'
import { CommandWithContext } from '../..'
import type { HyperdeckDeviceState } from './stateBuilder'

export interface HyperdeckCommandContext {
	oldState: HyperdeckDeviceState['transport'] | HyperdeckDeviceState['notify'] | undefined
	newState: HyperdeckDeviceState['transport'] | HyperdeckDeviceState['notify']
}

export type HyperdeckCommandWithContext = CommandWithContext<
	HyperdeckCommands.AbstractCommand<any>,
	HyperdeckCommandContext
>

function diffHyperdeckNotifyStates(
	oldHyperdeckState: HyperdeckDeviceState | undefined,
	newHyperdeckState: HyperdeckDeviceState
): Array<HyperdeckCommandWithContext> {
	const notifyCmd = new HyperdeckCommands.NotifySetCommand()
	let changedByTimelineObjId: string | null = null

	const keys = Object.keys(oldHyperdeckState?.notify ?? {}).concat(Object.keys(newHyperdeckState.notify))
	for (const k of keys) {
		if (!oldHyperdeckState || oldHyperdeckState.notify[k] !== newHyperdeckState.notify[k]) {
			notifyCmd[k] = newHyperdeckState.notify[k]
			changedByTimelineObjId = newHyperdeckState.timelineObjId
		}
	}

	if (changedByTimelineObjId) {
		return [
			{
				command: notifyCmd,
				context: {
					oldState: oldHyperdeckState?.notify,
					newState: newHyperdeckState.notify,
				},
				timelineObjId: changedByTimelineObjId,
			},
		]
	} else {
		return []
	}
}

export function diffHyperdeckStates(
	oldHyperdeckState: HyperdeckDeviceState | undefined,
	newHyperdeckState: HyperdeckDeviceState,
	logError: (err: Error) => void
): Array<HyperdeckCommandWithContext> {
	const commandsToAchieveState: HyperdeckCommandWithContext[] = []

	commandsToAchieveState.push(...diffHyperdeckNotifyStates(oldHyperdeckState, newHyperdeckState))

	switch (newHyperdeckState.transport.status) {
		case TransportStatus.RECORD: {
			// TODO - sometimes we can loose track of the filename (eg on reconnect).
			// should we split the record when recovering from that? (it might loose some frames)
			const filenameChanged =
				oldHyperdeckState?.transport?.recordFilename !== undefined &&
				oldHyperdeckState.transport.recordFilename !== newHyperdeckState.transport.recordFilename

			if (oldHyperdeckState?.transport?.status !== newHyperdeckState.transport.status) {
				// Start recording
				commandsToAchieveState.push({
					command: new HyperdeckCommands.RecordCommand(newHyperdeckState.transport.recordFilename),
					context: {
						oldState: oldHyperdeckState?.transport,
						newState: newHyperdeckState.transport,
					},
					timelineObjId: newHyperdeckState.timelineObjId,
				})
			} else if (filenameChanged) {
				// Split recording
				commandsToAchieveState.push({
					command: new HyperdeckCommands.StopCommand(),
					context: {
						oldState: oldHyperdeckState.transport,
						newState: newHyperdeckState.transport,
					},
					timelineObjId: newHyperdeckState.timelineObjId,
				})
				commandsToAchieveState.push({
					command: new HyperdeckCommands.RecordCommand(newHyperdeckState.transport.recordFilename),
					context: {
						oldState: oldHyperdeckState.transport,
						newState: newHyperdeckState.transport,
					},
					timelineObjId: newHyperdeckState.timelineObjId,
				})
			} // else continue recording

			break
		}
		case TransportStatus.PLAY: {
			if (
				oldHyperdeckState?.transport?.status !== newHyperdeckState.transport.status ||
				oldHyperdeckState?.transport?.speed !== newHyperdeckState.transport.speed ||
				oldHyperdeckState?.transport?.loop !== newHyperdeckState.transport.loop ||
				oldHyperdeckState?.transport?.singleClip !== newHyperdeckState.transport.singleClip
			) {
				// Start or modify playback
				commandsToAchieveState.push({
					command: new HyperdeckCommands.PlayCommand(
						newHyperdeckState.transport.speed + '',
						newHyperdeckState.transport.loop,
						newHyperdeckState.transport.singleClip
					),
					context: {
						oldState: oldHyperdeckState?.transport,
						newState: newHyperdeckState.transport,
					},
					timelineObjId: newHyperdeckState.timelineObjId,
				})
			} // else continue playing

			if (
				oldHyperdeckState?.transport.clipId !== newHyperdeckState.transport.clipId &&
				newHyperdeckState.transport.clipId !== null
			) {
				// Go to the new clip
				commandsToAchieveState.push({
					command: new HyperdeckCommands.GoToCommand(undefined, newHyperdeckState.transport.clipId),
					context: {
						oldState: oldHyperdeckState?.transport,
						newState: newHyperdeckState.transport,
					},
					timelineObjId: newHyperdeckState.timelineObjId,
				})

				/**
				 * If the last played clip naturally reached its end and singleClip was
				 * true or it was the last clip on the disk, the Hyperdeck will stop,
				 * but our state will still think that it is playing.
				 * This means that in order to reliably play the clip we just GoTo'd,
				 * we have to always send a Play command.
				 */
				if (newHyperdeckState.transport.status === TransportStatus.PLAY) {
					// Start or modify playback
					commandsToAchieveState.push({
						command: new HyperdeckCommands.PlayCommand(
							newHyperdeckState.transport.speed + '',
							newHyperdeckState.transport.loop,
							newHyperdeckState.transport.singleClip
						),
						context: {
							oldState: oldHyperdeckState?.transport,
							newState: newHyperdeckState.transport,
						},
						timelineObjId: newHyperdeckState.timelineObjId,
					})
				} // else continue playing
			} // else continue playing

			break
		}
		case TransportStatus.PREVIEW: {
			if (oldHyperdeckState?.transport.status !== newHyperdeckState.transport.status) {
				// Switch to preview mode
				// A subsequent play or record command will automatically override this
				commandsToAchieveState.push({
					command: new HyperdeckCommands.PreviewCommand(true),
					context: {
						oldState: oldHyperdeckState?.transport,
						newState: newHyperdeckState.transport,
					},
					timelineObjId: newHyperdeckState.timelineObjId,
				})
			}

			break
		}
		case TransportStatus.STOPPED: {
			if (oldHyperdeckState?.transport.status !== newHyperdeckState.transport.status) {
				// Stop playback/recording
				commandsToAchieveState.push({
					command: new HyperdeckCommands.StopCommand(),
					context: {
						oldState: oldHyperdeckState?.transport,
						newState: newHyperdeckState.transport,
					},
					timelineObjId: newHyperdeckState.timelineObjId,
				})
			}

			break
		}
		default:
			logError(
				new Error(
					`Unhandled transport status: ${newHyperdeckState.transport.status} (from ${oldHyperdeckState?.transport.status})`
				)
			)

			// for now we are assuming they want a stop. that could be conditional later on
			if (
				oldHyperdeckState?.transport.status === TransportStatus.RECORD ||
				oldHyperdeckState?.transport.status === TransportStatus.PLAY
			) {
				commandsToAchieveState.push({
					command: new HyperdeckCommands.StopCommand(),
					context: {
						oldState: oldHyperdeckState.transport,
						newState: newHyperdeckState.transport,
					},
					timelineObjId: newHyperdeckState.timelineObjId,
				})
			}
			break
	}

	return commandsToAchieveState
}
