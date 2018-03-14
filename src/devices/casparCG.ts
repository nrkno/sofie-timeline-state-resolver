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
	private _state: TimelineState
	private _ccgState: CasparCGState
	private _queue: Array<any>

	constructor (deviceId: string, mapping: Mappings, options) {
		super(deviceId, mapping)

		this._ccgState = new CasparCGState({externalLog: console.log})
		this._ccgState.initStateFromChannelInfo([{ // @todo: these should be implemented from osc info
			channelNo: 1,
			videoMode: 'PAL',
			fps: 50
		}, {
			channelNo: 2,
			videoMode: 'PAL',
			fps: 50
		}])

		setInterval(() => {
			this.checkCommandBus()
		}, 20)
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
				resolve(true)

				// this._ccg.do('test')
			}

			// TODO:

		})
	}

	/**
	 * Generates an array of CasparCG commands by comparing the newState against the oldState, or the current device state.
	 * @param newState The state to target.
	 * @param oldState The "current" state of the device. If omitted, will use the actual current state.
	 */
	generateCommandsAgainstState (newState: TimelineState, oldState?: TimelineState): Array<DeviceCommand> {
		let newCasparState = this.casparStateFromTimelineState(newState)
		let oldCasparState

		if (oldState) {
			oldCasparState = this.casparStateFromTimelineState(oldState)
		} else {
			oldCasparState = this._ccgState.getState()
		}

		let commandsToAchieveState: Array<{
			cmds: Array<CommandNS.IAMCPCommandVO>
			additionalLayerState?: StateNS.ILayerBase
		}> = this._ccgState.diffStates(oldCasparState, newCasparState)

		let returnCommands = {
			time: newState.time,
			deviceId: this.deviceId,
			commands: []
		}
		_.each(commandsToAchieveState, (command) => {
			// returnCommands.push({
			// 	time: newState.time,
			// 	deviceId: this.deviceId,
			// 	commands: commandsToAchieveState
			// });
			_.each(command.cmds, (cmd) => {
				returnCommands.commands.push(cmd)
			})
		})

		return returnCommands
	}

	/**
	 * A receiver for generated commands.
	 * @param commandContainer A container that carries the commands.
	 */
	handleCommands (commandContainer: DeviceCommandContainer) {
		if (commandContainer.deviceId === this.deviceId) {
			this._queue = commandContainer.commands
			this.checkCommandBus()
		}
	}
	get deviceType () {
		return DeviceType.CASPARCG
	}
	/**
	 * Takes a timeline state and returns a CasparCG State that will work with the state lib.
	 * @param timelineState The timeline state to generate from.
	 */
	private casparStateFromTimelineState (timelineState: TimelineState): StateNS.State {

		const caspar = new StateNS.State()

		_.each(timelineState.LLayers, (layer: TimelineResolvedObject, layerName: string) => {
			const mapping: MappingCasparCG = this._mapping[layerName] as MappingCasparCG

			if (!mapping) {
				return
			} // we got passed a LLayer that doesn't belong to this device.

			const channel = new StateNS.Channel()
			channel.channelNo = Number(mapping.channel) || 1
			// @todo: check if we need fps as well.
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
					playing: true
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
					let routeMapping = this._mapping[layer.content.attributes.LLayer]
					if (routeMapping) {
						layer.container.attributes.channel = routeMapping.channel
						layer.container.attributes.layer = routeMapping.layer
					}
				}
				let l: StateNS.IRouteLayer = {
					layerNo: mapping.layer,
					content: StateNS.LayerContentType.ROUTE,
					media: 'route',
					route: {
						channel: layer.container.attributes.channel,
						layer: layer.container.attributes.layer
					},
					playing: true,
					playTime: layer.resolved.startTime
				}
				stateLayer = l
			} else if (layer.content.type === 'record') {
				let l: StateNS.IRecordLayer = {
					layerNo: mapping.layer,
					content: StateNS.LayerContentType.RECORD,
					encoderOptions: layer.content.attributes.file + ' ' + layer.content.attributes.encoderOptions,
					playing: true,
					playTime: layer.resolved.startTime
				}
				stateLayer = l
			}

			if (layer.content.transitions) {
				switch (layer.content.type) {
					case 'video' || 'ip' || 'template' || 'input' || 'route':
						// create transition object
						let media = stateLayer.media
						let transitions = {}

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

	/**
	 * This checks the _queue to see if any commands should be sent to CasparCG.
	 * @todo: replace with timecode scheduled commands.
	 */
	private checkCommandBus () {
		if (this._queue) {
			while (this._queue.length > 0 && this._queue[0].time < Date.now() / 1000 + .02) {
				let commandContainer = this._queue[0]
				this._queue.splice(0, 1)

				_.each(commandContainer.commands, (commandObj) => {
					let command = AMCPUtil.deSerialize(commandObj, 'id')
					this._ccg.do(command)

					this._ccgState.applyCommands([ { cmd: commandObj } ])
				})
			}
		}
	}
}
