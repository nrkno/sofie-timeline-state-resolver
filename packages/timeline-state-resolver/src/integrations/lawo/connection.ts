import { EmberClient, Model as EmberModel } from 'emberplus-connection'
import { EventEmitter } from 'eventemitter3'
import { deferAsync } from '../../lib'
import { LawoDeviceMode, LawoOptions } from 'timeline-state-resolver-types'
import _ = require('underscore')
import { LawoFaderRampCommand, LawoSetValueCommand } from './diff'
import { EmberValue } from 'emberplus-connection/dist/types'

export class LawoConnection extends EventEmitter {
	private _lawo: EmberClient

	private _lastSentValue: { [path: string]: number } = {}

	private _connected = false

	private _sourcesPath = ''
	private _rampMotorFunctionPath = ''
	private _dbPropertyName = ''
	private _faderIntervalTime = 0
	private _faderThreshold = -60
	private _sourceNamePath: string | undefined

	private _sourceNameToNodeName = new Map<string, string>()

	private transitions: {
		[address: string]: {
			started: number
			timelineObjId: string
		} & LawoFaderRampCommand
	} = {}
	private transitionInterval: NodeJS.Timer | undefined

	constructor(options: LawoOptions, private getCurrentTime: () => number) {
		super()
		if (options.faderInterval) {
			this._faderIntervalTime = options.faderInterval
		}

		switch (options.deviceMode) {
			case LawoDeviceMode.Ruby:
				this._sourcesPath = 'Ruby.Sources'
				this._dbPropertyName = 'Fader.Motor dB Value'
				this._rampMotorFunctionPath = 'Ruby.Functions.RampMotorFader'
				break
			case LawoDeviceMode.RubyManualRamp:
				this._sourcesPath = 'Ruby.Sources'
				this._dbPropertyName = 'Fader.Motor dB Value'
				this._faderThreshold = -60
				break
			case LawoDeviceMode.MC2:
				this._sourcesPath = 'Channels.Inputs'
				this._dbPropertyName = 'Fader.Fader Level'
				this._faderThreshold = -90
				this._sourceNamePath = 'General.Inherited Label'
				break
			case LawoDeviceMode.R3lay:
				this._sourcesPath = 'R3LAYVRX4.Ex.Sources'
				this._dbPropertyName = 'Active.Amplification'
				this._faderThreshold = -60
				break
			case LawoDeviceMode.Manual:
			default:
				this._sourcesPath = options.sourcesPath || ''
				this._dbPropertyName = options.dbPropertyName || ''
				this._rampMotorFunctionPath = options.dbPropertyName || ''
				this._faderThreshold = options.faderThreshold || -60
		}

		const host = options.host ? options.host : undefined
		const port = options.port ? options.port : undefined

		this._lawo = new EmberClient(host || '', port)
		this._lawo.on('error', (e) => {
			if ((e.message + '').match(/econnrefused/i) || (e.message + '').match(/disconnected/i)) {
				this._connected = false
			} else {
				this.emit('error', 'Lawo.Emberplus', e)
			}
		})
		// this._lawo.on('warn', (w) => {
		// 	this.emitDebug('Warning: Lawo.Emberplus', w)
		// })
		let firstConnection = true
		this._lawo.on('connected', () => {
			this._connected = true

			if (firstConnection) {
				deferAsync(
					async () => {
						const req = await this._lawo.getDirectory(this._lawo.tree)
						await req.response

						await this._mapSourcesToNodeNames()

						this.emit('connected', firstConnection)
					},
					(e) => {
						if (e instanceof Error) {
							this.emit('error', 'Error while expanding root', e)
						}
					}
				)
			} else {
				this.emit('connected', firstConnection)
			}
			firstConnection = false
		})
		this._lawo.on('disconnected', () => {
			this._connected = false
			this.emit('disconnected')
		})

		this._lawo
			.connect()
			.then((err) => {
				if (err) this.emit('error', 'Lawo initialization', err)
			})
			.catch((err) => {
				this.emit('error', 'Lawo initialization', err)
			})
	}

	/**
	 * Safely disconnect from physical device such that this instance of the class
	 * can be garbage collected.
	 */
	async terminate() {
		if (this.transitionInterval) clearInterval(this.transitionInterval)

		// @todo: Implement lawo dispose function upstream
		try {
			this._lawo
				.disconnect()
				.then(() => {
					this._lawo.discard()
				})
				.catch(() => null) // fail silently
			this._lawo.removeAllListeners('error')
			this._lawo.removeAllListeners('connected')
			this._lawo.removeAllListeners('disconnected')
		} catch (e) {
			this.emit('error', 'Lawo.terminate', e as Error)
		}
	}
	get connected(): boolean {
		return this._connected
	}

