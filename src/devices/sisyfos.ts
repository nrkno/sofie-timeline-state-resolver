import * as _ from 'underscore'
import {
	DeviceWithState,
	CommandWithContext,
	DeviceStatus,
	StatusCode
} from './device'
import {
	DeviceType,
	DeviceOptions
} from '../types/src'
import { DoOnTime, SendMode } from '../doOnTime'

import {
	TimelineState, ResolvedTimelineObjectInstance
} from 'superfly-timeline'
import { SisfyosOptions, SisyfosState, SisyfosChannel, TimelineObjSisyfosMessage, MappingSisyfos, ToggleCommand, Commands, SisyfosCommand } from '../types/src/sisyfos'
import { SisyfosInterface } from './sisyfosAPI'

export interface SisyfosDeviceOptions extends DeviceOptions {
	options?: {
		commandReceiver?: (time: number, cmd) => Promise<any>
	}
}
interface Command {
	content: SisyfosCommand
	context: CommandContext
}
type CommandContext = string
/**
 * This is a generic wrapper for any osc-enabled device.
 */
export class SisyfosMessageDevice extends DeviceWithState<SisyfosState> {

	private _doOnTime: DoOnTime
	private _sisyfos: SisyfosInterface

	private _commandReceiver: (time: number, cmd: SisyfosCommand, context: CommandContext) => Promise<any>

