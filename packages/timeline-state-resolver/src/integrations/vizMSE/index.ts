import * as _ from 'underscore'
import {
	ActionExecutionResult,
	ActionExecutionResultCode,
	DeviceOptionsVizMSE,
	Mappings,
	MediaObject,
	Timeline,
	TSRTimelineContent,
	VizMSEOptions,
	VizMSEActions,
	VizResetPayload,
	DeviceStatus,
	StatusCode,
} from 'timeline-state-resolver-types'
import { createMSE, MSE } from '@tv2media/v-connection'
import { DoOnTime, SendMode } from '../../devices/doOnTime'
import { ExpectedPlayoutItem } from '../../expectedPlayoutItems'
import { t } from '../../lib'
import { HTTPClientError, HTTPServerError } from '@tv2media/v-connection/dist/msehttp'
import { VizMSEManager } from './vizMSEManager'
import { VizMSECommand, VizMSEState, VizMSECommandType, VizMSECommandWithContext } from './types'
import { diffVizMSEStates } from './diffState'
import { convertStateToVizMSE } from './convertState'
import { DeviceContextAPI, Device } from '../../service/device'

export interface DeviceOptionsVizMSEInternal extends DeviceOptionsVizMSE {
	commandReceiver?: CommandReceiver
}
export type CommandReceiver = (time: number, cmd: VizMSECommand, context: string, timelineObjId: string) => Promise<any>

/**
 * This class is used to interface with a vizRT Media Sequence Editor, through the v-connection library.
 * It features playing both "internal" graphics element and vizPilot elements.
 */
export class VizMSEDevice extends Device<VizMSEOptions, VizMSEState, VizMSECommandWithContext> {
	private _vizMSE?: MSE
	private _vizmseManager?: VizMSEManager

	private _doOnTimeBurst: DoOnTime
	private _initOptions?: VizMSEOptions
	private _vizMSEConnected = false

	constructor(context: DeviceContextAPI<VizMSEState>) {
		super(context)

		this._doOnTimeBurst = new DoOnTime(() => this.context.getCurrentTime(), SendMode.BURST, this._deviceOptions)
		this.handleDoOnTime(this._doOnTimeBurst, 'VizMSE.burst')
	}

	async init(initOptions: VizMSEOptions, activeRundownPlaylistId?: string): Promise<boolean> {
		this._initOptions = initOptions
		if (!this._initOptions.host) throw new Error('VizMSE bad option: host')
		if (!this._initOptions.profile) throw new Error('VizMSE bad option: profile')

		this._vizMSE = createMSE(this._initOptions.host, this._initOptions.restPort, this._initOptions.wsPort)

		this._vizmseManager = new VizMSEManager(
			this,
			this._vizMSE,
			this._initOptions.preloadAllElements ?? false,
			this._initOptions.onlyPreloadActivePlaylist ?? false,
			this._initOptions.purgeUnknownElements ?? false,
			this._initOptions.autoLoadInternalElements ?? false,
			this._initOptions.engineRestPort,
			this._initOptions.showDirectoryPath ?? '',
			initOptions.profile,
			initOptions.playlistID
		)

		this._vizmseManager.on('connectionChanged', (connected) => this.connectionChanged(connected))
		this._vizmseManager.on('updateMediaObject', (docId: string, doc: MediaObject | null) =>
			this.context.updateMediaObject(docId, doc)
		)
		this._vizmseManager.on('clearMediaObjects', () => this.context.clearMediaObjects())

		this._vizmseManager.on('info', (str) => this.context.logger.info('VizMSE: ' + str))
		this._vizmseManager.on('warning', (str) => this.context.logger.warning('VizMSE: ' + str))
		this._vizmseManager.on('error', (e) =>
			this.context.logger.error('VizMSE', typeof e === 'string' ? new Error(e) : e)
		)
		this._vizmseManager.on('debug', (...args) => this.context.logger.debug(...args))

		await this._vizmseManager.initializeRundown(activeRundownPlaylistId)

		return true
	}

