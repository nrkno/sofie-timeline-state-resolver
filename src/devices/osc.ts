import * as _ from 'underscore'
import {
	DeviceWithState,
	CommandWithContext,
	DeviceStatus,
	StatusCode
} from './device'
import {
	DeviceType,
	DeviceOptions,
	OSCMessageCommandContent,
	OSCOptions,
	SomeOSCValue,
	OSCValueType
} from '../types/src'
import { DoOnTime, SendMode } from '../doOnTime'

import {
	TimelineState, ResolvedTimelineObjectInstance
} from 'superfly-timeline'
import * as osc from 'osc'
import { Easing } from '../easings'

export interface OSCMessageDeviceOptions extends DeviceOptions {
	options?: {
		commandReceiver?: (time: number, cmd) => Promise<any>,
		oscSender?: (msg: osc.OscMessage, address?: string | undefined, port?: number | undefined) => void
	}
}
interface Command {
	commandName: 'added' | 'changed' | 'removed',
	content: OSCMessageCommandContent,
	context: CommandContext
}
type CommandContext = string
/**
 * This is a generic wrapper for any osc-enabled device.
 */
export class OSCMessageDevice extends DeviceWithState<TimelineState> {

	private _doOnTime: DoOnTime
	private _oscClient: osc.UDPPort
	private tweens: { [address: string]: {
		started: number
	} & OSCMessageCommandContent } = {}
	private tweenInterval: NodeJS.Timer | undefined

	private _commandReceiver: (time: number, cmd: OSCMessageCommandContent, context: CommandContext) => Promise<any>
	private _oscSender: (msg: osc.OscMessage, address?: string | undefined, port?: number | undefined) => void

