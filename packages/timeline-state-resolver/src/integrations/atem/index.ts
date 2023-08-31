import * as _ from 'underscore'
import { DeviceStatus, StatusCode } from './../../devices/device'
import {
	SomeMappingAtem,
	MappingAtemType,
	AtemOptions,
	Mappings,
	Timeline,
	TSRTimelineContent,
	Mapping,
	MappingAtemAuxilliary,
	ActionExecutionResult,
	ActionExecutionResultCode,
	AtemActions,
	MappingAtemAudioChannel,
} from 'timeline-state-resolver-types'
import { AtemState, State as DeviceState, Diff } from 'atem-state'
import {
	BasicAtem,
	Commands as AtemCommands,
	AtemState as NativeAtemState,
	AtemStateUtil,
	Enums as ConnectionEnums,
} from 'atem-connection'
import { CommandWithContext, Device } from '../../service/device'
import { AtemStateBuilder } from './stateBuilder'
import { DeepComplete } from 'atem-state/dist/util'

export interface AtemCommandWithContext {
	command: AtemCommands.ISerializableCommand
	context: string
	timelineObjId: string
}

type AtemDeviceState = DeviceState

/**
 * This is a wrapper for the Atem Device. Commands to any and all atem devices will be sent through here.
 */
export class AtemDevice extends Device<AtemOptions, AtemDeviceState, AtemCommandWithContext> {
	readonly actions: {
		[id in AtemActions]: (id: string, payload: Record<string, any>) => Promise<ActionExecutionResult>
	} = {
		[AtemActions.Resync]: this.resyncState.bind(this),
	}

	private readonly _atem = new BasicAtem()
	private _protocolVersion = ConnectionEnums.ProtocolVersion.V8_1_1
	private _connected = false // note: ideally this should be replaced by this._atem.connected

	private _atemStatus: {
		psus: Array<boolean>
	} = {
		psus: [],
	}

	/**
	 * Initiates the connection with the ATEM through the atem-connection lib
	 * and initiates Atem State lib.
	 */
	async init(options: AtemOptions): Promise<boolean> {
		this._atem.on('disconnected', () => {
			this._connected = false
			this._connectionChanged()
		})
		this._atem.on('error', (e) => this.context.logger.error('Atem', new Error(e)))
		this._atem.on('stateChanged', (state) => this._onAtemStateChanged(state))

		this._atem.on('connected', () => {
			this._connected = true

			this._connectionChanged()
			this.context.resetResolver()

			if (this._atem.state) {
				this._protocolVersion = this._atem.state.info.apiVersion
			}
		})

		// This only waits for the child thread to start, it doesn't wait for connection
		await this._atem.connect(options.host, options.port)

		return true
	}
	/**
	 * Safely terminate everything to do with this device such that it can be
	 * garbage collected.
	 */
	async terminate(): Promise<void> {
		await this._atem.disconnect().catch(() => null)
		await this._atem.destroy().catch(() => null)
		this._atem.removeAllListeners()
	}

	private async resyncState(): Promise<ActionExecutionResult> {
		this.context.resetResolver()

		return {
			result: ActionExecutionResultCode.Ok,
		}
	}

	get connected(): boolean {
		return this._connected
	}

	/**
	 * Convert a timeline state into an Atem state.
	 * @param timelineState The state to be converted
	 */
	convertTimelineStateToDeviceState(
		timelineState: Timeline.TimelineState<TSRTimelineContent>,
		mappings: Mappings
	): AtemDeviceState {
		return AtemStateBuilder.fromTimeline(timelineState.layers, mappings)
	}

