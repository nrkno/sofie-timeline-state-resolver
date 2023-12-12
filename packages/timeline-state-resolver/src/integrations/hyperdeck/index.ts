import * as _ from 'underscore'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode } from '../../devices/device'
import {
	DeviceType,
	HyperdeckOptions,
	DeviceOptionsHyperdeck,
	Mappings,
	TSRTimelineContent,
	Timeline,
	HyperdeckActions,
	HyperdeckActionExecutionPayload,
	HyperdeckActionExecutionResult,
} from 'timeline-state-resolver-types'
import {
	Hyperdeck,
	Commands as HyperdeckCommands,
	TransportStatus,
	FilesystemFormat,
	SlotStatus,
} from 'hyperdeck-connection'
import { DoOnTime, SendMode } from '../../devices/doOnTime'
import { SlotInfoCommandResponse } from 'hyperdeck-connection/dist/commands'
import { actionNotFoundMessage, deferAsync, endTrace, startTrace } from '../../lib'
import { ActionExecutionResult, ActionExecutionResultCode } from 'timeline-state-resolver-types'
import { HyperdeckCommandWithContext, diffHyperdeckStates } from './diffStates'
import { HyperdeckDeviceState, convertTimelineStateToHyperdeckState, getDefaultHyperdeckState } from './stateBuilder'

export interface DeviceOptionsHyperdeckInternal extends DeviceOptionsHyperdeck {
	commandReceiver?: CommandReceiver
}
export type CommandReceiver = (
	time: number,
	command: HyperdeckCommands.AbstractCommand,
	context: CommandContext,
	timelineObjId: string
) => Promise<any>

export interface TransportInfoCommandResponseExt {
	status: TransportStatus
	speed: number
	singleClip: boolean
	loop: boolean
	clipId: number | null
	recordFilename?: string
}

type CommandContext = any

/**
 * This is a wrapper for the Hyperdeck Device. Commands to any and all hyperdeck devices will be sent through here.
 */
export class HyperdeckDevice extends DeviceWithState<HyperdeckDeviceState, DeviceOptionsHyperdeckInternal> {
	private _doOnTime: DoOnTime

	private _hyperdeck: Hyperdeck
	private _initialized = false
	private _connected = false

	private _recordingTime: number
	private _minRecordingTime: number // 15 minutes
	private _recTimePollTimer: NodeJS.Timer
	private _slots = 0
	private _slotStatus = {}
	private _transportStatus: TransportStatus
	private _suppressEmptySlotWarnings: boolean

	private _commandReceiver: CommandReceiver

