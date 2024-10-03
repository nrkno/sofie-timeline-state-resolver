import {
	ActionExecutionResult,
	DeviceStatus,
	DeviceType,
	OSCDeviceType,
	OSCMessageCommandContent,
	OSCOptions,
	OSCValueType,
	SomeOSCValue,
	StatusCode,
	Timeline,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { CommandWithContext, Device } from '../../service/device'
import * as osc from 'osc'

import Debug from 'debug'
import _ = require('underscore')
import { Easing } from '../../devices/transitions/easings'
import { assertNever } from '../../lib'
const debug = Debug('timeline-state-resolver:osc')

export interface OscDeviceState {
	[address: string]: OSCDeviceStateContent
}
interface OSCDeviceStateContent extends OSCMessageCommandContent {
	fromTlObject: string
}

export interface OscCommandWithContext extends CommandWithContext {
	command: OSCDeviceStateContent
}

export class OscDevice extends Device<OSCOptions, OscDeviceState, OscCommandWithContext> {
	/** Setup in init */
	private _oscClient!: osc.UDPPort | osc.TCPSocketPort
	private _oscClientStatus: 'connected' | 'disconnected' = 'disconnected'
	private transitions: {
		[address: string]: {
			started: number
		} & OSCMessageCommandContent
	} = {}
	private transitionInterval: NodeJS.Timer | undefined
	private options: OSCOptions | undefined

	async init(options: OSCOptions): Promise<boolean> {
		this.options = options
		if (options.type === OSCDeviceType.TCP) {
			debug('Creating TCP OSC device')
			const client = new osc.TCPSocketPort({
				address: options.host,
				port: options.port,
				metadata: true,
			})
			this._oscClient = client
			client.open() // creates client.socket
			let firstConnect = true
			client.socket.on('connect', () => {
				this._oscClientStatus = 'connected'
				if (firstConnect) {
					// note - perhaps we could resend the commands every time we reconnect? or that could be a device option
					firstConnect = false
					this.context.connectionChanged(this.getStatus())
					this.context
						.resetToState({})
						.catch((e) =>
							this.context.logger.warning(
								'Failed to reset to state after first connection, device may be in unknown state (reason: ' + e + ')'
							)
						)
				}
			})
			client.socket.on('close', () => {
				this._oscClientStatus = 'disconnected'
				this.context.connectionChanged(this.getStatus())
			})
		} else if (options.type === OSCDeviceType.UDP) {
			debug('Creating UDP OSC device')
			this._oscClient = new osc.UDPPort({
				localAddress: '0.0.0.0',
				localPort: 0,

				remoteAddress: options.host,
				remotePort: options.port,
				metadata: true,
			})
			this._oscClient.once('ready', () => {
				this.context
					.resetToState({})
					.catch((e) =>
						this.context.logger.warning(
							'Failed to reset to state after first connection, device may be in unknown state (reason: ' + e + ')'
						)
					)
			})
			this._oscClient.open()
		} else {
			assertNever(options.type)
			throw new Error(`Unknown device transport type: ${options.type}`)
		}

		return Promise.resolve(true) // This device doesn't have any initialization procedure
	}
	async terminate(): Promise<void> {
		this._oscClient.close()
		this._oscClient.removeAllListeners()
	}

	convertTimelineStateToDeviceState(state: Timeline.TimelineState<TSRTimelineContent>): OscDeviceState {
		const addrToOSCMessage: OscDeviceState = {}
		const addrToPriority: { [address: string]: number } = {}

		Object.values<Timeline.ResolvedTimelineObjectInstance<TSRTimelineContent>>(state.layers).forEach((layer) => {
			if (layer.content.deviceType === DeviceType.OSC) {
				const content: OSCDeviceStateContent = {
					...layer.content,
					fromTlObject: layer.id,
				}
				if (
					(addrToOSCMessage[content.path] && addrToPriority[content.path] <= (layer.priority || 0)) ||
					!addrToOSCMessage[content.path]
				) {
					addrToOSCMessage[content.path] = content
					addrToPriority[content.path] = layer.priority || 0
				}
			}
		})

		return addrToOSCMessage
	}
	diffStates(oldState: OscDeviceState | undefined, newState: OscDeviceState): Array<OscCommandWithContext> {
		const commands: Array<OscCommandWithContext> = []

		Object.entries<OSCDeviceStateContent>(newState).forEach(([address, newCommandContent]) => {
			const oldLayer = oldState?.[address]
			if (!oldLayer) {
				// added!
				commands.push({
					context: `added: ${newCommandContent.fromTlObject}`,
					timelineObjId: newCommandContent.fromTlObject,
					command: newCommandContent,
				})
			} else {
				// changed?
				if (!_.isEqual(oldLayer, newCommandContent)) {
					// changed!
					commands.push({
						context: `changed: ${newCommandContent.fromTlObject}`,
						timelineObjId: newCommandContent.fromTlObject,
						command: newCommandContent,
					})
				}
			}
		})
		return commands
	}
	async sendCommand({ command, context, timelineObjId }: OscCommandWithContext): Promise<any> {
		const cwc: CommandWithContext = {
			context: context,
			command: command,
			timelineObjId,
		}
		this.context.logger.debug(cwc)
		debug(command)

		try {
			if (command.transition && command.from) {
				const easingType = Easing[command.transition.type]
				const easing = (easingType || {})[command.transition.direction]

				if (!easing) throw new Error(`Easing "${command.transition.type}.${command.transition.direction}" not found`)

				for (let i = 0; i < Math.max(command.from.length, command.values.length); i++) {
					if (command.from[i] && command.values[i] && 'value' in command.from[i] && 'value' in command.values[i]) {
						if (command.from[i].value !== command.values[i].value && command.from[i].type !== command.values[i].type) {
							throw new Error('Cannot interpolate between values of different types')
						}
					}
				}

				this.transitions[command.path] = {
					// push the tween
					started: this.getMonotonicTime(),
					...command,
				}
				this._oscSender({
					// send first parameters
					address: command.path,
					args: [...command.values].map((o: SomeOSCValue, i: number) => command.from![i] || o),
				})

				// trigger loop:
				if (!this.transitionInterval) this.transitionInterval = setInterval(() => this.runAnimation(), 40)
			} else {
				this._oscSender({
					address: command.path,
					args: command.values,
				})
			}

			return Promise.resolve()
		} catch (e) {
			this.context.commandError(e as Error, cwc)
			return Promise.resolve()
		}
	}

	get connected(): boolean {
		return this._oscClientStatus === 'connected'
	}
	getStatus(): Omit<DeviceStatus, 'active'> {
		if (this.options?.type === OSCDeviceType.TCP) {
			return {
				statusCode: this._oscClientStatus === 'disconnected' ? StatusCode.BAD : StatusCode.GOOD,
				messages: this._oscClientStatus === 'disconnected' ? ['Disconnected'] : [],
			}
		}
		return {
			statusCode: StatusCode.GOOD,
			messages: [],
		}
	}

	readonly actions: Record<string, (id: string, payload?: Record<string, any>) => Promise<ActionExecutionResult>> = {}

	private _oscSender(msg: osc.OscMessage, address?: string | undefined, port?: number | undefined): void {
		this.context.logger.debug('sending ' + msg.address)
		this._oscClient.send(msg, address, port)
	}
	private runAnimation() {
		const t = this.getMonotonicTime()
		for (const addr in this.transitions) {
			// delete old tweens
			if (this.transitions[addr].started + this.transitions[addr].transition!.duration < t) {
				delete this.transitions[addr]
			}
		}

		for (const addr in this.transitions) {
			const tween = this.transitions[addr]
			// check if easing exists:
			const easingType = Easing[tween.transition!.type]
			const easing = (easingType || {})[tween.transition!.direction]
			if (easing) {
				// scale time in range 0...1, then calculate progress in range 0..1
				const deltaTime = t - tween.started
				const progress = deltaTime / tween.transition!.duration
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
								value: oldVal + (newVal - oldVal) * fraction,
							}
						} else if (tween.from![i].type === OSCValueType.INT && tween.values[i].type === OSCValueType.INT) {
							const oldVal = tween.from![i].value as number
							const newVal = tween.values[i].value as number
							values[i] = {
								type: OSCValueType.INT,
								value: oldVal + Math.round((newVal - oldVal) * fraction),
							}
						} else {
							values[i] = tween.values[i]
						}
					}
				}

				this._oscSender({
					address: tween.path,
					args: values,
				})
			}
		}

		if (Object.keys(this.transitions).length === 0) {
			if (this.transitionInterval) {
				clearInterval(this.transitionInterval)
			}
			this.transitionInterval = undefined
		}
	}

	private getMonotonicTime() {
		const hrTime = process.hrtime()
		return hrTime[0] * 1000 + hrTime[1] / 1000000
	}
}
