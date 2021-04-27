import * as _ from 'underscore'
import * as underScoreDeepExtend from 'underscore-deep-extend'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode } from './device'
import { DoOnTime, SendMode } from '../doOnTime'

import { TimelineState } from 'superfly-timeline'
import * as OBSWebSocket from 'obs-websocket-js'
import {
	DeviceType,
	DeviceOptionsOBS,
	OBSOptions,
	Mappings,
	MappingOBS,
	TimelineContentTypeOBS,
	OBSRequest as OBSRequestName,
	TimelineObjOBSCurrentScene,
	MappingOBSType,
	TimelineObjOBSCurrentTransition,
	TimelineObjOBSRecording,
	TimelineObjOBSStreaming,
	TimelineObjOBSMute,
	TimelineObjOBSSceneItemRender,
	MappingOBSMute,
	MappingOBSSceneItemRender,
	TimelineObjOBSSourceSettings,
	MappingOBSSourceSettings,
} from 'timeline-state-resolver-types'

interface OBSRequest {
	requestName: OBSRequestName
	args: object
}

_.mixin({ deepExtend: underScoreDeepExtend(_) })
function deepExtend<T>(destination: T, ...sources: any[]) {
	// @ts-ignore (mixin)
	return _.deepExtend(destination, ...sources)
}
export interface DeviceOptionsOBSInternal extends DeviceOptionsOBS {
	options: DeviceOptionsOBS['options'] & {
		commandReceiver?: CommandReceiver
	}
}
export type CommandReceiver = (
	time: number,
	cmd: OBSCommandWithContext,
	context: CommandContext,
	timelineObjId: string
) => Promise<any>

type CommandContext = any
export interface OBSCommandWithContext {
	command: OBSRequest
	context: CommandContext
	timelineId: string
}

/**
 * This is a OBSDevice, it sends commands when it feels like it
 */
export class OBSDevice extends DeviceWithState<OBSState, DeviceOptionsOBSInternal> {
	private _doOnTime: DoOnTime

	private _commandReceiver: CommandReceiver
	private _obs: OBSWebSocket
	private _connected = false
	private _authenticated = false
	private _initialized = false

