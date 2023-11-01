import { BaseDeviceAPI, CommandWithContext } from './device'
import { Measurement } from './measure'

const wait = async (t: number) => new Promise<void>((r) => setTimeout(() => r(), t))

export class CommandQueue<DeviceState, Command extends CommandWithContext, CommandResult> {
	constructor(
		private mode: 'salvo' | 'sequential',
		private sendCommand: BaseDeviceAPI<DeviceState, Command, CommandResult>['sendCommand']
	) {}

	async queueCommands(commands: Command[], measurement?: Measurement): Promise<PromiseSettledResult<CommandResult>[]> {
		commands.sort((a, b) => (b.preliminary ?? 0) - (a.preliminary ?? 0))
		const totalTime = commands[0].preliminary ?? 0

		if (this.mode === 'salvo') {
			return this._queueCommandsSalvo(totalTime, commands, measurement)
		} else {
			return this._queueCommandsSequential(totalTime, commands, measurement)
		}
	}

	private async _queueCommandsSalvo(
		totalTime: number,
		commands: Command[],
		measurement?: Measurement
	): Promise<PromiseSettledResult<CommandResult>[]> {
		return await Promise.allSettled(
			commands.map(async (command) => {
				const timeToWait = totalTime - (command.preliminary ?? 0)
				if (timeToWait > 0) await wait(totalTime)

				measurement?.executeCommand(command)
				return this.sendCommand(command).then((result) => {
					measurement?.finishedCommandExecution(command)
					return result
				})
			})
		)
	}

	private async _queueCommandsSequential(
		totalTime: number,
		commands: Command[],
		measurement?: Measurement
	): Promise<PromiseSettledResult<CommandResult>[]> {
		const start = Date.now() // note - would be better to use monotonic time here but BigInt's are annoying
		const results: PromiseSettledResult<CommandResult>[] = []

		for (const command of commands || []) {
			const timeToWait = totalTime - (Date.now() - start)
			if (timeToWait > 0) await wait(timeToWait)

			measurement?.executeCommand(command)
			await this.sendCommand(command)
				.then((result) => {
					results.push({ status: 'fulfilled', value: result })
				})
				.catch((e) => {
					console.error('Error while executing command', e) // todo
					results.push({ status: 'rejected', reason: e })
				})
			measurement?.finishedCommandExecution(command)
		}

		return results
	}
}
