import * as _ from 'underscore'
import * as underScoreDeepExtend from 'underscore-deep-extend'
import { DeviceStatus, StatusCode } from './../../devices/device'
import {
	DeviceType,
	TimelineContentTypeAtem,
	SomeMappingAtem,
	MappingAtemType,
	AtemOptions,
	Mappings,
	AtemTransitionStyle,
	Timeline,
	TSRTimelineContent,
	Mapping,
	MappingAtemAuxilliary,
	ActionExecutionResult,
	ActionExecutionResultCode,
	AtemActions,
} from 'timeline-state-resolver-types'
import { AtemState, State as DeviceState, Defaults as StateDefault } from 'atem-state'
import {
	BasicAtem,
	Commands as AtemCommands,
	AtemState as NativeAtemState,
	AtemStateUtil,
	Enums as ConnectionEnums,
} from 'atem-connection'
import { CommandWithContext, Device, DeviceEvents } from '../../service/device'
import EventEmitter = require('eventemitter3')
import { ProtocolVersion } from 'atem-connection/dist/enums'

_.mixin({ deepExtend: underScoreDeepExtend(_) })

function deepExtend<T>(destination: T, ...sources: any[]) {
	// @ts-ignore (mixin)
	return _.deepExtend(destination, ...sources)
}

export interface AtemCommandWithContext {
	command: AtemCommands.ISerializableCommand
	context: string
	tlObjId: string
}

type AtemDeviceState = DeviceState

/**
 * This is a wrapper for the Atem Device. Commands to any and all atem devices will be sent through here.
 */
