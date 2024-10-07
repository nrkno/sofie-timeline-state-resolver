import { Commands, TransportStatus } from 'hyperdeck-connection'
import { diffHyperdeckStates } from '../diffState'
import { HyperdeckDeviceState, HyperdeckDeviceTransportState, getDefaultHyperdeckState } from '../stateBuilder'

describe('Diff States', () => {
	function createStoppedState(): HyperdeckDeviceState {
		const newState = getDefaultHyperdeckState()
		newState.transport = {
			status: TransportStatus.STOPPED,
			speed: 1,
			singleClip: true,
			loop: false,
			clipId: null,
			recordFilename: undefined,
		}
		return newState
	}

	function createPlayingState(
		clipId: number | null,
		props?: Partial<Pick<HyperdeckDeviceTransportState, 'loop' | 'singleClip' | 'speed'>>
	): HyperdeckDeviceState {
		const newState = getDefaultHyperdeckState()
		newState.transport = {
			status: TransportStatus.PLAY,
			speed: 1,
			singleClip: true,
			loop: false,
			clipId: clipId,
			recordFilename: undefined,
			...props,
		}
		return newState
	}

	function createPreviewState(): HyperdeckDeviceState {
		const newState = getDefaultHyperdeckState()
		newState.transport = {
			status: TransportStatus.PREVIEW,
			speed: 1,
			singleClip: true,
			loop: false,
			clipId: null,
			recordFilename: undefined,
		}
		return newState
	}

	function createRecordingState(filename: string | undefined): HyperdeckDeviceState {
		const newState = getDefaultHyperdeckState()
		newState.transport = {
			status: TransportStatus.RECORD,
			speed: 1,
			singleClip: true,
			loop: false,
			clipId: null,
			recordFilename: filename,
		}
		return newState
	}

	describe('to default state', () => {
		test('from undefined state', async () => {
			const newState = getDefaultHyperdeckState()
			const logError = jest.fn()

			const commands = diffHyperdeckStates(undefined, newState, logError)
			expect(commands).toHaveLength(1)
			expect(commands[0].command).toBeInstanceOf(Commands.StopCommand)

			expect(logError).toHaveBeenCalledTimes(0)
		})

		test('from recording', async () => {
			const oldState = createRecordingState(undefined)
			const newState = getDefaultHyperdeckState()
			const logError = jest.fn()

			const commands = diffHyperdeckStates(oldState, newState, logError)
			expect(commands).toHaveLength(1)
			expect(commands[0].command).toBeInstanceOf(Commands.StopCommand)

			expect(logError).toHaveBeenCalledTimes(0)
		})
	})

	describe('to recording', () => {
		test('from undefined state', async () => {
			const newState = createRecordingState('test record')
			const logError = jest.fn()

			const commands = diffHyperdeckStates(undefined, newState, logError)
			expect(commands).toHaveLength(1)
			expect(commands[0].command).toBeInstanceOf(Commands.RecordCommand)
			expect(commands[0].command).toMatchObject({
				filename: 'test record',
			})

			expect(logError).toHaveBeenCalledTimes(0)
		})

		test('from playing state', async () => {
			const oldState = createPlayingState(12)
			const newState = createRecordingState('test record')
			const logError = jest.fn()

			const commands = diffHyperdeckStates(oldState, newState, logError)
			expect(commands).toHaveLength(1)
			expect(commands[0].command).toBeInstanceOf(Commands.RecordCommand)
			expect(commands[0].command).toMatchObject({
				filename: 'test record',
			})

			expect(logError).toHaveBeenCalledTimes(0)
		})

		test('from other record state', async () => {
			const oldState = createRecordingState(undefined)
			const newState = createRecordingState('test record')
			const logError = jest.fn()

			const commands = diffHyperdeckStates(oldState, newState, logError)
			expect(commands).toHaveLength(0)

			expect(logError).toHaveBeenCalledTimes(0)
		})

		test('from record with different filename', async () => {
			const oldState = createRecordingState('old name')
			const newState = createRecordingState('test record')
			const logError = jest.fn()

			const commands = diffHyperdeckStates(oldState, newState, logError)
			expect(commands).toHaveLength(2)
			expect(commands[0].command).toBeInstanceOf(Commands.StopCommand)
			expect(commands[1].command).toBeInstanceOf(Commands.RecordCommand)
			expect(commands[1].command).toMatchObject({
				filename: 'test record',
			})

			expect(logError).toHaveBeenCalledTimes(0)
		})
	})

	describe('to playing', () => {
		test('from undefined state', async () => {
			const newState = createPlayingState(15)
			const logError = jest.fn()

			const commands = diffHyperdeckStates(undefined, newState, logError)
			expect(commands).toHaveLength(3)
			expect(commands[0].command).toBeInstanceOf(Commands.PlayCommand)
			expect(commands[0].command).toMatchObject({
				speed: '1',
				loop: false,
				singleClip: true,
			})
			expect(commands[1].command).toBeInstanceOf(Commands.GoToCommand)
			expect(commands[1].command).toMatchObject({
				clipId: 15,
			})
			expect(commands[2].command).toBeInstanceOf(Commands.PlayCommand)
			expect(commands[2].command).toMatchObject({
				speed: '1',
				loop: false,
				singleClip: true,
			})

			expect(logError).toHaveBeenCalledTimes(0)
		})

		test('from stopped state', async () => {
			const oldState = createStoppedState()
			const newState = createPlayingState(15)
			const logError = jest.fn()

			const commands = diffHyperdeckStates(oldState, newState, logError)
			expect(commands).toHaveLength(3)
			expect(commands[0].command).toBeInstanceOf(Commands.PlayCommand)
			expect(commands[0].command).toMatchObject({
				speed: '1',
				loop: false,
				singleClip: true,
			})
			expect(commands[1].command).toBeInstanceOf(Commands.GoToCommand)
			expect(commands[1].command).toMatchObject({
				clipId: 15,
			})
			expect(commands[2].command).toBeInstanceOf(Commands.PlayCommand)
			expect(commands[2].command).toMatchObject({
				speed: '1',
				loop: false,
				singleClip: true,
			})

			expect(logError).toHaveBeenCalledTimes(0)
		})

		test('from other playing state', async () => {
			const oldState = createPlayingState(12)
			const newState = createPlayingState(15)
			const logError = jest.fn()

			const commands = diffHyperdeckStates(oldState, newState, logError)
			expect(commands).toHaveLength(2)
			expect(commands[0].command).toBeInstanceOf(Commands.GoToCommand)
			expect(commands[0].command).toMatchObject({
				clipId: 15,
			})
			expect(commands[1].command).toBeInstanceOf(Commands.PlayCommand)
			expect(commands[1].command).toMatchObject({
				speed: '1',
				loop: false,
				singleClip: true,
			})

			expect(logError).toHaveBeenCalledTimes(0)
		})

		test('same clip, different speed', async () => {
			const oldState = createPlayingState(15)
			const newState = createPlayingState(15, { speed: 1.1 })
			const logError = jest.fn()

			const commands = diffHyperdeckStates(oldState, newState, logError)
			expect(commands).toHaveLength(1)
			expect(commands[0].command).toBeInstanceOf(Commands.PlayCommand)
			expect(commands[0].command).toMatchObject({
				speed: '1.1',
				loop: false,
				singleClip: true,
			})

			expect(logError).toHaveBeenCalledTimes(0)
		})
	})

	describe('to preview', () => {
		test('from undefined state', async () => {
			const newState = createPreviewState()
			const logError = jest.fn()

			const commands = diffHyperdeckStates(undefined, newState, logError)
			expect(commands).toHaveLength(1)
			expect(commands[0].command).toBeInstanceOf(Commands.PreviewCommand)
			expect(commands[0].command).toMatchObject({
				enable: true,
			})

			expect(logError).toHaveBeenCalledTimes(0)
		})

		test('from stopped state', async () => {
			const oldState = createStoppedState()
			const newState = createPreviewState()
			const logError = jest.fn()

			const commands = diffHyperdeckStates(oldState, newState, logError)
			expect(commands).toHaveLength(1)
			expect(commands[0].command).toBeInstanceOf(Commands.PreviewCommand)
			expect(commands[0].command).toMatchObject({
				enable: true,
			})

			expect(logError).toHaveBeenCalledTimes(0)
		})

		test('from other preview state', async () => {
			const oldState = createPreviewState()
			const newState = createPreviewState()
			const logError = jest.fn()

			const commands = diffHyperdeckStates(oldState, newState, logError)
			expect(commands).toHaveLength(0)

			expect(logError).toHaveBeenCalledTimes(0)
		})
	})
})
