import { VMixCommand } from 'timeline-state-resolver-types'
import { VMixStateDiffer } from '../vMixStateDiffer'
import { makeMockFullState } from './mockState'

function createTestee(): VMixStateDiffer {
	return new VMixStateDiffer(() => Date.now(), jest.fn())
}

/**
 * Note: most of the coverage is still in vmix.spec.ts
 */
describe('VMixStateDiffer', () => {
	it('does not generate commands for identical states', () => {
		const differ = createTestee()

		const oldState = makeMockFullState()
		const newState = makeMockFullState()

		expect(differ.getCommandsToAchieveState(Date.now(), oldState, newState)).toEqual([])
	})

	it('resets audio buses when audio starts to be controlled', () => {
		const differ = createTestee()

		const oldState = makeMockFullState()
		const newState = makeMockFullState()

		newState.reportedState.existingInputsAudio['99'] = differ.getDefaultInputAudioState(99)

		const commands = differ.getCommandsToAchieveState(Date.now(), oldState, newState)
		const busCommands = commands.filter((command) => command.command.command === VMixCommand.AUDIO_BUS_OFF)

		expect(busCommands.length).toBe(7) // all but Master
	})
})
