import { EventEmitter } from 'eventemitter3'
import * as _ from 'underscore'
import * as underScoreDeepExtend from 'underscore-deep-extend'

import Debug from 'debug'
const debug = Debug('timeline-state-resolver:atem')

import { AtemState, State as AtemDeviceState, Defaults as StateDefault } from 'atem-state'
import {
	BasicAtem,
	Commands as AtemCommands,
	// AtemState as NativeAtemState,
	AtemStateUtil,
	Enums as ConnectionEnums,
} from 'atem-connection'

import {
	ActionExecutionResult,
	AtemOptions,
	AtemTransitionStyle,
	DeviceStatus,
	DeviceType,
	MappingAtem,
	MappingAtemType,
	Mappings,
	StatusCode,
	Timeline,
	TimelineContentTypeAtem,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { Device, DeviceImplEvents } from '../../service/device'

type AtemDeviceOptions = AtemOptions

export interface AtemCommandWithContext {
	command: AtemCommands.ISerializableCommand
	context: CommandContext
	tlObjId: string
}
type CommandContext = any

export class AtemDevice
	extends EventEmitter<DeviceImplEvents>
	implements Device<AtemDeviceOptions, AtemDeviceState, AtemCommandWithContext>
{
	private _state: AtemState
	private _atem: BasicAtem
	private _connected = false
	private _initialized = false

	init(options: AtemDeviceOptions): Promise<boolean> {
		return new Promise((resolve, reject) => {
			this._state = new AtemState()
			this._atem = new BasicAtem()
			this._atem.once('connected', () => {
				// check if state has been initialized:
				this._connected = true
				this._initialized = true
				resolve(true)
			})
			this._atem.on('connected', () => {
				debug('connected')
				// const time = this.getCurrentTime()
				// if (this._atem.state) this.setState(this._atem.state, time)
				this._connected = true
				this.emit('connectionChanged')
				// this.emit('resetResolver')
			})
			this._atem.on('disconnected', () => {
				this._connected = false
				this.emit('connectionChanged')
			})
			this._atem.on('error', (e) => this.emit('error', 'Atem', new Error(e)))
			// this._atem.on('stateChanged', (state) => this._onAtemStateChanged(state))

			this._atem.connect(options.host, options.port).catch((e) => {
				reject(e)
			})
		})
	}

	async terminate(): Promise<boolean> {
		this._atem.destroy()
		return true
	}

	async makeReady(_okToDestroyStuff?: boolean): Promise<void> {
		// todo: implement reset
	}

	get connected(): boolean {
		return this._connected
	}

	getStatus(): Omit<DeviceStatus, 'active'> {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (statusCode === StatusCode.GOOD) {
			if (!this._connected) {
				statusCode = StatusCode.BAD
				messages.push(`Atem disconnected`)
			}
		}
		if (statusCode === StatusCode.GOOD) {
			const psus = this._atem.state?.info.power || []
			_.each(psus, (psu: boolean, i: number) => {
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

	actions: Record<string, (id: string, payload: Record<string, any>) => Promise<ActionExecutionResult>> = {}

	convertTimelineStateToDeviceState(
		state: Timeline.TimelineState<TSRTimelineContent>,
		newMappings: Mappings
	): AtemDeviceState {
		if (!this._initialized) throw Error('convertStateToAtem cannot be used before inititialized')

		// Start out with default state:
		const deviceState = AtemStateUtil.Create()

		// Sort layer based on Layer name
		const sortedLayers = _.map(state.layers, (tlObject, layerName) => ({ layerName, tlObject })).sort((a, b) =>
			a.layerName.localeCompare(b.layerName)
		)

		// For every layer, augment the state
		_.each(sortedLayers, ({ tlObject, layerName }) => {
			const content = tlObject.content

			const mapping = newMappings[layerName] as MappingAtem | undefined

			if (mapping && content.deviceType === DeviceType.ATEM) {
				// if (mapping && mapping.deviceId === this.deviceId && content.deviceType === DeviceType.ATEM) {
				if (mapping.index !== undefined && mapping.index >= 0) {
					// index must be 0 or higher
					switch (mapping.mappingType) {
						case MappingAtemType.MixEffect:
							if (content.type === TimelineContentTypeAtem.ME) {
								const me = AtemStateUtil.getMixEffect(deviceState, mapping.index)
								const atemObjKeyers = content.me.upstreamKeyers
								const transition = content.me.transition

								deepExtend(me, _.omit(content.me, 'upstreamKeyers'))
								if (this._isAssignableToNextStyle(transition)) {
									me.transitionProperties.nextStyle = transition as number as ConnectionEnums.TransitionStyle
								}
								if (atemObjKeyers) {
									_.each(atemObjKeyers, (objKey, i) => {
										const keyer = AtemStateUtil.getUpstreamKeyer(me, i)
										deepExtend(keyer, objKey)
									})
								}
							}
							break
						case MappingAtemType.DownStreamKeyer:
							if (content.type === TimelineContentTypeAtem.DSK) {
								const dsk = AtemStateUtil.getDownstreamKeyer(deviceState, mapping.index)
								if (dsk) deepExtend(dsk, content.dsk)
							}
							break
						case MappingAtemType.SuperSourceBox:
							if (content.type === TimelineContentTypeAtem.SSRC) {
								const ssrc = AtemStateUtil.getSuperSource(deviceState, mapping.index)
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
								const ssrc = AtemStateUtil.getSuperSource(deviceState, mapping.index)
								if (!ssrc.properties) ssrc.properties = { ...StateDefault.Video.SuperSourceProperties }
								if (ssrc) deepExtend(ssrc.properties, content.ssrcProps)
							}
							break
						case MappingAtemType.Auxilliary:
							if (content.type === TimelineContentTypeAtem.AUX) {
								deviceState.video.auxilliaries[mapping.index] = content.aux.input
							}
							break
						case MappingAtemType.MediaPlayer:
							if (content.type === TimelineContentTypeAtem.MEDIAPLAYER) {
								const ms = AtemStateUtil.getMediaPlayer(deviceState, mapping.index)
								if (ms) deepExtend(ms, content.mediaPlayer)
							}
							break
						case MappingAtemType.AudioChannel:
							if (content.type === TimelineContentTypeAtem.AUDIOCHANNEL) {
								const chan = deviceState.audio?.channels[mapping.index]
								if (chan && deviceState.audio) {
									deviceState.audio.channels[mapping.index] = {
										...chan,
										...content.audioChannel,
									}
								}
							}
							break
					}
				}

				if (mapping.mappingType === MappingAtemType.MacroPlayer) {
					if (content.type === TimelineContentTypeAtem.MACROPLAYER) {
						const ms = deviceState.macro.macroPlayer
						if (ms) deepExtend(ms, content.macroPlayer)
					}
				}
			}
		})

		return deviceState
	}

	diffStates(
		oldState: AtemDeviceState | undefined,
		newState: AtemDeviceState,
		mappings: Mappings
	): Array<AtemCommandWithContext> {
		// Ensure the state diffs the correct version
		if (this._atem.state) {
			this._state.version = this._atem.state.info.apiVersion
		}
		oldState = oldState ?? AtemStateUtil.Create()

		// bump out any auxes that we don't control as they may be used for CC etc.
		const noOfAuxes = Math.max(oldState.video.auxilliaries.length, newState.video.auxilliaries.length)
		const auxMappings = Object.values(mappings)
			.filter((mapping: MappingAtem) => mapping.mappingType === MappingAtemType.Auxilliary)
			.map((mapping: MappingAtem) => mapping.index)

		for (let i = 0; i < noOfAuxes; i++) {
			if (!auxMappings.includes(i)) {
				oldState.video.auxilliaries[i] = undefined
				newState.video.auxilliaries[i] = undefined
			}
		}

		return _.map(this._state.diffStates(oldState, newState), (cmd: any) => {
			if (_.has(cmd, 'command') && _.has(cmd, 'context')) {
				return cmd as AtemCommandWithContext
			} else {
				// backwards compability, to be removed later:
				return {
					command: cmd as AtemCommands.ISerializableCommand,
					context: null,
					tlObjId: '', // @todo: implement in Atem-state
				}
			}
		})
	}

	async sendCommand(command: AtemCommandWithContext): Promise<any> {
		this.emit('debug', command)
		debug('Send cmd', command)

		return this._atem
			.sendCommand(command.command)
			.then(() => {
				// @todo: command was acknowledged by atem, how will we check if it did what we wanted?
			})
			.catch((error) => {
				this.emit('commandError', error, command)
			})
	}

	private _isAssignableToNextStyle(transition: AtemTransitionStyle | undefined) {
		return (
			transition !== undefined && transition !== AtemTransitionStyle.DUMMY && transition !== AtemTransitionStyle.CUT
		)
	}
}

_.mixin({ deepExtend: underScoreDeepExtend(_) })

function deepExtend<T>(destination: T, ...sources: any[]) {
	// @ts-ignore (mixin)
	return _.deepExtend(destination, ...sources)
}
