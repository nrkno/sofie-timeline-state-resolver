import * as _ from 'underscore'
import { BaseDeviceAPI, CommandWithContext } from './device'
import { Measurement } from './measure'
import { StateHandlerContext } from './stateHandler'

const wait = async (t: number) => new Promise<void>((r) => setTimeout(() => r(), t))

export class CommandExecutor<DeviceState, Command extends CommandWithContext> {
	constructor(
		private logger: StateHandlerContext['logger'],
		private mode: 'salvo' | 'sequential',
		private sendCommand: BaseDeviceAPI<DeviceState, void, Command>['sendCommand']
	) {}

	async executeCommands(commands: Command[], measurement?: Measurement): Promise<void> {
		if (commands.length === 0) return

		commands.sort((a, b) => (b.preliminary ?? 0) - (a.preliminary ?? 0))
		const totalTime = commands[0].preliminary ?? 0

		if (this.mode === 'salvo') {
			return this._executeCommandsSalvo(totalTime, commands, measurement)
		} else {
			return this._executeCommandsSequential(totalTime, commands, measurement)
		}
	}

	private async _executeCommandsSalvo(
		totalTime: number,
		commands: Command[],
		measurement?: Measurement
	): Promise<void> {
		await Promise.allSettled(
			commands.map(async (command) => {
				const timeToWait = totalTime - (command.preliminary ?? 0)
				if (timeToWait > 0) await wait(totalTime)

				measurement?.executeCommand(command)
				return this.sendCommand(command).then(() => {
					measurement?.finishedCommandExecution(command)
					return command
				})
			})
		)
	}

	private async _executeCommandsSequential(
		totalTime: number,
		commands: Command[],
		measurement?: Measurement
	): Promise<void> {
		const start = Date.now() // note - would be better to use monotonic time here but BigInt's are annoying

		const commandQueues = _.groupBy(commands || [], (command) => command.queueId ?? '$$default')

		await Promise.allSettled(
			Object.values<Command[]>(commandQueues).map(async (commandsInQueue): Promise<void> => {
				for (const command of commandsInQueue) {
					const timeToWait = totalTime - (Date.now() - start)
					if (timeToWait > 0) await wait(timeToWait)

					measurement?.executeCommand(command)
					await this.sendCommand(command).catch((e) => {
						this.logger.error('Error while executing command', e)
					})
					measurement?.finishedCommandExecution(command)
				}
			})
		)
	}
}
