import { CommandExecutor } from '../commandExecutor'

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

		const executor = new CommandExecutor(logger, 'sequential', async (c) => {
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
})

function makeCommand(cmd: string) {
	return { command: cmd, context: undefined, timelineObjId: '' }
}
async function sleep(time: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, time)
	})
}