	/**
	 * Gets an ember node based on its path
	 * @param path
	 */
	private async _getParameterNodeByPath(
		path: string
	): Promise<EmberModel.NumberedTreeNode<EmberModel.Parameter> | undefined> {
		const node = await this._lawo.getElementByPath(path)

		return node as EmberModel.NumberedTreeNode<EmberModel.Parameter> | undefined
	}

	private _identifierToNodeName(identifier: string): string {
		if (this._sourceNamePath) {
			const s = this._sourceNameToNodeName.get(identifier)
			if (!s) this.emit('warning', `Source identifier "${identifier}" could not be found`)
			return s || identifier
		} else {
			return identifier
		}
	}

	/**
	 * Returns an attribute path
	 * @param identifier
	 * @param attributePath
	 */
	sourceNodeAttributePath(identifier: string, attributePath: string): string {
		return _.compact([this._sourcesPath, this._identifierToNodeName(identifier), attributePath]).join('.')
	}

	async rampFader(command: LawoFaderRampCommand, timelineObjId: string) {
		const path = this.sourceNodeAttributePath(command.identifier, this._dbPropertyName)
		const transitionDuration = command.transitionDuration ?? 0

		// save start time of command
		const startSend = this.getCurrentTime()
		this._lastSentValue[path] = startSend

		// TODO - Lawo result 6 code is based on time - difference ratio, certain ratios we may want to run a manual fade?
		if (
			!this._rampMotorFunctionPath ||
			(transitionDuration > 0 && transitionDuration < 500 && this._faderIntervalTime < 250)
		) {
			// add the fade to the fade object, such that we can fade the signal using the fader
			if (!command.from) {
				// @todo: see if we can query the lawo first always?
				const node = await this._getParameterNodeByPath(path)
				if (node) {
					if (node.contents.factor) {
						command.from = (node.contents.value as number) / (node.contents.factor || 1)
					} else {
						command.from = node.contents.value
					}
					if (command.from === command.value) return
				} else {
					throw new Error('Node ' + path + ' was not found')
				}
			}

			this.transitions[path] = {
				...command,
				timelineObjId,
				started: this.getCurrentTime(),
			}

			if (!this.transitionInterval)
				this.transitionInterval = setInterval(() => this.runAnimation(), this._faderIntervalTime || 75)
		} else if (transitionDuration >= 500) {
			// Motor Ramp in Lawo cannot handle too short durations
			const fn = await this._lawo.getElementByPath(this._rampMotorFunctionPath)
			if (!fn) throw new Error('Function path not found')
			if (fn.contents.type !== EmberModel.ElementType.Function)
				throw new Error('Node at specified path for function is not a function')
			const req = await this._lawo.invoke(
				fn as EmberModel.NumberedTreeNode<EmberModel.EmberFunction>,
				{ type: EmberModel.ParameterType.String, value: command.identifier },
				{ type: EmberModel.ParameterType.Real, value: command.value },
				{ type: EmberModel.ParameterType.Real, value: transitionDuration / 1000 }
			)
			this.emit('debug', `Ember function invoked (${timelineObjId}, ${command.identifier}, ${command.value})`)
			const res = await req.response
			if (res && res.success === false) {
				const reasons = {
					1: 'Incorrect number of parameters',
					2: 'Incorrect datatype',
					3: 'Input value out of range',
					4: 'Source / sum not found',
					5: 'Source / sum not assigned to fader',
					6: 'Combination of values not allowed',
					7: 'Touch active',
				}
				const result = res.result![0].value as number

				if (res.result && (result === 6 || result === 5) && this._lastSentValue[path] <= startSend) {
					// result 5 / 6 and no new command fired for this path in meantime
					// Lawo rejected the command, so ensure the value gets set
					this.emit(
						'info',
						`Ember function result (${timelineObjId}, ${command.identifier}) was ${result}, running a direct setValue now`
					)
					await this.setValueWrapper(path, command.value, timelineObjId, false) // result 6 is quite likely to cause a timeout
				} else {
					this.emit(
						'error',
						`Lawo: Ember function success false (${timelineObjId}, ${command.identifier}), result ${
							res.result![0].value
						}`,
						new Error('Lawo Result ' + res.result![0].value)
					)
				}
				this.emit('debug', `Lawo: Ember fn error ${command.identifier}): result ${result}: ${reasons[result]}`, {
					...res,
					source: command.identifier,
				})
			} else {
				this.emit(
					'debug',
					`Ember function result (${timelineObjId}, ${command.identifier}): ${JSON.stringify(res)}`,
					res
				)
			}
		} else {
			// withouth timed fader movement
			await this.setValueWrapper(path, command.value, timelineObjId)
		}
	}

