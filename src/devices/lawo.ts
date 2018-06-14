import * as _ from 'underscore'
import { Device, DeviceOptions } from './device'
import { DeviceType, MappingLawo, Mappings } from './mapping'

import { TimelineState, TimelineResolvedObject } from 'superfly-timeline'
import { DeviceTree, Ember } from 'emberplus'
import { DoOnTime } from '../doOnTime'

/*
	This is a wrapper for an "Abstract" device

	An abstract device is just a test-device that doesn't really do anything, but can be used
	as a preliminary mock
*/
export interface LawoOptions extends DeviceOptions {
	options?: {
		commandReceiver?: (time: number, cmd) => void,
		host?: string,
		port?: number
	}
}
export enum TimelineContentTypeLawo { //  Lawo-state
	LAWO = 'lawo' // a general content type, possibly to be replaced by specific ones later?
}
interface TimelineLawoObject extends TimelineResolvedObject {
	content: {
		type: TimelineContentTypeLawo,
		attributes: {
			[lawoProperty: string]: any
		}
	}
}
export interface LawoState {
	[path: string]: LawoStateNode
}
export interface LawoStateNode {
	[attrName: string]: LawoStateNodeAttr
}
export type LawoStateNodeBaseAttr = boolean | number | string
export type LawoStateNodeAttr = LawoStateNodeBaseAttr | LawoStateNodeAttrTransition
export interface LawoStateNodeAttrTransition {
	value: LawoStateNodeBaseAttr
	transitionDuration: number
}
export interface LawoCommand {
	path: string,
	attribute: string,
	value: LawoStateNodeBaseAttr,
	transitionDuration?: number
}
export class LawoDevice extends Device {
	private _doOnTime: DoOnTime
	// private _queue: Array<{ time: number, command: LawoCommand}>
	private _device: DeviceTree
	private _resolveMappingsOnConnect = false
	private _mappingToAttributes: { [layerName: string]: { [attrName: string]: number } } = {}
	private _savedNodes: { [pathName: string]: Ember.Node } = {}
	private _sourceNames: { [index: string]: string } = {}

	private _commandReceiver: (time: number, cmd: LawoCommand) => void

