import * as _ from 'underscore'
import { BaseDeviceAPI, CommandWithContext, ExecuteMode } from './device'
import { Measurement } from './measure'
import { StateHandlerContext } from './stateHandler'
import PQueue from 'p-queue'

const wait = async (t: number) => new Promise<void>((r) => setTimeout(() => r(), t))

export class CommandExecutor<DeviceState, Command extends CommandWithContext> {
	private commandQueueSalvo = new PQueue({ concurrency: 1 })
	private commandQueueSequential = new PQueue({ concurrency: 1 })

	constructor(
		private logger: StateHandlerContext['logger'],
		private defaultMode: ExecuteMode,
		private sendCommand: BaseDeviceAPI<DeviceState, Command>['sendCommand']
	) {}

	async executeCommands(commands: Command[], measurement?: Measurement): Promise<void> {
		if (commands.length === 0) return

		commands.sort((a, b) => (b.preliminary ?? 0) - (a.preliminary ?? 0))
		const totalTime = commands[0].preliminary ?? 0

		const salvoCommands: Command[] = []
		const sequentialCommands: Command[] = []

		for (const command of commands) {
			const mode = command.executeMode || this.defaultMode
			if (mode === ExecuteMode.SEQUENTIAL) {
				sequentialCommands.push(command)
			} else {
				salvoCommands.push(command)
			}
		}

		// The execution logic is as follows:
		// * When the commands sent into executeCommands() is called a BATCH.
		//
		// * Salvos should wait for Salvos from previous BATCH to have finished before executing
		// * Salvos within the same BATCH are executed in parallel.
		//
		// * Sequentials should wait for all Salvos and Sequentials from previous BATCH to have finished before executing
		// * Sequentials should be executed after all Salvos from the same BATCH have been executed
		// * Sequentials within the same BATCH are executed in order

		let pSequential: Promise<any> | null = null

		// Wait for Salvos from previous batch to finish:
		await this.commandQueueSalvo.add(async () => {
			await this._executeCommandsSalvo(totalTime, salvoCommands, measurement)

			// Salvos should not have to wait for Sequentials to finish, so we don't await the pSequential here:
			// eslint-disable-next-line @typescript-eslint/await-thenable
			pSequential = this.commandQueueSequential.add(async () => {
				await this._executeCommandsSequential(totalTime, sequentialCommands, measurement)
			})
		})

		if (!pSequential) throw new Error('Internal error in CommandExecutor: pSequential not set')
		// eslint-disable-next-line @typescript-eslint/await-thenable
		await pSequential
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
