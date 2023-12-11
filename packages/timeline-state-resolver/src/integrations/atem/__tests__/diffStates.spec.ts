import * as AtemConnection from 'atem-connection'
import { compareAtemCommands, createDevice, expectIncludesAtemCommandName, extractAllCommands } from './util'
import {
	AtemTransitionStyle,
	DeviceType,
	MappingAtemAuxilliary,
	MappingAtemMixEffect,
	MappingAtemType,
	Mappings,
} from 'timeline-state-resolver-types'
import { AtemState } from 'atem-state'
import { createDiffOptions } from '../diffState'

const diffStatesSpy = jest.spyOn(AtemState, 'diffStates')

describe('Diff States', () => {
	beforeEach(() => {
		diffStatesSpy.mockClear()
	})

	test('Simple diff against empty state', async () => {
		const device = await createDevice()

		const state1 = AtemConnection.AtemStateUtil.Create()
		AtemConnection.AtemStateUtil.getMixEffect(state1, 0).programInput = 2

		const diffOptions = createDiffOptions({})
		expect(diffOptions).toMatchSnapshot()

		expect(diffStatesSpy).toHaveBeenCalledTimes(0)

		const commands = device.diffStates(undefined, state1, {})

		expect(diffStatesSpy).toHaveBeenCalledTimes(1)
		expect(diffStatesSpy).toHaveBeenNthCalledWith(
			1,
			expect.anything(),
			AtemConnection.AtemStateUtil.Create(),
			state1,
			diffOptions
		)

		const allCommands = extractAllCommands(commands)
		expect(allCommands).toHaveLength(1)
		compareAtemCommands(allCommands[0], new AtemConnection.Commands.ProgramInputCommand(0, 2))
	})

	test('Simple diff against other state', async () => {
		const device = await createDevice()

		const state1 = AtemConnection.AtemStateUtil.Create()
		AtemConnection.AtemStateUtil.getMixEffect(state1, 0).programInput = 2
		const state2 = AtemConnection.AtemStateUtil.Create()
		AtemConnection.AtemStateUtil.getMixEffect(state2, 0).programInput = 3

		const diffOptions = createDiffOptions({})

		expect(diffStatesSpy).toHaveBeenCalledTimes(0)

		const commands = device.diffStates(state1, state2, {})

		expect(diffStatesSpy).toHaveBeenCalledTimes(1)
		expect(diffStatesSpy).toHaveBeenNthCalledWith(1, expect.anything(), state1, state2, diffOptions)

		const allCommands = extractAllCommands(commands)
		expect(allCommands).toHaveLength(1)
		compareAtemCommands(allCommands[0], new AtemConnection.Commands.ProgramInputCommand(0, 3))
	})

	test('Diff aux without mapping', async () => {
		const device = await createDevice()

		const state1 = AtemConnection.AtemStateUtil.Create()
		state1.video.auxilliaries[5] = 10

		const diffOptions = createDiffOptions({})
		expect(diffOptions.video?.auxiliaries).toStrictEqual([])

		expect(diffStatesSpy).toHaveBeenCalledTimes(0)

		const commands = device.diffStates(undefined, state1, {})

		expect(diffStatesSpy).toHaveBeenCalledTimes(1)
		expect(diffStatesSpy).toHaveBeenNthCalledWith(
			1,
			expect.anything(),
			AtemConnection.AtemStateUtil.Create(),
			state1,
			diffOptions
		)

		expect(commands).toHaveLength(0)
	})

	test('Diff aux with mapping', async () => {
		const device = await createDevice()

		const state1 = AtemConnection.AtemStateUtil.Create()
		state1.video.auxilliaries[5] = 10

		const mappings: Mappings<MappingAtemAuxilliary> = {
			myAux: {
				device: DeviceType.ATEM,
				deviceId: '',
				options: {
					mappingType: MappingAtemType.Auxilliary,
					index: 5,
				},
			},
		}

		const diffOptions = createDiffOptions(mappings)
		expect(diffOptions.video?.auxiliaries).toStrictEqual([5])

		expect(diffStatesSpy).toHaveBeenCalledTimes(0)

		const commands = device.diffStates(undefined, state1, mappings)

		expect(diffStatesSpy).toHaveBeenCalledTimes(1)
		expect(diffStatesSpy).toHaveBeenNthCalledWith(
			1,
			expect.anything(),
			AtemConnection.AtemStateUtil.Create(),
			state1,
			diffOptions
		)

		const allCommands = extractAllCommands(commands)
		expect(allCommands).toHaveLength(1)
		compareAtemCommands(allCommands[0], new AtemConnection.Commands.AuxSourceCommand(5, 10))
	})

	test('Diff set input with transition', async () => {
		const device = await createDevice()

		const mappings: Mappings<MappingAtemMixEffect> = {
			myAux: {
				device: DeviceType.ATEM,
				deviceId: '',
				options: {
					mappingType: MappingAtemType.MixEffect,
					index: 0,
				},
			},
		}

		const deviceState1 = AtemConnection.AtemStateUtil.Create()
		Object.assign(AtemConnection.AtemStateUtil.getMixEffect(deviceState1, 0), {
			input: 2,
			transition: AtemTransitionStyle.CUT,
		})

		{
			const commands = device.diffStates(undefined, deviceState1, mappings)

			const allCommands = extractAllCommands(commands)
			expect(allCommands).toHaveLength(2)
			expectIncludesAtemCommandName(allCommands, AtemConnection.Commands.CutCommand.name)
		}

		const deviceState2 = AtemConnection.AtemStateUtil.Create()
		Object.assign(AtemConnection.AtemStateUtil.getMixEffect(deviceState2, 0), {
			input: 3,
			transition: AtemTransitionStyle.DIP,
		})

		{
			const commands = device.diffStates(deviceState1, deviceState2, mappings)

			const allCommands = extractAllCommands(commands)
			expect(allCommands).toHaveLength(4)

			expectIncludesAtemCommandName(allCommands, AtemConnection.Commands.AutoTransitionCommand.name)
		}
	})

	test('Diff set input with transition from another transition', async () => {
		const device = await createDevice()

		const mappings: Mappings<MappingAtemMixEffect> = {
			myAux: {
				device: DeviceType.ATEM,
				deviceId: '',
				options: {
					mappingType: MappingAtemType.MixEffect,
					index: 0,
				},
			},
		}

		const deviceState1 = AtemConnection.AtemStateUtil.Create()
		Object.assign(AtemConnection.AtemStateUtil.getMixEffect(deviceState1, 0), {
			input: 2,
			transition: AtemTransitionStyle.DIP,
		})

		{
			const commands = device.diffStates(undefined, deviceState1, mappings)

			const allCommands = extractAllCommands(commands)
			expect(allCommands).toHaveLength(4)
		}

		const deviceState2 = AtemConnection.AtemStateUtil.Create()
		Object.assign(AtemConnection.AtemStateUtil.getMixEffect(deviceState2, 0), {
			input: 4,
			transition: AtemTransitionStyle.DIP,
		})

		{
			const commands = device.diffStates(deviceState1, deviceState2, mappings)

			const allCommands = extractAllCommands(commands)
			expect(allCommands).toHaveLength(3)

			expectIncludesAtemCommandName(allCommands, AtemConnection.Commands.AutoTransitionCommand.name)
		}
	})
})
