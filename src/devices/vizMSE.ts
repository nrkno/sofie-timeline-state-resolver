import * as _ from 'underscore'
import { EventEmitter } from 'events'
import {
	DeviceWithState,
	CommandWithContext,
	DeviceStatus,
	StatusCode
} from './device'

import {
	DeviceType,
	DeviceOptions,
	Mapping,
	MappingVizMSE,
	VizMSEOptions,
	ResolvedTimelineObjectInstanceExtended,
	TimelineContentTypeVizMSE,
	TimelineObjVIZMSEBase,
	TimelineObjVIZMSEElementInternal,
	TimelineObjVIZMSEElementPilot
} from '../types/src'

import {
	TimelineState, ResolvedTimelineObjectInstance
} from 'superfly-timeline'

import { createMSE, MSE, VRundown } from 'v-connection'

import { DoOnTime, SendMode } from '../doOnTime'

/** The ideal time to prepare elements before going on air */
const IDEAL_PREPARE_TIME = 1000
/** Minimum time to wait after preparing elements */
const PREPARE_TIME_WAIT = 50

// const DEFAULT_FPS = 25 // frames per second
// const JUMP_ERROR_MARGIN = 10 // frames

export interface VizMSEDeviceOptions extends DeviceOptions {
	options?: {
		commandReceiver?: CommandReceiver

	}
}
export type CommandReceiver = (time: number, cmd: VizMSECommand, context: string, timelineObjId: string) => Promise<any>
/**
 * This class is used to interface with a vizRT Media Sequence Editor, through the v-connection library
 */
export class VizMSEDevice extends DeviceWithState<VizMSEState> {

	private _vizMSE?: MSE
	private _vizmseManager?: VizMSEManager

	private _commandReceiver: CommandReceiver

	private _doOnTime: DoOnTime
	private _connectionOptions?: VizMSEOptions
	private _vizMSEConnected: boolean = false
	// private _initialized: boolean = false

