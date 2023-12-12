import * as _ from 'underscore'
import * as deepMerge from 'deepmerge'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode } from './../../devices/device'
import { DoOnTime, SendMode } from '../../devices/doOnTime'

import { VMix } from './connection'
import {
	DeviceType,
	DeviceOptionsVMix,
	VMixOptions,
	Mappings,
	VMixTransform,
	VMixInputOverlays,
	Timeline,
	TSRTimelineContent,
	ActionExecutionResult,
	ActionExecutionResultCode,
	OpenPresetPayload,
	SavePresetPayload,
	VmixActions,
} from 'timeline-state-resolver-types'
import { t } from '../../lib'
import { VMixInput, VMixState, VMixStateDiffer, VMixStateExtended } from './vMixStateDiffer'
import { CommandContext, VMixStateCommandWithContext } from './vMixCommands'
import { VMixTimelineStateConverter } from './vMixTimelineStateConverter'

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

export type EnforceableVMixInputStateKeys = 'duration' | 'loop' | 'transform' | 'overlays' | 'listFilePaths'

/**
 * This is a VMixDevice, it sends commands when it feels like it
 */
export class VMixDevice extends DeviceWithState<VMixStateExtended, DeviceOptionsVMixInternal> {
	private _doOnTime: DoOnTime

	private _commandReceiver: CommandReceiver
	private _vmix: VMix
	private _connected = false
	private _initialized = false
	private _pollTimeout: NodeJS.Timeout
	private _pollTime: number | null = null
	private _stateDiffer: VMixStateDiffer
	private _timelineStateConverter: VMixTimelineStateConverter

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

		this._stateDiffer = new VMixStateDiffer(
			() => this._vmix.state.fixedInputsCount,
			(commands: VMixStateCommandWithContext[]) => this._addToQueue(commands, this.getCurrentTime())
		)

