import * as _ from 'underscore'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode } from './../../devices/device'
import {
	DeviceType,
	DeviceOptionsSisyfos,
	Mappings,
	SisyfosOptions,
	SomeMappingSisyfos,
	MappingSisyfosType,
	TimelineContentSisyfosAny,
	TimelineContentTypeSisyfos,
	SisyfosChannelOptions,
	MappingSisyfosChannel,
	TSRTimelineContent,
	Timeline,
	ResolvedTimelineObjectInstanceExtended,
	Mapping,
	SisyfosActions,
	ActionExecutionResultCode,
	SisyfosActionExecutionPayload,
	SisyfosActionExecutionResult,
	SetSisyfosChannelStatePayload,
	LoadMixerPresetPayload,
} from 'timeline-state-resolver-types'

import { DoOnTime, SendMode } from '../../devices/doOnTime'

import { SisyfosApi, SisyfosCommand, SisyfosState, SisyfosChannel, SisyfosCommandType } from './connection'
import Debug from 'debug'
import { startTrace, endTrace, actionNotFoundMessage, t } from '../../lib'
const debug = Debug('timeline-state-resolver:sisyfos')

export interface DeviceOptionsSisyfosInternal extends DeviceOptionsSisyfos {
	commandReceiver?: CommandReceiver
}
export type CommandReceiver = (time: number, cmd: SisyfosCommand, context: any, timelineObjId: string) => Promise<any>
interface Command extends CommandWithContext {
	command: SisyfosCommand
}

/**
 * This is a generic wrapper for any osc-enabled device.
 */
export class SisyfosMessageDevice extends DeviceWithState<SisyfosState, DeviceOptionsSisyfosInternal> {
	private _doOnTime: DoOnTime
	private _sisyfos: SisyfosApi

	private _commandReceiver: CommandReceiver = this._defaultCommandReceiver.bind(this)

	private _resyncing = false