	/**
	 * Terminates the device safely such that things can be garbage collected.
	 */
	async terminate(): Promise<void> {
		if (this._vizmseManager) {
			await this._vizmseManager.terminate()
			this._vizmseManager.removeAllListeners()
			delete this._vizmseManager
		}
		this._doOnTimeBurst.dispose()
	}

	get connected(): boolean {
		return this._vizMSEConnected
	}

	async activate(payload: Record<string, any> | undefined): Promise<ActionExecutionResult> {
		if (!payload || !payload.activeRundownPlaylistId) {
			return {
				result: ActionExecutionResultCode.Error,
				response: t('Invalid payload'),
			}
		}
		if (!this._vizmseManager) {
			return {
				result: ActionExecutionResultCode.Error,
				response: t('Unable to activate vizMSE, not initialized yet'),
			}
		}

		const activeRundownPlaylistId = payload.activeRundownPlaylist
		const previousPlaylistId = this._vizmseManager?.activeRundownPlaylistId

		await this._vizmseManager.activate(activeRundownPlaylistId)

		if (!payload.clearAll) {
			return {
				result: ActionExecutionResultCode.Ok,
			}
		}

		await this.context.resetState()

		if (this._initOptions && activeRundownPlaylistId !== previousPlaylistId) {
			if (this._initOptions.clearAllCommands && this._initOptions.clearAllCommands.length) {
				await this._vizmseManager.clearEngines({
					type: VizMSECommandType.CLEAR_ALL_ENGINES,
					time: this.context.getCurrentTime(),
					timelineObjId: 'makeReady',
					channels: 'all',
					commands: this._initOptions.clearAllCommands,
				})
			}
		}

		return {
			result: ActionExecutionResultCode.Ok,
		}
	}
	public async purgeRundown(clearAll: boolean): Promise<void> {
		await this._vizmseManager?.purgeRundown(clearAll)
	}
	public async clearEngines(): Promise<void> {
		await this._vizmseManager?.clearEngines({
			type: VizMSECommandType.CLEAR_ALL_ENGINES,
			time: this.context.getCurrentTime(),
			timelineObjId: 'clearAllEnginesAction',
			channels: 'all',
			commands: this._initOptions?.clearAllCommands || [],
		})
	}
	public async resetViz(payload: VizResetPayload): Promise<void> {
		await this.purgeRundown(true) // note - this might not be 100% necessary
		await this.clearEngines()
		await this._vizmseManager?.activate(payload?.activeRundownPlaylistId)

		// lastly make sure we reset so timeline state is sent again
		await this.context.resetState()
	}

	readonly actions: Record<
		VizMSEActions,
		(id: string, payload?: Record<string, any>) => Promise<ActionExecutionResult>
	> = {
		[VizMSEActions.PurgeRundown]: async (_id: string, _payload?: Record<string, any>) => {
			await this.purgeRundown(true)
			return { result: ActionExecutionResultCode.Ok }
		},
		[VizMSEActions.Activate]: async (_id: string, payload?: Record<string, any>) => {
			return this.activate(payload)
		},
		[VizMSEActions.StandDown]: async (_id: string, _payload?: Record<string, any>) => {
			return this.executeStandDown()
		},
		[VizMSEActions.ClearAllEngines]: async (_id: string, _payload?: Record<string, any>) => {
			await this.clearEngines()
			return { result: ActionExecutionResultCode.Ok }
		},
		[VizMSEActions.VizReset]: async (_id: string, payload?: Record<string, any>) => {
			await this.resetViz(payload ?? {})
			return { result: ActionExecutionResultCode.Ok }
		},
	}

	get supportsExpectedPlayoutItems(): boolean {
		return true
	}
	public handleExpectedPlayoutItems(expectedPlayoutItems: Array<ExpectedPlayoutItem>): void {
		this.context.logger.debug('VIZDEBUG: handleExpectedPlayoutItems called')
		if (this._vizmseManager) {
			this.context.logger.debug('VIZDEBUG: manager exists')
			this._vizmseManager.setExpectedPlayoutItems(expectedPlayoutItems)
		}
	}