	constructor (deviceId: string, deviceOptions: OSCMessageDeviceOptions, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver

			if (deviceOptions.options.oscSender) this._oscSender = deviceOptions.options.oscSender
			else this._oscSender = this._defaultOscSender
		}
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		}, SendMode.BURST, this._deviceOptions)
		this._doOnTime.on('error', e => this.emit('error', 'OSC.doOnTime', e))
		this._doOnTime.on('slowCommand', msg => this.emit('slowCommand', this.deviceName + ': ' + msg))
	}
	init (options: OSCOptions): Promise<boolean> {
		this._oscClient = new osc.UDPPort({
			localAddress: '0.0.0.0',
			localPort: 0,

			remoteAddress: options.host,
			remotePort: options.port,
			metadata: true
		})
		this._oscClient.open()

		return Promise.resolve(true) // This device doesn't have any initialization procedure
	}
	/**
	 * Handles a new state such that the device will be in that state at a specific point
	 * in time.
	 * @param newState
	 */
	handleState (newState: TimelineState) {
		// Transform timeline states into device states
		let previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		let oldState: TimelineState = (this.getStateBefore(previousStateTime) || { state: { time: 0, layers: {}, nextEvents: [] } }).state

		let oldAbstractState = this.convertStateToOSCMessage(oldState)
		let newAbstractState = this.convertStateToOSCMessage(newState)

		// Generate commands necessary to transition to the new state
		let commandsToAchieveState: Array<any> = this._diffStates(oldAbstractState, newAbstractState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newState, newState.time)
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
		okToDestroyStuff = okToDestroyStuff
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
	convertStateToOSCMessage (state: TimelineState) {
		return state
	}
	get deviceType () {
		return DeviceType.OSC
	}
	get deviceName (): string {
		return 'OSC ' + this.deviceId
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
				if (
					cmd.commandName === 'added' ||
					cmd.commandName === 'changed'
				) {
					return this._commandReceiver(time, cmd.content, cmd.context)
				} else {
					return null
				}
			}, cmd)
		})
	}
	/**
	 * Generates commands to transition from old to new state.
	 * @param oldOscSendState The assumed current state
	 * @param newOscSendState The desired state of the device
	 */
	private _diffStates (oldOscSendState: TimelineState, newOscSendState: TimelineState): Array<Command> {
		// in this oscSend class, let's just cheat:

		let commands: Array<Command> = []

		_.each(newOscSendState.layers, (newLayer: ResolvedTimelineObjectInstance, layerKey: string) => {
			let oldLayer = oldOscSendState.layers[layerKey]
			if (!oldLayer) {
				// added!
				commands.push({
					commandName:	'added',
					content:		newLayer.content as OSCMessageCommandContent,
					context:		`added: ${newLayer.id}`
				})
			} else {
				// changed?
				if (!_.isEqual(oldLayer.content, newLayer.content)) {
					// changed!
					commands.push({
						commandName:	'changed',
						content:		newLayer.content as OSCMessageCommandContent,
						context:		`changed: ${newLayer.id}`
					})
				}
			}
		})
		// removed
		_.each(oldOscSendState.layers, (oldLayer: ResolvedTimelineObjectInstance, layerKey) => {
			let newLayer = newOscSendState.layers[layerKey]
			if (!newLayer) {
				// removed!
				commands.push({
					commandName:	'removed',
					content:		oldLayer.content as OSCMessageCommandContent,
					context:		`removed: ${oldLayer.id}`
				})
			}
		})
		return commands
	}
	private _defaultCommandReceiver (time: number, cmd: OSCMessageCommandContent, context: CommandContext): Promise<any> {
		time = time

		let cwc: CommandWithContext = {
			context: context,
			command: cmd
		}
		this.emit('debug', cwc)

		try {
			if (cmd.tween && cmd.from) {
				const easingType = Easing[cmd.tween!.type]
				const easing = (easingType || {})[cmd.tween!.direction]

				if (!easing) throw new Error(`Easing "${cmd.tween.type}.${cmd.tween.direction}" not found`)

				for (let i = 0; i < Math.max(cmd.from.length, cmd.values.length); i++) {
					if (cmd.from[i] && cmd.values[i]) {
						if (cmd.from[i].value !== cmd.values[i].value && cmd.from[i].type !== cmd.values[i].type) {
							throw new Error('Cannot interpolate between values of different types')
						}
					}
				}

				this.tweens[cmd.path] = { // push the tween
					started: time,
					...cmd
				}
				this._oscSender({ // send first parameters
					address: cmd.path,
					args: [ ...cmd.values ].map((o: SomeOSCValue, i: number) => cmd.from![i] || o)
				})

				// trigger loop:
				if (!this.tweenInterval) this.tweenInterval = setInterval(() => this.runAnimation(), 40)
			} else {
				this._oscSender({
					address: cmd.path,
					args: cmd.values
				})
			}

			return Promise.resolve()
		} catch (e) {
			return Promise.reject(e)
		}
	}
	private _defaultOscSender (msg: osc.OscMessage, address?: string | undefined, port?: number | undefined): void {
		this._oscClient.send(msg, address, port)
	}
	private runAnimation () {
		for (const addr in this.tweens) {
			// delete old tweens
			if (this.tweens[addr].started + this.tweens[addr].tween!.duration < this.getCurrentTime()) {
				delete this.tweens[addr]
			}
		}

		for (const addr in this.tweens) {
			const tween = this.tweens[addr]
			// check if easing exists:
			const easingType = Easing[tween.tween!.type]
			const easing = (easingType || {})[tween.tween!.direction]
			if (easing) {
				// scale time in range 0...1, then calculate progress in range 0..1
				const deltaTime = this.getCurrentTime() - tween.started
				const progress = deltaTime / tween.tween!.duration
				const fraction = easing(progress)
				// calculate individual values:
				const values: Array<SomeOSCValue> = []
				for (let i = 0; i < Math.max(tween.from!.length, tween.values.length); i++) {
					if (!tween.from![i]) {
						values[i] = tween.values[i]
					} else if (!tween.values[i]) {
						values[i] = tween.from![i]
					} else {
						if (tween.from![i].type === OSCValueType.FLOAT && tween.values[i].type === OSCValueType.FLOAT) {
							const oldVal = tween.from![i].value as number
							const newVal = tween.values[i].value as number
							values[i] = {
								type: OSCValueType.FLOAT,
								value: oldVal + (newVal - oldVal) * fraction
							}
						} else if (tween.from![i].type === OSCValueType.INT && tween.values[i].type === OSCValueType.INT) {
							const oldVal = tween.from![i].value as number
							const newVal = tween.values[i].value as number
							values[i] = {
								type: OSCValueType.INT,
								value: oldVal + Math.round((newVal - oldVal) * fraction)
							}
						} else {
							values[i] = tween.values[i]
						}
					}
				}

				this._oscSender({
					address: tween.path,
					args: values
				})
			}
		}

		if (Object.keys(this.tweens).length === 0) {
			clearInterval(this.tweenInterval!)
			this.tweenInterval = undefined
		}
	}
}
