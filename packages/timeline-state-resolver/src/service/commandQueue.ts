import { BaseDeviceAPI, CommandWithContext } from './device'
import { Measurement } from './measure'

const wait = async (t: number) => new Promise<void>((r) => setTimeout(() => r(), t))

export class CommandQueue<DeviceState, Command extends CommandWithContext> {
	constructor(
		private mode: 'salvo' | 'sequential',
		private sendCommand: BaseDeviceAPI<DeviceState, Command>['sendCommand']
	) {}

	async queueCommands(commands: Command[], measurement?: Measurement): Promise<void> {
		commands.sort((a, b) => (b.preliminary ?? 0) - (a.preliminary ?? 0))
		const totalTime = commands[0].preliminary ?? 0

		if (this.mode === 'salvo') {
			return this._queueCommandsSalvo(totalTime, commands, measurement)
		} else {
			return this._queueCommandsSequential(totalTime, commands, measurement)
		}
	}

	private async _queueCommandsSalvo(totalTime: number, commands: Command[], measurement?: Measurement): Promise<void> {
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

	private async _queueCommandsSequential(
		totalTime: number,
		commands: Command[],
		measurement?: Measurement
	): Promise<void> {
		const start = Date.now() // note - would be better to use monotonic time here but BigInt's are annoying

		for (const command of commands || []) {
			const timeToWait = totalTime - (Date.now() - start)
			if (timeToWait > 0) await wait(timeToWait)

			measurement?.executeCommand(command)
			await this.sendCommand(command).catch((e) => {
				console.error('Error while executing command', e) // todo
			})
			measurement?.finishedCommandExecution(command)
		}
	}
}