	constructor (deviceId: string, deviceOptions: VizMSEDeviceOptions, options) {
		super(deviceId, deviceOptions, options)

		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}

		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		}, SendMode.IN_ORDER, this._deviceOptions)
		this.handleDoOnTime(this._doOnTime, 'VizMSE')
	}

	async init (connectionOptions: VizMSEOptions): Promise<boolean> {
		this._connectionOptions = connectionOptions
		if (!this._connectionOptions.host) 	throw new Error('VizMSE bad connection option: host')

		this._vizMSE = createMSE(
			this._connectionOptions.host,
			this._connectionOptions.restPort,
			this._connectionOptions.wsPort
		)

		this._vizmseManager = new VizMSEManager(
			this._vizMSE,
			() => this.getCurrentTime()
		)

		this._vizmseManager.on('connectionChanged', (connected) => this._connectionChanged(connected))

		await this._vizmseManager.initialize(
			connectionOptions.showID,
			connectionOptions.profile
		)

		

		// this._vizmse.on('error', e => this.emit('error', 'VizMSE.v-connection', e))
		// this._vizmseManager.on('info', str => this.emit('info', 'VizMSE: ' + str))
		// this._vizmseManager.on('warning', str => this.emit('warning', 'VizMSE' + str))
		// this._vizmseManager.on('error', e => this.emit('error', 'VizMSE', e))
		// this._vizmseManager.on('debug', (...args) => this.emit('debug', ...args))

		// this._initialized = true

		return true
	}

	/**
	 * Terminates the device safely such that things can be garbage collected.
	 */
	async terminate (): Promise<boolean> {
		if (this._vizmseManager) {
			await this._vizmseManager.terminate()
			delete this._vizmseManager
		}
		this._doOnTime.dispose()

		return true
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState (newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	/**
	 * Generates an array of VizMSE commands by comparing the newState against the oldState, or the current device state.
	 */
	handleState (newState: TimelineState) {
		// check if initialized:
		if (!this._vizmseManager || !this._vizmseManager.initialized) {
			this.emit('warning', 'VizMSE.v-connection not initialized yet')
			return
		}

		let previousStateTime = Math.max(this.getCurrentTime(), newState.time)

		let oldVizMSEState: VizMSEState = (
			this.getStateBefore(previousStateTime) ||
			{ state: { time: 0, layer: {} } }
		).state

		let newVizMSEState = this.convertStateToVizMSE(newState)

		let commandsToAchieveState = this._diffStates(oldVizMSEState, newVizMSEState, newState.time)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)

		// add the new commands to the queue
		this._addToQueue(commandsToAchieveState)

		// store the new state, for later use:
		this.setState(newVizMSEState, newState.time)
	}

	/**
	 * Clear any scheduled commands after this time
	 * @param clearAfterTime
	 */
	clearFuture (clearAfterTime: number) {
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	get canConnect (): boolean {
		return true
	}
	get connected (): boolean {
		return this._vizMSEConnected
	}

	get deviceType () {
		return DeviceType.VIZMSE
	}
	get deviceName (): string {
		return `VizMSE ${this._vizMSE ? this._vizMSE.hostname : 'Uninitialized'}`
	}

	get queue () {
		return this._doOnTime.getQueue()
	}

	/**
	 * Takes a timeline state and returns a VizMSE State that will work with the state lib.
	 * @param timelineState The timeline state to generate from.
	 */
	convertStateToVizMSE (timelineState: TimelineState): VizMSEState {

		const state: VizMSEState = {
			time: timelineState.time,
			layer: {}
		}

		const mappings = this.getMapping()

		_.each(timelineState.layers, (layer: ResolvedTimelineObjectInstance, layerName: string) => {

			const layerExt = layer as ResolvedTimelineObjectInstanceExtended
			let foundMapping: Mapping = mappings[layerName]

			let isLookahead = false
			if (!foundMapping && layerExt.isLookahead && layerExt.lookaheadForLayer) {
				foundMapping = mappings[layerExt.lookaheadForLayer]
				isLookahead = true
			}
			if (
				foundMapping &&
				foundMapping.device === DeviceType.VIZMSE
			) {
				if (layer.content) {

					if (layer.content.type === TimelineContentTypeVizMSE.ELEMENT_INTERNAL) {
						const l = layer as any as TimelineObjVIZMSEElementInternal

						state.layer[layerName] = {
							timelineObjId: l.id,
							contentType: TimelineContentTypeVizMSE.ELEMENT_INTERNAL,
							continueStep: l.content.continueStep,

							templateName: l.content.templateName,
							templateData: l.content.templateData
						}
					} else if (layer.content.type === TimelineContentTypeVizMSE.ELEMENT_PILOT) {
						const l = layer as any as TimelineObjVIZMSEElementPilot
						state.layer[layerName] = {
							timelineObjId: l.id,
							contentType: TimelineContentTypeVizMSE.ELEMENT_PILOT,
							continueStep: l.content.continueStep,

							templateVcpId: l.content.templateVcpId

						}
					}

					if (isLookahead) state.layer[layerName].lookahead = true
				}
			}
		})

		return state

	}

	/**
	 * Prepares the physical device for playout.
	 * @param okToDestroyStuff Whether it is OK to do things that affects playout visibly
	 */
	async makeReady (okToDestroyStuff?: boolean): Promise<void> {

		await this._vizmseManager.activate()

		if (okToDestroyStuff) {
			// reset our own state(s):
			this.clearStates()
		}
	}
	/**
	 * The standDown event could be triggered at a time after broadcast
	 * @param okToDestroyStuff If true, the device may do things that might affect the visible output
	 */
	async standDown (okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			await this._vizmseManager.deactivate()
		}
	}
	getStatus (): DeviceStatus {
		let statusCode = StatusCode.GOOD
		let messages: Array<string> = []

		if (!this._vizMSEConnected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		}
		// if (this._vizMSE.statusMessage) {
		// 	statusCode = StatusCode.BAD
		// 	messages.push(this._vizMSE.statusMessage)
		// }

		// if (!this._vizMSE.initialized) {
		// 	statusCode = StatusCode.BAD
		// 	messages.push(`VizMSE device connection not initialized (restart required)`)
		// }

		return {
			statusCode: statusCode,
			messages: messages
		}
	}

	private _diffStates (oldState: VizMSEState, newState: VizMSEState, time: number): Array<VizMSECommand> {
		const highPrioCommands: VizMSECommand[] = []
		const lowPrioCommands: VizMSECommand[] = []

		const addCommand = (command: VizMSECommand, lowPriority?: boolean) => {
			(lowPriority ? lowPrioCommands : highPrioCommands).push(command)
		}

		/** The time of when to run "preparation" commands */
		let prepareTime = Math.min(
			time,
			Math.max(
				time - IDEAL_PREPARE_TIME,
				oldState.time + PREPARE_TIME_WAIT // earliset possible prepareTime
			)
		)
		if (prepareTime < this.getCurrentTime()) { // Only to not emit an unnessesary slowCommand event
			prepareTime = this.getCurrentTime()
		}
		if (time < prepareTime) {
			prepareTime = time - 10
		}

		_.each(newState.layer, (newLayer: VizMSEStateLayer, layerId: string) => {
			const oldLayer: VizMSEStateLayer | undefined = oldState.layer[layerId]

			// if (
			// 	!oldLayer ||
			// 	!_.isEqual(newLayer.channels, oldLayer.channels)
			// ) {
			// 	const channel = newLayer.channels[0] as number | undefined
			// 	if (channel !== undefined) { // todo: support for multiple channels
			// 		addCommand({
			// 			type: VizMSECommandType.SETUPPORT,
			// 			time: prepareTime,
			// 			portId: portId,
			// 			timelineObjId: newLayer.timelineObjId,
			// 			channel: channel
			// 		}, newLayer.lookahead)
			// 	}
			// }

			if (
				!oldLayer ||
				!_.isEqual(
					_.omit(newLayer, ['continueStep']),
					_.omit(oldLayer, ['continueStep'])
				)
			) {
				if (
					newLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL ||
					newLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT
				) {
					// Maybe prepare the element first:
					addCommand({
						type: VizMSECommandType.PREPARE_ELEMENT,
						time: prepareTime,
						timelineObjId: newLayer.timelineObjId,
						fromLookahead: newLayer.lookahead,

						elementName: this._getElementName(newLayer),
						templateName: this._getTemplateName(newLayer),
						textFields: this._getTemplateData(newLayer)
					}, newLayer.lookahead)

					// Start playing
					addCommand({
						type: VizMSECommandType.TAKE_ELEMENT,
						time: time,
						timelineObjId: newLayer.timelineObjId,
						fromLookahead: newLayer.lookahead,

						elementName: this._getElementName(newLayer),
						templateName: this._getTemplateName(newLayer),
						textFields: this._getTemplateData(newLayer)

					}, newLayer.lookahead)
				}
			} else if (
				(newLayer.continueStep || 0) > (oldLayer.continueStep || 0)
			) {
				// A change in continueStep should result in triggering a continue:
				addCommand({
					type: VizMSECommandType.CONTINUE_ELEMENT,
					time: prepareTime,
					timelineObjId: newLayer.timelineObjId,
					fromLookahead: newLayer.lookahead,

					elementName: this._getElementName(newLayer)

				}, newLayer.lookahead)
			}
		})

		_.each(oldState.layer, (oldLayer: VizMSEStateLayer, layerId: string) => {
			const newLayer = newState.layer[layerId]
			if (!newLayer) {
				// Stopped playing
				addCommand({
					type: VizMSECommandType.TAKEOUT_ELEMENT,
					time: prepareTime,
					timelineObjId: oldLayer.timelineObjId,
					fromLookahead: oldLayer.lookahead,

					elementName: this._getElementName(oldLayer)

				}, oldLayer.lookahead)
			}
		})

		return highPrioCommands.concat(lowPrioCommands)
	}
	private _doCommand (command: VizMSECommand, context: string, timlineObjId: string): Promise<void> {
		let time = this.getCurrentTime()
		return this._commandReceiver(time, command, context, timlineObjId)
	}
	/**
	 * Use either AMCP Command Scheduling or the doOnTime to execute commands at
	 * {@code time}.
	 * @param commandsToAchieveState Commands to be added to queue
	 * @param time Point in time to send commands at
	 */
	private _addToQueue (commandsToAchieveState: Array<VizMSECommand>) {
		_.each(commandsToAchieveState, (cmd: VizMSECommand) => {
			this._doOnTime.queue(cmd.time, cmd.layerId, (c: {cmd: VizMSECommand}) => {
				return this._doCommand(c.cmd, c.cmd.type + '_' + c.cmd.timelineObjId, c.cmd.timelineObjId)
			}, { cmd: cmd })
		})

	}
	/**
	 * Sends commands to the VizMSE ISA server
	 * @param time deprecated
	 * @param cmd Command to execute
	 */
	private async _defaultCommandReceiver (_time: number, cmd: VizMSECommand, context: string, timelineObjId: string): Promise<any> {

		let cwc: CommandWithContext = {
			context: context,
			timelineObjId: timelineObjId,
			command: cmd
		}
		this.emit('debug', cwc)

		try {

			if (cmd.type === VizMSECommandType.PREPARE_ELEMENT) {
				await this._vizmseManager.prepareElement()
			} else if (cmd.type === VizMSECommandType.CUE_ELEMENT) {
				await this._vizmseManager.cueElement()
			} else if (cmd.type === VizMSECommandType.TAKE_ELEMENT) {
				await this._vizmseManager.takeElement()
			} else if (cmd.type === VizMSECommandType.TAKEOUT_ELEMENT) {
				await this._vizmseManager.takeoutElement()
			} else if (cmd.type === VizMSECommandType.CONTINUE_ELEMENT) {
				await this._vizmseManager.continueElement()
			} else {
				// @ts-ignore never
				throw new Error(`Unsupported command type "${cmd.type}"`)
			}
		} catch (error) {
			let errorString = (
				error && error.message ?
				error.message :
				error.toString()
			)
			this.emit('commandError', new Error(errorString), cwc)
		}
	}
	private _connectionChanged (connected?: boolean) {
		if (connected === true || connected === false) this._vizMSEConnected = connected
		this.emit('connectionChanged', this.getStatus())
	}
	private _getTemplateName (layer: VizMSEStateLayer): string {
		if (layer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL) return layer.templateName
		// if (layer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT) return layer.templateVcpId
		throw new Error(`Unknown layer.contentType "${layer['contentType']}"`)
	}
	private _getTemplateData (layer: VizMSEStateLayer): string[] {
		if (layer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL) return layer.templateData
		return []
	}
	private _getElementName (layer: VizMSEStateLayer): string | number {
		if (layer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL) {
			return 'sofieInt_' + layer.templateName + layer.templateData.join(',')
		}
		if (layer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT) return layer.templateVcpId

		throw new Error(`Unknown layer.contentType "${layer['contentType']}"`)
	}
}
class VizMSEManager extends EventEmitter {
	public initialized: boolean = false
	private _vizmseState: VizMSETrackedState = {
		elements: {}
	}
	private _rundown: VRundown | undefined

