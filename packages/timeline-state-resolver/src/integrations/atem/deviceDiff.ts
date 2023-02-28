import { Commands as AtemCommands } from 'atem-connection'
import { MappingAtem, MappingAtemType, Mappings } from 'timeline-state-resolver-types'
import { AtemCommandWithContext } from '.'
import { AtemDeviceState } from './deviceState'

import Debug from 'debug'
const debug = Debug('timeline-state-resolver:atem')

import { resolveMixEffectsState } from 'atem-state/dist/resolvers/mixEffect'

const DELAY = 40

export function diffDeviceStates(
	oldState: AtemDeviceState | undefined,
	newState: AtemDeviceState,
	mappings: Mappings,
	lastChanged: Record<string, number>,
	lastControlled: Record<string, number>
): Array<AtemCommandWithContext> {
	debug('diff commands')
	const commands: Array<AtemCommandWithContext> = []

	for (const layerName of Object.keys(mappings)) {
		const mapping = mappings[layerName] as MappingAtem
		const index = mapping.index ?? 0

		switch (mapping.mappingType) {
			case MappingAtemType.MixEffect:
				const baseAddress = 'video.mixEffects.' + index
				const oldState2 = {}
				const newState2 = {}

				const diffProp = (prop: string) => {
					if (prop in (newState.state[layerName].state as any)) {
						if (!isBlocked(baseAddress + '.' + prop, lastChanged, lastControlled)) {
							oldState2[prop] = oldState?.state[layerName].state[prop]
							newState2[prop] = newState?.state[layerName].state[prop]
						} else {
							debug(baseAddress + '.' + prop + ' is blocked')
						}
					}
				}

				diffProp('previewInput')
				diffProp('programInput')

				commands.push(
					...resolveME(index, oldState2, newState2).map((c) => ({
						command: c,
						tlObjId: '',
						context: '',
						paths: [baseAddress + '.previewInput'], // todo - not hardcode
					}))
				)
				break
			case MappingAtemType.DownStreamKeyer:
				break
			case MappingAtemType.SuperSourceBox:
				break
			case MappingAtemType.SuperSourceProperties:
				break
			case MappingAtemType.Auxilliary:
				if (isBlocked('video.auxiliaries.' + index, lastChanged, lastControlled)) break
				commands.push(
					...resolveAuxes(index, oldState?.[layerName].state as number, newState[layerName].state as number).map(
						(c) => ({
							command: c,
							tlObjId: '',
							context: '',
							paths: [],
						})
					)
				)
				break
			case MappingAtemType.MediaPlayer:
				break
			case MappingAtemType.AudioChannel:
				break
		}
	}

	return commands
}

export function resolveAuxes(
	index: number,
	oldSource: number | undefined,
	newSource: number
): Array<AtemCommands.ISerializableCommand> {
	const commands: Array<AtemCommands.ISerializableCommand> = []
	// resolve auxilliaries:
	if (oldSource !== newSource) {
		commands.push(new AtemCommands.AuxSourceCommand(index, newSource))
	}

	return commands
}

export function resolveME(
	index: number,
	oldME: { previewInput?: number; programInput?: number } | undefined,
	newME: { previewInput?: number; programInput?: number }
): Array<AtemCommands.ISerializableCommand> {
	const commands: Array<AtemCommands.ISerializableCommand> = []

	if (newME.programInput !== undefined) {
		if (oldME?.previewInput === newME.programInput) {
			commands.push(new AtemCommands.CutCommand(index))
		} else if (oldME?.programInput !== newME.programInput) {
			commands.push(new AtemCommands.ProgramInputCommand(index, newME.programInput))
		}
	}
	if (oldME?.previewInput !== newME.previewInput && newME.previewInput !== undefined) {
		commands.push(new AtemCommands.PreviewInputCommand(index, newME.previewInput))
	}

	return commands
}

function isBlocked(path, lastChanged, lastControlled) {
	debug('check ' + path, lastChanged[path], lastControlled[path])
	return lastChanged[path] > lastControlled[path] + DELAY
}
