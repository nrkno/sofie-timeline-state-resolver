import * as _ from 'underscore'
import {
	DeviceWithState,
	CommandWithContext,
	DeviceStatus,
	StatusCode,
	IDevice
} from './device'
import {
	DeviceType,
	DeviceOptionsSisyfos
} from '../types/src'
import { DoOnTime, SendMode } from '../doOnTime'

import {
	TimelineState, ResolvedTimelineObjectInstance
} from 'superfly-timeline'
import { SisyfosOptions, SisyfosState, SisyfosChannel, TimelineObjSisyfosMessage, MappingSisyfos, Commands, SisyfosCommand } from '../types/src/sisyfos'
import { SisyfosInterface } from './sisyfosAPI'

export interface DeviceOptionsSisyfosInternal extends DeviceOptionsSisyfos {
	options: (
		DeviceOptionsSisyfos['options'] &
		{ commandReceiver?: CommandReceiver }
	)
}
export type CommandReceiver = (time: number, cmd: SisyfosCommand, context: CommandContext, timelineObjId: string) => Promise<any>
interface Command {
	content: SisyfosCommand
	context: CommandContext
	timelineObjId: string
}
type CommandContext = string
/**
 * This is a generic wrapper for any osc-enabled device.
 */
export class SisyfosMessageDevice extends DeviceWithState<SisyfosState> implements IDevice {

	private _doOnTime: DoOnTime
	private _sisyfos: SisyfosInterface

	private _commandReceiver: CommandReceiver

	constructor (deviceId: string, deviceOptions: DeviceOptionsSisyfosInternal, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}

