import * as _ from 'underscore'
import { Device, DeviceOptions } from './device'
import { DeviceType, MappingLawo, Mappings } from './mapping'

import { TimelineState, TimelineResolvedObject } from 'superfly-timeline'
import { DeviceTree } from 'emberplus'

/*
	This is a wrapper for an "Abstract" device

	An abstract device is just a test-device that doesn't really do anything, but can be used
	as a preliminary mock
*/
export interface LawoOptions extends DeviceOptions {
	host: string,
	port: number,
	options?: {
		commandReceiver?: (time: number, cmd) => void
	}
}
export class LawoDevice extends Device {

	private _queue: Array<{ time: number, command: Object}>
	private _device: DeviceTree
	private _resolveMappingsOnConnect = false
	private _mappingToAttributes: { [layerName: string]: { [attrName: string]: number } } = {}

	private _commandReceiver: (time: number, cmd) => void

	constructor (deviceId: string, deviceOptions: LawoOptions, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}

		this._device = new DeviceTree(deviceOptions.host, deviceOptions.port)
		this._device.on('connected', () => {
			if (this._resolveMappingsOnConnect) {
				this._resolveMappings()
			}
		})
		// @todo: put the lawo into our default state

		setInterval(() => {
			// send any commands due:

			let now = this.getCurrentTime()

			// console.log('check queue ' + now, _.values(this._queue).length )

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
			this._device.connect().then(() => resolve(true))
			// @todo: timeout
		})
	}
	handleState (newState: TimelineState) {
		// Handle this new state, at the point in time specified

		// console.log('handleState')

		let oldState: TimelineState = this.getStateBefore(newState.time) || {time: 0, LLayers: {}, GLayers: {}}

		let oldLawoState = this.convertStateToLawo(oldState)
		let newLawoState = this.convertStateToLawo(newState)

		let commandsToAchieveState: Array<any> = this._diffStates(oldLawoState, newLawoState)

		// clear any queued commands on this time:
		this._queue = _.reject(this._queue, (q) => { return q.time === newState.time })

		// add the new commands to the queue:
		_.each(commandsToAchieveState, (cmd) => {
			this._queue.push({
				time: newState.time,
				command: cmd
			})
		})
		console.log(this._queue)

		// store the new state, for later use:
		this.setState(newState)
	}
	clearFuture (clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._queue = _.reject(this._queue, (q) => { return q.time > clearAfterTime })
	}
	get connected (): boolean {
		return false
	}
	convertStateToLawo (state: TimelineState) {
		// convert the timeline state into something we can use
		const lawoState: { [path: string]: { [attrName: string]: boolean | number | string }} = {}

		_.each(state.LLayers, (tlObject: TimelineResolvedObject, layerName: string) => {
			const mapping = this.mapping[layerName] as MappingLawo
			if (typeof mapping !== 'undefined') {
				lawoState[mapping.path.join('/')] = { ...lawoState[mapping.path.join('/')], ...tlObject.content }
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
		return _.values(this._queue)
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

	private _diffStates (oldLawoState, newLawoState) {
		// in this abstract class, let's just cheat:

		let commands: Array<any> = []

		_.each(newLawoState, (newNode: { [attrName: string]: boolean | number | string }, path: string) => {
			let oldNode = oldLawoState[path]
			const mapping = _.find(this.mapping, (mapping: MappingLawo) => mapping.path.join('/') === path) as MappingLawo
			const mappingAttrs = this._mappingToAttributes[path]
			if (!oldNode) oldNode = mapping.defaults
			for (const attr in newNode) {
				if (newNode[attr] !== oldNode[attr] && mappingAttrs[attr] !== undefined) {
					commands.push({ path, attribute: attr, value: newNode[attr] })
				}
			}
		})
		// removed
		_.each(oldLawoState, (oldNode: any, path: string) => {
			let newNode = newLawoState[path]
			if (!newNode) newNode = (_.find(this.mapping, (mapping: MappingLawo) => mapping.path.join('/') === path) as MappingLawo).defaults
			for (const attr in newNode) {
				if (newNode[attr] !== oldNode[attr]) {
					commands.push({ path, attribute: attr, value: newNode[attr] })
				}
			}
		})
		return commands
	}

	private _defaultCommandReceiver (time: number, command: { path: string, attribute: string, value: number | boolean | string }) {
		const path = _.map(command.path.split('/'), (val: string) => Number(val))
		path.push(this._mappingToAttributes[command.path][command.attribute])

		this._device.getNodeByPath(path).then((node: any) => {
			this._device.setValue(node, command.value).catch(console.log)
		})
	}

	private _resolveMappings () {
		_.each(this.mapping, (mapping: MappingLawo, layerName: string) => {
			const pathStr = mapping.path.join('/')
			this._device.getNodeByPath(mapping.path).then((node) => {
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
