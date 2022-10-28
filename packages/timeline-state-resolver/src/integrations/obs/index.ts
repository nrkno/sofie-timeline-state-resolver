import * as _ from 'underscore'
import * as underScoreDeepExtend from 'underscore-deep-extend'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode } from './../../devices/device'
import { DoOnTime, SendMode } from '../../devices/doOnTime'

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
	MappingOBSType,
	MappingOBSMute,
	MappingOBSSceneItemRender,
	MappingOBSSourceSettings,
	ResolvedTimelineObjectInstanceExtended,
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
	commandReceiver?: CommandReceiver
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

const RETRY_TIMEOUT = 5000 // ms

/**
 * This is a OBSDevice, it sends commands when it feels like it
 */
export class OBSDevice extends DeviceWithState<OBSState, DeviceOptionsOBSInternal> {
	private _doOnTime: DoOnTime

	private _commandReceiver: CommandReceiver
	private _obs: OBSWebSocket
	private _options: OBSOptions
	private _connected = false
	private _authenticated = false
	private _initialized = false

	private _setDisconnected = false // set to true if disconnect() has been called (then do not trye to reconnect)
	private _retryConnectTimeout: NodeJS.Timer | undefined

	constructor(deviceId: string, deviceOptions: DeviceOptionsOBSInternal, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.commandReceiver) {
				this._commandReceiver = deviceOptions.commandReceiver
			} else {
				this._commandReceiver = this._defaultCommandReceiver.bind(this)
			}
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
		this._doOnTime.on('slowSentCommand', (info) => this.emit('slowSentCommand', info))
		this._doOnTime.on('slowFulfilledCommand', (info) => this.emit('slowFulfilledCommand', info))
	}
	async init(options: OBSOptions): Promise<boolean> {
		this._options = options
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
			this._triggerRetryConnection()
		})
		this._obs.on('error' as any, (e) => this.emit('error', 'OBS', e))

		return this._connect().then((connected) => {
			if (!connected) {
				this._triggerRetryConnection()
			}
			return connected
		})
	}

	private async _connect() {
		return this._obs
			.connect({
				address: `${this._options.host}:${this._options.port}`,
				password: this._options.password,
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

			if (!this._authenticated) {
				this._initialized = false
			}
		}
	}

	private _triggerRetryConnection() {
		if (!this._retryConnectTimeout) {
			this._retryConnectTimeout = setTimeout(() => {
				this._retryConnection()
			}, RETRY_TIMEOUT)
		}
	}
	private _retryConnection() {
		if (this._retryConnectTimeout) {
			clearTimeout(this._retryConnectTimeout)
			this._retryConnectTimeout = undefined
		}

		if (!this.connected && !this._setDisconnected) {
			this._connect()
				.then((connected) => {
					if (!connected) {
						this._triggerRetryConnection()
					}
				})
				.catch((err) => {
					this.emit('error', 'OBS retryConnection', err)
				})
		}
	}

	private _getDefaultState(): OBSState {
		return {
			currentScene: undefined,
			previewScene: undefined,
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
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}

	handleState(newState: TimelineState, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		if (!this._initialized) {
			// before it's initialized don't do anything
			this.emit('warning', 'OBS not initialized yet')
			return
		}

		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
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
		this._setDisconnected = true
		this._doOnTime.dispose()
		this._obs.disconnect()
		return true
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
		return !this._connected && !this._retryConnectTimeout && !this._setDisconnected
	}

	get connected(): boolean {
		return this._connected
	}

	convertStateToOBS(state: TimelineState, mappings: Mappings): OBSState {
		if (!this._initialized) {
			throw Error('convertStateToOBS cannot be used before inititialized')
		}

		const deviceState = this._getDefaultState()

		// Sort layer based on Mapping type (to make sure audio is after inputs) and Layer name
		const sortedLayers = _.sortBy(
			_.map(state.layers, (tlObject, layerName) => {
				const tlObjectExt = tlObject as ResolvedTimelineObjectInstanceExtended
				let mapping: MappingOBS = mappings[layerName] as MappingOBS
				if (!mapping && tlObjectExt.isLookahead && tlObjectExt.lookaheadForLayer) {
					mapping = mappings[tlObjectExt.lookaheadForLayer] as MappingOBS
				}
				return {
					layerName,
					tlObject,
					mapping,
				}
			}).sort((a, b) => a.layerName.localeCompare(b.layerName)),
			(o) => o.mapping.mappingType
		)

		_.each(sortedLayers, ({ tlObject, mapping }) => {
			if (mapping) {
				switch (mapping.mappingType) {
					case MappingOBSType.CurrentScene:
						if (tlObject.content.type === TimelineContentTypeOBS.CURRENT_SCENE) {
							if ((tlObject as ResolvedTimelineObjectInstanceExtended).isLookahead) {
								deviceState.previewScene = tlObject.content.sceneName
							} else {
								deviceState.currentScene = tlObject.content.sceneName
							}
						}
						break
					case MappingOBSType.CurrentTransition:
						if (tlObject.content.type === TimelineContentTypeOBS.CURRENT_TRANSITION) {
							if ((tlObject as ResolvedTimelineObjectInstanceExtended).isLookahead) {
								// CurrentTransiton can't be looked ahead, same below
								break
							}

							deviceState.currentTransition = tlObject.content.transitionName
						}
						break
					case MappingOBSType.Recording:
						if (tlObject.content.type === TimelineContentTypeOBS.RECORDING) {
							if ((tlObject as ResolvedTimelineObjectInstanceExtended).isLookahead) {
								// CurrentTransiton can't be looked ahead, same below
								break
							}

							deviceState.recording = tlObject.content.on
						}
						break
					case MappingOBSType.Streaming:
						if (tlObject.content.type === TimelineContentTypeOBS.STREAMING) {
							if ((tlObject as ResolvedTimelineObjectInstanceExtended).isLookahead) {
								// CurrentTransiton can't be looked ahead, same below
								break
							}

							deviceState.streaming = tlObject.content.on
						}
						break
					case MappingOBSType.Mute:
						if (tlObject.content.type === TimelineContentTypeOBS.MUTE) {
							if ((tlObject as ResolvedTimelineObjectInstanceExtended).isLookahead) {
								// CurrentTransiton can't be looked ahead, same below
								break
							}

							const source = (mapping as MappingOBSMute).source
							deviceState.muted[source] = tlObject.content.mute
						}
						break
					case MappingOBSType.SceneItemRender:
						if (tlObject.content.type === TimelineContentTypeOBS.SCENE_ITEM_RENDER) {
							if ((tlObject as ResolvedTimelineObjectInstanceExtended).isLookahead) {
								// CurrentTransiton can't be looked ahead, same below
								break
							}

							const source = (mapping as MappingOBSSceneItemRender).source
							const sceneName = (mapping as MappingOBSSceneItemRender).sceneName
							deepExtend(deviceState.scenes, {
								[sceneName]: {
									sceneItems: {
										[source]: {
											render: tlObject.content.on,
										},
									},
								},
							})
						}
						break
					case MappingOBSType.SourceSettings:
						if (tlObject.content.type === TimelineContentTypeOBS.SOURCE_SETTINGS) {
							if ((tlObject as ResolvedTimelineObjectInstanceExtended).isLookahead) {
								// CurrentTransiton can't be looked ahead, same below
								break
							}

							const source = (mapping as MappingOBSSourceSettings).source

							deepExtend(deviceState.sources, {
								[source]: {
									sourceType: tlObject.content.sourceType,
									sourceSettings: tlObject.content.sourceSettings,
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
				async (cmd: OBSCommandWithContext) => {
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
					context: `currentScene changed from "${oldCurrentScene}" to "${newCurrentScene}"`,
					timelineId: '',
				})
			}
		}

		const oldPreviewScene = oldState.previewScene
		const newPreviewScene = newState.previewScene
		if (newPreviewScene !== undefined) {
			if (oldPreviewScene !== newPreviewScene) {
				commands.push({
					command: {
						requestName: OBSRequestName.SET_PREVIEW_SCENE,
						args: {
							'scene-name': newPreviewScene,
						},
					},
					context: `previewScene changed from "${oldPreviewScene}" to "${newPreviewScene}"`,
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
					context: 'currentTransition changed',
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
					context: 'recording changed',
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
					context: 'streaming changed',
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
					context: `mute ${source} changed`,
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
						context: `scene ${sceneName} item ${source} changed render`,
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
					context: `source ${sourceName} changed settings`,
					timelineId: '',
				})
			}
		})

		return commands
	}

	private _diffStates(oldState: OBSState, newState: OBSState): Array<OBSCommandWithContext> {
		const commands: Array<OBSCommandWithContext> = [
			...this._resolveCurrentSceneState(oldState, newState),
			...this._resolveCurrentTransitionState(oldState, newState),
			...this._resolveRecordingStreaming(oldState, newState),
			...this._resolveMute(oldState, newState),
			...this._resolveScenes(oldState, newState),
			...this._resolveSourceSettings(oldState, newState),
		]

		return commands
	}

	private async _defaultCommandReceiver(
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
		this.emitDebug(cwc)

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
	previewScene: string | undefined
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
