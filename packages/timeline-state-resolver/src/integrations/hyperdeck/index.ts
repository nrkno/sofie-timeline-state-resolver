import { CommandWithContext, DeviceStatus, StatusCode } from '../../devices/device'
import {
	HyperdeckOptions,
	Mappings,
	TSRTimelineContent,
	Timeline,
	HyperdeckActionMethods,
	ActionExecutionResult,
	ActionExecutionResultCode,
	HyperdeckDeviceTypes,
} from 'timeline-state-resolver-types'
import {
	Hyperdeck,
	Commands as HyperdeckCommands,
	TransportStatus,
	FilesystemFormat,
	SlotStatus,
} from 'hyperdeck-connection'
import { deferAsync } from '../../lib'
import { HyperdeckCommandWithContext, diffHyperdeckStates } from './diffState'
import { HyperdeckDeviceState, convertTimelineStateToHyperdeckState, getDefaultHyperdeckState } from './stateBuilder'
import { Device } from '../../service/device'

/**
 * This is a wrapper for the Hyperdeck Device. Commands to any and all hyperdeck devices will be sent through here.
 */
export class HyperdeckDevice extends Device<HyperdeckDeviceTypes, HyperdeckDeviceState, HyperdeckCommandWithContext> {
	readonly actions: HyperdeckActionMethods = {
		formatDisks: this.formatDisks.bind(this),
		resync: this.resyncState.bind(this),
	}

	private readonly _hyperdeck = new Hyperdeck({ pingPeriod: 1000 })
	private _connected = false

	private _recordingTime = 0
	private _minRecordingTime = 0 // 15 minutes
	private _recTimePollTimer: NodeJS.Timer | undefined
	private _slotCount = 0
	private _slotStatus: Record<number, HyperdeckCommands.SlotInfoCommandResponse> = {}
	private _transportStatus: TransportStatus | undefined
	private _expectedTransportStatus: TransportStatus | undefined
	private _suppressEmptySlotWarnings = false

	/**
	 * Initiates the connection with the Hyperdeck through the hyperdeck-connection lib.
	 */
	async init(initOptions: HyperdeckOptions): Promise<boolean> {
		let firstConnect = true

		this._hyperdeck.connect(initOptions.host, initOptions.port)
		this._hyperdeck.on('connected', () => {
			deferAsync(
				async () => {
					await this._hyperdeck.sendCommand(new HyperdeckCommands.RemoteCommand(true))

					this._queryCurrentState()
						.then(async (state) => {
							if (firstConnect) {
								firstConnect = false
								this._slotCount = await this._querySlotNumber()
							}
							this._connected = true
							this._connectionChanged()

							this.context
								.resetToState(state)
								.catch((e) => this.context.logger.error('Error resetting hyperdeck state', new Error(e)))
						})
						.catch((e) => this.context.logger.error('Hyperdeck.on("connected")', e))

					if (initOptions.minRecordingTime) {
						this._minRecordingTime = initOptions.minRecordingTime
						if (this._recTimePollTimer) clearTimeout(this._recTimePollTimer)
					}
					this._queryRecordingTime().catch((e) => this.context.logger.error('HyperDeck.queryRecordingTime', e))

					this._suppressEmptySlotWarnings = !!initOptions.suppressEmptySlotWarnings

					const notifyCmd = new HyperdeckCommands.NotifySetCommand()
					notifyCmd.slot = true
					notifyCmd.transport = true
					this._hyperdeck.sendCommand(notifyCmd).catch((e) => this.context.logger.error('HyperDeck.on("connected")', e))

					const tsCmd = new HyperdeckCommands.TransportInfoCommand()
					this._hyperdeck
						.sendCommand(tsCmd)
						.then((r) => (this._transportStatus = r.status))
						.catch((e) => this.context.logger.error('HyperDeck.on("connected")', e))
				},
				(e) => {
					this.context.logger.error('Failed to send command', e as Error)
				}
			)
		})
		this._hyperdeck.on('disconnected', () => {
			this._connected = false
			this._connectionChanged()
		})
		this._hyperdeck.on('error', (e) => this.context.logger.error('Hyperdeck', new Error(e)))

		this._hyperdeck.on('notify.slot', (res) => {
			deferAsync(
				async () => {
					await this._queryRecordingTime().catch((e) => this.context.logger.error('HyperDeck.queryRecordingTime', e))
					if (res.status) this._connectionChanged()
				},
				(e) => {
					this.context.logger.error('Failed to send command', e as Error)
				}
			)
		})
		this._hyperdeck.on('notify.transport', (res) => {
			if (res.status) {
				this._transportStatus = res.status

				if (this._expectedTransportStatus !== res.status) {
					this._connectionChanged()
				}
			}
		})

		return true
	}
	/**
	 * Makes this device ready for garbage collection.
	 */
	async terminate(): Promise<void> {
		if (this._recTimePollTimer) clearTimeout(this._recTimePollTimer)

		await this._hyperdeck.disconnect().catch(() => null)
		this._hyperdeck.removeAllListeners()
	}

	private async resyncState(): Promise<ActionExecutionResult> {
		try {
			// TODO - could this being slow/offline be a problem?
			const state = await this._queryCurrentState()

			await this.context.resetToState(state)
		} catch (e) {
			this.context.resetResolver()
		}

		return {
			result: ActionExecutionResultCode.Ok,
		}
	}

