import {
	Mappings,
	DeviceType,
	Mapping,
	SomeMappingPharos,
	TimelineContentTypePharos,
} from 'timeline-state-resolver-types'
import { getDeviceContext } from '../../__tests__/testlib'
import { EventEmitter } from 'events'
import type { Pharos, ProjectInfo } from '../connection'
import { makeTimelineObjectResolved } from '../../../__mocks__/objects'

class MockPharosApi
	extends EventEmitter
	implements
		Pick<
			Pharos,
			| 'connect'
			| 'dispose'
			| 'getProjectInfo'
			| 'releaseScene'
			| 'releaseTimeline'
			| 'pauseTimeline'
			| 'resumeTimeline'
			| 'setTimelineRate'
			| 'startScene'
			| 'startTimeline'
		>
{
	static instances: MockPharosApi[] = []
	constructor() {
		super()

		MockPharosApi.instances.push(this)
	}

	connected = false

	connect = jest.fn(async () => {
		this.connected = true

		setImmediate(() => this.emit('connected'))
	})
	dispose = jest.fn(async () => {
		this.connected = false

		setImmediate(() => this.emit('disconnected'))
	})

	getProjectInfo = jest.fn(async () => {
		return {
			author: 'Jest',
			filename: 'filename',
			name: 'Jest test mock',
			unique_id: 'abcde123',
			upload_date: '2018-10-22T08:09:02',
		} satisfies ProjectInfo
	})

	commandCalls: any[] = []
	releaseScene = jest.fn(async (scene: number, fade?: number) => {
		this.commandCalls.push({ type: 'releaseScene', scene, fade })
	})
	releaseTimeline = jest.fn(async (timeline: number, fade?: number) => {
		this.commandCalls.push({ type: 'releaseTimeline', timeline, fade })
	})
	pauseTimeline = jest.fn(async (timeline: number) => {
		this.commandCalls.push({ type: 'pauseTimeline', timeline })
	})
	resumeTimeline = jest.fn(async (timeline: number) => {
		this.commandCalls.push({ type: 'resumeTimeline', timeline })
	})
	setTimelineRate = jest.fn(async (timeline: number, rate: number) => {
		this.commandCalls.push({ type: 'setTimelineRate', timeline, rate })
	})
	startScene = jest.fn(async (scene: number, fade?: number) => {
		this.commandCalls.push({ type: 'startScene', scene, fade })
	})
	startTimeline = jest.fn(async (timeline: number, rate?: number) => {
		this.commandCalls.push({ type: 'startTimeline', timeline, rate })
	})
}
jest.mock('../connection', () => ({ Pharos: MockPharosApi }))
import { PharosDevice, PharosState } from '..'

describe('Pharos', () => {
	jest.mock('ws', () => null)
	beforeEach(() => {
		MockPharosApi.instances = []
	})

	afterEach(() => {
		// eslint-disable-next-line jest/no-standalone-expect
		expect(MockPharosApi.instances).toHaveLength(1)
	})

	// Future: this tests should be rewritten to be less monolithic and more granular
	test('Scene', async () => {
		const context = getDeviceContext()
		const pharos = new PharosDevice(context)

		await pharos.init({
			host: '127.0.0.1',
		})
		expect(pharos).toBeTruthy()

		const mockApi = MockPharosApi.instances[0]
		expect(mockApi).toBeTruthy()

		const myLayerMapping0: Mapping<SomeMappingPharos> = {
			device: DeviceType.PHAROS,
			deviceId: 'myPharos',
			options: {},
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const state0: PharosState = {}
		const commands0 = pharos.diffStates(undefined, state0, myLayerMapping, 0, 'test')
		expect(commands0).toHaveLength(0)

		const state1: PharosState = {
			myLayer0: makeTimelineObjectResolved({
				id: 'scene0',
				enable: {
					start: 1000,
					duration: 5000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.PHAROS,
					type: TimelineContentTypePharos.SCENE,

					scene: 1,
				},
			}),
		}
		const commands1 = pharos.diffStates(state0, state1, myLayerMapping, 0, 'test')
		expect(commands1).toHaveLength(1)

		for (const command of commands1) await pharos.sendCommand(command)
		expect(context.commandError).toHaveBeenCalledTimes(0)
		expect(mockApi.commandCalls).toEqual([{ type: 'startScene', scene: 1 }])
		mockApi.commandCalls = []

		const state2: PharosState = {
			myLayer0: makeTimelineObjectResolved({
				id: 'scene1',
				enable: {
					start: 2000,
					duration: 5000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.PHAROS,
					type: TimelineContentTypePharos.SCENE,

					scene: 2,
				},
			}),
		}
		const commands2 = pharos.diffStates(state1, state2, myLayerMapping, 0, 'test')
		expect(commands2).toHaveLength(2)

		for (const command of commands2) await pharos.sendCommand(command)
		expect(context.commandError).toHaveBeenCalledTimes(0)
		expect(mockApi.commandCalls).toEqual([
			{ type: 'releaseScene', scene: 1 },
			{ type: 'startScene', scene: 2 },
		])
		mockApi.commandCalls = []

		const state3: PharosState = {
			myLayer0: makeTimelineObjectResolved({
				id: 'scene2',
				enable: {
					start: 3000,
					duration: 1000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.PHAROS,
					type: TimelineContentTypePharos.SCENE,

					scene: 2,
					stopped: true,
				},
			}),
		}
		const commands3 = pharos.diffStates(state2, state3, myLayerMapping, 0, 'test')
		expect(commands3).toHaveLength(2)

		for (const command of commands3) await pharos.sendCommand(command)
		expect(context.commandError).toHaveBeenCalledTimes(0)
		expect(mockApi.commandCalls).toEqual([
			{ type: 'releaseScene', scene: 2 },
			{ type: 'releaseScene', scene: 2 },
		])
		mockApi.commandCalls = []

		const state4: PharosState = {}
		const commands4 = pharos.diffStates(state3, state4, myLayerMapping, 0, 'test')
		expect(commands4).toHaveLength(1)

		for (const command of commands4) await pharos.sendCommand(command)
		expect(context.commandError).toHaveBeenCalledTimes(0)
		expect(mockApi.commandCalls).toEqual([{ type: 'releaseScene', scene: 2 }])
	})
})
