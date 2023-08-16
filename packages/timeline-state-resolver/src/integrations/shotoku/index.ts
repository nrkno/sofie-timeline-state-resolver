import {
	ActionExecutionResult,
	DeviceStatus,
	DeviceType,
	StatusCode,
	Timeline,
	TimelineContentShotokuSequence,
	ShotokuCommandContent,
	TSRTimelineContent,
	TimelineContentTypeShotoku,
	ShotokuTransitionType,
	ShotokuOptions,
} from 'timeline-state-resolver-types'
import { Device, DeviceEvents } from '../../service/device'

import _ = require('underscore')
import EventEmitter = require('eventemitter3')
import { ShotokuAPI, ShotokuCommand, ShotokuCommandType } from './connection'

export interface ShotokuDeviceState {
	shots: Record<string, ShotokuCommandContent & { fromTlObject: string }>
	sequences: Record<string, ShotokuSequence>
}
interface ShotokuSequence {
	fromTlObject: string
	shots: TimelineContentShotokuSequence['shots']
}

export interface ShotokuCommandWithContext {
	command: ShotokuCommand // todo
	context: string
	tlObjId: string
}

export class ShotokuDevice
	extends EventEmitter<DeviceEvents>
	implements Device<ShotokuOptions, ShotokuDeviceState, ShotokuCommandWithContext>
{
	private _shotoku: ShotokuAPI

	async init(options: ShotokuOptions): Promise<boolean> {
		this._shotoku = new ShotokuAPI()
		this._shotoku.on('error', (info, e) => this.emit('error', e, info))

		this._shotoku
			.connect(options.host, options.port)
			.catch((e) => this.emit('debug', 'Shotoku device failed initial connection attempt', e))

		return true
	}
	async terminate(): Promise<boolean> {
		await this._shotoku.dispose()
		return true
	}

	convertTimelineStateToDeviceState(state: Timeline.TimelineState<TSRTimelineContent>): ShotokuDeviceState {
		const deviceState: ShotokuDeviceState = {
			shots: {},
			sequences: {},
		}

		_.each(state.layers, (layer) => {
			const content = layer.content

			if (content.deviceType === DeviceType.SHOTOKU) {
				if (content.type === TimelineContentTypeShotoku.SHOT) {
					const show = content.show || 1

					if (!content.shot) return

					deviceState.shots[show + '.' + content.shot] = {
						...content,
						fromTlObject: layer.id,
					}
				} else {
					deviceState.sequences[content.sequenceId] = {
						shots: content.shots.filter((s) => !!s.shot),
						fromTlObject: layer.id,
					}
				}
			}
		})

		return deviceState
	}
	diffStates(oldState: ShotokuDeviceState | undefined, newState: ShotokuDeviceState): Array<ShotokuCommandWithContext> {
		// unfortunately we don't know what shots belong to what camera, so we can't do anything smart

		const commands: Array<ShotokuCommandWithContext> = []

		Object.entries<ShotokuDeviceState['shots'][string]>(newState.shots).forEach(([index, newCommandContent]) => {
			const oldLayer = oldState?.shots[index]
			if (!oldLayer) {
				// added!
				const shotokuCommand: ShotokuCommand = {
					show: newCommandContent.show,
					shot: newCommandContent.shot,
					type:
						newCommandContent.transitionType === ShotokuTransitionType.Fade
							? ShotokuCommandType.Fade
							: ShotokuCommandType.Cut,
					changeOperatorScreen: newCommandContent.changeOperatorScreen,
				}
				commands.push({
					context: `added: ${newCommandContent.fromTlObject}`,
					tlObjId: newCommandContent.fromTlObject,
					command: shotokuCommand,
				})
			} else {
				// since there is nothing but a trigger, we know nothing changed.
			}
		})

		Object.entries<ShotokuSequence>(newState.sequences).forEach(([index, newCommandContent]) => {
			const oldLayer = oldState?.sequences[index]
			if (!oldLayer) {
				// added!
				const shotokuCommand: ShotokuCommand = {
					shots: newCommandContent.shots.map((s) => ({
						show: s.show,
						shot: s.shot,
						type: s.transitionType === ShotokuTransitionType.Fade ? ShotokuCommandType.Fade : ShotokuCommandType.Cut,
						changeOperatorScreen: s.changeOperatorScreen,
						offset: s.offset,
					})),
				}
				commands.push({
					context: `added: ${newCommandContent.fromTlObject}`,
					tlObjId: newCommandContent.fromTlObject,
					command: shotokuCommand,
				})
			} else {
				// since there is nothing but a trigger, we know nothing changed.
			}
		})

		return commands
	}
	async sendCommand({ command, context, tlObjId }: ShotokuCommandWithContext): Promise<void> {
		this.emit('debug', { command, context, tlObjId })

		try {
			if (this._shotoku.connected) {
				await this._shotoku.executeCommand(command)
			}

			return
		} catch (e) {
			this.emit('commandError', e as Error, { command, context, tlObjId })
			return
		}
	}

	get connected(): boolean {
		return this._shotoku.connected
	}
	getStatus(): Omit<DeviceStatus, 'active'> {
		return {
			statusCode: this._shotoku.connected ? StatusCode.GOOD : StatusCode.BAD,
			messages: [],
		}
	}

	actions: Record<string, (id: string, payload: Record<string, any>) => Promise<ActionExecutionResult>> = {}
}
