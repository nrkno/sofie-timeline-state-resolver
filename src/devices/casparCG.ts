import * as _ from 'underscore'
import { Device, DeviceOptions } from './device'

import { CasparCG, Command as CommandNS, AMCPUtil, AMCP, CasparCGSocketStatusEvent } from 'casparcg-connection'
import { MappingCasparCG, DeviceType, Mapping, TimelineResolvedObjectExtended } from './mapping'

import { TimelineState, TimelineResolvedObject } from 'superfly-timeline'
import { CasparCG as StateNS, CasparCGState } from 'casparcg-state'
import { Conductor } from '../conductor'

// const BGLOADTIME = 1000 // the time we will look back to schedule a loadbg command.

/*
	This is a wrapper for a CasparCG device. All commands will be sent through this
*/
const MAX_TIMESYNC_TRIES = 5
const MAX_TIMESYNC_DURATION = 40
export interface CasparCGDeviceOptions extends DeviceOptions {
	options?: {
		commandReceiver?: (time: number, cmd: CommandNS.IAMCPCommand) => Promise<any>
		/* Timecode base of channel */
		timeBase?: {[channel: string]: number} | number
	}
}
export interface CasparCGOptions {
	host: string,
	port: number
}
export enum TimelineContentTypeCasparCg { //  CasparCG-state
	VIDEO = 'video', // to be deprecated & replaced by MEDIA
	AUDIO = 'audio', // to be deprecated & replaced by MEDIA
	MEDIA = 'media',
	IP = 'ip',
	INPUT = 'input',
	TEMPLATE = 'template',
	HTMLPAGE = 'htmlpage',
	ROUTE = 'route',
	RECORD = 'record'
}
export class CasparCGDevice extends Device {

	private _ccg: CasparCG
	private _conductor: Conductor
	private _ccgState: CasparCGState
	private _queue: { [key: string]: number } = {}
	private _commandReceiver: (time: number, cmd: CommandNS.IAMCPCommand) => Promise<any>
	private _timeToTimecodeMap: {time: number, timecode: number} = { time: 0, timecode: 0 }
	private _timeBase: {[channel: string]: number} | number = {}

	constructor (deviceId: string, deviceOptions: CasparCGDeviceOptions, options, conductor: Conductor) {
		super(deviceId, deviceOptions, options)

		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
			if (deviceOptions.options.timeBase) this._timeBase = deviceOptions.options.timeBase
		}