	private _cache = new Cache()

	constructor (
		private _vizMSE: MSE,
		private getCurrentTime: () => number
	) {
		super()
		// this._vizmse.on('error', (...args) => this.emit('error', ...args))
		// this._vizmse.on('debug', (...args) => this.emit('debug', ...args))
	}

	public async initialize (
		showID: string,
		profile: string
	): Promise<void> {
		this._vizMSE.on('connected', () => this.emit('connectionChanged', true))
		this._vizMSE.on('disconnected', () => this.emit('connectionChanged', false))

		await this._vizMSE.ping()
		this.emit('connectionChanged', true)

		// Setup the rundown used by this device

		// check if it already exists:
		this._rundown = _.find(this._vizMSE.getRundowns(), (rundown) => {
			return (
				rundown.show === showID &&
				rundown.profile === profile
			)
		})
		if (!this._rundown) {
			this._rundown = await this._vizMSE.createRundown(
				showID,
				profile
			)
		}

		if (!this._rundown) throw new Error(`VizMSEManager: unable to create rundown!`)

		// const profile = await this._vizMSE.getProfile('sofie') // TODO: Figure out if this is needed
		this.initialized = true
	}
	public async terminate () {
		if (this._vizMSE) {
			await this._vizMSE.close()
			delete this._vizMSE
		}
	}
	public async activate (): Promise<void> {
		if (!this._rundown) throw new Error(`Not initialized!`)
		await this._rundown.activate()
	}
	public async deactivate (): Promise<void> {
		if (!this._rundown) throw new Error(`Not initialized!`)
		await this._rundown.deactivate()
	}
	public async prepareElement (cmd: VizMSECommandPrepare): Promise<void> {
		if (!this._rundown) throw new Error(`Not initialized!`)

	}
	public async cueElement (cmd: VizMSECommandCue): Promise<void> {
		if (!this._rundown) throw new Error(`Not initialized!`)

	}
	public async takeElement (cmd: VizMSECommandTake): Promise<void> {
		if (!this._rundown) throw new Error(`Not initialized!`)

	}
	public async takeoutElement (cmd: VizMSECommandTakeOut): Promise<void> {
		if (!this._rundown) throw new Error(`Not initialized!`)

	}
	public async continueElement (cmd: VizMSECommandContinue): Promise<void> {
		if (!this._rundown) throw new Error(`Not initialized!`)

	}

