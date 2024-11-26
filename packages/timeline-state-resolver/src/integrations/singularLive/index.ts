import * as _ from 'underscore'
import {
	DeviceType,
	SingularLiveOptions,
	TimelineContentTypeSingularLive,
	SomeMappingSingularLive,
	SingularCompositionControlNode,
	Mappings,
	TSRTimelineContent,
	Timeline,
	Mapping,
	DeviceStatus,
	StatusCode,
	ActionExecutionResult,
} from 'timeline-state-resolver-types'
import got from 'got'
import { literal } from '../../lib'
import { CommandWithContext, Device } from '../../service/device'

export interface SingularLiveControlNodeCommandContent extends SingularLiveCommandContent {
	state?: string
	payload?: { [controlNodeField: string]: string }
}

export interface SingularLiveCommandContent {
	subCompositionName: string
}

export interface SingularLiveCommandContext extends CommandWithContext {
	command: Command
}

interface Command {
	commandName: 'added' | 'changed' | 'removed'
	content: SingularLiveCommandContent | SingularLiveControlNodeCommandContent
	layer: string
}

export interface SingularComposition {
	timelineObjId: string
	controlNode: SingularCompositionControlNode
}

export interface SingularLiveState {
	compositions: {
		[key: string]: SingularComposition
	}
}

const SINGULAR_LIVE_API = 'https://app.singular.live/apiv2/controlapps/'

/**
 * This is a Singular.Live device, it talks to a Singular.Live App Instance using an Access Token
 */
export class SingularLiveDevice extends Device<SingularLiveOptions, SingularLiveState, SingularLiveCommandContext> {
	readonly actions: {
		[id: string]: (id: string, payload?: Record<string, any>) => Promise<ActionExecutionResult>
	} = {}

	private _accessToken: string | undefined

	async init(initOptions: SingularLiveOptions): Promise<boolean> {
		this._accessToken = initOptions.accessToken || ''

		if (!this._accessToken)
			throw new Error('Singular.Live bad connection option: accessToken. An accessToken is required.')

		return true // This device doesn't have any initialization procedure
	}

	// TODO

	async terminate() {
		// Nothing to do
	}

	getStatus(): Omit<DeviceStatus, 'active'> {
		// Good, since this device has no status, really
		return {
			statusCode: StatusCode.GOOD,
			messages: [],
		}
	}
	get connected(): boolean {
		// Doesn't support connection status
		return false
	}

	private _getDefaultState(): SingularLiveState {
		return {
			compositions: {},
		}
	}

	convertTimelineStateToDeviceState(
		state: Timeline.TimelineState<TSRTimelineContent>,
		newMappings: Mappings<unknown>
	): SingularLiveState {
		// convert the timeline state into something we can use
		// (won't even use this.mapping)
		const singularState: SingularLiveState = this._getDefaultState()

		_.each(state.layers, (tlObject, layerName: string) => {
			const mapping = newMappings[layerName] as Mapping<SomeMappingSingularLive>
			if (
				mapping &&
				mapping.device === DeviceType.SINGULAR_LIVE &&
				tlObject.content.deviceType === DeviceType.SINGULAR_LIVE
			) {
				const content = tlObject.content

				if (content.type === TimelineContentTypeSingularLive.COMPOSITION) {
					singularState.compositions[mapping.options.compositionName] = {
						timelineObjId: tlObject.id,
						controlNode: content.controlNode,
					}
				}
			}
		})

		return singularState
	}

	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 */
	diffStates(
		oldSingularLiveState: SingularLiveState | undefined,
		newSingularLiveState: SingularLiveState,
		_mappings: Mappings<unknown>,
		_time: number
	): SingularLiveCommandContext[] {
		const commands: Array<SingularLiveCommandContext> = []

		_.each(newSingularLiveState.compositions, (composition: SingularComposition, compositionName: string) => {
			const oldComposition = oldSingularLiveState?.compositions?.[compositionName]
			if (!oldComposition) {
				// added!
				commands.push({
					timelineObjId: composition.timelineObjId,
					context: `added: ${composition.timelineObjId}`,
					command: {
						commandName: 'added',
						content: literal<SingularLiveControlNodeCommandContent>({
							subCompositionName: compositionName,
							state: composition.controlNode.state,
							payload: composition.controlNode.payload,
						}),
						layer: compositionName,
					},
				})
			} else {
				// changed?
				if (!_.isEqual(oldComposition.controlNode, composition.controlNode)) {
					// changed!
					commands.push({
						timelineObjId: composition.timelineObjId,
						context: `changed: ${composition.timelineObjId}  (previously: ${oldComposition.timelineObjId})`,
						command: {
							commandName: 'changed',
							content: literal<SingularLiveControlNodeCommandContent>({
								subCompositionName: compositionName,
								state: composition.controlNode.state,
								payload: composition.controlNode.payload,
							}),
							layer: compositionName,
						},
					})
				}
			}
		})
		// removed
		if (oldSingularLiveState) {
			_.each(oldSingularLiveState.compositions, (composition: SingularComposition, compositionName) => {
				const newComposition = newSingularLiveState.compositions[compositionName]
				if (!newComposition) {
					// removed!
					commands.push({
						timelineObjId: composition.timelineObjId,
						context: `removed: ${composition.timelineObjId}`,
						command: {
							commandName: 'removed',
							content: literal<SingularLiveControlNodeCommandContent>({
								subCompositionName: compositionName,
								state: 'Out',
							}),
							layer: compositionName,
						},
					})
				}
			})
		}

		return commands
			.sort((a, b) =>
				(a.command.content as any).state && !(b.command.content as any).state
					? 1
					: !(a.command.content as any).state && (b.command.content as any).state
					? -1
					: 0
			)
			.sort((a, b) => a.command.layer.localeCompare(b.command.layer))
	}

	async sendCommand({ command, context, timelineObjId }: SingularLiveCommandContext): Promise<any> {
		const cwc: CommandWithContext = {
			context,
			command,
			timelineObjId,
		}
		this.context.logger.debug(cwc)

		const url = SINGULAR_LIVE_API + this._accessToken + '/control'

		try {
			await got
				.patch(url, { json: [command.content] })
				.then((response) => {
					if (response.statusCode === 200) {
						this.context.logger.debug(
							`SingularLive: ${command.content.subCompositionName}: Good statuscode response on url "${url}": ${response.statusCode} (${context})`
						)
					} else {
						this.context.logger.warning(
							`SingularLive: ${command.content.subCompositionName}: Bad statuscode response on url "${url}": ${response.statusCode} (${context})`
						)
					}
				})
				.catch((error) => {
					this.context.logger.error(
						`SingularLive.response error ${command.content.subCompositionName} (${context}`,
						error
					)
					throw error
				})
		} catch (error: any) {
			this.context.commandError(error, cwc)
		}
	}
}
