import * as _ from 'underscore'
import * as path from 'path'
import { EventEmitter } from 'eventemitter3'

import { VMixCommand } from 'timeline-state-resolver-types'
import { CommandContext, VMixDevice, VMixStateCommandWithContext } from '.'
/**
 * Handles pre-loading of inputs.
 */
export class VMixInputHandler extends EventEmitter {
	// how long to let an input linger before removing it
	private TTL = 1000

	/** Tracks the actual state in vmix of which inputs are loaded */
	private _inputs: Map<
		string,
		{
			type: string
			name: string
			/** Is set to true when the commands to add the input has been set. */
			addedCommandSent: boolean
			/** Is set to something when the input is scheduled to be removed. */
			removeTime?: number
		}
	> = new Map()

	private _updateTimeout: NodeJS.Timeout | undefined = undefined

	constructor(private _vmix: VMixDevice) {
		super()
	}

	public addInput(key: string, type: string, name: string) {
		let existing = this._inputs.get(key)
		if (!existing) {
			existing = {
				type,
				name,
				addedCommandSent: false,
			}
			this._inputs.set(key, existing)
		}
		delete existing.removeTime

		this._triggerUpdate()
	}

	/** Mark input for removal */
	public removeInput(time: number, key: string) {
		const existing = this._inputs.get(key)
		if (existing) {
			existing.removeTime = Math.max(existing.removeTime ?? 0, time + this.TTL)

			this._triggerUpdate()
		}
	}

	private _triggerUpdate() {
		if (this._updateTimeout) {
			clearTimeout(this._updateTimeout)
			this._updateTimeout = undefined
		}
		setImmediate(() => {
			try {
				this._update()
			} catch (e) {
				this.emit('error', e)
			}
		})
	}
	private _update() {
		const commands: Array<VMixStateCommandWithContext> = []

		const now = this._vmix.getCurrentTime()
		let nextTimeout = Infinity

		for (const [key, input] of this._inputs.entries()) {
			if (input.removeTime && input.removeTime <= now) {
				if (input.addedCommandSent) {
					commands.push({
						command: {
							command: VMixCommand.REMOVE_INPUT,
							input: input.name,
						},
						context: CommandContext.None,
						timelineId: '',
					})
				}
				this._inputs.delete(key)
				continue // don't update nextTimeout
			} else {
				if (!input.addedCommandSent) {
					commands.push({
						command: {
							command: VMixCommand.ADD_INPUT,
							value: `${input.type}|${input.name}`,
						},
						context: CommandContext.None,
						timelineId: '',
					})
					commands.push({
						command: {
							command: VMixCommand.SET_INPUT_NAME,
							input: this.getFilename(input.name),
							value: input.name,
						},
						context: CommandContext.None,
						timelineId: '',
					})

					input.addedCommandSent = true
				}
			}

			if (input.removeTime) {
				nextTimeout = Math.min(nextTimeout, input.removeTime)
			}
		}

		this._vmix.addToQueue(commands, now)

		const timeToNextTimeout = nextTimeout - now
		if (timeToNextTimeout > 0 && timeToNextTimeout !== Infinity) {
			this._updateTimeout = setTimeout(() => {
				this._updateTimeout = undefined
				this._triggerUpdate()
			}, timeToNextTimeout)
		}
	}
	private getFilename(filePath: string) {
		return path.basename(filePath)
	}
}