	constructor(deviceId: string, deviceOptions: DeviceOptionsOBSInternal, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) {
				this._commandReceiver = deviceOptions.options.commandReceiver
			} else this._commandReceiver = this._defaultCommandReceiver
		}
		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.IN_ORDER,
			this._deviceOptions
		)
		this._doOnTime.on('error', (e) => this.emit('error', 'OBS.doOnTime', e))
		this._doOnTime.on('slowCommand', (msg) => this.emit('slowCommand', this.deviceName + ': ' + msg))
	}
	init(options: OBSOptions): Promise<boolean> {
		this._obs = new OBSWebSocket()
		this._obs.on('AuthenticationFailure', () => {
			this._setConnected(true, false)
		})
		this._obs.on('AuthenticationSuccess', () => {
			this._initialized = true
			this._setConnected(true, true)
			this.emit('resetResolver')
		})
		this._obs.on('ConnectionClosed', () => {
			this._setConnected(false)
		})
		this._obs.on('error' as any, (e) => this.emit('error', 'OBS', e))

		return this._obs
			.connect({
				address: `${options.host}:${options.port}`,
				password: options.password,
			})
			.then(() => {
				// connected
				const time = this.getCurrentTime()
				const state = this._getDefaultState()
				this.setState(state, time)
				this._setConnected(true, this._authenticated)
				return true
			})
			.catch((err) => {
				// connection error
				this.emit('error', 'OBS', err)
				this._setConnected(false)
				return false
			})
	}
	private _connectionChanged() {
		this.emit('connectionChanged', this.getStatus())
	}

	private _setConnected(connected: boolean, authenticated = false) {
		if (this._connected !== connected || this._authenticated !== authenticated) {
			this._connected = connected
			this._authenticated = authenticated
			this._connectionChanged()
		}
	}

	private _getDefaultState(): OBSState {
		return {
			currentScene: undefined,
			currentTransition: undefined,
			muted: {},
			recording: undefined,
			streaming: undefined,
			scenes: {},
			sources: {},
		}
	}

	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime + 0.1)
		this.cleanUpStates(0, newStateTime + 0.1)
	}

	handleState(newState: TimelineState, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		if (!this._initialized) {
			// before it's initialized don't do anything
			this.emit('warning', 'OBS not initialized yet')
			return
		}

		const previousStateTime = Math.max(this.getCurrentTime() + 0.1, newState.time)
		const oldState: OBSState = (
			this.getStateBefore(previousStateTime) || {
				state: this._getDefaultState(),
			}
		).state

		const newOBSState = this.convertStateToOBS(newState, newMappings)

		const commandsToAchieveState: Array<any> = this._diffStates(oldState, newOBSState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)

		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newOBSState, newState.time)
	}

	clearFuture(clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}

	async terminate() {
		this._doOnTime.dispose()
		this._obs.disconnect()
		return Promise.resolve(true)
	}

	getStatus(): DeviceStatus {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		} else if (!this._authenticated) {
			statusCode = StatusCode.BAD
			messages.push('Not authenticated')
		}

		return {
			statusCode: statusCode,
			messages: messages,
			active: this.isActive,
		}
	}

	async makeReady(okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			// do something?
		}
	}

	get canConnect(): boolean {
		return false
	}

	get connected(): boolean {
		return false
	}

	convertStateToOBS(state: TimelineState, mappings: Mappings): OBSState {
		if (!this._initialized) {
			throw Error('convertStateToOBS cannot be used before inititialized')
		}

		const deviceState = this._getDefaultState()

		// Sort layer based on Mapping type (to make sure audio is after inputs) and Layer name
		const sortedLayers = _.sortBy(
			_.map(state.layers, (tlObject, layerName) => ({
				layerName,
				tlObject,
				mapping: mappings[layerName] as MappingOBS,
			})).sort((a, b) => a.layerName.localeCompare(b.layerName)),
			(o) => o.mapping.mappingType
		)

		_.each(sortedLayers, ({ tlObject, mapping }) => {
			if (mapping) {
				switch (mapping.mappingType) {
					case MappingOBSType.CurrentScene:
						if (tlObject.content.type === TimelineContentTypeOBS.CURRENT_SCENE) {
							const obsTlCurrentScene = tlObject as any as TimelineObjOBSCurrentScene
							deviceState.currentScene = obsTlCurrentScene.content.sceneName
						}
						break
					case MappingOBSType.CurrentTransition:
						if (tlObject.content.type === TimelineContentTypeOBS.CURRENT_TRANSITION) {
							const obsTlCurrentTransition = tlObject as any as TimelineObjOBSCurrentTransition
							deviceState.currentTransition = obsTlCurrentTransition.content.transitionName
						}
						break
					case MappingOBSType.Recording:
						if (tlObject.content.type === TimelineContentTypeOBS.RECORDING) {
							const obsTlRecording = tlObject as any as TimelineObjOBSRecording
							deviceState.recording = obsTlRecording.content.on
						}
						break
					case MappingOBSType.Streaming:
						if (tlObject.content.type === TimelineContentTypeOBS.STREAMING) {
							const obsTlStreaming = tlObject as any as TimelineObjOBSStreaming
							deviceState.streaming = obsTlStreaming.content.on
						}
						break
					case MappingOBSType.Mute:
						if (tlObject.content.type === TimelineContentTypeOBS.MUTE) {
							const obsTlMute = tlObject as any as TimelineObjOBSMute
							const source = (mapping as MappingOBSMute).source
							deviceState.muted[source] = obsTlMute.content.mute
						}
						break
					case MappingOBSType.SceneItemRender:
						if (tlObject.content.type === TimelineContentTypeOBS.SCENE_ITEM_RENDER) {
							const obsTlSceneItemRender = tlObject as any as TimelineObjOBSSceneItemRender
							const source = (mapping as MappingOBSSceneItemRender).source
							const sceneName = (mapping as MappingOBSSceneItemRender).sceneName
							deepExtend(deviceState.scenes[sceneName], {
								[sceneName]: {
									[source]: {
										render: obsTlSceneItemRender.content.on,
									},
								},
							})
						}
						break
					case MappingOBSType.SourceSettings:
						if (tlObject.content.type === TimelineContentTypeOBS.SOURCE_SETTINGS) {
							const obsTlSourceSettings = tlObject as any as TimelineObjOBSSourceSettings
							const source = (mapping as MappingOBSSourceSettings).source

							deepExtend(deviceState.sources, {
								[source]: {
									sourceType: obsTlSourceSettings.content.sourceType,
									sourceSettings: obsTlSourceSettings.content.sourceSettings,
								},
							})
						}
						break
				}
			}
		})
		return deviceState
	}

	get deviceType() {
		return DeviceType.OBS
	}

	get deviceName(): string {
		return 'OBS ' + this.deviceId
	}

	get queue() {
		return this._doOnTime.getQueue()
	}

	private _addToQueue(commandsToAchieveState: Array<OBSCommandWithContext>, time: number) {
		_.each(commandsToAchieveState, (cmd: OBSCommandWithContext) => {
			// add the new commands to the queue:
			this._doOnTime.queue(
				time,
				undefined,
				(cmd: OBSCommandWithContext) => {
					return this._commandReceiver(time, cmd, cmd.context, cmd.timelineId)
				},
				cmd
			)
		})
	}

	private _resolveCurrentSceneState(oldState: OBSState, newState: OBSState): Array<OBSCommandWithContext> {
		const commands: Array<OBSCommandWithContext> = []
		const oldCurrentScene = oldState.currentScene
		const newCurrentScene = newState.currentScene
		if (newCurrentScene !== undefined) {
			if (oldCurrentScene !== newCurrentScene) {
				commands.push({
					command: {
						requestName: OBSRequestName.SET_CURRENT_SCENE,
						args: {
							'scene-name': newCurrentScene,
						},
					},
					context: null,
					timelineId: '',
				})
			}
		}

		return commands
	}

	private _resolveCurrentTransitionState(oldState: OBSState, newState: OBSState): Array<OBSCommandWithContext> {
		const commands: Array<OBSCommandWithContext> = []

		const oldCurrentTransition = oldState.currentTransition
		const newCurrentTransition = newState.currentTransition
		if (newCurrentTransition !== undefined) {
			if (oldCurrentTransition !== newCurrentTransition) {
				commands.push({
					command: {
						requestName: OBSRequestName.SET_CURRENT_TRANSITION,
						args: {
							'transition-name': newCurrentTransition,
						},
					},
					context: null,
					timelineId: '',
				})
			}
		}

		return commands
	}

	private _resolveRecordingStreaming(oldState: OBSState, newState: OBSState): Array<OBSCommandWithContext> {
		const commands: Array<OBSCommandWithContext> = []

		const oldRecording = oldState.recording
		const newRecording = newState.recording
		if (newRecording !== undefined) {
			if (oldRecording !== newRecording) {
				commands.push({
					command: {
						requestName: newRecording ? OBSRequestName.START_RECORDING : OBSRequestName.STOP_RECORDING,
						args: {},
					},
					context: null,
					timelineId: '',
				})
			}
		}

		const oldStreaming = oldState.streaming
		const newStreaming = newState.streaming
		if (newStreaming !== undefined) {
			if (oldStreaming !== newStreaming) {
				commands.push({
					command: {
						requestName: newStreaming ? OBSRequestName.START_STREAMING : OBSRequestName.STOP_STREAMING,
						args: {},
					},
					context: null,
					timelineId: '',
				})
			}
		}

		return commands
	}

	private _resolveMute(oldState: OBSState, newState: OBSState): Array<OBSCommandWithContext> {
		const commands: Array<OBSCommandWithContext> = []

		const oldMuted = oldState.muted
		const newMuted = newState.muted
		Object.keys(newMuted).forEach((source) => {
			if (newMuted[source] !== oldMuted[source]) {
				commands.push({
					command: {
						requestName: OBSRequestName.SET_MUTE,
						args: {
							source: source,
							mute: newMuted[source],
						},
					},
					context: null,
					timelineId: '',
				})
			}
		})

		return commands
	}

	private _resolveScenes(oldState: OBSState, newState: OBSState): Array<OBSCommandWithContext> {
		const commands: Array<OBSCommandWithContext> = []

		const oldScenes = oldState.scenes
		const newScenes = newState.scenes
		Object.entries(newScenes).forEach(([sceneName, scene]) => {
			Object.entries(scene.sceneItems).forEach(([source, newSceneItemProperties]) => {
				const oldSceneItemProperties = oldScenes[sceneName]?.sceneItems[source]
				if (
					(oldSceneItemProperties as any) === undefined ||
					newSceneItemProperties.render !== oldSceneItemProperties.render
				) {
					commands.push({
						command: {
							requestName: OBSRequestName.SET_SCENE_ITEM_RENDEER,
							args: {
								'scene-name': sceneName,
								source: source,
								render: newSceneItemProperties.render,
							},
						},
						context: null,
						timelineId: '',
					})
				}
			})
		})

		return commands
	}

	private _resolveSourceSettings(oldState: OBSState, newState: OBSState): Array<OBSCommandWithContext> {
		const commands: Array<OBSCommandWithContext> = []

		const oldSources = oldState.sources
		const newSources = newState.sources
		Object.entries(newSources).forEach(([sourceName, source]) => {
			if (!_.isEqual(source.sourceSettings, oldSources[sourceName]?.sourceSettings)) {
				commands.push({
					command: {
						requestName: OBSRequestName.SET_SOURCE_SETTINGS,
						args: {
							sourceName: sourceName,
							sourceSettings: source.sourceSettings,
						},
					},
					context: null,
					timelineId: '',
				})
			}
		})

		return commands
	}

	private _diffStates(oldState: OBSState, newState: OBSState): Array<OBSCommandWithContext> {
		let commands: Array<OBSCommandWithContext> = []

		commands = commands.concat(this._resolveCurrentSceneState(oldState, newState))
		commands = commands.concat(this._resolveCurrentTransitionState(oldState, newState))
		commands = commands.concat(this._resolveRecordingStreaming(oldState, newState))
		commands = commands.concat(this._resolveMute(oldState, newState))
		commands = commands.concat(this._resolveScenes(oldState, newState))
		commands = commands.concat(this._resolveSourceSettings(oldState, newState))

		return commands
	}

	private _defaultCommandReceiver(
		_time: number,
		cmd: OBSCommandWithContext,
		context: CommandContext,
		timelineObjId: string
	): Promise<any> {
		const cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId,
		}
		this.emit('debug', cwc)

		return this._obs.send(cmd.command.requestName, cmd.command.args as any).catch((error) => {
			this.emit('commandError', error, cwc)
		})
	}
}

interface OBSSceneItem {
	render: boolean
}

interface OBSScene {
	sceneItems: {
		[key: string]: OBSSceneItem
	}
}

export class OBSState {
	currentScene: string | undefined
	currentTransition: string | undefined
	recording: boolean | undefined
	streaming: boolean | undefined
	muted: {
		[key: string]: boolean
	}
	scenes: {
		[key: string]: OBSScene
	}
	sources: {
		[key: string]: {
			sourceType: string
			sourceSettings: object
		}
	}
}