	/**
	 * Check status and return it with useful messages appended.
	 */
	public getStatus(): Omit<DeviceStatus, 'active'> {
		if (!this._connected) {
			return {
				statusCode: StatusCode.BAD,
				messages: [`Atem disconnected`],
			}
		} else {
			let statusCode = StatusCode.GOOD
			const messages: Array<string> = []

			const psus = this._atemStatus.psus
			psus.forEach((psu: boolean, i: number) => {
				if (!psu) {
					statusCode = StatusCode.WARNING_MAJOR
					messages.push(`Atem PSU ${i + 1} is faulty. The device has ${psus.length} PSU(s) in total.`)
				}
			})

			return {
				statusCode: statusCode,
				messages: messages,
			}
		}
	}

	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 * @param oldAtemState
	 * @param newAtemState
	 */
	diffStates(
		oldAtemState: AtemDeviceState | undefined,
		newAtemState: AtemDeviceState,
		mappings: Mappings
	): Array<AtemCommandWithContext> {
		// Skip diffing if not connected, a resolverReset will be fired upon reconnection
		if (!this._connected) return []

		// Make sure there is something to diff against
		oldAtemState = oldAtemState ?? this._atem.state ?? AtemStateUtil.Create()

		// Find the auxes that have mappings
		const auxMappings = Object.values<Mapping<unknown>>(mappings)
			.filter(
				(mapping: Mapping<SomeMappingAtem>): mapping is Mapping<MappingAtemAuxilliary> =>
					mapping.options.mappingType === MappingAtemType.Auxilliary
			)
			.map((mapping) => mapping.options.index)

		// Find the audioOutputs that have mappings
		const audioOutputs = Object.values<Mapping<unknown>>(mappings)
			.filter(
				(mapping: Mapping<SomeMappingAtem>): mapping is Mapping<MappingAtemAudioChannel> =>
					mapping.options.mappingType === MappingAtemType.Auxilliary
			)
			.map((mapping) => mapping.options.index)
		const audioOutputsObj: DeepComplete<Record<number | 'default', Diff.DiffFairlightAudioRoutingOutput | undefined>> =
			{ default: undefined }
		for (const audioOutput of audioOutputs) {
			audioOutputsObj[audioOutput] = {
				name: false,
				sourceId: true,
			}
		}

		// Manually construct the tree of what to diff, to match the previous version of atem-state.
		// Future: this should be computed from the mappings
		const diffOptions: DeepComplete<Diff.SectionsToDiff> = {
			colorGenerators: undefined,
			settings: {
				multiviewer: undefined,
			},
			macros: {
				player: { player: true },
			},
			media: {
				players: {
					source: true,
					status: true,
				},
			},
			video: {
				auxiliaries: auxMappings,
				downstreamKeyers: {
					sources: true,
					onAir: true,
					properties: true,
					mask: true,
				},
				mixEffects: {
					programPreview: true,
					transitionStatus: true,
					transitionProperties: true,
					transitionSettings: {
						dip: false,
						DVE: false,
						mix: true,
						stinger: false,
						wipe: true,
					},
					upstreamKeyers: {
						sources: true,
						onAir: true,
						type: true,
						mask: true,
						flyKeyframes: undefined,
						dveSettings: true,
						chromaSettings: false,
						advancedChromaSettings: false,
						lumaSettings: true,
						patternSettings: true,
					},
				},
				superSources: {
					boxes: 'all',
					border: true,
					properties: true,
				},
			},
			audio: {
				classic: undefined,
				fairlight: {
					inputs: undefined,
					masterOutput: undefined,
					monitorOutput: undefined,
					crossfade: undefined,
					audioRouting: {
						sources: undefined,
						outputs: audioOutputsObj,
					},
				},
			},
		}

		return AtemState.diffStates(this._protocolVersion, oldAtemState, newAtemState, diffOptions).map((cmd) => {
			// backwards compability, to be removed later:
			return {
				command: cmd,
				context: '',
				timelineObjId: '', // @todo: implement in Atem-state
			}
		})
	}

	async sendCommand({ command, context, timelineObjId }: AtemCommandWithContext): Promise<void> {
		const cwc: CommandWithContext = {
			context,
			command,
			timelineObjId,
		}
		this.context.logger.debug(cwc)

		// Skip attempting send if not connected
		if (!this._connected) return

		try {
			await this._atem.sendCommand(command)
		} catch (error: any) {
			this.context.commandError(error, cwc)
		}
	}
	private _onAtemStateChanged(newState: Readonly<NativeAtemState>) {
		const psus = newState.info.power || []

		if (!_.isEqual(this._atemStatus.psus, psus)) {
			this._atemStatus.psus = psus.slice()

			this._connectionChanged()
		}
	}
	private _connectionChanged() {
		this.context.connectionChanged(this.getStatus())
	}
}