		this._ccgState = new CasparCGState({
			currentTime: this.getCurrentTime,
			externalLog: (...args) => {
				this._log(...args)
			}
		})
		this._conductor = conductor
	}

	/**
	 * Initiates the connection with CasparCG through the ccg-connection lib.
	 */
	init (connectionOptions: CasparCGOptions): Promise<boolean> {
		this._ccg = new CasparCG({
			host: connectionOptions.host,
			port: connectionOptions.port,
			autoConnect: true,
			virginServerCheck: true,
			onConnectionChanged: (connected: boolean) => {
				this.emit('connectionChanged', connected)
			}
		})
		this._ccg.on(CasparCGSocketStatusEvent.CONNECTED, (event: CasparCGSocketStatusEvent) => {
			this.makeReady(false) // always make sure timecode is correct, setting it can never do bad
			.catch((e) => this.emit('error', e))
			if (event.valueOf().virginServer === true) {
				// a "virgin server" was just restarted (so it is cleared & black).
				// Otherwise it was probably just a loss of connection

				this._ccgState.softClearState()
				this.clearStates()
				this._conductor.resetResolver() // trigger a re-calc
			}
		})

		return new Promise((resolve, reject) => {
			this._ccg.info()
			.then((command) => {
				this._ccgState.initStateFromChannelInfo(_.map(command.response.data, (obj: any) => {
					return {
						channelNo: obj.channel,
						videoMode: obj.format.toUpperCase(),
						fps: obj.frameRate
					}
				}) as StateNS.ChannelInfo[])

				resolve(true)
			}).catch((e) => reject(e))
		}).then(() => {
			return true
		})
	}

	terminate (): Promise<boolean> {
		return new Promise((resolve) => {
			this._ccg.disconnect()
			this._ccg.onDisconnected = () => {
				resolve()
			}
		})
	}

	/**
	 * Generates an array of CasparCG commands by comparing the newState against the oldState, or the current device state.
	 */
	handleState (newState: TimelineState) {
		// check if initialized:
		if (!this._ccgState.isInitialised) {
			this._log('CasparCG State not initialized yet')
			return
		}

		let oldState = (this.getStateBefore(newState.time) || { state: { time: 0, LLayers: {}, GLayers: {} } }).state

		let newCasparState = this.convertStateToCaspar(newState)
		let oldCasparState = this.convertStateToCaspar(oldState)

		let commandsToAchieveState: Array<CommandNS.IAMCPCommandVO> = this._diffStates(oldCasparState, newCasparState)

		// clear any queued commands later than this time:
		let now = this.getCurrentTime()
		for (let token in this._queue) {
			if (this._queue[token] < now) {
				delete this._queue[token]
			} else if (this._queue[token] === newState.time) {
				this._doCommand(new AMCP.ScheduleRemoveCommand(token))
				delete this._queue[token]
			}
		}
		// console.log('commandsToAchieveState', commandsToAchieveState)

		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newState, newState.time)
	}

	clearFuture (clearAfterTime: number) {
		// Clear any scheduled commands after this time
		for (let token in this._queue) {
			if (this._queue[token] > clearAfterTime) {
				this._doCommand(new AMCP.ScheduleRemoveCommand(token))
			}
		}
	}
	get canConnect (): boolean {
		return true
	}
	get connected (): boolean {
		// Returns connection status
		return this._ccg.connected
	}

	get deviceType () {
		return DeviceType.CASPARCG
	}
	get deviceName (): string {
		return 'CasparCG ' + this._ccg.host + ':' + this._ccg.port
	}

	get queue () {
		if (this._queue) {
			return _.map(this._queue, (val, index) => [ val, index ])
		} else {
			return []
		}
	}

	/**
	 * Takes a timeline state and returns a CasparCG State that will work with the state lib.
	 * @param timelineState The timeline state to generate from.
	 */
	convertStateToCaspar (timelineState: TimelineState): StateNS.State {

		const caspar = new StateNS.State()

		_.each(timelineState.LLayers, (layer: TimelineResolvedObject, layerName: string) => {
			const layerExt = layer as TimelineResolvedObjectExtended
			let foundMapping: Mapping = this.mapping[layerName]
			if (!foundMapping && layerExt.isBackground && layerExt.originalLLayer) {
				foundMapping = this.mapping[layerExt.originalLLayer]
			}

			if (
				foundMapping &&
				foundMapping.device === DeviceType.CASPARCG &&
				_.has(foundMapping,'channel') &&
				_.has(foundMapping,'layer')
			) {

				const mapping: MappingCasparCG = {
					device: DeviceType.CASPARCG,
					deviceId: foundMapping.deviceId,
					channel: foundMapping.channel || 0,
					layer: foundMapping.layer || 0
				}

				const channel = caspar.channels[mapping.channel] ? caspar.channels[mapping.channel] : new StateNS.Channel()
				channel.channelNo = Number(mapping.channel) || 1
				// @todo: check if we need to get fps.
				channel.fps = 25 / 1000 // 25 fps over 1000ms
				caspar.channels[channel.channelNo] = channel

				let stateLayer: StateNS.ILayerBase | null = null
				if (
					layer.content.type === TimelineContentTypeCasparCg.VIDEO || // to be deprecated & replaced by MEDIA
					layer.content.type === TimelineContentTypeCasparCg.AUDIO || // to be deprecated & replaced by MEDIA
					layer.content.type === TimelineContentTypeCasparCg.MEDIA
				) {
					let l: StateNS.IMediaLayer = {
						layerNo: mapping.layer,
						content: StateNS.LayerContentType.MEDIA,
						media: layer.content.attributes.file,
						playTime: layer.resolved.startTime || null,
						pauseTime: layer.resolved.pauseTime || null,
						playing: layer.resolved.playing !== undefined ? layer.resolved.playing : true,

						looping: layer.content.attributes.loop,
						seek: layer.content.attributes.seek
					}
					stateLayer = l
				} else if (layer.content.type === TimelineContentTypeCasparCg.IP) {
					let l: StateNS.IMediaLayer = {
						layerNo: mapping.layer,
						content: StateNS.LayerContentType.MEDIA,
						media: layer.content.attributes.uri,
						playTime: null, // ip inputs can't be seeked // layer.resolved.startTime || null,
						playing: true,
						seek: 0 // ip inputs can't be seeked
					}
					stateLayer = l
				} else if (layer.content.type === TimelineContentTypeCasparCg.INPUT) {
					let l: StateNS.IInputLayer = {
						layerNo: mapping.layer,
						content: StateNS.LayerContentType.INPUT,
						media: 'decklink',
						input: {
							device: layer.content.attributes.device
						},
						playing: true,
						playTime: null
					}
					stateLayer = l
				} else if (layer.content.type === TimelineContentTypeCasparCg.TEMPLATE) {
					let l: StateNS.ITemplateLayer = {
						layerNo: mapping.layer,
						content: StateNS.LayerContentType.TEMPLATE,
						media: layer.content.attributes.name,

						playTime: layer.resolved.startTime || null,
						playing: true,

						templateType: layer.content.attributes.type || 'html',
						templateData: layer.content.attributes.data,
						cgStop: layer.content.attributes.useStopCommand
					}
					stateLayer = l
				} else if (layer.content.type === TimelineContentTypeCasparCg.HTMLPAGE) {
					let l: StateNS.IHtmlPageLayer = {
						layerNo: mapping.layer,
						content: StateNS.LayerContentType.HTMLPAGE,
						media: layer.content.attributes.url,

						playTime: layer.resolved.startTime || null,
						playing: true
					}
					stateLayer = l
				} else if (layer.content.type === TimelineContentTypeCasparCg.ROUTE) {
					if (layer.content.attributes.LLayer) {
						let routeMapping = this.mapping[layer.content.attributes.LLayer] as MappingCasparCG
						if (routeMapping) {
							layer.content.attributes.channel = routeMapping.channel
							layer.content.attributes.layer = routeMapping.layer
						}
					}
					let l: StateNS.IRouteLayer = {
						layerNo: mapping.layer,
						content: StateNS.LayerContentType.ROUTE,
						media: 'route',
						route: {
							channel: layer.content.attributes.channel,
							layer: layer.content.attributes.layer
						},
						mode: layer.content.attributes.mode || undefined,
						playing: true,
						playTime: null // layer.resolved.startTime || null
					}
					stateLayer = l
				} else if (layer.content.type === TimelineContentTypeCasparCg.RECORD) {
					if (layer.resolved.startTime) {
						let l: StateNS.IRecordLayer = {
							layerNo: mapping.layer,
							content: StateNS.LayerContentType.RECORD,
							media: layer.content.attributes.file,
							encoderOptions: layer.content.attributes.encoderOptions,
							playing: true,
							playTime: layer.resolved.startTime
						}
						stateLayer = l
					}
				}
				if (!stateLayer) {
					let l: StateNS.IEmptyLayer = {
						layerNo: mapping.layer,
						content: StateNS.LayerContentType.NOTHING,
						playing: false,
						pauseTime: 0
					}
					stateLayer = l
				}
				if (stateLayer) {
					if (layer.content.transitions) {
						switch (layer.content.type) {
							case TimelineContentTypeCasparCg.VIDEO:
							case TimelineContentTypeCasparCg.IP:
							case TimelineContentTypeCasparCg.TEMPLATE:
							case TimelineContentTypeCasparCg.INPUT:
							case TimelineContentTypeCasparCg.ROUTE:
								// create transition object
								let media = stateLayer.media
								let transitions = {} as any
								if (layer.content.transitions.inTransition) {
									transitions.inTransition = new StateNS.Transition(
										layer.content.transitions.inTransition.type,
										layer.content.transitions.inTransition.duration || layer.content.transitions.inTransition.maskFile,
										layer.content.transitions.inTransition.easing || layer.content.transitions.inTransition.delay,
										layer.content.transitions.inTransition.direction || layer.content.transitions.inTransition.overlayFile
									)
								}
								if (layer.content.transitions.outTransition) {
									transitions.outTransition = new StateNS.Transition(
										layer.content.transitions.outTransition.type,
										layer.content.transitions.outTransition.duration || layer.content.transitions.inTransition.maskFile,
										layer.content.transitions.outTransition.easing || layer.content.transitions.inTransition.delay,
										layer.content.transitions.outTransition.direction || layer.content.transitions.inTransition.overlayFile
									)
								}
								stateLayer.media = new StateNS.TransitionObject(media, {
									inTransition: transitions.inTransition,
									outTransition: transitions.outTransition
								})
								break
							default :
								// create transition using mixer
								break
						}
					}
					if (layer.resolved.mixer) {
						// just pass through values here:
						let mixer: StateNS.Mixer = {}
						_.each(layer.resolved.mixer, (value, property) => {
							mixer[property] = value
						})
						stateLayer.mixer = mixer
					}
					stateLayer.layerNo = mapping.layer
				}

				if (stateLayer && !layerExt.isBackground) {
					const prev = channel.layers[mapping.layer] || {}
					channel.layers[mapping.layer] = _.extend(stateLayer, _.pick(prev, 'nextUp'))
				} else if (stateLayer && layerExt.isBackground) {
					let s = stateLayer as StateNS.NextUp
					s.auto = false

					const res = channel.layers[mapping.layer]
					if (!res) {
						let l: StateNS.IEmptyLayer = {
							layerNo: mapping.layer,
							content: StateNS.LayerContentType.NOTHING,
							playing: false,
							pauseTime: 0,
							nextUp: s
						}
						channel.layers[mapping.layer] = l
					} else {
						channel.layers[mapping.layer].nextUp = s
					}
				}
			}
		})

		return caspar

	}

	makeReady (okToDestroyStuff?: boolean): Promise<void> {
		// Sync Caspar Time to our time:
		return this._ccg.info()
		.then((command) => {
			let channels: any = command.response.data
			const attemptSync = (channelNo, tries) => {
				let startTime = this.getCurrentTime()
				return this._commandReceiver(startTime, new AMCP.TimeCommand({
					channel: channelNo,
					timecode: this.convertTimeToTimecode(startTime, channelNo)
				}))
				.then(async () => {
					let duration = this.getCurrentTime() - startTime
					if (duration > MAX_TIMESYNC_DURATION) { // @todo: acceptable time is dependent on fps
						if (tries > MAX_TIMESYNC_TRIES) {
							this.emit('error', 'CasparCG Time command took too long (' + MAX_TIMESYNC_TRIES + ' tries took longer than ' + MAX_TIMESYNC_DURATION + 'ms), channel will be slightly out of sync!')
							return Promise.resolve()
						}
						await new Promise(resolve => { setTimeout(() => resolve(), MAX_TIMESYNC_DURATION) })
						return attemptSync(channelNo, tries + 1)
					}
				})
			}

			// console.log('channels', channels)

			let p = Promise.resolve()
			_.each(channels, (channel: any) => {

				let channelNo = channel.channel
				p = p.then(() => attemptSync(channelNo, 1))
			})
			// Clear all channels (?)
			p = p.then(() => {
				if (okToDestroyStuff) {
					return Promise.all(
						_.map(channels, (channel: any) => {
							return this._commandReceiver(this.getCurrentTime(), new AMCP.ClearCommand({
								channel: channel.channel
							}))
						})
					).then(() => { return })
				}
				return Promise.resolve()
			})
			return p.then(() => { return })
		})
		.then(() => {
			// reset our own state(s):
			this.clearStates()
			// a resolveTimeline will be triggered later
		})
	}

	private _diffStates (oldState, newState): Array<CommandNS.IAMCPCommandVO> {
		let commands: Array<{
			cmds: Array<CommandNS.IAMCPCommandVO>
			additionalLayerState?: StateNS.ILayerBase
		}> = this._ccgState.diffStates(oldState, newState)

		let returnCommands: Array<CommandNS.IAMCPCommandVO> = []

		_.each(commands, (cmdObject) => {
			returnCommands = returnCommands.concat(cmdObject.cmds)
		})

		return returnCommands
	}
	private _doCommand (command): void {
		this._commandReceiver(this.getCurrentTime(), command)
		.catch(e => this.emit('error', e))
	}

	private _addToQueue (commandsToAchieveState: Array<CommandNS.IAMCPCommandVO>, time: number) {
		_.each(commandsToAchieveState, (cmd: CommandNS.IAMCPCommandVO) => {

			let command = AMCPUtil.deSerialize(cmd, 'id')
			let scheduleCommand = new AMCP.ScheduleSetCommand({
				token: command.token,
				timecode: this.convertTimeToTimecode(time, command.channel),
				command
			})

			if (time <= this.getCurrentTime()) {
				this._doCommand(command)
			} else {
				this._doCommand(scheduleCommand)
				this._queue[command.token] = time
			}
		})
	}
	private _defaultCommandReceiver (time: number, cmd): Promise<any> {
		time = time
		return this._ccg.do(cmd)
		.then((resCommand) => {
			if (this._queue[resCommand.token]) {
				delete this._queue[resCommand.token]
			}
			this.emit('command', cmd)
		}).catch((error) => {
			this.emit('error', { cmdName: cmd.name, cmd, error })
			this._log(cmd, error)
			if (cmd.name === 'ScheduleSetCommand') {
				delete this._queue[cmd.getParam('command').token]
			}
		})
	}

	private convertTimeToTimecode (time: number, channel: number): string {
		let relTime = time - this._timeToTimecodeMap.time
		let timecodeTime = this._timeToTimecodeMap.timecode + relTime

		let timeBase = (
			typeof this._timeBase === 'object' ?
			this._timeBase[channel + ''] :
			this._timeBase
		) || 25

		let timecode = [
			('0' + (Math.floor(timecodeTime / 3.6e6) % 24)).substr(-2),
			('0' + (Math.floor(timecodeTime / 6e4) % 60)).substr(-2),
			('0' + (Math.floor(timecodeTime / 1e3) % 60)).substr(-2),
			('0' + (Math.floor(timecodeTime / (1000 / timeBase)) % timeBase)).substr(-(timeBase + '').length)
		]

		return timecode.join(':')
	}
}