	constructor(deviceId: string, deviceOptions: DeviceOptionsSisyfosInternal, getCurrentTime: () => Promise<number>) {
		super(deviceId, deviceOptions, getCurrentTime)
		if (deviceOptions.options) {
			if (deviceOptions.commandReceiver) this._commandReceiver = deviceOptions.commandReceiver
		}

		this._sisyfos = new SisyfosApi()
		this._sisyfos.on('error', (e) => this.emit('error', 'Sisyfos', e))
		this._sisyfos.on('connected', () => {
			this._connectionChanged()
		})
		this._sisyfos.on('disconnected', () => {
			this._connectionChanged()
		})
		this._sisyfos.on('mixerOnline', (onlineStatus) => {
			this._sisyfos.setMixerOnline(onlineStatus)
			this._connectionChanged()
		})

		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.BURST,
			this._deviceOptions
		)
		this.handleDoOnTime(this._doOnTime, 'Sisyfos')
	}
	async init(initOptions: SisyfosOptions): Promise<boolean> {
		this._sisyfos.once('initialized', () => {
			this.setState(this.getDeviceState(false), this.getCurrentTime())
			this.emit('resyncStates')
		})

		this._sisyfos
			.connect(initOptions.host, initOptions.port)
			.catch((e) => this.emit('error', 'Failed to initialise Sisyfos connection', e))

		return true
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	/**
	 * Handles a new state such that the device will be in that state at a specific point
	 * in time.
	 * @param newState
	 */
	handleState(newState: Timeline.TimelineState<TSRTimelineContent>, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		if (!this._sisyfos.state) {
			this.emit('warning', 'Sisyfos State not initialized yet')
			return
		}

		// Transform timeline states into device states
		const convertTrace = startTrace(`device:convertState`, { deviceId: this.deviceId })
		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		const oldSisyfosState: SisyfosState = (
			this.getStateBefore(previousStateTime) || { state: { channels: {}, resync: false } }
		).state
		this.emit('timeTrace', endTrace(convertTrace))

		const diffTrace = startTrace(`device:diffState`, { deviceId: this.deviceId })
		const newSisyfosState = this.convertTimelineStateToDeviceState(newState, newMappings)
		this.emit('timeTrace', endTrace(diffTrace))

		this._handleStateInner(oldSisyfosState, newSisyfosState, previousStateTime, newState.time)
	}

	private _handleStateInner(
		oldSisyfosState: SisyfosState,
		newSisyfosState: SisyfosState,
		previousStateTime: number,
		newTime: number
	) {
		// Generate commands necessary to transition to the new state
		const commandsToAchieveState: Array<Command> = this.diffStates(oldSisyfosState, newSisyfosState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newTime)

		// store the new state, for later use:
		this.setState(newSisyfosState, newTime)
	}

	/**
	 * Clear any scheduled commands after this time
	 * @param clearAfterTime
	 */
	clearFuture(clearAfterTime: number) {
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	async terminate() {
		this._doOnTime.dispose()
		this._sisyfos.dispose()
		this._sisyfos.removeAllListeners()
	}
	getStatus(): DeviceStatus {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._sisyfos.connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		}

		if (!this._sisyfos.state && !this._resyncing) {
			statusCode = StatusCode.BAD
			messages.push(`Sisyfos device connection not initialized (restart required)`)
		}

		if (!this._sisyfos.mixerOnline) {
			statusCode = StatusCode.BAD
			messages.push(`Sisyfos has no connection to Audiomixer`)
		}
		return {
			statusCode: statusCode,
			messages: messages,
			active: this.isActive,
		}
	}
	async makeReady(okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) return this._makeReadyInner(okToDestroyStuff)
	}

	private async _makeReadyInner(resync?: boolean): Promise<void> {
		if (resync) {
			this._resyncing = true
			// If state is still not reinitialised afer 5 seconds, we may have a problem.
			setTimeout(() => (this._resyncing = false), 5000)
		}

		this._doOnTime.clearQueueNowAndAfter(this.getCurrentTime())
		this._sisyfos.reInitialize()
		this._sisyfos.once('initialized', () => {
			if (resync) {
				this._resyncing = false
				const targetState = this.getState(this.getCurrentTime())

				if (targetState) {
					this._handleStateInner(this.getDeviceState(false), targetState.state, targetState.time, this.getCurrentTime())
				}
			} else {
				this.setState(this.getDeviceState(false), this.getCurrentTime())
				this.emit('resyncStates')
			}
		})

		return Promise.resolve()
	}

	async executeAction<A extends SisyfosActions>(
		actionId0: A,
		payload0: SisyfosActionExecutionPayload<A>
	): Promise<SisyfosActionExecutionResult<A>> {
		const actionId = actionId0
		switch (actionId) {
			case SisyfosActions.Reinit:
				return this._makeReadyInner()
					.then(() => ({
						result: ActionExecutionResultCode.Ok,
					}))
					.catch(() => ({
						result: ActionExecutionResultCode.Error,
					}))
			case SisyfosActions.SetSisyfosChannelState: {
				const payload = payload0 as SetSisyfosChannelStatePayload
				if (typeof payload?.channel !== 'number') {
					return {
						result: ActionExecutionResultCode.Error,
					}
				}
				this._sisyfos.setSisyfosChannel(payload.channel + 1, { ...this.getDeviceState().channels[payload.channel] })
				return {
					result: ActionExecutionResultCode.Ok,
				}
			}
			case SisyfosActions.LoadMixerPreset: {
				const payload = payload0 as LoadMixerPresetPayload
				if (!payload?.name) {
					return { result: ActionExecutionResultCode.Error, response: t('Missing name') }
				}
				return this._handleLoadMixerPreset(payload.name)
			}
			default:
				return actionNotFoundMessage(actionId)
		}
	}

	get canConnect(): boolean {
		return true
	}
	get connected(): boolean {
		return this._sisyfos.connected
	}
	getDeviceState(isDefaultState = true, mappings?: Mappings): SisyfosState {
		let deviceStateFromAPI = this._sisyfos.state
		const deviceState: SisyfosState = {
			channels: {},
			resync: false,
		}

		if (!deviceStateFromAPI) deviceStateFromAPI = deviceState

		const channels = mappings
			? Object.values<Mapping<unknown>>(mappings || {})
					.filter(
						(m): m is Mapping<MappingSisyfosChannel> =>
							(m as Mapping<SomeMappingSisyfos>).options.mappingType === MappingSisyfosType.Channel
					)
					.map((m: Mapping<MappingSisyfosChannel>) => ({
						index: m.options.channel,
						disableDefaults: m.options.disableDefaults,
					}))
			: Object.keys(deviceStateFromAPI.channels).map((index) => ({ index, disableDefaults: true }))

		for (const ch of channels) {
			const channelFromAPI = deviceStateFromAPI.channels[ch.index]

			let channel: SisyfosChannel = {
				...channelFromAPI,
				timelineObjIds: [],
			}

			if (isDefaultState) {
				// reset values for default state
				channel = {
					...channel,
					...(ch.disableDefaults ? this.getBlankStateChannel() : this.getDefaultStateChannel()),
				}
			}

			deviceState.channels[ch.index] = channel
		}
		return deviceState
	}

	/** Returns a channel with defaults */
	getDefaultStateChannel(): SisyfosChannel {
		return {
			faderLevel: 0.75, // 0 dB
			pgmOn: 0,
			pstOn: 0,
			label: '',
			visible: true,
			muteOn: false,
			inputGain: 0.75,
			inputSelector: 1,
			timelineObjIds: [],
		}
	}

	/** Returns a channel without defaults */
	getBlankStateChannel(): SisyfosChannel {
		return {
			label: '',
			timelineObjIds: [],
			// we want those undefined properties to exist
			faderLevel: undefined,
			pgmOn: undefined,
			pstOn: undefined,
			visible: undefined,
			inputGain: undefined,
			inputSelector: undefined,
			muteOn: undefined,
		}
	}
	/**
	 * Transform the timeline state into a device state, which is in this case also
	 * a timeline state.
	 * @param state
	 */
	convertTimelineStateToDeviceState(
		state: Timeline.TimelineState<TSRTimelineContent>,
		mappings: Mappings
	): SisyfosState {
		const deviceState: SisyfosState = this.getDeviceState(true, mappings)

		// Set labels to layer names
		for (const mapping of Object.values<Mapping<unknown>>(mappings)) {
			const sisyfosMapping = mapping as Mapping<SomeMappingSisyfos>

			if (sisyfosMapping.options.mappingType !== MappingSisyfosType.Channel) continue

			if (!sisyfosMapping.options.setLabelToLayerName) continue

			if (!sisyfosMapping.layerName) continue

			let channel = deviceState.channels[sisyfosMapping.options.channel] as SisyfosChannel | undefined

			if (!channel) {
				channel = sisyfosMapping.options.disableDefaults ? this.getBlankStateChannel() : this.getDefaultStateChannel()
			}

			channel.label = sisyfosMapping.layerName

			deviceState.channels[sisyfosMapping.options.channel] = channel
		}

		// Preparation: put all channels that comes from the state in an array:
		const newChannels: ({
			overridePriority: number
			channel: number
			isLookahead: boolean
			timelineObjId: string
			triggerValue?: string
			disableDefaults?: boolean
		} & SisyfosChannelOptions)[] = []

		_.each(state.layers, (tlObject, layerName) => {
			const layer = tlObject as ResolvedTimelineObjectInstanceExtended<any>
			let foundMapping = mappings[layerName] as Mapping<SomeMappingSisyfos> | undefined

			const content = tlObject.content as TimelineContentSisyfosAny

			// Allow resync without valid channel mapping
			if ('resync' in content && content.resync !== undefined) {
				deviceState.resync = deviceState.resync || content.resync
			}

			// Allow global retrigger without valid channel mapping
			if (
				'triggerValue' in content &&
				content.triggerValue !== undefined &&
				content.type === TimelineContentTypeSisyfos.TRIGGERVALUE
			) {
				deviceState.triggerValue = content.triggerValue
			}

			// if the tlObj is specifies to load to PST the original Layer is used to resolve the mapping
			if (!foundMapping && layer.isLookahead && layer.lookaheadForLayer) {
				foundMapping = mappings[layer.lookaheadForLayer] as Mapping<SomeMappingSisyfos> | undefined
			}

			if (foundMapping?.deviceId !== this.deviceId) return

			// @ts-ignore backwards-compatibility:
			if (!foundMapping.mappingType) foundMapping.mappingType = MappingSisyfosType.CHANNEL
			// @ts-ignore backwards-compatibility:
			if (content.type === 'sisyfos') content.type = TimelineContentTypeSisyfos.CHANNEL

			debug(
				`Mapping ${foundMapping.layerName}: ${foundMapping.options.mappingType}, ${
					(foundMapping.options as any).channel || (foundMapping.options as any).label
				}`
			)

			if (
				foundMapping.options.mappingType === MappingSisyfosType.Channel &&
				content.type === TimelineContentTypeSisyfos.CHANNEL
			) {
				newChannels.push({
					...content,
					channel: foundMapping.options.channel,
					overridePriority: content.overridePriority || 0,
					isLookahead: layer.isLookahead || false,
					timelineObjId: layer.id,
					triggerValue: content.triggerValue,
					disableDefaults: foundMapping.options.disableDefaults,
				})
				deviceState.resync = deviceState.resync || content.resync || false
			} else if (
				foundMapping.options.mappingType === MappingSisyfosType.ChannelByLabel &&
				content.type === TimelineContentTypeSisyfos.CHANNEL
			) {
				const ch = this._sisyfos.getChannelByLabel(foundMapping.options.label)
				debug(`Channel by label ${foundMapping.options.label}(${ch}): ${content.isPgm}`)
				if (ch === undefined) return

				newChannels.push({
					...content,
					channel: ch,
					overridePriority: content.overridePriority || 0,
					isLookahead: layer.isLookahead || false,
					timelineObjId: layer.id,
					triggerValue: content.triggerValue,
					disableDefaults: foundMapping.options.disableDefaults,
				})
				deviceState.resync = deviceState.resync || content.resync || false
			} else if (
				foundMapping.options.mappingType === MappingSisyfosType.Channels &&
				content.type === TimelineContentTypeSisyfos.CHANNELS
			) {
				for (const channel of content.channels) {
					const referencedMapping = mappings[channel.mappedLayer] as Mapping<SomeMappingSisyfos> | undefined
					if (!referencedMapping) continue

					let channelNumber: number | undefined
					if (referencedMapping.options.mappingType === MappingSisyfosType.Channel) {
						channelNumber = referencedMapping.options.channel
					} else if (referencedMapping.options.mappingType === MappingSisyfosType.ChannelByLabel) {
						channelNumber = this._sisyfos.getChannelByLabel(referencedMapping.options.label)
						debug(`Channel by label ${referencedMapping.options.label}(${channelNumber}): ${channel.isPgm}`)
					}

					if (channelNumber === undefined) continue

					newChannels.push({
						...channel,
						channel: channelNumber,
						overridePriority: content.overridePriority || 0,
						isLookahead: layer.isLookahead || false,
						timelineObjId: layer.id,
						triggerValue: content.triggerValue,
						disableDefaults: foundMapping.options.disableDefaults,
					})
				}
				deviceState.resync = deviceState.resync || content.resync || false
			}
		})

		// Sort by overridePriority, so that those with highest overridePriority will be applied last
		_.each(
			_.sortBy(newChannels, (channel) => channel.overridePriority),
			(newChannel) => {
				if (!deviceState.channels[newChannel.channel]) {
					deviceState.channels[newChannel.channel] = newChannel.disableDefaults
						? this.getBlankStateChannel()
						: this.getDefaultStateChannel()
				}
				const channel = deviceState.channels[newChannel.channel]

				if (newChannel.isPgm !== undefined) {
					if (newChannel.isLookahead) {
						channel.pstOn = newChannel.isPgm || 0
					} else {
						channel.pgmOn = newChannel.isPgm || 0
					}
				}

				if (newChannel.faderLevel !== undefined) channel.faderLevel = newChannel.faderLevel
				if (newChannel.label !== undefined && newChannel.label !== '') channel.label = newChannel.label
				if (newChannel.visible !== undefined) channel.visible = newChannel.visible
				if (newChannel.fadeTime !== undefined) channel.fadeTime = newChannel.fadeTime
				if (newChannel.muteOn !== undefined) channel.muteOn = newChannel.muteOn
				if (newChannel.inputGain !== undefined) channel.inputGain = newChannel.inputGain
				if (newChannel.inputSelector !== undefined) channel.inputSelector = newChannel.inputSelector
				if (newChannel.triggerValue !== undefined) channel.triggerValue = newChannel.triggerValue

				channel.timelineObjIds.push(newChannel.timelineObjId)
			}
		)
		return deviceState
	}
	get deviceType() {
		return DeviceType.SISYFOS
	}
	get deviceName(): string {
		return 'Sisyfos ' + this.deviceId
	}
	get queue() {
		return this._doOnTime.getQueue()
	}
	/**
	 * add the new commands to the queue:
	 * @param commandsToAchieveState
	 * @param time
	 */
	private _addToQueue(commandsToAchieveState: Array<Command>, time: number) {
		_.each(commandsToAchieveState, (cmd: Command) => {
			this._doOnTime.queue(
				time,
				undefined,
				async (cmd: Command) => {
					return this._commandReceiver(time, cmd.command, cmd.context, cmd.timelineObjId)
				},
				cmd
			)
		})
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 */
	diffStates(oldOscSendState: SisyfosState | undefined, newOscSendState: SisyfosState): Command[] {
		const commands: Command[] = []

		if (newOscSendState.resync && !oldOscSendState?.resync) {
			commands.push({
				context: `Resyncing with Sisyfos`,
				command: {
					type: SisyfosCommandType.RESYNC,
				},
				timelineObjId: '',
			})
		}

		_.each(newOscSendState.channels, (newChannel: SisyfosChannel, index) => {
			const oldChannel: SisyfosChannel | undefined = oldOscSendState?.channels[index]

			if (newOscSendState.triggerValue && newOscSendState.triggerValue !== oldOscSendState?.triggerValue) {
				// || (!oldChannel && Number(index) >= 0)) {
				// push commands for everything
				debug('reset channel ' + index)
				commands.push({
					context: `Channel ${index} reset`,
					command: {
						type: SisyfosCommandType.SET_CHANNEL,
						channel: Number(index),
						values: newChannel,
					},
					timelineObjId: newChannel.timelineObjIds[0] || '',
				})
				return
			}

			if (newChannel.triggerValue && oldChannel?.triggerValue !== newChannel.triggerValue) {
				// note - should we only do this if we have an oldchannel?
				debug('reset channel ' + index)
				commands.push({
					context: `Channel ${index} reset`,
					command: {
						type: SisyfosCommandType.SET_CHANNEL,
						channel: Number(index),
						values: newChannel,
					},
					timelineObjId: newChannel.timelineObjIds[0] || '',
				})
				return
			}

			if (!oldChannel) return

			if (oldChannel.pgmOn !== newChannel.pgmOn && newChannel.pgmOn !== undefined) {
				debug(`Channel ${index} pgm goes from "${oldChannel.pgmOn}" to "${newChannel.pgmOn}"`)
				const values: number[] = [newChannel.pgmOn]
				if (newChannel.fadeTime) {
					values.push(newChannel.fadeTime)
				}
				commands.push({
					context: `Channel ${index} pgm goes from "${oldChannel.pgmOn}" to "${newChannel.pgmOn}"`,
					command: {
						type: SisyfosCommandType.TOGGLE_PGM,
						channel: Number(index),
						values,
					},
					timelineObjId: newChannel.timelineObjIds[0] || '',
				})
			}

			if (oldChannel.pstOn !== newChannel.pstOn && newChannel.pstOn !== undefined) {
				debug(`Channel ${index} pst goes from "${oldChannel.pstOn}" to "${newChannel.pstOn}"`)
				commands.push({
					context: `Channel ${index} pst goes from "${oldChannel.pstOn}" to "${newChannel.pstOn}"`,
					command: {
						type: SisyfosCommandType.TOGGLE_PST,
						channel: Number(index),
						value: newChannel.pstOn,
					},
					timelineObjId: newChannel.timelineObjIds[0] || '',
				})
			}

			if (oldChannel.faderLevel !== newChannel.faderLevel && newChannel.faderLevel !== undefined) {
				debug(`change faderLevel ${index}: "${newChannel.faderLevel}"`)
				const values: number[] = [newChannel.faderLevel]
				if (newChannel.fadeTime) {
					values.push(newChannel.fadeTime)
				}
				commands.push({
					context: 'faderLevel change',
					command: {
						type: SisyfosCommandType.SET_FADER,
						channel: Number(index),
						values,
					},
					timelineObjId: newChannel.timelineObjIds[0] || '',
				})
			}

			newChannel.label = newChannel.label || oldChannel.label
			if (newChannel.label !== '' && oldChannel.label !== newChannel.label) {
				debug(`set label on fader ${index}: "${newChannel.label}"`)
				commands.push({
					context: 'set label on fader',
					command: {
						type: SisyfosCommandType.LABEL,
						channel: Number(index),
						value: newChannel.label,
					},
					timelineObjId: newChannel.timelineObjIds[0] || '',
				})
			}

			if (oldChannel.visible !== newChannel.visible && newChannel.visible !== undefined) {
				debug(`Channel ${index} Visibility goes from "${oldChannel.visible}" to "${newChannel.visible}"`)
				commands.push({
					context: `Channel ${index} Visibility goes from "${oldChannel.visible}" to "${newChannel.visible}"`,
					command: {
						type: SisyfosCommandType.VISIBLE,
						channel: Number(index),
						value: newChannel.visible,
					},
					timelineObjId: newChannel.timelineObjIds[0] || '',
				})
			}

			if (oldChannel.muteOn !== newChannel.muteOn && newChannel.muteOn !== undefined) {
				debug(`Channel ${index} mute goes from "${oldChannel.muteOn}" to "${newChannel.muteOn}"`)
				commands.push({
					context: `Channel ${index} mute goes from "${oldChannel.muteOn}" to "${newChannel.muteOn}"`,
					command: {
						type: SisyfosCommandType.SET_MUTE,
						channel: Number(index),
						value: newChannel.muteOn,
					},
					timelineObjId: newChannel.timelineObjIds[0] || '',
				})
			}

			if (oldChannel.inputGain !== newChannel.inputGain && newChannel.inputGain !== undefined) {
				debug(`Channel ${index} inputGain goes from "${oldChannel.inputGain}" to "${newChannel.inputGain}"`)
				commands.push({
					context: `Channel ${index} inputGain goes from "${oldChannel.inputGain}" to "${newChannel.inputGain}"`,
					command: {
						type: SisyfosCommandType.SET_INPUT_GAIN,
						channel: Number(index),
						value: newChannel.inputGain,
					},
					timelineObjId: newChannel.timelineObjIds[0] || '',
				})
			}

			if (oldChannel.inputSelector !== newChannel.inputSelector && newChannel.inputSelector !== undefined) {
				debug(`Channel ${index} inputSelector goes from "${oldChannel.inputSelector}" to "${newChannel.inputSelector}"`)
				commands.push({
					context: `Channel ${index} inputSelector goes from "${oldChannel.inputSelector}" to "${newChannel.inputSelector}"`,
					command: {
						type: SisyfosCommandType.SET_INPUT_SELECTOR,
						channel: Number(index),
						value: newChannel.inputSelector,
					},
					timelineObjId: newChannel.timelineObjIds[0] || '',
				})
			}
		})

		return commands
	}
	private async _defaultCommandReceiver(
		_time: number,
		cmd: SisyfosCommand,
		context: string,
		timelineObjId: string
	): Promise<any> {
		const cwc: CommandWithContext = {
			context,
			command: cmd,
			timelineObjId,
		}
		this.emitDebug(cwc)

		if (cmd.type === SisyfosCommandType.RESYNC) {
			return this._makeReadyInner(true)
		} else {
			try {
				this._sisyfos.send(cmd)

				return Promise.resolve()
			} catch (e) {
				return Promise.reject(e)
			}
		}
	}
	private _connectionChanged() {
		this.emit('connectionChanged', this.getStatus())
	}

	private _handleLoadMixerPreset(presetName: string) {
		if (!this._sisyfos.connected || !this._sisyfos.mixerOnline)
			return {
				result: ActionExecutionResultCode.Error,
			}
		this._sisyfos.send({
			type: SisyfosCommandType.LOAD_MIXER_PRESET,
			presetName,
		})
		return {
			result: ActionExecutionResultCode.Ok,
		}
	}
}
