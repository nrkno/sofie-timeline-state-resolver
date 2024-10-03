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
import { CommandWithContext, Device } from '../../service/device'

import _ = require('underscore')
import { ShotokuAPI, ShotokuCommand, ShotokuCommandType } from './connection'

export interface ShotokuDeviceState {
	shots: Record<string, ShotokuCommandContent & { fromTlObject: string }>
	sequences: Record<string, ShotokuSequence>
}
interface ShotokuSequence {
	fromTlObject: string
	shots: TimelineContentShotokuSequence['shots']
}

export interface ShotokuCommandWithContext extends CommandWithContext {
	command: ShotokuCommand // todo
}

export class ShotokuDevice extends Device<ShotokuOptions, ShotokuDeviceState, ShotokuCommandWithContext> {
	private readonly _shotoku = new ShotokuAPI()

	async init(options: ShotokuOptions): Promise<boolean> {
		this._shotoku.on('error', (info, error) => this.context.logger.error(info, error))
		this._shotoku.on('connected', () => {
			this.context.connectionChanged(this.getStatus())
		})
		this._shotoku.on('disconnected', () => {
			this.context.connectionChanged(this.getStatus())
		})
		this._shotoku.on('warn', (message: string) => {
			this.context.logger.warning(message)
		})

		this._shotoku
			.connect(options.host, options.port)
			.then(() => {
				this.context
					.resetToState({ shots: {}, sequences: {} })
					.catch((e) =>
						this.context.logger.warning(
							'Failed to reset to state after first connection, device may be in unknown state (reason: ' + e + ')'
						)
					)
			})
			.catch((e) => this.context.logger.debug('Shotoku device failed initial connection attempt', e))

		return true
	}
	async terminate(): Promise<void> {
		await this._shotoku.dispose()
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
					timelineObjId: newCommandContent.fromTlObject,
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
					timelineObjId: newCommandContent.fromTlObject,
					command: shotokuCommand,
				})
			} else {
				// since there is nothing but a trigger, we know nothing changed.
			}
		})

		return commands
	}
	async sendCommand({ command, context, timelineObjId }: ShotokuCommandWithContext): Promise<void> {
		this.context.logger.debug({ command, context, timelineObjId })

		try {
			if (this._shotoku.connected) {
				await this._shotoku.executeCommand(command)
			}

			return
		} catch (e) {
			this.context.commandError(e as Error, { command, context, timelineObjId })
			return
		}
	}

	get connected(): boolean {
		return this._shotoku.connected
	}
	getStatus(): Omit<DeviceStatus, 'active'> {
		const messages: string[] = []
		if (!this._shotoku.connected) messages.push('Not connected')
		return {
			statusCode: this._shotoku.connected ? StatusCode.GOOD : StatusCode.BAD,
			messages: [],
		}
	}

	readonly actions: Record<string, (id: string, payload?: Record<string, any>) => Promise<ActionExecutionResult>> = {}
}