	public async setupPort (cmd: VizMSECommandSetupPort): Promise<void> {
		const trackedPort = this._vizmseState.port[cmd.portId]

		// Check if the port is already set up
		if (
			!trackedPort ||
			trackedPort.channel !== cmd.channel
		) {
			let port: Q.PortStatus | null = null
			// Setup a port and connect it to a channel
			try {
				port = await this._vizmse.getPort(cmd.portId)
			} catch (e) {
				// If the GET fails, it might be something unknown wrong.
				// A temporary workaround is to send a delete on that port and try again, it might work.
				try {
					await this._vizmse.releasePort(cmd.portId)
				} catch {
					// ignore any errors
				}
				// Try again:
				port = await this._vizmse.getPort(cmd.portId)
			}
			if (port) {
				// port already exists, release it first:
				await this._vizmse.releasePort(cmd.portId)
			}
			await this._vizmse.createPort(cmd.portId, cmd.channel)

			// Store to the local tracking state:
			this._vizmseState.port[cmd.portId] = {
				loadedFragments: {},
				offset: -1,
				playing: false,
				jumpOffset: null,
				scheduledStop: null,
				channel: cmd.channel
			}
		}
	}
	public async releasePort (cmd: VizMSECommandReleasePort): Promise<void> {
		try {
			await this._vizmse.releasePort(cmd.portId)
		} catch (e) {
			if (e.status !== 404) { // releasing a non-existent port is OK
				throw e
			}
		}
		// Store to the local tracking state:
		delete this._vizmseState.port[cmd.portId]
	}
	public async loadClipFragments (cmd: VizMSECommandLoadClipFragments): Promise<void> {

		const trackedPort = this.getTrackedPort(cmd.portId)

		const server = await this.getServer()

		let clipId = await this.getClipId(cmd.clip)
		const clipData = await this._vizmse.getClip(clipId)
		if (!clipData) throw new Error(`Clip ${clipId} not found`)
		if (!clipData.PoolID) throw new Error(`Clip ${clipData.ClipID} missing PoolID`)

		// Check that the clip is present on the server:
		if ((server.pools || []).indexOf(clipData.PoolID) === -1) {
			throw new Error(`Clip "${clipData.ClipID}" PoolID ${clipData.PoolID} not found on server (${server.ident})`)
		}

		let useInOutPoints: boolean = !!(
			cmd.clip.inPoint ||
			cmd.clip.length
		)

		let inPoint = cmd.clip.inPoint
		let length = cmd.clip.length

		/** In point [frames] */
		const inPointFrames: number = (
			inPoint ?
			Math.round(inPoint * DEFAULT_FPS / 1000) : // todo: handle fps, get it from clip?
			0
		) || 0

		/** Duration [frames] */
		let lengthFrames: number = (
			length ?
			Math.round(length * DEFAULT_FPS / 1000) : // todo: handle fps, get it from clip?
			0
		) || parseInt(clipData.Frames, 10) || 0

		if (inPoint && !length) {
			lengthFrames -= inPointFrames
		}

		const outPointFrames = inPointFrames + lengthFrames

		let portInPoint: number
		let portOutPoint: number
		// Check if the fragments are already loaded on the port?
		const loadedFragments = trackedPort.loadedFragments[clipId]
		if (
			loadedFragments &&
			loadedFragments.inPoint === inPointFrames &&
			loadedFragments.outPoint === outPointFrames
		) {
			// Reuse the already loaded fragment:
			portInPoint = loadedFragments.portInPoint
			// portOutPoint = loadedFragments.portOutPoint
		} else {
			// Fetch fragments of clip:
			const fragmentsInfo = await (
				useInOutPoints ?
				this._vizmse.getClipFragments(clipId, inPointFrames, outPointFrames) :
				this._vizmse.getClipFragments(clipId)
			)

			// Check what the end-frame of the port is:
			const portStatus = await this._vizmse.getPort(cmd.portId)
			if (!portStatus) throw new Error(`Port ${cmd.portId} not found`)
			// Load the fragments onto Port:
			portInPoint = portStatus.endOfData || 0
			const newPortStatus = await this._vizmse.loadFragmentsOntoPort(cmd.portId, fragmentsInfo.fragments, portInPoint)
			if (!newPortStatus) throw new Error(`Port ${cmd.portId} not found after loading fragments`)

			// Calculate the end of data of the fragments:
			portOutPoint = portInPoint + (
				fragmentsInfo.fragments
				.filter(fragment => (
					fragment.type === 'VideoFragment' && // Only use video, so that we don't risk ending at a black frame
					fragment.trackNum === 0 // < 0 are historic data (not used for automation), 0 is the normal, playable video track, > 0 are extra channels, such as keys
				))
				.reduce((prev, current) => prev > current.finish ? prev : current.finish, 0) - 1 // newPortStatus.endOfData - 1
			)

			// Store a reference to the beginning of the fragments:
			trackedPort.loadedFragments[clipId] = {
				portInPoint: portInPoint,
				portOutPoint: portOutPoint,
				inPoint: inPointFrames,
				outPoint: outPointFrames
			}
		}
		// Prepare the jump?
		let timeLeftToPlay = cmd.timeOfPlay - this.getCurrentTime()
		if (timeLeftToPlay > 0) { // We have time to prepare the jump

			if (portInPoint > 0 && trackedPort.scheduledStop === null) {
				// Since we've now added fragments to the end of the port timeline, we should make sure it'll stop at the previous end
				await this._vizmse.portStop(cmd.portId, portInPoint - 1)
				trackedPort.scheduledStop = portInPoint - 1
			}

			await this._vizmse.portPrepareJump(cmd.portId, portInPoint)
			// Store the jump in the tracked state:
			trackedPort.jumpOffset = portInPoint
		}
	}
	public async playClip (cmd: VizMSECommandPlayClip): Promise<void> {
		await this.prepareClipJump(cmd, 'play')
	}
	public async pauseClip (cmd: VizMSECommandPauseClip): Promise<void> {
		await this.prepareClipJump(cmd, 'pause')
	}
	public async clearClip (cmd: VizMSECommandClearClip): Promise<void> {

		// Fetch tracked reference to the loaded clip:
		const trackedPort = this.getTrackedPort(cmd.portId)
		if (cmd.transition) {
			if (cmd.transition.type === VizMSETransitionType.DELAY) {
				if (await this.waitWithPort(cmd.portId, cmd.transition.delay)) {
					// at this point, the wait aws aborted by someone else. Do nothing then.
					return
				}
			}
		}
		// Reset the port (this will clear all fragments and reset playhead)
		await this._vizmse.resetPort(cmd.portId)

		trackedPort.loadedFragments = {}
		trackedPort.offset = -1
		trackedPort.playing = false
		trackedPort.jumpOffset = null
		trackedPort.scheduledStop = null
	}
	private async prepareClipJump (cmd: VizMSECommandClip, alsoDoAction?: 'play' | 'pause'): Promise<void> {

		// Fetch tracked reference to the loaded clip:
		const trackedPort = this.getTrackedPort(cmd.portId)
		if (cmd.transition) {
			if (cmd.transition.type === VizMSETransitionType.DELAY) {
				if (await this.waitWithPort(cmd.portId, cmd.transition.delay)) {
					// at this point, the wait aws aborted by someone else. Do nothing then.
					return
				}
			}
		}

		const clipId = await this.getClipId(cmd.clip)
		const loadedFragments = trackedPort.loadedFragments[clipId]

		if (!loadedFragments) {
			// huh, the fragments hasn't been loaded
			throw new Error(`Fragments of clip ${clipId} wasn't loaded`)
		}
		const clipFps = DEFAULT_FPS // todo: handle fps, get it from clip?
		const jumpToOffset = Math.floor(
			loadedFragments.portInPoint + (
				cmd.clip.playTime ?
				Math.max(0, (cmd.clip.pauseTime || this.getCurrentTime()) - cmd.clip.playTime) * clipFps / 1000 :
				0
			)
		)
		if (
			jumpToOffset === trackedPort.offset || // We're already there
			(
				alsoDoAction === 'play' &&
				// trackedPort.offset &&
				jumpToOffset > trackedPort.offset &&
				jumpToOffset - trackedPort.offset < JUMP_ERROR_MARGIN
				// We're probably a bit late, just start playing
			)
		) {
			// do nothing
		} else {

			if (
				trackedPort.jumpOffset !== null &&
				Math.abs(trackedPort.jumpOffset - jumpToOffset) > JUMP_ERROR_MARGIN
			) {
				// It looks like the stored jump is no longer valid
				// Invalidate stored jump:
				trackedPort.jumpOffset = null
			}
			// Jump the port playhead to the correct place
			if (trackedPort.jumpOffset !== null) {
				// Good, there is a prepared jump
				if (alsoDoAction === 'pause') {
					// Pause the playback:
					await this._vizmse.portStop(cmd.portId)
					trackedPort.scheduledStop = null
					trackedPort.playing = false
				}
				// Trigger the jump:
				await this._vizmse.portTriggerJump(cmd.portId)
				trackedPort.offset = trackedPort.jumpOffset
				trackedPort.jumpOffset = null
			} else {
				// No jump has been prepared
				if (cmd.mode === VizMSEControlMode.QUALITY) {

					// Prepare a soft jump:
					await this._vizmse.portPrepareJump(cmd.portId, jumpToOffset)
					trackedPort.jumpOffset = jumpToOffset

					if (alsoDoAction === 'pause') {
						// Pause the playback:
						await this._vizmse.portStop(cmd.portId)
						trackedPort.scheduledStop = null
						trackedPort.playing = false

						// Allow the server some time to load the clip:
						await this.wait(SOFT_JUMP_WAIT_TIME) // This is going to give the
					} else {
						// Allow the server some time to load the clip:
						await this.wait(SOFT_JUMP_WAIT_TIME) // This is going to give the
					}

					// Trigger the jump:
					await this._vizmse.portTriggerJump(cmd.portId)
					trackedPort.offset = trackedPort.jumpOffset
					trackedPort.jumpOffset = null

				} else { // cmd.mode === VizMSEControlMode.SPEED
					// Just do a hard jump:
					await this._vizmse.portHardJump(cmd.portId, jumpToOffset)

					trackedPort.offset = jumpToOffset
					trackedPort.playing = false
				}
			}
		}

		if (alsoDoAction === 'play') {
			// Start playing:
			await this._vizmse.portPlay(cmd.portId)

			await this.wait(60)

			// Check if the play actually succeeded:
			const portStatus = await this._vizmse.getPort(cmd.portId)

			if (!portStatus) {
				// oh, something's gone very wrong
				throw new Error(`VizMSE: After play, port doesn't exist anymore`)
			} else if (!portStatus.status.match(/playing/i)) {
				// The port didn't seem to have started playing, let's retry a few more times:

				this.emit('warning', `vizmseRecovery: port didn't play`)
				this.emit('warning', portStatus)

				for (let i = 0; i < 3; i++) {
					await this.wait(20)

					await this._vizmse.portPlay(cmd.portId)

					await this.wait(60 + i * 200) // Wait progressively longer times before trying again:

					const portStatus = await this._vizmse.getPort(cmd.portId)

					if (portStatus && portStatus.status.match(/playing/i)) {
						// it has started playing, all good!
						this.emit('warning', `vizmseRecovery: port started playing again, on try ${i}`)
						break
					} else {
						this.emit('warning', `vizmseRecovery: try ${i}, no luck trying again..`)
						this.emit('warning', portStatus)
					}
				}
			}
			trackedPort.scheduledStop = null
			trackedPort.playing = true

			// Schedule the port to stop at the last frame of the clip
			if (loadedFragments.portOutPoint) {
				await this._vizmse.portStop(cmd.portId, loadedFragments.portOutPoint)
				trackedPort.scheduledStop = loadedFragments.portOutPoint
			}
		} else if (
			alsoDoAction === 'pause' &&
			trackedPort.playing
		) {
			await this._vizmse.portHardJump(cmd.portId, jumpToOffset)

			trackedPort.offset = jumpToOffset
			trackedPort.playing = false
		}
	}
	private getTrackedPort (portId: string): VizMSETrackedStatePort {
		const trackedPort = this._vizmseState.port[portId]
		if (!trackedPort) {
			// huh, it looks like the port hasn't been created yet.
			// This is strange, it should have been created by a previously run SETUPPORT
			throw new Error(`Port ${portId} missing in tracked vizmse state`)
		}
		return trackedPort
	}
	private async getServer () {
		const server = await this._vizmse.getServer()
		if (!server) throw new Error(`VizMSE server ${this._vizmse.serverId} not found`)
		if (!server.pools) throw new Error(`Server ${server.ident} has no .pools`)
		if (!server.pools.length) throw new Error(`Server ${server.ident} has an empty .pools array`)

		return server
	}
	private async getClipId (clip: VizMSEStatePortClip): Promise<number> {
		let clipId = clip.clipId

		if (!clipId && clip.guid) {
			clipId = await this._cache.getSet(`clip.guid.${clip.guid}.clipId`, async () => {

				const server = await this.getServer()

				// Look up the clip:
				const foundClips = await this._vizmse.searchClip({
					ClipGUID: `"${clip.guid}"`
				})
				const foundClip = _.find(foundClips, (clip) => {
					return (
						clip.PoolID &&
						(server.pools || []).indexOf(clip.PoolID) !== -1
					)
				})
				if (!foundClip) throw new Error(`Clip with GUID "${clip.guid}" not found on server (${server.ident})`)
				return foundClip.ClipID
			})
		} else if (!clipId && clip.title) {
			clipId = await this._cache.getSet(`clip.title.${clip.title}.clipId`, async () => {

				const server = await this.getServer()

				// Look up the clip:
				const foundClips = await this._vizmse.searchClip({
					Title: `"${clip.title}"`
				})
				const foundClip = _.find(foundClips, (clip) => {
					return (
						clip.PoolID &&
						(server.pools || []).indexOf(clip.PoolID) !== -1
					)
				})
				if (!foundClip) throw new Error(`Clip with Title "${clip.title}" not found on server (${server.ident})`)
				return foundClip.ClipID
			})
		}
		if (!clipId) throw new Error(`Unable to determine clipId for clip "${clip.title || clip.guid}"`)

		return clipId
	}
}
class Cache {
	private data: {[key: string]: {
		endTime: number
		value: any
	}} = {}
	private callCount: number = 0
	set (key: string, value: any, ttl: number = 30000): any {
		this.data[key] = {
			endTime: Date.now() + ttl,
			value: value
		}
		this.callCount++
		if (this.callCount > 100) {
			this.callCount = 0
			this._triggerClean()
		}
		return value
	}
	get (key: string): any | undefined {
		const o = this.data[key]
		if (o && (o.endTime || 0) >= Date.now()) return o.value
	}
	exists (key: string): boolean {
		const o = this.data[key]
		return (o && (o.endTime || 0) >= Date.now())
	}
	getSet<T extends any> (key, fcn: () => T, ttl?: number): T {
		if (this.exists(key)) {
			return this.get(key)
		} else {
			let value = fcn()
			if (value && _.isObject(value) && _.isFunction(value.then)) {
				// value is a promise
				return (
					Promise.resolve(value)
					.then((value) => {
						return this.set(key, value, ttl)
					})
				) as any as T
			} else {
				return this.set(key, value, ttl)
			}
		}
	}
	private _triggerClean () {
		setTimeout(() => {
			_.each(this.data, (o, key) => {
				if ((o.endTime || 0) < Date.now()) {
					delete this.data[key]
				}
			})
		}, 1)
	}
}


