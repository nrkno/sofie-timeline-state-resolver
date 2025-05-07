import { EmberValue } from 'timeline-state-resolver-types'
import { LawoState } from './state'
import { Model as EmberModel } from 'emberplus-connection'
import { literal } from '../../lib'
import { CommandWithContext } from '../..'

export type LawoCommandWithContext = CommandWithContext<LawoCommand, string>

export enum LawoCommandType {
	FaderRamp = 'FaderRamp',
	SetValue = 'SetValue',
}

export type LawoCommand = LawoFaderRampCommand | LawoSetValueCommand

export interface LawoFaderRampCommand {
	type: LawoCommandType.FaderRamp

	identifier: string
	value: EmberValue

	transitionDuration?: number
	from?: EmberValue

	priority: number
}

export interface LawoSetValueCommand {
	type: LawoCommandType.SetValue

	identifier: string
	value: EmberValue
	valueType?: EmberModel.ParameterType
	priority: number
}

export function diffLawoStates(oldState: LawoState | undefined, newState: LawoState): LawoCommandWithContext[] {
	const commands: LawoCommandWithContext[] = []

	// changed triggerValue => reset all faders and nodes
	const changedTriggerValue = oldState?.triggerValue !== newState.triggerValue

	// build an index of old faders and nodes
	const oldFaders = new Map(oldState?.faders.map((f) => [f.identifier, f]) ?? [])
	const oldNodes = new Map(oldState?.nodes.map((f) => [f.identifier, f]) ?? [])

	// diff faders
	for (const newFader of newState.faders) {
		const oldFader = oldFaders.get(newFader.identifier)

		if (changedTriggerValue || oldFader?.value !== newFader.value) {
			commands.push({
				command: literal<LawoFaderRampCommand>({
					type: LawoCommandType.FaderRamp,

					identifier: newFader.identifier,
					value: newFader.value,
					transitionDuration: newFader.transitionDuration,
					from: oldFader?.value,
					priority: newFader.priority,
				}),
				context: `Values: "${oldFader?.value}" !== "${newFader.value}", Changed TriggerValue: ${changedTriggerValue}`,
				timelineObjId: newFader.timelineObjId,
			})
		}
	}

	// diff nodes
	for (const newNode of newState.nodes) {
		const oldNode = oldNodes.get(newNode.identifier)

		if (changedTriggerValue || oldNode?.value !== newNode.value) {
			commands.push({
				command: literal<LawoSetValueCommand>({
					type: LawoCommandType.SetValue,

					identifier: newNode.identifier,
					value: newNode.value,
					valueType: newNode.valueType,
					priority: newNode.priority,
				}),
				context: `Values: "${oldNode?.value}" !== "${newNode.value}", Changed TriggerValue: ${changedTriggerValue}`,
				timelineObjId: newNode.timelineObjId,
			})
		}
	}

	// sort by priority
	commands.sort((a, b) => {
		if (a.command.priority < b.command.priority) return 1
		if (a.command.priority > b.command.priority) return -1

		if (a.command.identifier > b.command.identifier) return 1
		if (a.command.identifier < b.command.identifier) return -1

		return 0
	})

	return commands
}
