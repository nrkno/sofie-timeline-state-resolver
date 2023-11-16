import * as AtemConnection from 'atem-connection'
import { compareAtemCommands, createDevice } from './util'
import {
	AtemTransitionStyle,
	DeviceType,
	MappingAtemAuxilliary,
	MappingAtemMixEffect,
	MappingAtemType,
	Mappings,
} from 'timeline-state-resolver-types'

describe('Diff States', () => {
	test('Simple diff against empty state', async () => {
		const device = await createDevice()

		const state1 = AtemConnection.AtemStateUtil.Create()
		AtemConnection.AtemStateUtil.getMixEffect(state1, 0).programInput = 2

		const commands = device.diffStates(undefined, state1, {})

		expect(commands).toHaveLength(1)
		compareAtemCommands(commands[0].command, new AtemConnection.Commands.ProgramInputCommand(0, 2))
	})

	test('Simple diff against other state', async () => {
		const device = await createDevice()

		const state1 = AtemConnection.AtemStateUtil.Create()
		AtemConnection.AtemStateUtil.getMixEffect(state1, 0).programInput = 2
		const state2 = AtemConnection.AtemStateUtil.Create()
		AtemConnection.AtemStateUtil.getMixEffect(state2, 0).programInput = 3

		const commands = device.diffStates(state1, state2, {})

		expect(commands).toHaveLength(1)
		compareAtemCommands(commands[0].command, new AtemConnection.Commands.ProgramInputCommand(0, 3))
	})

	test('Diff aux without mapping', async () => {
		const device = await createDevice()

		const state1 = AtemConnection.AtemStateUtil.Create()
		state1.video.auxilliaries[5] = 10

		const commands = device.diffStates(undefined, state1, {})

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

		const commands = device.diffStates(undefined, state1, mappings)

		expect(commands).toHaveLength(1)
		compareAtemCommands(commands[0].command, new AtemConnection.Commands.AuxSourceCommand(5, 10))
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

			expect(commands).toHaveLength(2)
			compareAtemCommands(commands[0].command, new AtemConnection.Commands.PreviewInputCommand(0, 2))
			compareAtemCommands(commands[1].command, new AtemConnection.Commands.CutCommand(0))
		}

		const deviceState2 = AtemConnection.AtemStateUtil.Create()
		Object.assign(AtemConnection.AtemStateUtil.getMixEffect(deviceState2, 0), {
			input: 3,
			transition: AtemTransitionStyle.DIP,
		})

		{
			const commands = device.diffStates(deviceState1, deviceState2, mappings)

			expect(commands).toHaveLength(4)
			const transitionPropertiesCommand = new AtemConnection.Commands.TransitionPropertiesCommand(0)
			transitionPropertiesCommand.updateProps({ nextStyle: 1 })

			compareAtemCommands(commands[0].command, new AtemConnection.Commands.PreviewInputCommand(0, 3))
			compareAtemCommands(commands[1].command, transitionPropertiesCommand)
			compareAtemCommands(commands[2].command, new AtemConnection.Commands.TransitionPositionCommand(0, 0))
			compareAtemCommands(commands[3].command, new AtemConnection.Commands.AutoTransitionCommand(0))
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
			expect(commands).toHaveLength(4)
		}

		const deviceState2 = AtemConnection.AtemStateUtil.Create()
		Object.assign(AtemConnection.AtemStateUtil.getMixEffect(deviceState2, 0), {
			input: 4,
			transition: AtemTransitionStyle.DIP,
		})

		{
			const commands = device.diffStates(deviceState1, deviceState2, mappings)

			expect(commands).toHaveLength(3)
			const transitionPropertiesCommand = new AtemConnection.Commands.TransitionPropertiesCommand(0)
			transitionPropertiesCommand.updateProps({ nextStyle: 1 })

			compareAtemCommands(commands[0].command, new AtemConnection.Commands.PreviewInputCommand(0, 4))
			compareAtemCommands(commands[1].command, new AtemConnection.Commands.TransitionPositionCommand(0, 0))
			compareAtemCommands(commands[2].command, new AtemConnection.Commands.AutoTransitionCommand(0))
		}
	})
})
