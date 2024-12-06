import * as _ from 'underscore'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode } from './../../devices/device'
import { DoOnTime, SendMode } from '../../devices/doOnTime'

import { VMixCommandSender, VMixConnection } from './connection'
import {
	DeviceType,
	DeviceOptionsVMix,
	VMixOptions,
	Mappings,
	Timeline,
	TSRTimelineContent,
	ActionExecutionResult,
	ActionExecutionResultCode,
	OpenPresetPayload,
	SavePresetPayload,
	VmixActions,
	VmixActionExecutionPayload,
	VmixActionExecutionResult,
} from 'timeline-state-resolver-types'
import { VMixState, VMixStateDiffer, VMixStateExtended } from './vMixStateDiffer'
import { CommandContext, VMixStateCommandWithContext } from './vMixCommands'
import { MappingsVmix, VMixTimelineStateConverter } from './vMixTimelineStateConverter'
import { VMixXmlStateParser } from './vMixXmlStateParser'
import { VMixPollingTimer } from './vMixPollingTimer'
import { VMixStateSynchronizer } from './vMixStateSynchronizer'
import { Response } from './vMixResponseStreamReader'
import { actionNotFoundMessage, t } from '../../lib'

/**
 * Default time, in milliseconds, for when we should poll vMix to query its actual state.
 */
const DEFAULT_VMIX_POLL_INTERVAL = 10 * 1000

/**
 * How long to wait, in milliseconds, to poll vMix's state after we send commands to it.
 */
const BACKOFF_VMIX_POLL_INTERVAL = 5 * 1000

export interface DeviceOptionsVMixInternal extends DeviceOptionsVMix {
	commandReceiver?: CommandReceiver
}
export type CommandReceiver = (
	time: number,
	cmd: VMixStateCommandWithContext,
	context: CommandContext,
	timelineObjId: string
) => Promise<any>
/*interface Command {
	commandName: 'added' | 'changed' | 'removed'
	content: VMixCommandContent
	context: CommandContext
	timelineObjId: string
	layer: string
}*/

export type EnforceableVMixInputStateKeys = 'duration' | 'loop' | 'transform' | 'layers' | 'listFilePaths'

/**
 * This is a VMixDevice, it sends commands when it feels like it
 */
export class VMixDevice extends DeviceWithState<VMixStateExtended, DeviceOptionsVMixInternal> {
	private _doOnTime: DoOnTime

	private _commandReceiver: CommandReceiver = this._defaultCommandReceiver.bind(this)
	/** Setup in init */
	private _vMixConnection!: VMixConnection
	private _vMixCommandSender!: VMixCommandSender

	private _connected = false
	private _initialized = false
	private _stateDiffer: VMixStateDiffer
	private _timelineStateConverter: VMixTimelineStateConverter
	private _xmlStateParser: VMixXmlStateParser
	private _stateSynchronizer: VMixStateSynchronizer
	private _expectingStateAfterConnecting = false
	private _expectingPolledState = false
	private _pollingTimer: VMixPollingTimer | null = null

	constructor(deviceId: string, deviceOptions: DeviceOptionsVMixInternal, getCurrentTime: () => Promise<number>) {
		super(deviceId, deviceOptions, getCurrentTime)

		if (deviceOptions.options) {
			if (deviceOptions.commandReceiver) this._commandReceiver = deviceOptions.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver.bind(this)
		}

		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.IN_ORDER,
			this._deviceOptions
		)
		this._doOnTime.on('error', (e) => this.emit('error', 'VMix.doOnTime', e))
		this._doOnTime.on('slowCommand', (msg) => this.emit('slowCommand', this.deviceName + ': ' + msg))
		this._doOnTime.on('slowSentCommand', (info) => this.emit('slowSentCommand', info))
		this._doOnTime.on('slowFulfilledCommand', (info) => this.emit('slowFulfilledCommand', info))

		this._stateDiffer = new VMixStateDiffer(this.getCurrentTime.bind(this), (commands: VMixStateCommandWithContext[]) =>
			this.addToQueue(commands, this.getCurrentTime())
		)

		this._timelineStateConverter = new VMixTimelineStateConverter(
			() => this._stateDiffer.getDefaultState(),
			(inputNumber) => this._stateDiffer.getDefaultInputState(inputNumber),
			(inputNumber) => this._stateDiffer.getDefaultInputAudioState(inputNumber)
		)