		this._sisyfos = new SisyfosInterface()
		this._sisyfos.on('error', e => this.emit('error', 'Sisyfos', e))
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

		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		}, SendMode.BURST, this._deviceOptions)
		this.handleDoOnTime(this._doOnTime, 'Sisyfos')
	}
	init (initOptions: SisyfosOptions): Promise<boolean> {

		this._sisyfos.once('initialized', () => {
			this.setState(this.getDeviceState(), this.getCurrentTime())
			this.emit('resetResolver')
		})

		return this._sisyfos.connect(initOptions.host, initOptions.port)
			.then(() => true)
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState (newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	/**
	 * Handles a new state such that the device will be in that state at a specific point
	 * in time.
	 * @param newState
	 */
	handleState (newState: TimelineState) {
		if (!this._sisyfos.state) {
			this.emit('warning', 'Sisyfos State not initialized yet')
			return
		}

		// Transform timeline states into device states
		let previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		let oldState: SisyfosState = (this.getStateBefore(previousStateTime) || { state: { channels: {} } }).state

		let newAbstractState = this.convertStateToSisyfosState(newState)

		// Generate commands necessary to transition to the new state
		let commandsToAchieveState: Array<Command> = this._diffStates(oldState, newAbstractState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newAbstractState, newState.time)
	}
	/**
	 * Clear any scheduled commands after this time
	 * @param clearAfterTime
	 */
	clearFuture (clearAfterTime: number) {
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	terminate () {
		this._doOnTime.dispose()
		return Promise.resolve(true)
	}
	getStatus (): DeviceStatus {
		let statusCode = StatusCode.GOOD
		let messages: Array<string> = []

		if (!this._sisyfos.connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		}

		if (!this._sisyfos.state) {
			statusCode = StatusCode.BAD
			messages.push(`Sisyfos device connection not initialized (restart required)`)
		}

		if (!this._sisyfos.mixerOnline) {
			statusCode = StatusCode.BAD
			messages.push(`Sisyfos has no connection to Audiomixer`)
		}
		return {
			statusCode: statusCode,
			messages: messages
		}
	}
	makeReady (okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			this._doOnTime.clearQueueNowAndAfter(this.getCurrentTime())
			this.setState(this.getDeviceState(), this.getCurrentTime())
		}
		return Promise.resolve()
	}

	get canConnect (): boolean {
		return true
	}
	get connected (): boolean {
		return this._sisyfos.connected
	}
	getDeviceState (): SisyfosState {
		const deviceStateFromAPI = this._sisyfos.state
		const deviceState: SisyfosState = { channels: {} }

		for (const ch of Object.keys(deviceStateFromAPI.channels)) {

			const channelFromAPI = deviceStateFromAPI.channels[ch]

			const channel: SisyfosChannel = {
				...channelFromAPI,
				faderLevel: 0.75,  // 0 dB
				pgmOn: 0,
				pstOn: 0,
				label: '',
				visible: true,
				tlObjIds: []
			}

			deviceState.channels[ch] = channel
		}
		return deviceState
	}
	/**
	 * Transform the timeline state into a device state, which is in this case also
	 * a timeline state.
	 * @param state
	 */
	convertStateToSisyfosState (state: TimelineState) {
		const deviceState: SisyfosState = this.getDeviceState()

		_.each(state.layers, (tlObject, layerName) => {
			const layer = tlObject as ResolvedTimelineObjectInstance & TimelineObjSisyfosMessage
			let foundMapping: MappingSisyfos = this.getMapping()[layerName] as any // @todo: make ts understand this

			// if the tlObj is specifies to load to PST the original Layer is used to resolve the mapping
			if (!foundMapping && layer.isLookahead && layer.lookaheadForLayer) {
				foundMapping = this.getMapping()[layer.lookaheadForLayer] as any
			}
			if (foundMapping && _.has(foundMapping, 'channel') && deviceState.channels[foundMapping.channel]) {

				if (layer.isLookahead) {
					deviceState.channels[foundMapping.channel].pstOn = layer.content.isPgm || 0
				} else {
					deviceState.channels[foundMapping.channel].pgmOn = layer.content.isPgm || 0
				}

				if (layer.content.faderLevel !== undefined) {
					deviceState.channels[foundMapping.channel].faderLevel = layer.content.faderLevel
				}

				if (layer.content.fadeToBlack !== undefined) {
					deviceState.channels[foundMapping.channel].fadeToBlack = layer.content.fadeToBlack
				}

				if (layer.content.label !== undefined) {
					deviceState.channels[foundMapping.channel].label = layer.content.label
				}

				if (layer.content.visible !== undefined) {
					deviceState.channels[foundMapping.channel].visible = layer.content.visible
				}

				deviceState.channels[foundMapping.channel].tlObjIds.push(tlObject.id)
			}
		})
		return deviceState
	}
	get deviceType () {
		return DeviceType.SISYFOS
	}
	get deviceName (): string {
		return 'Sisyfos ' + this.deviceId
	}
	get queue () {
		return this._doOnTime.getQueue()
	}
	/**
	 * add the new commands to the queue:
	 * @param commandsToAchieveState
	 * @param time
	 */
	private _addToQueue (commandsToAchieveState: Array<Command>, time: number) {
		_.each(commandsToAchieveState, (cmd: Command) => {
			this._doOnTime.queue(time, undefined, (cmd: Command) => {
				return this._commandReceiver(time, cmd.content, cmd.context, cmd.timelineObjId)
			}, cmd)
		})
	}
	/**
	 * Generates commands to transition from old to new state.
	 * @param oldOscSendState The assumed current state
	 * @param newOscSendState The desired state of the device
	 */
	private _diffStates (oldOscSendState: SisyfosState, newOscSendState: SisyfosState): Array<Command> {

		const commands: Array<Command> = []

		_.each(newOscSendState.channels, (newChannel: SisyfosChannel, index) => {
			const oldChannel = oldOscSendState.channels[index]

			if (oldChannel && oldChannel.pgmOn !== newChannel.pgmOn) {
				commands.push({
					context: `Channel ${index} goes from "${oldChannel.pgmOn}" to "${newChannel.pgmOn}"`,
					content: {
						type: Commands.TOGGLE_PGM,
						channel: Number(index),
						value: newChannel.pgmOn
					},
					timelineObjId: newChannel.tlObjIds[0] || ''
				})
			}

			if (oldChannel && oldChannel.pstOn !== newChannel.pstOn) {
				commands.push({
					context: `Channel ${index} goes from "${oldChannel.pgmOn}" to "${newChannel.pgmOn}"`,
					content: {
						type: Commands.TOGGLE_PST,
						channel: Number(index),
						value: newChannel.pstOn
					},
					timelineObjId: newChannel.tlObjIds[0] || ''
				})
			}

			if (oldChannel && oldChannel.faderLevel !== newChannel.faderLevel) {
				commands.push({
					context: 'faderLevel change',
					content: {
						type: Commands.SET_FADER,
						channel: Number(index),
						value: newChannel.faderLevel
					},
					timelineObjId: newChannel.tlObjIds[0] || ''
				})
			}

			if (oldChannel && oldChannel.fadeToBlack !== newChannel.fadeToBlack) {
				commands.push({
					context: 'fade all pgm to black',
					content: {
						type: Commands.FADE_TO_BLACK,
						channel: 0,
						value: newChannel.fadeToBlack
					},
					timelineObjId: newChannel.tlObjIds[0] || ''
				})
			}

			if (newChannel.label !== '' && oldChannel.label !== newChannel.label) {
				commands.push({
					context: 'set label on fader',
					content: {
						type: Commands.LABEL,
						channel: Number(index),
						value: newChannel.label
					},
					timelineObjId: newChannel.tlObjIds[0] || ''
				})
			}

			if (oldChannel && oldChannel.visible !== newChannel.visible) {
				commands.push({
					context: `Channel ${index} Visibility goes from "${oldChannel.visible}" to "${newChannel.visible}"`,
					content: {
						type: Commands.VISIBLE,
						channel: Number(index),
						value: newChannel.visible
					},
					timelineObjId: newChannel.tlObjIds[0] || ''
				})
			}
		})

		return commands
	}
	private _defaultCommandReceiver (_time: number, cmd: SisyfosCommand, context: CommandContext, timelineObjId: string): Promise<any> {

		let cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId
		}
		this.emit('debug', cwc)

		try {
			this._sisyfos.send(cmd)

			return Promise.resolve()
		} catch (e) {
			return Promise.reject(e)
		}
	}
	private _connectionChanged () {
		this.emit('connectionChanged', this.getStatus())
	}
}