interface VizMSEState {
	time: number
	layer: {
		[layerId: string]: VizMSEStateLayer
	}
}
type VizMSEStateLayer = VizMSEStateLayerInternal | VizMSEStateLayerPilot
interface VizMSEStateLayerBase {
	timelineObjId: string

	contentType: TimelineContentTypeVizMSE
	continueStep?: number

	lookahead?: boolean
}
interface VizMSEStateLayerInternal extends VizMSEStateLayerBase {
	contentType: TimelineContentTypeVizMSE.ELEMENT_INTERNAL

	templateName: string
	templateData: Array<string>
}
interface VizMSEStateLayerPilot extends VizMSEStateLayerBase {
	contentType: TimelineContentTypeVizMSE.ELEMENT_PILOT

	templateVcpId: number
}

interface VizMSECommandBase {
	time: number
	type: VizMSECommandType
	timelineObjId: string
	fromLookahead?: boolean
	layerId?: string
}
export enum VizMSECommandType {
	// ACTIVATE = 'activate', // something to be done before starting to use the viz engine
	// DEACTIVATE = 'deactivate', // something to be done when done with a viz engine

	PREPARE_ELEMENT = 'prepare',
	CUE_ELEMENT = 'cue',
	TAKE_ELEMENT = 'take',
	TAKEOUT_ELEMENT = 'out',
	CONTINUE_ELEMENT = 'continue'
}
// interface VizMSECommandActivate extends VizMSECommandBase {
// 	type: VizMSECommandType.ACTIVATE
// }
// interface VizMSECommandDeactivate extends VizMSECommandBase {
// 	type: VizMSECommandType.DEACTIVATE
// }
interface VizMSECommandElementBase extends VizMSECommandBase {
	templateName: string
	elementName: string | number // if number, it's a vizPilot element
	textFields: string[]
}
interface VizMSECommandPrepare extends VizMSECommandElementBase {
	type: VizMSECommandType.PREPARE_ELEMENT
}
interface VizMSECommandCue extends VizMSECommandElementBase {
	type: VizMSECommandType.CUE_ELEMENT
}
interface VizMSECommandTake extends VizMSECommandElementBase {
	type: VizMSECommandType.TAKE_ELEMENT
}
interface VizMSECommandTakeOut extends VizMSECommandBase {
	type: VizMSECommandType.TAKEOUT_ELEMENT