	constructor(deviceId: string, deviceOptions: DeviceOptionsHyperdeckInternal, getCurrentTime: () => Promise<number>) {
		super(deviceId, deviceOptions, getCurrentTime)
		if (deviceOptions.options) {
			if (deviceOptions.commandReceiver) this._commandReceiver = deviceOptions.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver.bind(this)
		}
		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.BURST,
			this._deviceOptions
		)
		this.handleDoOnTime(this._doOnTime, 'Hyperdeck')
	}

	/**
	 * Initiates the connection with the Hyperdeck through the hyperdeck-connection lib.
	 */
	async init(initOptions: HyperdeckOptions): Promise<boolean> {
		return new Promise((resolve /*, reject*/) => {
			let firstConnect = true

			this._hyperdeck = new Hyperdeck({ pingPeriod: 1000 })
			this._hyperdeck.connect(initOptions.host, initOptions.port)
			this._hyperdeck.on('connected', () => {
				deferAsync(
					async () => {
						await this._hyperdeck.sendCommand(new HyperdeckCommands.RemoteCommand(true))

						this._queryCurrentState()
							.then(async (state) => {
								this.setState(state, this.getCurrentTime())
								if (firstConnect) {
									firstConnect = false
									this._initialized = true
									this._slots = await this._querySlotNumber()
									resolve(true)
								}
								this._connected = true
								this._connectionChanged()
								this.emit('resetResolver')
							})
							.catch((e) => this.emit('error', 'Hyperdeck.on("connected")', e))

						if (initOptions.minRecordingTime) {
							this._minRecordingTime = initOptions.minRecordingTime
							if (this._recTimePollTimer) clearTimeout(this._recTimePollTimer)
						}
						this._queryRecordingTime().catch((e) => this.emit('error', 'HyperDeck.queryRecordingTime', e))

						this._suppressEmptySlotWarnings = !!initOptions.suppressEmptySlotWarnings

						const notifyCmd = new HyperdeckCommands.NotifySetCommand()
						notifyCmd.slot = true
						notifyCmd.transport = true
						this._hyperdeck.sendCommand(notifyCmd).catch((e) => this.emit('error', 'HyperDeck.on("connected")', e))

						const tsCmd = new HyperdeckCommands.TransportInfoCommand()
						this._hyperdeck
							.sendCommand(tsCmd)
							.then((r) => (this._transportStatus = r.status))
							.catch((e) => this.emit('error', 'HyperDeck.on("connected")', e))
					},
					(e) => {
						this.emit('error', 'Failed to send command', e as Error)
					}
				)
			})
			this._hyperdeck.on('disconnected', () => {
				this._connected = false
				this._connectionChanged()
			})
			this._hyperdeck.on('error', (e) => this.emit('error', 'Hyperdeck', e))

			this._hyperdeck.on('notify.slot', (res: SlotInfoCommandResponse) => {
				deferAsync(
					async () => {
						await this._queryRecordingTime().catch((e) => this.emit('error', 'HyperDeck.queryRecordingTime', e))
						if (res.status) this._connectionChanged()
					},
					(e) => {
						this.emit('error', 'Failed to send command', e as Error)
					}
				)
			})
			this._hyperdeck.on('notify.transport', (res: TransportInfoCommandResponseExt) => {
				if (res.status) {
					this._transportStatus = res.status

					const state = this.getState()
					if (state && state.state.transport.status !== res.status) {
						this._connectionChanged()
					}
				}
			})
		})
	}
	/**
	 * Makes this device ready for garbage collection.
	 */
	async terminate(): Promise<void> {
		this._doOnTime.dispose()
		if (this._recTimePollTimer) clearTimeout(this._recTimePollTimer)

		await this._hyperdeck.disconnect()
		this._hyperdeck.removeAllListeners()
	}

	private async resync(): Promise<ActionExecutionResult> {
		const time = this.getCurrentTime()
		this._doOnTime.clearQueueNowAndAfter(time)

		// TODO - could this being slow/offline be a problem?
		const state = await this._queryCurrentState()

		this.setState(state, time)
		this.emit('resetResolver')

		return {
			result: ActionExecutionResultCode.Ok,
		}
	}

	/**
	 * Prepares device for playout
	 */
	async makeReady(okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			await this.resync()
		}
	}

	/**
	 * Sends commands to the HyperDeck to format disks. Afterwards,
	 * calls this._queryRecordingTime
	 */
	private async formatDisks() {
		const wait = async (t: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), t))

		for (let i = 1; i <= this._slots; i++) {
			// select slot
			const slotSel = new HyperdeckCommands.SlotSelectCommand()
			slotSel.slotId = i + ''
			try {
				await this._hyperdeck.sendCommand(slotSel)
			} catch (e) {
				continue
			}
			// get code:
			const prepare = new HyperdeckCommands.FormatCommand()
			prepare.filesystem = FilesystemFormat.exFAT
			const res = await this._hyperdeck.sendCommand(prepare)

			const format = new HyperdeckCommands.FormatConfirmCommand()
			format.code = res.code
			await this._hyperdeck.sendCommand(format)

			// now actualy await until finished:
			const slotInfo = new HyperdeckCommands.SlotInfoCommand(i)
			while ((await this._hyperdeck.sendCommand(slotInfo)).status === SlotStatus.EMPTY) {
				await wait(500)
			}
		}

		await this._queryRecordingTime()
	}
	async executeAction<A extends HyperdeckActions>(
		actionId: A,
		_payload: HyperdeckActionExecutionPayload<A>
	): Promise<HyperdeckActionExecutionResult<A>> {
		switch (actionId) {
			case HyperdeckActions.FormatDisks:
				try {
					await this.formatDisks()
					return { result: ActionExecutionResultCode.Ok }
				} catch {
					return { result: ActionExecutionResultCode.Error }
				}
			case HyperdeckActions.Resync:
				return this.resync() as Promise<HyperdeckActionExecutionResult<A>>
			default:
				return actionNotFoundMessage(actionId)
		}
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	/**
	 * Saves and handles state at specified point in time such that the device will be in
	 * that state at that time.
	 * @param newState
	 */
	handleState(newState: Timeline.TimelineState<TSRTimelineContent>, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		if (!this._initialized) {
			// before it's initialized don't do anything
			this.emit('info', 'Hyperdeck not initialized yet')
			return
		}

		// Create device states
		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		const oldState: HyperdeckDeviceState = (
			this.getStateBefore(previousStateTime) || { state: this._getDefaultState() }
		).state

		const convertTrace = startTrace(`device:convertState`, { deviceId: this.deviceId })
		const oldHyperdeckState = oldState
		const newHyperdeckState = this.convertStateToHyperdeck(newState, newMappings)
		this.emit('timeTrace', endTrace(convertTrace))

		// Generate commands to transition to new state
		const diffTrace = startTrace(`device:diffState`, { deviceId: this.deviceId })
		const commandsToAchieveState: Array<HyperdeckCommandWithContext> = this._diffStates(
			oldHyperdeckState,
			newHyperdeckState
		)
		this.emit('timeTrace', endTrace(diffTrace))

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newHyperdeckState, newState.time)
	}
	/**
	 * Clears any scheduled commands after this time
	 * @param clearAfterTime
	 */
	clearFuture(clearAfterTime: number) {
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	get canConnect(): boolean {
		return true
	}
	get connected(): boolean {
		return this._connected
	}
	/**
	 * Converts a timeline state to a device state.
	 * @param state
	 */
	convertStateToHyperdeck(state: Timeline.TimelineState<TSRTimelineContent>, mappings: Mappings): HyperdeckDeviceState {
		if (!this._initialized) throw Error('convertStateToHyperdeck cannot be used before inititialized')

		return convertTimelineStateToHyperdeckState(state, mappings)
	}
	get deviceType() {
		return DeviceType.HYPERDECK
	}
	get deviceName(): string {
		return 'Hyperdeck ' + this.deviceId
	}
	get queue() {
		return this._doOnTime.getQueue()
	}
	getStatus(): DeviceStatus {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		}

		if (this._connected) {
			// check recording time left
			if (this._minRecordingTime && this._recordingTime < this._minRecordingTime) {
				if (this._recordingTime === 0) {
					statusCode = StatusCode.BAD
				} else {
					statusCode = StatusCode.WARNING_MAJOR
				}
				messages.push(
					`Recording time left is less than ${Math.floor(this._recordingTime / 60)} minutes and ${
						this._recordingTime % 60
					} seconds`
				)
			}

			// check for available slots
			let noAvailableSlots = true
			for (let slot = 1; slot <= this._slots; slot++) {
				if (
					this._slotStatus[slot] &&
					this._slotStatus[slot].status !== SlotStatus.MOUNTED &&
					!this._suppressEmptySlotWarnings
				) {
					messages.push(`Slot ${slot} is not mounted`)
					if (statusCode < StatusCode.WARNING_MINOR) statusCode = StatusCode.WARNING_MINOR
				} else {
					noAvailableSlots = false
				}
			}
			if (noAvailableSlots) {
				statusCode = StatusCode.BAD
			}

			// check if transport status is correct
			const state = this.getState()
			if (state) {
				const supposedState = state.state.transport.status
				if (supposedState === TransportStatus.RECORD && this._transportStatus !== supposedState) {
					if (statusCode < StatusCode.WARNING_MAJOR) statusCode = StatusCode.WARNING_MAJOR
					messages.push('Hyperdeck not recording')
				}

				if (supposedState === TransportStatus.PLAY && this._transportStatus !== supposedState) {
					if (statusCode < StatusCode.WARNING_MAJOR) statusCode = StatusCode.WARNING_MAJOR
					messages.push('Hyperdeck not playing')
				}
			}
		}
		if (!this._initialized) {
			statusCode = StatusCode.BAD
			messages.push(`Hyperdeck device connection not initialized (restart required)`)
		}

		return {
			statusCode,
			messages,
			active: this.isActive,
		}
	}
	/**
	 * Add commands to queue, to be executed at the right time
	 */
	private _addToQueue(commandsToAchieveState: Array<HyperdeckCommandWithContext>, time: number) {
		_.each(commandsToAchieveState, (cmd: HyperdeckCommandWithContext) => {
			// add the new commands to the queue:
			this._doOnTime.queue(
				time,
				undefined,
				async (cmd: HyperdeckCommandWithContext) => {
					return this._commandReceiver(time, cmd.command, cmd.context, cmd.timelineObjId)
				},
				cmd
			)
		})
	}

	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 * @param oldHyperdeckState The assumed current state
	 * @param newHyperdeckState The desired state of the device
	 */
	private _diffStates(
		oldHyperdeckState: HyperdeckDeviceState,
		newHyperdeckState: HyperdeckDeviceState
	): Array<HyperdeckCommandWithContext> {
		return diffHyperdeckStates(oldHyperdeckState, newHyperdeckState, (err) => {
			this.emit('error', 'Hyperdeck', err)
		})
	}

	/**
	 * Gets the current state of the device
	 */
	private async _queryCurrentState(): Promise<HyperdeckDeviceState> {
		if (!this._connected) return this._getDefaultState()

		const [notifyRes, transportRes] = await Promise.all([
			this._hyperdeck.sendCommand(new HyperdeckCommands.NotifyGetCommand()),
			this._hyperdeck.sendCommand(new HyperdeckCommands.TransportInfoCommand()),
		])

		const res: HyperdeckDeviceState = {
			notify: notifyRes,
			transport: transportRes,
			timelineObjId: 'currentState',
		}
		return res
	}

	/**
	 * Queries the recording time left in seconds of the device and mutates
	 * this._recordingTime
	 */
	private async _queryRecordingTime(): Promise<void> {
		if (this._recTimePollTimer) {
			clearTimeout(this._recTimePollTimer)
		}
		let time = 0

		for (let slot = 1; slot <= this._slots; slot++) {
			try {
				const res: SlotInfoCommandResponse = await this._hyperdeck.sendCommand(
					new HyperdeckCommands.SlotInfoCommand(slot)
				)
				this._slotStatus[slot] = res
				if (res.status === 'mounted') {
					time += res.recordingTime
				}
			} catch (e) {
				// null
			}
		}

		if (time !== this._recordingTime) {
			this._recordingTime = time
			this._connectionChanged()
		}

		let timeTillNextUpdate = 10
		if (time > 10) {
			if (time - this._minRecordingTime > 10) {
				timeTillNextUpdate = (time - this._minRecordingTime) / 2
			} else if (time - this._minRecordingTime < 0) {
				timeTillNextUpdate = time / 2
			}
		}
		this._recTimePollTimer = setTimeout(() => {
			this._queryRecordingTime().catch((e) => this.emit('error', 'HyperDeck.queryRecordingTime', e))
		}, timeTillNextUpdate * 1000)
	}

	private async _querySlotNumber(): Promise<number> {
		const { slots } = await this._hyperdeck.sendCommand(new HyperdeckCommands.DeviceInfoCommand())

		// before protocol version 1.9 we do not get slot info, so we assume 2 slots.
		if (!slots) return 2

		return slots
	}

	/**
	 * Gets the default state of the device
	 */
	private _getDefaultState(): HyperdeckDeviceState {
		return getDefaultHyperdeckState()
	}

	private async _defaultCommandReceiver(
		_time: number,
		command: HyperdeckCommands.AbstractCommand,
		context: CommandContext,
		timelineObjId: string
	): Promise<any> {
		const cwc: CommandWithContext = {
			context,
			timelineObjId,
			command: command,
		}
		this.emitDebug(cwc)

		return this._hyperdeck.sendCommand(command).catch((error) => {
			this.emit('commandError', error, cwc)
		})
	}
	private _connectionChanged() {
		this.emit('connectionChanged', this.getStatus())
	}
}