	/**
	 * Sends commands to the HyperDeck to format disks. Afterwards,
	 * calls this._queryRecordingTime
	 */
	private async formatDisks(): Promise<ActionExecutionResult> {
		try {
			const wait = async (t: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), t))

			for (let i = 1; i <= this._slotCount; i++) {
				// select slot
				const slotSel = new HyperdeckCommands.SlotSelectCommand()
				slotSel.slotId = i
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

			return { result: ActionExecutionResultCode.Ok }
		} catch {
			return { result: ActionExecutionResultCode.Error }
		}
	}

	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 * @param oldHyperdeckState The assumed current state
	 * @param newHyperdeckState The desired state of the device
	 */
	diffStates(
		oldHyperdeckState: HyperdeckDeviceState | undefined,
		newHyperdeckState: HyperdeckDeviceState
	): Array<HyperdeckCommandWithContext> {
		return diffHyperdeckStates(oldHyperdeckState, newHyperdeckState, (err) => {
			this.context.logger.error('Hyperdeck diffStates', err)
		})
	}

	async sendCommand({ command, context, timelineObjId }: HyperdeckCommandWithContext): Promise<void> {
		const cwc: CommandWithContext = {
			context,
			command,
			timelineObjId,
		}
		this.context.logger.debug(cwc)

		// TODO: is this a good idea?
		// Track what we expect the TransportStatus to be, only Commands we may send need to be considered
		if (command instanceof HyperdeckCommands.PlayCommand) {
			this._expectedTransportStatus = TransportStatus.PLAY
		} else if (command instanceof HyperdeckCommands.StopCommand) {
			this._expectedTransportStatus = TransportStatus.STOPPED
		} else if (command instanceof HyperdeckCommands.RecordCommand) {
			this._expectedTransportStatus = TransportStatus.RECORD
		} else if (command instanceof HyperdeckCommands.PreviewCommand) {
			this._expectedTransportStatus = TransportStatus.PREVIEW
		}

		// Skip attempting send if not connected
		if (!this._connected) return

		try {
			await this._hyperdeck.sendCommand(command)
		} catch (error: any) {
			this.context.commandError(error, cwc)
		}
	}

	get connected(): boolean {
		return this._connected
	}

	/**
	 * Convert a timeline state into an hyperdeck state.
	 * @param timelineState The state to be converted
	 */
	convertTimelineStateToDeviceState(
		timelineState: Timeline.TimelineState<TSRTimelineContent>,
		mappings: Mappings
	): HyperdeckDeviceState {
		return convertTimelineStateToHyperdeckState(timelineState.layers, mappings)
	}

	getStatus(): Omit<DeviceStatus, 'active'> {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		} else {
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
			for (let slot = 1; slot <= this._slotCount; slot++) {
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
			if (this._expectedTransportStatus !== this._transportStatus) {
				if (this._expectedTransportStatus === TransportStatus.RECORD) {
					if (statusCode < StatusCode.WARNING_MAJOR) statusCode = StatusCode.WARNING_MAJOR
					messages.push('Hyperdeck not recording')
				} else if (this._expectedTransportStatus === TransportStatus.PLAY) {
					if (statusCode < StatusCode.WARNING_MAJOR) statusCode = StatusCode.WARNING_MAJOR
					messages.push('Hyperdeck not playing')
				}
			}
		}

		return {
			statusCode,
			messages,
		}
	}

	/**
	 * Gets the current state of the device
	 */
	private async _queryCurrentState(): Promise<HyperdeckDeviceState> {
		if (!this._connected) return getDefaultHyperdeckState()

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
	 * This is public for the unit tests
	 */
	public async _queryRecordingTime(): Promise<void> {
		if (this._recTimePollTimer) {
			clearTimeout(this._recTimePollTimer)
		}
		let totalRecordingTime = 0

		for (let slot = 1; slot <= this._slotCount; slot++) {
			try {
				const res = await this._hyperdeck.sendCommand(new HyperdeckCommands.SlotInfoCommand(slot))
				this._slotStatus[slot] = res
				if (res.status === 'mounted') {
					totalRecordingTime += res.recordingTime
				}
			} catch (e) {
				// null
			}
		}

		if (totalRecordingTime !== this._recordingTime) {
			this._recordingTime = totalRecordingTime
			this._connectionChanged()
		}

		let timeTillNextUpdate = 10
		if (totalRecordingTime > 10) {
			if (totalRecordingTime - this._minRecordingTime > 10) {
				timeTillNextUpdate = (totalRecordingTime - this._minRecordingTime) / 2
			} else if (totalRecordingTime - this._minRecordingTime < 0) {
				timeTillNextUpdate = totalRecordingTime / 2
			}
		}
		this._recTimePollTimer = setTimeout(() => {
			this._queryRecordingTime().catch((e) => this.context.logger.error('HyperDeck.queryRecordingTime', e))
		}, timeTillNextUpdate * 1000)
	}

	private async _querySlotNumber(): Promise<number> {
		const { slots } = await this._hyperdeck.sendCommand(new HyperdeckCommands.DeviceInfoCommand())

		// before protocol version 1.9 we do not get slot info, so we assume 2 slots.
		if (!slots) return 2

		return slots
	}

	private _connectionChanged() {
		this.context.connectionChanged(this.getStatus())
	}
}
