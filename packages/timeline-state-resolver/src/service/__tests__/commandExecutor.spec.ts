import { CommandExecutor } from '../commandExecutor'
import { ExecuteMode } from '../device'

describe('commandExecutor', () => {
	test('Sequential order', async () => {
		// CommandExecutor

		const logger = {
			debug: jest.fn((...args: any[]) => console.log('debug', ...args)),
			info: jest.fn((info: string) => console.log('info', info)),
			warn: jest.fn((warn: string) => console.log('warning', warn)),
			error: jest.fn((context: string, e: Error) => console.log('error', context, e)),
		}
		const sendCommand = jest.fn()

		let sequence = 0

		const executor = new CommandExecutor(logger, ExecuteMode.SEQUENTIAL, async (c) => {
			await sleep(10)
			sendCommand(c, sequence++)
		})

		await executor.executeCommands([makeCommand('a'), makeCommand('b'), makeCommand('c')])

		expect(sendCommand).toHaveBeenCalledTimes(3)
		expect(sendCommand).toHaveBeenNthCalledWith(1, makeCommand('a'), 0)
		expect(sendCommand).toHaveBeenNthCalledWith(2, makeCommand('b'), 1)
		expect(sendCommand).toHaveBeenNthCalledWith(3, makeCommand('c'), 2)

		sendCommand.mockClear()
		sequence = 0

		// If calling executeCommands several times synchronously, the commands should
		// be executed in the order they are given:

		await Promise.all([
			executor.executeCommands([makeCommand('a'), makeCommand('b'), makeCommand('c')]),
			executor.executeCommands([makeCommand('x'), makeCommand('y'), makeCommand('z')]),
		])

		expect(sendCommand).toHaveBeenCalledTimes(6)
		expect(sendCommand).toHaveBeenNthCalledWith(1, makeCommand('a'), 0)
		expect(sendCommand).toHaveBeenNthCalledWith(2, makeCommand('b'), 1)
		expect(sendCommand).toHaveBeenNthCalledWith(3, makeCommand('c'), 2)
		expect(sendCommand).toHaveBeenNthCalledWith(4, makeCommand('x'), 3)
		expect(sendCommand).toHaveBeenNthCalledWith(5, makeCommand('y'), 4)
		expect(sendCommand).toHaveBeenNthCalledWith(6, makeCommand('z'), 5)
	})
	test('Salvo order', async () => {
		// CommandExecutor

		const logger = {
			debug: jest.fn((...args: any[]) => console.log('debug', ...args)),
			info: jest.fn((info: string) => console.log('info', info)),
			warn: jest.fn((warn: string) => console.log('warning', warn)),
			error: jest.fn((context: string, e: Error) => console.log('error', context, e)),
		}
		const sendCommandStart = jest.fn()
		const sendCommandEnd = jest.fn()

		let sequence = 1

		const executor = new CommandExecutor(logger, ExecuteMode.SALVO, async (c) => {
			sendCommandStart(c, sequence++)
			await sleep(10)
			sendCommandEnd(c, sequence++)
		})

		await Promise.all([
			executor.executeCommands([makeCommand('a'), makeCommand('b'), makeCommand('c')]),
			executor.executeCommands([makeCommand('d'), makeCommand('e'), makeCommand('f')]),
		])

		expect(sendCommandStart).toHaveBeenCalledTimes(6)
		expect(sendCommandEnd).toHaveBeenCalledTimes(6)

		// The Salvos in batch 1 are executed in parallel:
		expect(sendCommandStart).toHaveBeenCalledWith(makeCommand('a'), 1)
		expect(sendCommandStart).toHaveBeenCalledWith(makeCommand('b'), 2)
		expect(sendCommandStart).toHaveBeenCalledWith(makeCommand('c'), 3)

		expect(sendCommandEnd).toHaveBeenCalledWith(makeCommand('a'), 4)
		expect(sendCommandEnd).toHaveBeenCalledWith(makeCommand('b'), 5)
		expect(sendCommandEnd).toHaveBeenCalledWith(makeCommand('c'), 6)

		// The Salvos in batch 2 are executed in parallel:
		expect(sendCommandStart).toHaveBeenCalledWith(makeCommand('d'), 7)
		expect(sendCommandStart).toHaveBeenCalledWith(makeCommand('e'), 8)
		expect(sendCommandStart).toHaveBeenCalledWith(makeCommand('f'), 9)

		expect(sendCommandEnd).toHaveBeenCalledWith(makeCommand('d'), 10)
		expect(sendCommandEnd).toHaveBeenCalledWith(makeCommand('e'), 11)
		expect(sendCommandEnd).toHaveBeenCalledWith(makeCommand('f'), 12)
	})
	test('Mixed order', async () => {
		// CommandExecutor

		const logger = {
			debug: jest.fn((...args: any[]) => console.log('debug', ...args)),
			info: jest.fn((info: string) => console.log('info', info)),
			warn: jest.fn((warn: string) => console.log('warning', warn)),
			error: jest.fn((context: string, e: Error) => console.log('error', context, e)),
		}
		const sendCommandStart = jest.fn()
		const sendCommandEnd = jest.fn()

		let sequence = 1

		const executor = new CommandExecutor(logger, ExecuteMode.SEQUENTIAL, async (c) => {
			sendCommandStart(c, sequence++)
			await sleep(10)
			sendCommandEnd(c, sequence++)
		})

		await Promise.all([
			executor.executeCommands([
				makeCommand('1_a1', ExecuteMode.SALVO),
				makeCommand('1_b1', ExecuteMode.SEQUENTIAL),
				makeCommand('1_a2', ExecuteMode.SALVO),
				makeCommand('1_b2', ExecuteMode.SEQUENTIAL),
				makeCommand('1_a3', ExecuteMode.SALVO),
				makeCommand('1_b3', ExecuteMode.SEQUENTIAL),
			]),

			executor.executeCommands([
				makeCommand('2_a1', ExecuteMode.SALVO),
				makeCommand('2_b1', ExecuteMode.SEQUENTIAL),
				makeCommand('2_a2', ExecuteMode.SALVO),
				makeCommand('2_b2', ExecuteMode.SEQUENTIAL),
				makeCommand('2_a3', ExecuteMode.SALVO),
				makeCommand('2_b3', ExecuteMode.SEQUENTIAL),
			]),
		])

		expect(sendCommandStart).toHaveBeenCalledTimes(12)
		expect(sendCommandEnd).toHaveBeenCalledTimes(12)

		// The Salvos in batch 1 are executed in parallel:
		expect(sendCommandStart).toHaveBeenCalledWith(makeCommand('1_a1', ExecuteMode.SALVO), 1)
		expect(sendCommandStart).toHaveBeenCalledWith(makeCommand('1_a2', ExecuteMode.SALVO), 2)
		expect(sendCommandStart).toHaveBeenCalledWith(makeCommand('1_a3', ExecuteMode.SALVO), 3)
		expect(sendCommandEnd).toHaveBeenCalledWith(makeCommand('1_a1', ExecuteMode.SALVO), 4)
		expect(sendCommandEnd).toHaveBeenCalledWith(makeCommand('1_a2', ExecuteMode.SALVO), 5)
		expect(sendCommandEnd).toHaveBeenCalledWith(makeCommand('1_a3', ExecuteMode.SALVO), 6)

		// The Sequentials in batch 1 are executed in order, but interleaved with the Salvos in batch 2:
		expect(sendCommandStart).toHaveBeenCalledWith(makeCommand('1_b1', ExecuteMode.SEQUENTIAL), 7)
		expect(sendCommandStart).toHaveBeenCalledWith(makeCommand('2_a1', ExecuteMode.SALVO), 8)
		expect(sendCommandStart).toHaveBeenCalledWith(makeCommand('2_a2', ExecuteMode.SALVO), 9)
		expect(sendCommandStart).toHaveBeenCalledWith(makeCommand('2_a3', ExecuteMode.SALVO), 10)

		expect(sendCommandEnd).toHaveBeenCalledWith(makeCommand('1_b1', ExecuteMode.SEQUENTIAL), 11)
		expect(sendCommandStart).toHaveBeenCalledWith(makeCommand('1_b2', ExecuteMode.SEQUENTIAL), 12)

		expect(sendCommandEnd).toHaveBeenCalledWith(makeCommand('2_a1', ExecuteMode.SALVO), 13)
		expect(sendCommandEnd).toHaveBeenCalledWith(makeCommand('2_a2', ExecuteMode.SALVO), 14)
		expect(sendCommandEnd).toHaveBeenCalledWith(makeCommand('2_a3', ExecuteMode.SALVO), 15)

		expect(sendCommandEnd).toHaveBeenCalledWith(makeCommand('1_b2', ExecuteMode.SEQUENTIAL), 16)
		expect(sendCommandStart).toHaveBeenCalledWith(makeCommand('1_b3', ExecuteMode.SEQUENTIAL), 17)
		expect(sendCommandEnd).toHaveBeenCalledWith(makeCommand('1_b3', ExecuteMode.SEQUENTIAL), 18)

		// The Sequentials in batch 2 are executed in order:
		expect(sendCommandStart).toHaveBeenCalledWith(makeCommand('2_b1', ExecuteMode.SEQUENTIAL), 19)
		expect(sendCommandEnd).toHaveBeenCalledWith(makeCommand('2_b1', ExecuteMode.SEQUENTIAL), 20)
		expect(sendCommandStart).toHaveBeenCalledWith(makeCommand('2_b2', ExecuteMode.SEQUENTIAL), 21)
		expect(sendCommandEnd).toHaveBeenCalledWith(makeCommand('2_b2', ExecuteMode.SEQUENTIAL), 22)
		expect(sendCommandStart).toHaveBeenCalledWith(makeCommand('2_b3', ExecuteMode.SEQUENTIAL), 23)
		expect(sendCommandEnd).toHaveBeenCalledWith(makeCommand('2_b3', ExecuteMode.SEQUENTIAL), 24)

		sendCommandStart.mockClear()
		sequence = 0
	})
})

function makeCommand(cmd: string, executeMode?: ExecuteMode) {
	return { command: cmd, context: undefined, timelineObjId: '', executeMode }
}
async function sleep(time: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, time)
	})
}