export class AtemDevice
	extends EventEmitter<DeviceEvents>
	implements Device<AtemOptions, AtemDeviceState, AtemCommandWithContext>
{
	readonly actions: {
		[id in AtemActions]: (id: string, payload: Record<string, any>) => Promise<ActionExecutionResult>
	} = {
		[AtemActions.Resync]: this.resyncState.bind(this),
	}

	private readonly _atem = new BasicAtem()
	private _protocolVersion = ProtocolVersion.V8_1_1
	private _initialized = false
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
		this._atem.on('error', (e) => this.emit('error', 'Atem', new Error(e)))
		this._atem.on('stateChanged', (state) => this._onAtemStateChanged(state))

		this._atem.on('connected', () => {
			this._connected = true
			this._initialized = true

			this._connectionChanged()
			this.emit('resetResolver')

			if (this._atem.state) {
				this._protocolVersion = this._atem.state.info.apiVersion
			}
		})

		// This only waits for the child thread to start, it doesn't wait for connection TODO-verify
		await this._atem.connect(options.host, options.port)

		return true
	}
	/**
	 * Safely terminate everything to do with this device such that it can be
	 * garbage collected.
	 */
	async terminate(): Promise<void> {
		await this._atem.disconnect()
		await this._atem.destroy()
	}

	private async resyncState(): Promise<ActionExecutionResult> {
		this.emit('resetResolver')

		return {
			result: ActionExecutionResultCode.Ok,
		}
	}

	/**
	 * Prepare device for playout
	 * @param okToDestroyStuff If true, may break output
	 */
	async makeReady(okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			await this.resyncState()
		}
	}

	get connected(): boolean {
		return this._connected
	}

	/**
	 * Convert a timeline state into an Atem state.
	 * @param state The state to be converted
	 */
	convertTimelineStateToDeviceState(
		state: Timeline.TimelineState<TSRTimelineContent>,
		newMappings: Mappings
	): AtemDeviceState {
		// Start out with default state:
		const deviceState = AtemStateUtil.Create()

		// Sort layer based on Layer name
		const sortedLayers = _.map(state.layers, (tlObject, layerName) => ({ layerName, tlObject })).sort((a, b) =>
			a.layerName.localeCompare(b.layerName)
		)

		// For every layer, augment the state
		_.each(sortedLayers, ({ tlObject, layerName }) => {
			const content = tlObject.content

			const mapping = newMappings[layerName] as Mapping<SomeMappingAtem> | undefined

			if (mapping && content.deviceType === DeviceType.ATEM) {
				if ('index' in mapping.options && mapping.options.index !== undefined && mapping.options.index >= 0) {
					// index must be 0 or higher
					switch (mapping.options.mappingType) {
						case MappingAtemType.MixEffect:
							if (content.type === TimelineContentTypeAtem.ME) {
								const me = AtemStateUtil.getMixEffect(deviceState, mapping.options.index)
								const atemObjKeyers = content.me.upstreamKeyers
								const transition = content.me.transition

								deepExtend(me, _.omit(content.me, 'upstreamKeyers'))
								if (this._isAssignableToNextStyle(transition)) {
									me.transitionProperties.nextStyle = transition as number as ConnectionEnums.TransitionStyle
								}
								if (atemObjKeyers) {
									for (const objKeyer of atemObjKeyers) {
										const keyer = AtemStateUtil.getUpstreamKeyer(me, objKeyer.upstreamKeyerId)
										deepExtend(keyer, objKeyer)
									}
								}
							}
							break
						case MappingAtemType.DownStreamKeyer:
							if (content.type === TimelineContentTypeAtem.DSK) {
								const dsk = AtemStateUtil.getDownstreamKeyer(deviceState, mapping.options.index)
								if (dsk) deepExtend(dsk, content.dsk)
							}
							break
						case MappingAtemType.SuperSourceBox:
							if (content.type === TimelineContentTypeAtem.SSRC) {
								const ssrc = AtemStateUtil.getSuperSource(deviceState, mapping.options.index)
								if (ssrc) {
									const objBoxes = content.ssrc.boxes
									_.each(objBoxes, (box, i) => {
										if (ssrc.boxes[i]) {
											deepExtend(ssrc.boxes[i], box)
										} else {
											ssrc.boxes[i] = {
												...StateDefault.Video.SuperSourceBox,
												...box,
											}
										}
									})
								}
							}
							break
						case MappingAtemType.SuperSourceProperties:
							if (content.type === TimelineContentTypeAtem.SSRCPROPS) {
								const ssrc = AtemStateUtil.getSuperSource(deviceState, mapping.options.index)
								if (!ssrc.properties) ssrc.properties = { ...StateDefault.Video.SuperSourceProperties }
								if (ssrc) deepExtend(ssrc.properties, content.ssrcProps)
							}
							break
						case MappingAtemType.Auxilliary:
							if (content.type === TimelineContentTypeAtem.AUX) {
								deviceState.video.auxilliaries[mapping.options.index] = content.aux.input
							}
							break
						case MappingAtemType.MediaPlayer:
							if (content.type === TimelineContentTypeAtem.MEDIAPLAYER) {
								const ms = AtemStateUtil.getMediaPlayer(deviceState, mapping.options.index)
								if (ms) deepExtend(ms, content.mediaPlayer)
							}
							break
						case MappingAtemType.AudioChannel:
							if (content.type === TimelineContentTypeAtem.AUDIOCHANNEL) {
								const chan = deviceState.audio?.channels[mapping.options.index]
								if (chan && deviceState.audio) {
									deviceState.audio.channels[mapping.options.index] = {
										...chan,
										...content.audioChannel,
									}
								}
							}
							break
					}
				}

				if (mapping.options.mappingType === MappingAtemType.MacroPlayer) {
					if (content.type === TimelineContentTypeAtem.MACROPLAYER) {
						const ms = deviceState.macro.macroPlayer
						if (ms) deepExtend(ms, content.macroPlayer)
					}
				}
			}
		})

		return deviceState
	}

	/**
	 * Check status and return it with useful messages appended.
	 */
	public getStatus(): Omit<DeviceStatus, 'active'> {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (statusCode === StatusCode.GOOD) {
			if (!this._connected) {
				statusCode = StatusCode.BAD
				messages.push(`Atem disconnected`)
			}
		}
		if (statusCode === StatusCode.GOOD) {
			const psus = this._atemStatus.psus

			psus.forEach((psu: boolean, i: number) => {
				if (!psu) {
					statusCode = StatusCode.WARNING_MAJOR
					messages.push(`Atem PSU ${i + 1} is faulty. The device has ${psus.length} PSU(s) in total.`)
				}
			})
		}
		if (!this._initialized) {
			statusCode = StatusCode.BAD
			messages.push(`ATEM device connection not initialized (restart required)`)
		}

		return {
			statusCode: statusCode,
			messages: messages,
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

		// bump out any auxes that we don't control as they may be used for CC etc.
		const noOfAuxes = Math.max(oldAtemState.video.auxilliaries.length, newAtemState.video.auxilliaries.length)
		const auxMappings = Object.values<Mapping<unknown>>(mappings)
			.filter(
				(mapping: Mapping<SomeMappingAtem>): mapping is Mapping<MappingAtemAuxilliary> =>
					mapping.options.mappingType === MappingAtemType.Auxilliary
			)
			.map((mapping) => mapping.options.index)

		for (let i = 0; i < noOfAuxes; i++) {
			if (!auxMappings.includes(i)) {
				oldAtemState.video.auxilliaries[i] = undefined
				newAtemState.video.auxilliaries[i] = undefined
			}
		}

		return AtemState.diffStates(this._protocolVersion, oldAtemState, newAtemState).map((cmd) => {
			// backwards compability, to be removed later:
			return {
				command: cmd,
				context: '',
				tlObjId: '', // @todo: implement in Atem-state
			}
		})
	}

	async sendCommand({ command, context, tlObjId }: AtemCommandWithContext): Promise<void> {
		const cwc: CommandWithContext = {
			context: context,
			command: command,
			tlObjId: tlObjId,
		}
		this.emit('debug', cwc)

		// Skip attempting send if not connected
		if (!this._connected) return

		try {
			await this._atem.sendCommand(command)
		} catch (error: any) {
			this.emit('commandError', error, cwc)
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
		this.emit('connectionChanged', this.getStatus())
	}
	private _isAssignableToNextStyle(transition: AtemTransitionStyle | undefined) {
		return (
			transition !== undefined && transition !== AtemTransitionStyle.DUMMY && transition !== AtemTransitionStyle.CUT
		)
	}
}