	constructor (deviceId: string, deviceOptions: LawoOptions, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) {
				this._commandReceiver = deviceOptions.options.commandReceiver
			} else {
				this._commandReceiver = this._defaultCommandReceiver
			}
		}
		let host = (
			deviceOptions.options && deviceOptions.options.host
			? deviceOptions.options.host :
			null
		)
		let port = (
			deviceOptions.options && deviceOptions.options.port ?
			deviceOptions.options.port :
			null
		)
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		})

		this._device = new DeviceTree(host, port)
		this._device.on('connected', () => {
			this._savedNodes = {} // reset cache
			if (this._resolveMappingsOnConnect) {
				this._resolveMappings()
			}
			this._device.getNodeByPath([1, 1]).then((node) => {
				this._device.getDirectory(node).then((res) => {
					const children = node.getChildren()
					if (!node || !children || !res ) return // no sources here.
					for (const child of children) {
						this._sourceNames[child.number] = child.identifier
					}
				})
			})
		})
		// this._enforceDeviceState()

		// setInterval(() => {
		// 	// send any commands due:

		// 	let now = this.getCurrentTime()

		// 	// console.log('check queue ' + now, _.values(this._queue).length )

		// 	this._queue = _.reject(this._queue, (q) => {
		// 		if (q.time <= now) {
		// 			if (this._commandReceiver) {
		// 				this._commandReceiver(now, q.command)
		// 			}
		// 			return true
		// 		}
		// 		return false
		// 	})
		// }, 100)
	}

	/**
	 * Initiates the connection with Lawo
	 */
	init (): Promise<boolean> {
		return new Promise((resolve/*, reject*/) => {
			this._device.connect().then(() => resolve(true))
			// @todo: timeout
		})
	}
	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified

		console.log('handleState', newState.time)

		let oldState: TimelineState = this.getStateBefore(newState.time) || {time: 0, LLayers: {}, GLayers: {}}

		let oldLawoState = this.convertStateToLawo(oldState)
		console.log('oldLawoState', oldLawoState)
		let newLawoState = this.convertStateToLawo(newState)
		console.log('newLawoState', newLawoState)

		let commandsToAchieveState: Array<LawoCommand> = this._diffStates(oldLawoState, newLawoState)

		console.log('commandsToAchieveState', commandsToAchieveState)
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueAfter(newState.time)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// clear any queued commands on this time:
		// this._queue = _.reject(this._queue, (q) => { return q.time === newState.time })

		// add the new commands to the queue:
		// _.each(commandsToAchieveState, (cmd) => {
		// 	this._queue.push({
		// 		time: newState.time,
		// 		command: cmd
		// 	})
		// })
		// console.log('_queue', this._queue)

		// store the new state, for later use:
		this.setState(newState)
	}
	clearFuture (clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
		// this._queue = _.reject(this._queue, (q) => { return q.time > clearAfterTime })
	}
	get connected (): boolean {
		return false
	}
	convertStateToLawo (state: TimelineState): LawoState {
		// convert the timeline state into something we can use
		// console.log('convertStateToLawo -----------')
		const lawoState: LawoState = {}

		_.each(state.LLayers, (tlObject: TimelineLawoObject, layerName: string) => {
			// console.log(tlObject.content)
			const mapping: MappingLawo | undefined = this.mapping[layerName] as MappingLawo
			if (mapping && mapping.device === DeviceType.LAWO ) {

				let path = mapping.path.join('/')

				if (tlObject.content.type === TimelineContentTypeLawo.LAWO) {

					let lawoObject: LawoStateNode = _.extend(
						lawoState[path] || {},
						tlObject.content.attributes
					)
					lawoState[path] = lawoObject
				}
			}
		})
		// console.log('lawoState before defaults', lawoState)
		// Apply default states defined in mappings
		_.each(this.mapping, (mapping: MappingLawo) => {
			if (mapping && mapping.device === DeviceType.LAWO && mapping.defaults) {
				let path = mapping.path.join('/')
				let lawoObject: LawoStateNode = _.extend(
					{}, // to not overwrite defaults object
					mapping.defaults,
					lawoState[path] || {}
				)
				lawoState[path] = lawoObject
			}
		})

		return lawoState
	}
	get deviceType () {
		return DeviceType.LAWO
	}
	get deviceName (): string {
		return 'Lawo ' + this.deviceId
	}
	get queue () {
		return this._doOnTime.getQueue()
	}

	set mapping (mappings: Mappings) {
		super.mapping = mappings

		if (this._device.isConnected()) {
			this._resolveMappings()
		} else {
			this._resolveMappingsOnConnect = true
		}
	}
	get mapping () {
		return super.mapping
	}
	private _addToQueue (commandsToAchieveState: Array<LawoCommand>, time: number) {
		_.each(commandsToAchieveState, (cmd: LawoCommand) => {

			// add the new commands to the queue:
			this._doOnTime.queue(time, (cmd: LawoCommand) => {
				this._commandReceiver(time, cmd)
			}, cmd)
		})
	}
	private _diffStates (oldLawoState: LawoState, newLawoState: LawoState): Array<LawoCommand> {

		let commands: Array<LawoCommand> = []

		let addCommand = (path, attrName, newAttr) => {
			if (typeof newAttr === 'object') {
				// it's a Transition:
				let transition: LawoStateNodeAttrTransition = newAttr
				commands.push({
					path,
					attribute: attrName,
					value: transition.value,
					transitionDuration: transition.transitionDuration
				})
			} else {
				// It's a plain value:
				commands.push({
					path,
					attribute: attrName,
					value: newAttr
				})
			}
		}
		_.each(newLawoState, (newNode: LawoStateNode, path: string) => {
			let oldNode: LawoStateNode = oldLawoState[path] || {}
			_.each(newNode, (newAttr: LawoStateNodeAttr, attrName: string ) => {
				let oldAttr = oldNode[attrName]
				if (!_.isEqual(newAttr, oldAttr) ) {
					console.log('# Not equal: ', newAttr, oldAttr)
					addCommand(path, attrName, newAttr)
				}
			})
		})
		// Removed attributes:
		_.each(oldLawoState, (oldNode: any, path: string) => {
			let newNode = newLawoState[path] || {}
			_.each(oldNode, (oldAttr: LawoStateNodeAttr, attrName: string ) => {
				if (!_.has(newNode, attrName)) {
					console.log('# Removed: ', oldAttr)
					addCommand(path, attrName, oldAttr)
				}
			})
		})
		return commands
	}

	// @ts-ignore no-unused-vars
	private _defaultCommandReceiver (time: number, command: LawoCommand) {
		if (command.transitionDuration && command.attribute === 'Motor dB Value') { // I don't think we can transition any other values
			const source = this._sourceNames[command.path.substr(4, 1)] // theoretically speaking anyway
			if (!source) return // maybe warn user?
			const faderRamp = new Ember.QualifiedFunction([1, 2, 2])
			this._device.invokeFunction(faderRamp, { source, value: command.value, duration: command.transitionDuration })
		} else {

			// TODO: this._mappingToAttributes is dependent of this.mappings, which we should not have any dependencies to at this point
			const path = _.map(command.path.split('/'), (val: string) => Number(val))
			path.push(this._mappingToAttributes[command.path][command.attribute])

			this._getNodeByPath(path).then((node: any) => {
				this._device.setValue(node, command.value).catch(console.log)
			})
		}
	}

	private async _getNodeByPath (path: Array<number>): Ember.Node {
		return new Promise ((resolve) => {
			if (this._savedNodes[path.join('/')] !== undefined) {
				resolve(this._savedNodes[path.join('/')])
			} else {
				this._device.getNodeByPath(path).then((node) => {
					this._savedNodes[path.join('/')] = node
					resolve(node)
				})
			}
		})
	}

	private _resolveMappings () {
		// @ts-ignore no-unused-vars
		_.each(this.mapping, (mapping: MappingLawo, layerName: string) => {
			const pathStr = mapping.path.join('/')
			this._getNodeByPath(mapping.path).then((node) => {
				// @todo: this might need a getDirectory() first.
				// @todo: should we subscribe to the node?
				_.each(node.getChildren(), (element: any) => {
					if (!this._mappingToAttributes[pathStr]) {
						this._mappingToAttributes[pathStr] = {}
					}
					this._mappingToAttributes[pathStr][element.contents.identifier] = element.number
				})
			})
		})
	}
}