		this._xmlStateParser = new VMixXmlStateParser()
		this._stateSynchronizer = new VMixStateSynchronizer()
	}

	async init(options: VMixOptions): Promise<boolean> {
		this._vMixConnection = new VMixConnection(options.host, options.port, false)
		this._vMixCommandSender = new VMixCommandSender(this._vMixConnection)
		this._vMixConnection.on('connected', () => {
			// We are not resetting the state at this point and waiting for the state to arrive. Otherwise, we risk
			// going back and forth on reconnections
			this._setConnected(true)
			this._expectingStateAfterConnecting = true
			this.emitDebug('connected')
			this._pollingTimer?.start()
			this._requestVMixState('VMix init')
		})
		this._vMixConnection.on('disconnected', () => {
			this._setConnected(false)
			this._pollingTimer?.stop()
			this.emitDebug('disconnected')
		})
		this._vMixConnection.on('error', (e) => this.emit('error', 'VMix', e))
		this._vMixConnection.on('data', (data) => this._onDataReceived(data))
		// this._vmix.on('debug', (...args) => this.emitDebug(...args))

		this._vMixConnection.connect()

		const pollTime =
			typeof options.pollInterval === 'number' && options.pollInterval >= 0 // options.pollInterval === 0 disables the polling
				? options.pollInterval
				: DEFAULT_VMIX_POLL_INTERVAL

		if (pollTime) {
			this._pollingTimer = new VMixPollingTimer(pollTime)
			this._pollingTimer.on('tick', () => {
				this._expectingPolledState = true
				this._requestVMixState('VMix poll')
			})
		}

		return true
	}

	private _onDataReceived(data: Response): void {
		if (data.message !== 'Completed') this.emitDebug(data)
		if (data.command === 'XML' && data.body) {
			if (!this._initialized) {
				this._initialized = true
				this.emit('connectionChanged', this.getStatus())
			}
			const realState = this._xmlStateParser.parseVMixState(data.body)
			if (this._expectingStateAfterConnecting) {
				this._setFullState(realState)
				this._expectingStateAfterConnecting = false

				// resync all tl states
				this.clearStates()
				this.emit('resyncStates')
			} else if (this._expectingPolledState) {
				this._setPartialInputState(realState)
				this._expectingPolledState = false
			}
		}
	}

	private _connectionChanged() {
		this.emit('connectionChanged', this.getStatus())
	}

	private _setConnected(connected: boolean) {
		if (this._connected !== connected) {
			this._connected = connected
			this._connectionChanged()
		}
	}

	/**
	 * Updates the entire state when we (re)connect
	 * @param realState State as reported by vMix itself.
	 */
	private _setFullState(realState: VMixState) {
		const time = this.getCurrentTime()
		const oldState: VMixStateExtended = (this.getStateBefore(time) ?? { state: this._stateDiffer.getDefaultState() })
			.state
		oldState.reportedState = realState
		this.setState(oldState, time)
		this.emit('resetResolver')
	}

	/**
	 * Runs when we receive XML state from vMix,
	 * generally as the result a poll (if polling/enforcement is enabled).
	 * @param realState State as reported by vMix itself.
	 */
	private _setPartialInputState(realState: VMixState) {
		const time = this.getCurrentTime()
		let expectedState: VMixStateExtended = (this.getStateBefore(time) ?? { state: this._stateDiffer.getDefaultState() })
			.state

		expectedState = this._stateSynchronizer.applyRealState(expectedState, realState)

		this.setState(expectedState, time)
		this.emit('resetResolver')
	}

	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}

	handleState(newState: Timeline.TimelineState<TSRTimelineContent>, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		if (!this._initialized) {
			// before it's initialized don't do anything
			this.emit('warning', 'VMix not initialized yet')
			return
		}

		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		const oldState: VMixStateExtended = (
			this.getStateBefore(previousStateTime) ?? { state: this._stateDiffer.getDefaultState() }
		).state

		const newVMixState = this._timelineStateConverter.getVMixStateFromTimelineState(
			newState,
			newMappings as MappingsVmix // is this safe? why is the TriCaster integration filtering?
		)

		const commandsToAchieveState = this._stateDiffer.getCommandsToAchieveState(newState.time, oldState, newVMixState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)

		// add the new commands to the queue:
		this.addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newVMixState, newState.time)

		this.emitDebugState(newVMixState)
	}

	clearFuture(clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}

	async terminate() {
		this._doOnTime.dispose()

		this._vMixConnection.removeAllListeners()
		this._vMixConnection.disconnect()
		this._pollingTimer?.stop()
	}

	getStatus(): DeviceStatus {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		} else if (!this._initialized) {
			statusCode = StatusCode.BAD
			messages.push('Not initialized')
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

	async executeAction<A extends VmixActions>(
		actionId: A,
		payload: VmixActionExecutionPayload<A>
	): Promise<VmixActionExecutionResult<A>> {
		switch (actionId) {
			case VmixActions.LastPreset:
				return this._lastPreset() as Promise<VmixActionExecutionResult<A>>
			case VmixActions.OpenPreset:
				return this._openPreset(payload as OpenPresetPayload) as Promise<VmixActionExecutionResult<A>>
			case VmixActions.SavePreset:
				return this._savePreset(payload as SavePresetPayload) as Promise<VmixActionExecutionResult<A>>
			case VmixActions.StartExternal:
				return this._startExternalOutput() as Promise<VmixActionExecutionResult<A>>
			case VmixActions.StopExternal:
				return this._stopExternalOutput() as Promise<VmixActionExecutionResult<A>>
			default:
				return actionNotFoundMessage(actionId)
		}
	}

	_checkPresetAction(payload?: any, payloadRequired?: boolean): ActionExecutionResult | undefined {
		const connectionError = this._checkConnectionForAction()
		if (connectionError) return connectionError

		if (payloadRequired) {
			if (!payload || typeof payload !== 'object') {
				return {
					result: ActionExecutionResultCode.Error,
					response: t('Action payload is invalid'),
				}
			}

			if (!payload.filename) {
				return {
					result: ActionExecutionResultCode.Error,
					response: t('No preset filename specified'),
				}
			}
		}
		return
	}

	private async _lastPreset(): Promise<ActionExecutionResult> {
		const presetActionCheckResult = this._checkPresetAction()
		if (presetActionCheckResult) return presetActionCheckResult
		await this._vMixCommandSender.lastPreset()
		return {
			result: ActionExecutionResultCode.Ok,
		}
	}

	private async _openPreset(payload: OpenPresetPayload): Promise<ActionExecutionResult> {
		const presetActionCheckResult = this._checkPresetAction(payload, true)
		if (presetActionCheckResult) return presetActionCheckResult
		await this._vMixCommandSender.openPreset(payload.filename)
		return {
			result: ActionExecutionResultCode.Ok,
		}
	}

	private async _savePreset(payload: SavePresetPayload): Promise<ActionExecutionResult> {
		const presetActionCheckResult = this._checkPresetAction(payload, true)
		if (presetActionCheckResult) return presetActionCheckResult
		await this._vMixCommandSender.savePreset(payload.filename)
		return {
			result: ActionExecutionResultCode.Ok,
		}
	}

	private async _startExternalOutput() {
		const connectionError = this._checkConnectionForAction()
		if (connectionError) return connectionError

		await this._vMixCommandSender.startExternal()
		return {
			result: ActionExecutionResultCode.Ok,
		}
	}

	private async _stopExternalOutput() {
		const connectionError = this._checkConnectionForAction()
		if (connectionError) return connectionError

		await this._vMixCommandSender.stopExternal()
		return {
			result: ActionExecutionResultCode.Ok,
		}
	}

	private _checkConnectionForAction(): ActionExecutionResult | undefined {
		if (!this._vMixConnection.connected) {
			return {
				result: ActionExecutionResultCode.Error,
				response: t('Cannot perform VMix action without a connection'),
			}
		}
		return undefined
	}

	get canConnect(): boolean {
		return false
	}

	get connected(): boolean {
		return false
	}

	get deviceType() {
		return DeviceType.VMIX
	}

	get deviceName(): string {
		return 'VMix ' + this.deviceId
	}

	get queue() {
		return this._doOnTime.getQueue()
	}

	private addToQueue(commandsToAchieveState: Array<VMixStateCommandWithContext>, time: number) {
		_.each(commandsToAchieveState, (cmd: VMixStateCommandWithContext) => {
			// add the new commands to the queue:
			this._doOnTime.queue(
				time,
				undefined,
				async (cmd: VMixStateCommandWithContext) => {
					return this._commandReceiver(time, cmd, cmd.context, cmd.timelineId)
				},
				cmd
			)
		})
	}

	private async _defaultCommandReceiver(
		_time: number,
		cmd: VMixStateCommandWithContext,
		context: CommandContext,
		timelineObjId: string
	): Promise<any> {
		// Do not poll or retry while we are sending commands, instead always do it closely after.
		// This is potentially an issue while producing a show, because it is theoretically possible
		// that the operator keeps performing actions/takes within 5 seconds of one another and
		// therefore this timeout keeps getting reset and never expires.
		// For now, we classify this as an extreme outlier edge case and acknowledge that this system
		// does not support it.
		this._expectingPolledState = false
		this._pollingTimer?.postponeNextTick(BACKOFF_VMIX_POLL_INTERVAL)

		const cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId,
		}
		this.emitDebug(cwc)

		return this._vMixCommandSender.sendCommand(cmd.command).catch((error) => {
			this.emit('commandError', error, cwc)
		})
	}

	/**
	 * Request vMix's XML status.
	 */
	private _requestVMixState(context: string) {
		this._vMixConnection.requestVMixState().catch((e) => this.emit('error', context, e))
	}
}