	constructor (deviceId: string, deviceOptions: SisyfosDeviceOptions, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		}, SendMode.BURST, this._deviceOptions)
		this._doOnTime.on('error', e => this.emit('error', 'OSC.doOnTime', e))
		this._doOnTime.on('slowCommand', msg => this.emit('slowCommand', this.deviceName + ': ' + msg))
	}
	init (options: SisfyosOptions): Promise<boolean> {
		this._sisyfos = new SisyfosInterface()
		this._sisyfos.once('initialized', () => {
			this.setState(this._sisyfos.state, this.getCurrentTime())
			this.emit('resetResolver')
		})

		return new Promise((resolve) => {
			this._sisyfos.connect(options.host, options.port)
			.then(() => resolve(true), () => resolve(false))
		})
	}
	/**
	 * Handles a new state such that the device will be in that state at a specific point
	 * in time.
	 * @param newState
	 */
	handleState (newState: TimelineState) {
		if (!this._sisyfos.state) return // no me gusta

		// Transform timeline states into device states
		let previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		let oldState: SisyfosState = (this.getStateBefore(previousStateTime) || { state: { groups: {}, channels: {} } }).state

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
		// Good, since this device has no status, really
		return {
			statusCode: StatusCode.GOOD
		}
	}
	makeReady (okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			this._doOnTime.clearQueueNowAndAfter(this.getCurrentTime())
			this.setState(this._sisyfos.state, this.getCurrentTime())
		}
		return Promise.resolve()
	}

	get canConnect (): boolean {
		return false
	}
	get connected (): boolean {
		return false
	}
	/**
	 * Transform the timeline state into a device state, which is in this case also
	 * a timeline state.
	 * @param state
	 */
	convertStateToSisyfosState (state: TimelineState) {
		const deviceState: SisyfosState = JSON.parse(JSON.stringify(this._sisyfos.state))

		for (const ch of Object.keys(deviceState.channels)) {
			const channel: SisyfosChannel = deviceState.channels[ch]

			channel.faderLevel = 0.75 // 0 dB
			channel.pgmOn = false
			channel.pstOn = false
		}

		_.each(state.layers, (tlObject, layerName) => {
			const layer = tlObject as ResolvedTimelineObjectInstance & TimelineObjSisyfosMessage
			let foundMapping: MappingSisyfos = this.getMapping()[layerName] as any // @todo: make ts understand this

			// if the tlObj is specifies to load to PST the original Layer is used to resolve the mapping
			if (!foundMapping && layer.isLookahead && layer.lookaheadForLayer) {
				foundMapping = this.getMapping()[layer.lookaheadForLayer] as any
			}

			if (foundMapping) {
				const channel = deviceState.channels[foundMapping.channel]

				if (layer.content.select) {
					if (layer.content.isPst || layer.isLookahead) {
						channel.pstOn = true
					} else {
						channel.pgmOn = true
					}
				}
				if (layer.content.faderLevel !== undefined) {
					channel.faderLevel = layer.content.faderLevel
				}
				// for context, set tl obj id:
				if (channel.tlObjId) {
					channel.tlObjId += ' & ' + tlObject.id
				} else {
					channel.tlObjId = tlObject.id
				}
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
				return this._commandReceiver(time, cmd.content, cmd.context)
			}, cmd)
		})
	}
	/**
	 * Generates commands to transition from old to new state.
	 * @param oldOscSendState The assumed current state
	 * @param newOscSendState The desired state of the device
	 */
	private _diffStates (oldOscSendState: SisyfosState, newOscSendState: SisyfosState): Array<Command> {
		/**
		 * States:
		 * 		PGM	PST
		 * A	0	0
		 * B	0	1
		 * C	1	0
		 * D	1	1
		 *
		 * Transitions:
		 * From:	To:		Actions:
		 * A		A		None
		 * A		B		(take), PST on
		 * A		C		PST on, take
		 * A		D		PST on, take, PST on
		 * B		A		PST off
		 * B		B		(pst off, take, pst on)
		 * B		C		take
		 * B		D		take, pst on
		 * C		A		take, pst off
		 * C		B		take
		 * C		C		(pst on, take, pst on)
		 * C		D		pst on
		 * D		A		pst off, take, pst off
		 * D		B		pst off, take
		 * D		C		(take), pst off
		 * D		D		none
		 *
		 * Things in brackets are done only when some other channel requires a
		 * take operation.
		 */

		const commandGenerator = {
			pstOn: (channel: string): ToggleCommand => {
				return {
					type: Commands.TOGGLE_PST,
					channel: Number(channel),
					value: true
				}
			},
			pstOff: (channel: string): ToggleCommand => {
				return {
					type: Commands.TOGGLE_PST,
					channel: Number(channel),
					value: false
				}
			}
		}
		const stateTransition = { // stateTransition[from][to] = [ preTake, take, postTake ]
			// 0: no, 1: take => on, 2: on, 3: take => off, 4: off (where => means implies)
			A: {
				A: [ 0, 0, 0 ],
				B: [ 0, 0, 2 ],
				C: [ 2, 2, 0 ],
				D: [ 2, 2, 2 ]
			},
			B: {
				A: [ 4, 0, 0 ],
				B: [ 3, 0, 1 ],
				C: [ 0, 2, 0 ],
				D: [ 0, 2, 2 ]
			},
			C: {
				A: [ 0, 2, 4 ],
				B: [ 0, 2, 0 ],
				C: [ 1, 0, 3 ],
				D: [ 2, 0, 0 ]
			},
			D: {
				A: [ 4, 2, 4 ],
				B: [ 4, 2, 0 ],
				C: [ 0, 0, 4 ],
				D: [ 0, 0, 0 ]
			}
		}
		const stateIdentifier = [
			[ 'A', 'B' ],
			[ 'C', 'D' ]
		]
		const transitions: Array<{ index: string, from: string, to: string, context: string }> = []
		let requireTake = false

		const commands: Array<Command> = []

		_.each(newOscSendState.channels, (newChannel, index) => {
			const oldChannel = oldOscSendState.channels[index]

			const oldState = oldChannel ? stateIdentifier[oldChannel.pgmOn ? 1 : 0][oldChannel.pstOn ? 1 : 0] : 'A'
			const newState = stateIdentifier[newChannel.pgmOn ? 1 : 0][newChannel.pstOn ? 1 : 0]

			transitions.push({
				index,
				from: oldState,
				to: newState,
				context: `Channel ${index} goes from "${oldState}" to "${newState}"` +
					newChannel.tlObjId ? ` by tlObj: ${newChannel.tlObjId}` : ''
			})

			if (stateTransition[oldState][newState][1]) {
				requireTake = true
			}

			if (oldChannel && oldChannel.faderLevel !== newChannel.faderLevel) {
				commands.push({
					context: 'faderLevel change',
					content: {
						type: Commands.SET_FADER,
						channel: Number(index),
						value: newChannel.faderLevel
					}
				})
			}
		})

		if (requireTake) {
			commands.push({
				content: { type: Commands.TAKE },
				context: `generic`
			})
		}

		for (const transition of transitions) {
			const transitionRule = stateTransition[transition.from][transition.to]

			if (transitionRule[0] !== 0) {
				if (transitionRule[0] % 2 === 0) { // always
					if (transitionRule[0] === 2) {
						commands.unshift({
							content: commandGenerator.pstOn(transition.index),
							context: transition.context
						})
					} else {
						commands.unshift({
							content: commandGenerator.pstOff(transition.index),
							context: transition.context
						})
					}
				} else if (requireTake) { // only on take
					if (transitionRule[0] === 1) {
						commands.unshift({
							content: commandGenerator.pstOn(transition.index),
							context: transition.context
						})
					} else {
						commands.unshift({
							content: commandGenerator.pstOff(transition.index),
							context: transition.context
						})
					}
				}
			}
			if (transitionRule[2] !== 0) {
				if (transitionRule[2] % 2 === 0) { // always
					if (transitionRule[2] === 2) {
						commands.push({
							content: commandGenerator.pstOn(transition.index),
							context: transition.context
						})
					} else {
						commands.push({
							content: commandGenerator.pstOff(transition.index),
							context: transition.context
						})
					}
				} else if (requireTake) { // only on take
					if (transitionRule[2] === 1) {
						commands.push({
							content: commandGenerator.pstOn(transition.index),
							context: transition.context
						})
					} else {
						commands.push({
							content: commandGenerator.pstOff(transition.index),
							context: transition.context
						})
					}
				}
			}
		}

		return commands
	}
	private _defaultCommandReceiver (time: number, cmd: SisyfosCommand, context: CommandContext): Promise<any> {
		time = time

		let cwc: CommandWithContext = {
			context: context,
			command: cmd
		}
		this.emit('debug', cwc)

		try {
			this._sisyfos.send(cmd)

			return Promise.resolve()
		} catch (e) {
			return Promise.reject(e)
		}
	}
}