	elementName: string | number
}
interface VizMSECommandContinue extends VizMSECommandBase {
	type: VizMSECommandType.CONTINUE_ELEMENT

	elementName: string | number
}

type VizMSECommand = VizMSECommandPrepare |
	VizMSECommandCue |
	VizMSECommandTake |
	VizMSECommandTakeOut |
	VizMSECommandContinue

/** Tracked state of the vizMSE */
interface VizMSETrackedState {
	elements: {
		[elementName: string]: vizMSEElement
	}
}
interface vizMSEElement {
	// todo
}
// interface VizMSETrackedStatePort {
// 	/** Reference to the latest loaded fragments of a clip  */
// 	loadedFragments: {
// 		[clipId: number]: {
// 			/** The point (in a port) where the fragments starts [frames] */
// 			portInPoint: number
// 			/** The point (in a port) where the fragments ends [frames] */
// 			portOutPoint: number

// 			/** The inpoint used when loading the fragments */
// 			inPoint: number
// 			/** The outpoint used when loading the fragments */
// 			outPoint: number
// 		}
// 	}
// 	/** The (SDI)-output channel the port is using */
// 	channel: number

// 	/** The current offset of the playhead (only valid when not playing) */
// 	offset: number
// 	/** If the playhead is playing or not */
// 	playing: boolean
// 	/** When preparing a jump, this is the frame the cursor is set to  */
// 	jumpOffset: number | null
// 	/** When preparing a stop, this is the frame the playhead will stop at */
// 	scheduledStop: number | null
// }
// interface MappedPorts extends MonitorPorts {
// 	[portId: string]: {
// 		mode: VizMSEControlMode,
// 		channels: number[]
// 	}
// }
