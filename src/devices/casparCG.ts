import * as _ from 'underscore'
import { Device, DeviceCommand, DeviceCommandContainer } from './device'

import { CasparCG, Command as CommandNS, AMCPUtil } from 'casparcg-connection'
import { Mappings, MappingCasparCG, DeviceType } from './mapping'

import { TimelineState, TimelineResolvedKeyframe, TimelineResolvedObject } from 'superfly-timeline'
import { CasparCG as StateNS, CasparCGState } from 'casparcg-state'

/*
	This is a wrapper for a CasparCG device. All commands will be sent through this
*/
export class CasparCGDevice extends Device {

	private _ccg: CasparCG
	private _ccgState: CasparCGState
	private _queue: Array<any>
	private _commandReceiver: (time: number, cmd) => void

	constructor (deviceId: string, deviceOptions: any, options) {
		super(deviceId, deviceOptions, options)

		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
		}

		this._ccgState = new CasparCGState({externalLog: console.log, currentTime: this.getCurrentTime})

		setInterval(() => {
			// send any commands due:

			let now = this.getCurrentTime()

			this._queue = _.reject(this._queue, (q) => {
				if (q.time <= now) {
					if (this._commandReceiver) {
						this._commandReceiver(now, q.command)
					}
					return true
				}
				return false
			})
		}, 100)
	}

	/**
	 * Initiates the connection with CasparCG through the ccg-connection lib.
	 */
	init (): Promise<boolean> {

		return new Promise((resolve/*, reject*/) => {

			this._ccg = new CasparCG({
				// TODO: add options
			})

			this._ccg.onConnected = () => {
				this._ccgState.initStateFromChannelInfo([{ // @todo: these should be implemented from osc info
					channelNo: 1,
					videoMode: 'PAL',
					fps: 50
				} as StateNS.ChannelInfo, {
					channelNo: 2,
					videoMode: 'PAL',
					fps: 50
				} as StateNS.ChannelInfo])

				resolve(true)
			}

		})
	}

	/**
	 * Generates an array of CasparCG commands by comparing the newState against the oldState, or the current device state.
	 * @param newState The state to target.
	 * @param oldState The "current" state of the device. If omitted, will use the actual current state.
	 */
	handleState (newState: TimelineState) {
		let oldState = this.getStateBefore(newState.time) || {time: 0, LLayers: {}, GLayers: {}}

		let newCasparState = this.convertStateToCaspar(newState)
		let oldCasparState = this.convertStateToCaspar(oldState)

		let commandsToAchieveState: Array<CommandNS.IAMCPCommandVO> = this._diffStates(oldCasparState, newCasparState)

		// clear any queued commands on this time:
		this._queue = _.reject(this._queue, (q) => { return q.time === newState.time })

		// add the new commands to the queue:
		_.each(commandsToAchieveState, (cmd) => {
			this._queue.push({
				time: newState.time,
				command: cmd
			})
		})

		// store the new state, for later use:
		this.setState(newState)
	}

	clearFuture (clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._queue = _.reject(this._queue, (q) => { return q.time > clearAfterTime })
	}

	get deviceType () {
		return DeviceType.CASPARCG
	}

	get queue () {
		return _.values(this._queue)
	}

	/**
	 * Takes a timeline state and returns a CasparCG State that will work with the state lib.
	 * @param timelineState The timeline state to generate from.
	 */
	convertStateToCaspar (timelineState: TimelineState): StateNS.State {

		const caspar = new StateNS.State()

		_.each(timelineState.LLayers, (layer: TimelineResolvedObject, layerName: string) => {
			const mapping: MappingCasparCG = this.mapping[layerName] as MappingCasparCG

			if (!mapping) {
				return
			} // we got passed a LLayer that doesn't belong to this device.

			const channel = new StateNS.Channel()
			channel.channelNo = Number(mapping.channel) || 1
			// @todo: check if we need fps as well.
			channel.fps = 50
			caspar.channels[channel.channelNo] = channel

			let stateLayer: StateNS.ILayerBase

			if (layer.content.type === 'video') {
				let l: StateNS.IMediaLayer = {
					layerNo: mapping.layer,
					content: StateNS.LayerContentType.MEDIA,
					media: layer.content.attributes.file,
					playTime: layer.resolved.startTime,
					playing: true,

					looping: layer.content.attributes.loop,
					seek: layer.content.attributes.seek
				}
				stateLayer = l
			} else if (layer.content.type === 'ip') {
				let l: StateNS.IMediaLayer = {
					layerNo: mapping.layer,
					content: StateNS.LayerContentType.MEDIA,
					media: layer.content.attributes.uri,
					playTime: layer.resolved.startTime,
					playing: true,
					seek: 0 // ip inputs can't be seeked
				}
				stateLayer = l
			} else if (layer.content.type === 'input') {
				let l: StateNS.IInputLayer = {
					layerNo: mapping.layer,
					content: StateNS.LayerContentType.INPUT,
					media: 'decklink',
					input: {
						device: layer.content.attributes.device
					},
					playing: true
				}
				stateLayer = l
			} else if (layer.content.type === 'template') {
				let l: StateNS.ITemplateLayer = {
					layerNo: mapping.layer,
					content: StateNS.LayerContentType.TEMPLATE,
					media: layer.content.attributes.name,

					playTime: layer.resolved.startTime,
					playing: true,

					templateType: layer.content.attributes.type || 'html',
					templateData: layer.content.attributes.data,
					cgStop: layer.content.attributes.useStopCommand
				}
				stateLayer = l
			} else if (layer.content.type === 'route') {
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
					playing: true,
					playTime: layer.resolved.startTime
				}
				stateLayer = l
			} else if (layer.content.type === 'record') {
				let l: StateNS.IRecordLayer = {
					layerNo: mapping.layer,
					content: StateNS.LayerContentType.RECORD,
					media: layer.content.attributes.file,
					encoderOptions: layer.content.attributes.encoderOptions,
					playing: true,
					playTime: layer.resolved.startTime
				}
				stateLayer = l
			} else {
				let l: StateNS.IEmptyLayer = {
					content: StateNS.LayerContentType.NOTHING,
					playing: false,
					pauseTime: 0
				}
				stateLayer = l
			}

			if (layer.content.transitions) {
				switch (layer.content.type) {
					case 'video' || 'ip' || 'template' || 'input' || 'route':
						// create transition object
						let media = stateLayer.media
						let transitions = {} as any

						if (layer.content.transitions.inTransition) {
							transitions.inTransition = new StateNS.Transition(
								layer.content.transitions.inTransition.type,
								layer.content.transitions.inTransition.duration,
								layer.content.transitions.inTransition.easing,
								layer.content.transitions.inTransition.direction
							)
						}

						if (layer.content.transitions.outTransition) {
							transitions.outTransition = new StateNS.Transition(
								layer.content.transitions.outTransition.type,
								layer.content.transitions.outTransition.duration,
								layer.content.transitions.outTransition.easing,
								layer.content.transitions.outTransition.direction
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

			channel.layers[mapping.layer] = stateLayer
		})

		return caspar

	}

	private _diffStates (oldState, newState): Array<CommandNS.IAMCPCommandVO> {
		let commands: Array<{
			cmds: Array<CommandNS.IAMCPCommandVO>
			additionalLayerState?: StateNS.ILayerBase
		}> = this._ccgState.diffStates(oldState, newState)

		let returnCommands = []

		_.each(commands, (cmdObject) => {
			returnCommands = returnCommands.concat(cmdObject.cmds)
		})

		return returnCommands
	}
}