	public connectionChanged(connected?: boolean) {
		if (connected === true || connected === false) this._vizMSEConnected = connected
		if (connected === false) {
			this.context.clearMediaObjects()
		}
		this.context.connectionChanged(this.getStatus())
	}

	/**
	 * Takes a timeline state and returns a VizMSE State that will work with the state lib.
	 * @param timelineState The timeline state to generate from.
	 */
	convertTimelineStateToDeviceState(
		timelineState: Timeline.TimelineState<TSRTimelineContent>,
		mappings: Mappings
	): VizMSEState {
		return convertStateToVizMSE(this.context.logger, this._vizmseManager, timelineState, mappings)
	}

	/**
	 * Prepares the physical device for playout.
	 * @param okToDestroyStuff Whether it is OK to do things that affects playout visibly
	 */
	async makeReady(okToDestroyStuff?: boolean, activeRundownPlaylistId?: string): Promise<void> {
		const previousPlaylistId = this._vizmseManager?.activeRundownPlaylistId
		if (this._vizmseManager) {
			await this._vizmseManager.cleanupAllShows()
			await this._vizmseManager.activate(activeRundownPlaylistId)
		} else throw new Error(`Unable to activate vizMSE, not initialized yet!`)

		if (okToDestroyStuff) {
			// reset our own state(s):
			await this.context.resetState()

			if (this._vizmseManager) {
				if (this._initOptions && activeRundownPlaylistId !== previousPlaylistId) {
					if (
						this._initOptions.clearAllOnMakeReady &&
						this._initOptions.clearAllCommands &&
						this._initOptions.clearAllCommands.length
					) {
						await this._vizmseManager.clearEngines({
							type: VizMSECommandType.CLEAR_ALL_ENGINES,
							time: this.context.getCurrentTime(),
							timelineObjId: 'makeReady',
							channels: 'all',
							commands: this._initOptions.clearAllCommands,
						})
					}
				}
			} else throw new Error(`Unable to activate vizMSE, not initialized yet!`)
		}
	}
	async executeStandDown(): Promise<ActionExecutionResult> {
		if (this._vizmseManager) {
			if (!this._initOptions || !this._initOptions.dontDeactivateOnStandDown) {
				await this._vizmseManager.deactivate()
			} else {
				this._vizmseManager.standDownActiveRundown() // because we still want to stop monitoring expectedPlayoutItems
			}
		}

		return {
			result: ActionExecutionResultCode.Ok,
		}
	}
	/**
	 * The standDown event could be triggered at a time after broadcast
	 * @param okToDestroyStuff If true, the device may do things that might affect the visible output
	 */
	async standDown(okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			return this.executeStandDown().then(() => undefined)
		}
	}
	getStatus(): Omit<DeviceStatus, 'active'> {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._vizMSEConnected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		} else if (this._vizmseManager) {
			if (this._vizmseManager.notLoadedCount > 0 || this._vizmseManager.loadingCount > 0) {
				statusCode = StatusCode.WARNING_MINOR
				messages.push(
					`Got ${this._vizmseManager.notLoadedCount} elements not yet loaded to the Viz Engine (${this._vizmseManager.loadingCount} are currently loading)`
				)
			}
			if (this._vizmseManager.enginesDisconnected.length) {
				statusCode = StatusCode.BAD
				this._vizmseManager.enginesDisconnected.forEach((engine) => {
					messages.push(`Viz Engine ${engine} disconnected`)
				})
			}
		}

		return {
			statusCode: statusCode,
			messages: messages,
		}
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 */
	public diffStates(
		oldState: VizMSEState | undefined,
		newState: VizMSEState,
		_mappings: Mappings,
		time: number
	): Array<VizMSECommandWithContext> {
		if (!this._initOptions) throw new Error('VizMSE not initialized yet')

		return diffVizMSEStates(
			oldState,
			newState,
			time,
			this.context.getCurrentTime(),
			this._initOptions,
			this.context.logger
		).map((cmd) => ({
			command: cmd,
			timelineObjId: cmd.timelineObjId,
			context: '', // TODO
		}))
	}

	/**
	 * Add commands to queue, to be executed at the right time
	 */
	private _addToQueue(commandsToAchieveState: Array<VizMSECommand>) {
		_.each(commandsToAchieveState, (cmd: VizMSECommand) => {
			this._doOnTime.queue(
				cmd.time,
				cmd.layerId,
				async (c: { cmd: VizMSECommand }) => {
					return this._commandReceiver(
						this.getCurrentTime(),
						c.cmd,
						c.cmd.type + '_' + c.cmd.timelineObjId,
						c.cmd.timelineObjId
					)
				},
				{ cmd: cmd }
			)

			this._doOnTimeBurst.queue(
				cmd.time,
				undefined,
				async (c: { cmd: VizMSECommand }) => {
					if (c.cmd.type === VizMSECommandType.TAKE_ELEMENT && !c.cmd.fromLookahead) {
						if (this._vizmseManager && c.cmd.layerId) {
							this._vizmseManager.clearAllWaitWithLayer(c.cmd.layerId)
						}
					}
					return Promise.resolve()
				},
				{ cmd: cmd }
			)
		})
	}
	/**
	 * Sends commands to the VizMSE server
	 * @param time deprecated
	 * @param cmd Command to execute
	 */
	public async sendCommand(cmd: VizMSECommandWithContext): Promise<any> {
		this.context.logger.debug(cmd)

		try {
			if (!this._vizmseManager) {
				throw new Error(`Not initialized yet`)
			}
			switch (cmd.command.type) {
				case VizMSECommandType.PREPARE_ELEMENT:
					await this._vizmseManager.prepareElement(cmd.command)
					break
				case VizMSECommandType.CUE_ELEMENT:
					await this._vizmseManager.cueElement(cmd.command)
					break
				case VizMSECommandType.TAKE_ELEMENT:
					await this._vizmseManager.takeElement(cmd.command)
					break
				case VizMSECommandType.TAKEOUT_ELEMENT:
					await this._vizmseManager.takeoutElement(cmd.command)
					break
				case VizMSECommandType.CONTINUE_ELEMENT:
					await this._vizmseManager.continueElement(cmd.command)
					break
				case VizMSECommandType.CONTINUE_ELEMENT_REVERSE:
					await this._vizmseManager.continueElementReverse(cmd.command)
					break
				case VizMSECommandType.LOAD_ALL_ELEMENTS:
					await this._vizmseManager.loadAllElements(cmd.command)
					break
				case VizMSECommandType.CLEAR_ALL_ELEMENTS:
					await this._vizmseManager.clearAll(cmd.command)
					break
				case VizMSECommandType.CLEAR_ALL_ENGINES:
					await this._vizmseManager.clearEngines(cmd.command)
					break
				case VizMSECommandType.SET_CONCEPT:
					await this._vizmseManager.setConcept(cmd.command)
					break
				case VizMSECommandType.INITIALIZE_SHOWS:
					await this._vizmseManager.initializeShows(cmd.command)
					break
				case VizMSECommandType.CLEANUP_SHOWS:
					await this._vizmseManager.cleanupShows(cmd.command)
					break
				default:
					// @ts-ignore never
					throw new Error(`Unsupported command type "${cmd.type}"`)
			}
		} catch (e) {
			const error = e as Error
			let errorString = error && error.message ? error.message : error.toString()
			if (error?.stack) {
				errorString += '\n' + error.stack
			}
			if (e instanceof HTTPClientError || e instanceof HTTPServerError) {
				errorString +=
					`\n\nPath: ${e.path}` +
					'\n\n' +
					(e.body ?? '[No request body present]') +
					`\n\nStatus: ${e.status}` +
					`\nResponse:\n ${e.response}`
			}
			this.context.commandError(new Error(errorString), cmd)
		}
	}
	public ignoreWaitsInTests() {
		if (!this._vizmseManager) throw new Error('_vizmseManager not set')
		this._vizmseManager.ignoreAllWaits = true
	}
}