		this._timelineStateConverter = new VMixTimelineStateConverter(
			() => this._stateDiffer.getDefaultState(),
			(num: number) => this._stateDiffer.getDefaultInputState(num)
		)
	}

	async init(options: VMixOptions): Promise<boolean> {
		this._vmix = new VMix(options.host, options.port, false)
		this._vmix.on('connected', () => {
			// We are not resetting the state at this point and waiting for the state to arrive. Otherwise, we risk
			// going back and forth on reconnections
			this._setConnected(true)
			this._vmix.requestVMixState().catch((e) => this.emit('error', 'VMix init', e))
		})
		this._vmix.on('disconnected', () => {
			this._setConnected(false)
		})
		this._vmix.on('error', (e) => this.emit('error', 'VMix', e))
		this._vmix.on('stateChanged', (state) => this._onVMixStateChanged(state))
		this._vmix.on('data', (d) => {
			if (d.message !== 'Completed') this.emit('debug', d)
			if (d.command === 'XML' && d.body) {
				this._vmix.parseVMixState(d.body)
				if (!this._initialized) {
					this._initialized = true
					this.emit('connectionChanged', this.getStatus())
					this.emit('resetResolver')
				}
			}
		})
		// this._vmix.on('debug', (...args) => this.emitDebug(...args))

		this._vmix.connect()

		this._pollTime =
			typeof options.pollInterval === 'number' && options.pollInterval >= 0 // options.pollInterval === 0 disables the polling
				? options.pollInterval
				: DEFAULT_VMIX_POLL_INTERVAL
		if (this._pollTime) {
			this._pollTimeout = setTimeout(() => this._pollVmix(), this._pollTime)
		}

		return true
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
	 * Runs when we receive XML state from vMix,
	 * generally as the result of a reconnect or a poll (if polling/enforcement is enabled).
	 * @param realState State as reported by vMix itself.
	 */
	private _onVMixStateChanged(realState: VMixState) {
		const time = this.getCurrentTime()
		const expectedState: VMixStateExtended = (
			this.getStateBefore(time) ?? { state: this._stateDiffer.getDefaultState() }
		).state

		// Merge the real into the expected, but don't merge the `inputs` of the real.
		// We'll cherry pick specific things to take from the real state's inputs.
		expectedState.reportedState = deepMerge<VMixState>(expectedState.reportedState, _.omit(realState, 'inputs'))

		// This is where "enforcement" of expected state occurs.
		// There is only a small number of properties which are safe to enforce.
		// Enforcing others can lead to issues such as clips replaying, seeking back to the start,
		// or even outright preventing Sisyfos from working.
		for (const inputKey of Object.keys(realState.inputs)) {
			const cherryPickedRealState: Pick<VMixInput, EnforceableVMixInputStateKeys> = {
				duration: realState.inputs[inputKey].duration,
				loop: realState.inputs[inputKey].loop,
				transform: realState.inputs[inputKey].transform,
				overlays: realState.inputs[inputKey].overlays,

				// This particular key is what enables the ability to re-load failed/missing media in a List Input.
				listFilePaths: realState.inputs[inputKey].listFilePaths,
			}

			// Shallow merging is sufficient.
			for (const [key, value] of Object.entries<string | number | boolean | VMixTransform | VMixInputOverlays>(
				cherryPickedRealState
			)) {
				expectedState.reportedState.inputs[inputKey][key] = value
			}
		}

		this.setState(expectedState, time)
		this.emit('resetResolver')
	}

	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime + 0.1)
		this.cleanUpStates(0, newStateTime + 0.1)
	}

	handleState(newState: Timeline.TimelineState<TSRTimelineContent>, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		if (!this._initialized) {
			// before it's initialized don't do anything
			this.emit('warning', 'VMix not initialized yet')
			return
		}

		const previousStateTime = Math.max(this.getCurrentTime() + 0.1, newState.time)
		const oldState: VMixStateExtended = (
			this.getStateBefore(previousStateTime) ?? { state: this._stateDiffer.getDefaultState() }
		).state

		const newVMixState = this._timelineStateConverter.getVMixStateFromTimelineState(newState, newMappings)

		const commandsToAchieveState = this._stateDiffer.getCommandsToAchieveState(oldState, newVMixState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)

		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

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

		this._vmix.removeAllListeners()
		this._vmix.disconnect()

		clearTimeout(this._pollTimeout)

		return Promise.resolve(true)
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

	async executeAction(actionId: string, payload?: Record<string, any> | undefined): Promise<ActionExecutionResult> {
		switch (actionId) {
			case VmixActions.LastPreset:
				return await this._lastPreset()
			case VmixActions.OpenPreset:
				return await this._openPreset(payload as OpenPresetPayload)
			case VmixActions.SavePreset:
				return await this._savePreset(payload as SavePresetPayload)
			default:
				return {
					result: ActionExecutionResultCode.Error,
					response: t('Action "{{actionId}}" not found', { actionId }),
				}
		}
	}

	_checkPresetAction(payload?: any, payloadRequired?: boolean): ActionExecutionResult | undefined {
		if (!this._vmix.connected) {
			return {
				result: ActionExecutionResultCode.Error,
				response: t('Cannot perform VMix action without a connection'),
			}
		}

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

	private async _lastPreset() {
		const presetActionCheckResult = this._checkPresetAction()
		if (presetActionCheckResult) return presetActionCheckResult
		await this._vmix.lastPreset()
		return {
			result: ActionExecutionResultCode.Ok,
		}
	}

	private async _openPreset(payload: OpenPresetPayload) {
		const presetActionCheckResult = this._checkPresetAction(payload, true)
		if (presetActionCheckResult) return presetActionCheckResult
		await this._vmix.openPreset(payload.filename)
		return {
			result: ActionExecutionResultCode.Ok,
		}
	}

	private async _savePreset(payload: SavePresetPayload) {
		const presetActionCheckResult = this._checkPresetAction(payload, true)
		if (presetActionCheckResult) return presetActionCheckResult
		await this._vmix.savePreset(payload.filename)
		return {
			result: ActionExecutionResultCode.Ok,
		}
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

	private _addToQueue(commandsToAchieveState: Array<VMixStateCommandWithContext>, time: number) {
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
		clearTimeout(this._pollTimeout)
		if (this._pollTime) this._pollTimeout = setTimeout(() => this._pollVmix(), BACKOFF_VMIX_POLL_INTERVAL)

		const cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId,
		}
		this.emitDebug(cwc)

		return this._vmix.sendCommand(cmd.command).catch((error) => {
			this.emit('commandError', error, cwc)
		})
	}

	/**
	 * Polls vMix's XML status endpoint, which will change our tracked state based on the response.
	 */
	private _pollVmix() {
		clearTimeout(this._pollTimeout)
		if (this._pollTime) {
			this._pollTimeout = setTimeout(() => this._pollVmix(), this._pollTime)
		}
		this._vmix.requestVMixState().catch((e) => this.emit('error', 'VMix poll', e))
	}
}
