import { Conductor } from '../../../conductor'
import { NoraNRKDevice } from '..'
import { Mappings, DeviceType, MappingNoraNRK, TimelineObjNoraNRKAny } from 'timeline-state-resolver-types'
import { MockTime } from '../../../__tests__/mockTime'
import { ThreadedClass } from 'threadedclass'
import { getMockCall } from '../../../__tests__/lib'

// let nowActual = Date.now()
describe('NORA Core (NRK)', () => {
	const mockTime = new MockTime()
	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})
	test('POST command', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingNoraNRK = {
			device: DeviceType.NORA_NRK,
			deviceId: 'myNORA',
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await myConductor.addDevice('myNORA', {
			type: DeviceType.NORA_NRK,
			options: {},
			commandReceiver: commandReceiver0,
		})
		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myNORA')
		const device = deviceContainer!.device as ThreadedClass<NoraNRKDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now + 1000, // in 1 second
					duration: 2000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.NORA_NRK,

					group: 'test',
					channel: 'gfx1',
					payload: {
						manifest: 'nyheter',
						template: {
							layer: 'super',
							name: '01_navn',
							event: 'take',
						},
						content: {
							navn: 'Firstname Lastname',
						},
					},
				},
			},
		])
		await mockTime.advanceTimeToTicks(10990)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		await mockTime.advanceTimeToTicks(11100)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toBeCalledWith(
			expect.anything(),
			expect.objectContaining({
				group: 'test',
				channel: 'gfx1',
				payload: {
					manifest: 'nyheter',
					template: {
						layer: 'super',
						name: '01_navn',
						event: 'take',
					},
					content: {
						navn: 'Firstname Lastname',
					},
				},
			}),
			expect.anything(),
			expect.stringContaining('obj0'),
			expect.anything()
		)
		expect(getMockCall(commandReceiver0, 0, 2)).toMatch(/added/) // context
		await mockTime.advanceTimeToTicks(16000)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
	})
	test('POST message, ordering of commands', async () => {
		const commandReceiver0: any = jest.fn(async () => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingNoraNRK = {
			device: DeviceType.NORA_NRK,
			deviceId: 'myNORA',
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
			myLayer1: myLayerMapping0,
			myLayer2: myLayerMapping0,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await myConductor.addDevice('myNORA', {
			type: DeviceType.NORA_NRK,
			options: {},
			commandReceiver: commandReceiver0,
		})
		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myNORA')
		const device = deviceContainer!.device as ThreadedClass<NoraNRKDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		const timeline: Array<TimelineObjNoraNRKAny> = [
			{
				id: 'obj0',
				enable: {
					start: mockTime.now + 1000, // in 1 second
					duration: 2000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.NORA_NRK,

					group: 'test',
					channel: 'gfx1',
					payload: {
						manifest: 'nyheter',
						template: {
							layer: 'super',
							name: '01_navn',
							event: 'take',
						},
						content: {
							navn: 'Firstname Lastname',
						},
					},

					temporalPriority: 1,
				},
			},
			{
				id: 'obj1',
				enable: {
					start: mockTime.now + 1000, // in 1 second
					duration: 2000,
				},
				layer: 'myLayer1',
				content: {
					deviceType: DeviceType.NORA_NRK,

					group: 'test',
					channel: 'gfx1',
					payload: {
						manifest: 'nyheter',
						template: {
							layer: 'super',
							name: '02_navn_alt',
							event: 'take',
						},
						content: {
							navn: 'Firstname Lastname',
						},
					},

					temporalPriority: 3,
				},
			},
			{
				id: 'obj2',
				enable: {
					start: mockTime.now + 1000, // in 1 second
					duration: 2000,
				},
				layer: 'myLayer2',
				content: {
					deviceType: DeviceType.NORA_NRK,

					group: 'test',
					channel: 'gfx1',
					payload: {
						manifest: 'nyheter',
						template: {
							layer: 'super',
							name: '03_navn_alt_2',
							event: 'take',
						},
						content: {
							navn: 'Firstname Lastname',
						},
					},

					temporalPriority: 2,
				},
			},
		]
		myConductor.setTimelineAndMappings(timeline)

		await mockTime.advanceTimeToTicks(10990)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		await mockTime.advanceTimeToTicks(11100)

		// Expecting to see the ordering below:
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			expect.anything(),
			expect.objectContaining({
				payload: expect.objectContaining({ template: expect.objectContaining({ name: '01_navn' }) }),
			}),
			expect.anything(),
			expect.stringContaining('obj0'),
			expect.anything()
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			expect.anything(),
			expect.objectContaining({
				payload: expect.objectContaining({ template: expect.objectContaining({ name: '03_navn_alt_2' }) }),
			}),
			expect.anything(),
			expect.stringContaining('obj2'),
			expect.anything()
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			3,
			expect.anything(),
			expect.objectContaining({
				payload: expect.objectContaining({ template: expect.objectContaining({ name: '02_navn_alt' }) }),
			}),
			expect.anything(),
			expect.stringContaining('obj1'),
			expect.anything()
		)
	})
})