	async setValue(command: LawoSetValueCommand, timelineObjId: string) {
		// save start time of command
		const startSend = this.getCurrentTime()
		this._lastSentValue[command.identifier] = startSend

		return this.setValueWrapper(command.identifier, command.value, timelineObjId)
	}

	private async setValueWrapper(path: string, value: EmberValue, timelineObjId: string, logResult = true) {
		try {
			const node = await this._getParameterNodeByPath(path)

			if (!node) throw new Error(`Unable to setValue for node "${path}", node not found!`)

			const scaledValue = node.contents.factor ? (value as number) * node.contents.factor : value

			if (node.contents.value === scaledValue) return // no need to do another setValue

			const req = await this._lawo.setValue(node, scaledValue, logResult)
			if (logResult) {
				const res = await req.response
				this.emit('debug', `Ember result (${timelineObjId}): ${res && res.contents.value}`, {
					path,
					value,
					res: res && res.contents,
				})
			} else if (!req.sentOk) {
				this.emit(
					'error',
					'SetValue no logResult',
					new Error(`Ember req (${timelineObjId}) for "${path}" to "${scaledValue}" failed`)
				)
			}
		} catch (e) {
			this.emit('error', `Lawo: Error in setValue (${timelineObjId})`, e as Error)
			throw e
		}
	}
	private runAnimation(): void {
		for (const addr in this.transitions) {
			const transition = this.transitions[addr]
			// delete old transitions
			if (transition.started + transition.transitionDuration! < this.getCurrentTime()) {
				delete this.transitions[addr]

				// assert correct finished value:
				this.setValueWrapper(addr, transition.value, transition.timelineObjId).catch(() => null)
			}
		}

		for (const addr in this.transitions) {
			const transition = this.transitions[addr]

			const from = this._faderThreshold
				? Math.max(this._faderThreshold, transition.from as number)
				: (transition.from as number)
			const to = this._faderThreshold
				? Math.max(this._faderThreshold, transition.value as number)
				: (transition.value as number)

			const p = (this.getCurrentTime() - transition.started) / transition.transitionDuration!

			const v = from + p * (to - from) // should this have easing?

			this.setValueWrapper(addr, v, transition.timelineObjId, false).catch(() => null)
		}

		if (Object.keys(this.transitions).length === 0) {
			if (this.transitionInterval) {
				clearInterval(this.transitionInterval)
			}
			this.transitionInterval = undefined
		}
	}

	private async _mapSourcesToNodeNames() {
		if (!this._sourceNamePath) return

		this.emit('info', 'Start mapping source identifiers to channel node identifiers')
		// get the node that contains the sources
		const sourceNode = await this._lawo.getElementByPath(this._sourcesPath)
		if (!sourceNode) {
			this.emit('warning', 'Could not map source names to node names because source node could not be found!')
			return
		}

		// get the sources
		const req = await this._lawo.getDirectory(sourceNode as EmberModel.NumberedTreeNode<EmberModel.EmberNode>)
		const sources = (await req.response!) as EmberModel.NumberedTreeNode<EmberModel.EmberNode> | undefined
		if (!sources) return

		for (const child of Object.values<EmberModel.NumberedTreeNode<EmberModel.EmberElement>>(sources.children || {})) {
			if (child.contents.type === EmberModel.ElementType.Node) {
				try {
					// get the identifier
					let previousNode: string | undefined = undefined
					const node = await this._lawo.getElementByPath(
						this._sourcesPath + '.' + child.number + '.' + this._sourceNamePath,
						(node0) => {
							const node = node0 as EmberModel.NumberedTreeNode<EmberModel.Parameter>
							// identifier changed
							if (!node) return

							const sourceId = (child.contents as EmberModel.EmberNode).identifier || child.number + ''

							// remove old mapping if it hasn't changed
							if (previousNode && this._sourceNameToNodeName.get(previousNode) === sourceId) {
								this.emit('info', `removing mapping ${previousNode}`)
								this._sourceNameToNodeName.delete(previousNode)
							}

							// set new mapping
							this._sourceNameToNodeName.set(node.contents.value as string, sourceId)
							previousNode = node.contents.value as string

							this.emit('info', `mapping ${node.contents.value} to channel ${sourceId}`)
						}
					)

					if (!node) continue

					this._sourceNameToNodeName.set(
						(node.contents as EmberModel.Parameter).value as string,
						child.contents.identifier || child.number + ''
					)
					previousNode = (node.contents as EmberModel.Parameter).value as string
				} catch (e) {
					this.emit('error', 'lawo: map sources to node names', e as Error)
				}
			}
		}

		this.emit('info', 'Mapped source identifiers to channel node identifiers')
	}
}
