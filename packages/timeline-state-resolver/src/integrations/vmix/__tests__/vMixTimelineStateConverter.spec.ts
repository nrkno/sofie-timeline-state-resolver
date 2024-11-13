import {
	DeviceType,
	Mapping,
	MappingVmixType,
	SomeMappingVmix,
	TSRTimelineContent,
	Timeline,
	TimelineContentTypeVMix,
	TimelineContentVMixAny,
	VMixInputType,
} from 'timeline-state-resolver-types'
import { VMixTimelineStateConverter } from '../vMixTimelineStateConverter'
import { VMixOutput, VMixStateDiffer } from '../vMixStateDiffer'
import { prefixAddedInput } from './mockState'

function createTestee(): VMixTimelineStateConverter {
	const stateDiffer = new VMixStateDiffer(
		() => Date.now(),
		() => {
			//
		}
	) // should those be mocks? or should this be taken from somewhere else? this is now more of an integration test, and maybe that's fine?
	return new VMixTimelineStateConverter(
		() => stateDiffer.getDefaultState(),
		(inputNumber) => stateDiffer.getDefaultInputState(inputNumber),
		(inputNumber) => stateDiffer.getDefaultInputAudioState(inputNumber)
	)
}

function wrapInTimelineState(
	layers: Timeline.StateInTime<TimelineContentVMixAny>
): Timeline.TimelineState<TSRTimelineContent> {
	return {
		time: Date.now(),
		layers,
		nextEvents: [],
	}
}

function wrapInTimelineObject(
	layer: string,
	content: TimelineContentVMixAny
): Timeline.ResolvedTimelineObjectInstance<TimelineContentVMixAny> {
	return {
		id: '',
		enable: { while: '1' },
		content,
		layer,
	} as Timeline.ResolvedTimelineObjectInstance<TimelineContentVMixAny>
}

function wrapInMapping(options: SomeMappingVmix): Mapping<SomeMappingVmix> {
	return {
		device: DeviceType.VMIX,
		deviceId: 'vmix0',
		options,
	}
}

/**
 * Note: most of the coverage is still in vmix.spec.ts
 */
describe('VMixTimelineStateConverter', () => {
	it('does not track state for outputs when not mapped', () => {
		const converter = createTestee()

		const result = converter.getVMixStateFromTimelineState(wrapInTimelineState({}), {})
		const controlledOutputs = Object.values<VMixOutput | undefined>({ ...result.outputs }).filter(
			(output) => output !== undefined
		)
		expect(controlledOutputs.length).toBe(0)
	})

	describe('inputs', () => {
		it('does not track state for not mapped existing inputs', () => {
			const converter = createTestee()

			const result = converter.getVMixStateFromTimelineState(wrapInTimelineState({}), {})
			expect(Object.keys(result.reportedState.existingInputs).length).toBe(0)
			expect(Object.keys(result.reportedState.existingInputsAudio).length).toBe(0)
		})

		it('does not track state for not mapped inputs added by us', () => {
			const converter = createTestee()

			const result = converter.getVMixStateFromTimelineState(wrapInTimelineState({}), {})
			expect(Object.keys(result.reportedState.inputsAddedByUs).length).toBe(0)
			expect(Object.keys(result.reportedState.inputsAddedByUsAudio).length).toBe(0)
		})

		it('tracks state for mapped existing inputs', () => {
			const converter = createTestee()

			const result = converter.getVMixStateFromTimelineState(wrapInTimelineState({}), {
				inp0: wrapInMapping({
					mappingType: MappingVmixType.Input,
					index: '1',
				}),
			})
			expect(result.reportedState.existingInputs[1]).toBeDefined()
			expect(result.reportedState.existingInputsAudio[1]).toBeUndefined() // but audio is independend
		})

		it('tracks audio state for mapped existing inputs', () => {
			const converter = createTestee()

			const result = converter.getVMixStateFromTimelineState(wrapInTimelineState({}), {
				inp0: wrapInMapping({
					mappingType: MappingVmixType.AudioChannel,
					index: '1',
				}),
			})
			expect(result.reportedState.existingInputs[1]).toBeUndefined()
			expect(result.reportedState.existingInputsAudio[1]).toBeDefined()
		})

		it('tracks state for mapped inputs added by us', () => {
			const converter = createTestee()
			const filePath = 'C:\\someFile.mp4'
			const result = converter.getVMixStateFromTimelineState(
				wrapInTimelineState({
					inp0: wrapInTimelineObject('inp0', {
						deviceType: DeviceType.VMIX,
						filePath: 'C:\\someFile.mp4',
						type: TimelineContentTypeVMix.INPUT,
						inputType: VMixInputType.Video,
					}),
				}),
				{
					inp0: wrapInMapping({
						mappingType: MappingVmixType.Input,
					}),
				}
			)
			expect(result.reportedState.inputsAddedByUs[prefixAddedInput(filePath)]).toBeDefined()
			expect(result.reportedState.inputsAddedByUsAudio[prefixAddedInput(filePath)]).toBeUndefined()
		})

		it('supports text', () => {
			const converter = createTestee()
			const text = { 'myTitle.Text': 'SomeValue', 'myTitle.Foo': 'Bar' }
			const result = converter.getVMixStateFromTimelineState(
				wrapInTimelineState({
					inp0: wrapInTimelineObject('inp0', {
						deviceType: DeviceType.VMIX,
						text,
						type: TimelineContentTypeVMix.INPUT,
					}),
				}),
				{
					inp0: wrapInMapping({
						mappingType: MappingVmixType.Input,
						index: '1',
					}),
				}
			)
			expect(result.reportedState.existingInputs['1'].text).toEqual(text)
		})

		// TODO: maybe we can't trust the defaults when adding an input? Make this test pass eventually
		// it('tracks audio state for mapped inputs added by us', () => {
		// 	const converter = createTestee()
		// 	const filePath = 'C:\\someFile.mp4'
		// 	const result = converter.getVMixStateFromTimelineState(
		// 		wrapInTimelineState({
		// 			inp0: wrapInTimelineObject('inp0', {
		// 				deviceType: DeviceType.VMIX,
		// 				filePath: 'C:\\someFile.mp4',
		// 				type: TimelineContentTypeVMix.INPUT,
		// 				inputType: VMixInputType.Video,
		// 			}),
		// 		}),
		// 		{
		// 			inp0: wrapInMapping({
		// 				mappingType: MappingVmixType.Input,
		// 			}),
		// 			inp0_audio: wrapInMapping({
		// 				mappingType: MappingVmixType.AudioChannel,
		// 				inputLayer: 'inp0',
		// 			}),
		// 		}
		// 	)
		// 	expect(result.reportedState.inputsAddedByUs[prefixAddedInput(filePath)]).toBeDefined()
		// 	expect(result.reportedState.inputsAddedByUsAudio[prefixAddedInput(filePath)]).toBeDefined()
		// })
	})
})
