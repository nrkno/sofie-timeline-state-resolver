import { CommandWithContext, DeviceStatus, StatusCode } from './../../devices/device'
import {
	AbstractOptions,
	Timeline,
	TSRTimelineContent,
	ActionExecutionResult,
	DeviceOptionsAbstract,
	AbstractActions,
	ActionExecutionResultCode,
} from 'timeline-state-resolver-types'
import { Device } from '../../service/device'

export interface AbstractCommandWithContext extends CommandWithContext {
	command: string
}

export type DeviceOptionsAbstractInternal = DeviceOptionsAbstract

export type AbstractDeviceState = Timeline.TimelineState<TSRTimelineContent>

/*
	This is a wrapper for an "Abstract" device

	An abstract device is just a test-device that doesn't really do anything, but can be used
	as a preliminary mock
*/
export class AbstractDevice extends Device<AbstractOptions, AbstractDeviceState, AbstractCommandWithContext> {
	readonly actions: {
		[id in AbstractActions]: (id: string, payload?: Record<string, any>) => Promise<ActionExecutionResult>
	} = {
		[AbstractActions.TestAction]: async () => {
			// noop
			return { result: ActionExecutionResultCode.Ok }
		},
	}

	public readonly connected = false

	/**
	 * Initiates the connection with CasparCG through the ccg-connection lib.
	 */
	async init(_initOptions: AbstractOptions): Promise<boolean> {
		// This is where we would do initialization, but not connecting to the device
		return true
	}

	/**
	 * Dispose of the device so it can be garbage collected.
	 */
	async terminate(): Promise<void> {
		// Noop
	}

	/**
	 * converts the timeline state into something we can use
	 * @param state
	 */
	convertTimelineStateToDeviceState(state: Timeline.TimelineState<TSRTimelineContent>) {
		return state
	}

	getStatus(): Omit<DeviceStatus, 'active'> {
		return {
			statusCode: StatusCode.GOOD,
			messages: [],
		}
	}

	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 * @param oldAbstractState
	 * @param newAbstractState
	 */
	diffStates(oldAbstractState: AbstractDeviceState | undefined, newAbstractState: AbstractDeviceState) {
		// in this abstract class, let's just cheat:

		const commands: Array<AbstractCommandWithContext> = []

		for (const [layerKey, newLayer] of Object.entries<Timeline.ResolvedTimelineObjectInstance<any>>(
			newAbstractState.layers
		)) {
			const oldLayer = oldAbstractState?.layers[layerKey]
			if (!oldLayer) {
				// added!
				commands.push({
					command: 'addedAbstract',
					timelineObjId: newLayer.id,
					context: `added: ${newLayer.id}`,
				})
			} else {
				// changed?
				if (oldLayer.id !== newLayer.id) {
					// changed!
					commands.push({
						command: 'changedAbstract',
						timelineObjId: newLayer.id,
						context: `changed: ${newLayer.id}`,
					})
				}
			}
		}

		// removed
		for (const [layerKey, oldLayer] of Object.entries<Timeline.ResolvedTimelineObjectInstance<any>>(
			oldAbstractState?.layers || {}
		)) {
			const newLayer = newAbstractState.layers[layerKey]
			if (!newLayer) {
				// removed!
				commands.push({
					command: 'removedAbstract',
					timelineObjId: oldLayer.id,
					context: `removed: ${oldLayer.id}`,
				})
			}
		}

		return commands
	}

	async sendCommand({ command, context, timelineObjId }: AbstractCommandWithContext): Promise<any> {
		// emit the command to debug:
		this.context.logger.debug({ command, context, timelineObjId })

		// Note: In the Abstract case, the execution does nothing

		return null
	}
}
