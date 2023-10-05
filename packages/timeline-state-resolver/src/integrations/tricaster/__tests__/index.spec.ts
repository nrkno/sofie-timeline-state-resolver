import { EventEmitter } from 'eventemitter3'
import { MockTime } from '../../../__tests__/mockTime'
import {
	DeviceType,
	MappingTriCaster,
	MappingTriCasterType,
	TimelineContentTypeTriCaster,
	TimelineContentTriCasterME,
} from 'timeline-state-resolver-types'
import { TriCasterDevice } from '..'
import { TriCasterConnectionEvents, TriCasterConnection } from '../triCasterConnection'
import { literal } from '../../../devices/device'
import { wrapIntoResolvedInstance } from './helpers'

const MOCK_CONNECT = jest.fn()
const MOCK_SEND = jest.fn(async () => Promise.resolve())
const MOCK_CLOSE = jest.fn()

jest.mock('../triCasterConnection', () => ({
	TriCasterConnection: jest.fn().mockImplementation(() => {
		return new TriCasterConnectionMock()
	}),
}))

describe('TriCasterDevice', () => {
	const mockTime = new MockTime()
	beforeEach(() => {
		mockTime.init()
		;(TriCasterConnection as jest.Mock).mockClear()
		MOCK_CONNECT.mockClear()
		MOCK_SEND.mockClear()
		MOCK_CLOSE.mockClear()
	})

	test('resolves init when connected', async () => {
		const device = createTriCasterDevice(mockTime)

		const initResult = await device.init({
			host: 'testhost',
			port: 56789,
		})

		expect(TriCasterConnection).toHaveBeenCalledWith('testhost', 56789)
		expect(MOCK_CONNECT).toHaveBeenCalledTimes(1)
		expect(MOCK_CLOSE).toHaveBeenCalledTimes(0)
		expect(initResult).toBe(true)

		await device.terminate()
		expect(MOCK_CLOSE).toHaveBeenCalledTimes(1)
	})

	test('sends commands', async () => {
		const device = createTriCasterDevice(mockTime)

		await device.init({
			host: 'testhost',
			port: 56789,
		})

		expect(MOCK_SEND).not.toHaveBeenCalled()
		const mappings = {
			tc_me0_0: literal<MappingTriCaster>({
				device: DeviceType.TRICASTER,
				mappingType: MappingTriCasterType.ME,
				name: 'main',
				deviceId: 'tc0',
			}),
		}

		device.handleState({ time: 11000, layers: {}, nextEvents: [] }, mappings)
		await mockTime.advanceTimeToTicks(11010)

		// check that initial commands are sent after connection
		// the number of them is not that relevant, but they have to only affect the mapped resource
		expect(MOCK_SEND).toHaveBeenCalled()
		expect(MOCK_SEND.mock.calls.filter((call) => (call as any)[0].target.startsWith('main')).length).toEqual(
			MOCK_SEND.mock.calls.length
		)
		MOCK_SEND.mockClear()

		device.handleState(
			{
				time: 12000,
				layers: {
					tc_me0_0: wrapIntoResolvedInstance<TimelineContentTriCasterME>({
						layer: 'tc_me0_0',
						enable: { while: '1' },
						id: 't0',
						content: {
							deviceType: DeviceType.TRICASTER,
							type: TimelineContentTypeTriCaster.ME,
							me: { programInput: 'input2', previewInput: 'input3', transitionEffect: 5, transitionDuration: 20 },
						},
					}),
				},
				nextEvents: [],
			},
			mappings
		)
		await mockTime.advanceTimeToTicks(12010)
		expect(MOCK_SEND).toHaveBeenCalledTimes(4)
		expect(MOCK_SEND).toHaveBeenNthCalledWith(1, { target: 'main', name: '_select_index', value: 5 })
		expect(MOCK_SEND).toHaveBeenNthCalledWith(2, { target: 'main', name: '_speed', value: 20 })
		expect(MOCK_SEND).toHaveBeenNthCalledWith(3, { target: 'main_b', name: '_row_named_input', value: 'input2' })
		expect(MOCK_SEND).toHaveBeenNthCalledWith(4, { target: 'main', name: '_auto' })
	})
})

function createTriCasterDevice(mockTime): TriCasterDevice {
	return new TriCasterDevice(
		'tc0',
		{
			type: DeviceType.TRICASTER,
		},
		mockTime.getCurrentTime
	)
}

class TriCasterConnectionMock extends EventEmitter<TriCasterConnectionEvents> {
	connect = MOCK_CONNECT.mockImplementationOnce(() => {
		this.emit(
			'connected',
			{
				inputCount: 32,
				meCount: 9,
				dskCount: 4,
				ddrCount: 4,
				productModel: 'TEST-MODEL',
				sessionName: 'TEST-SESSION',
				outputCount: 8,
			},
			`<shortcut_states>
	<shortcut_state name="main_a_row_named_input" value="INPUT7" type="" sender="unknown"/>
	<shortcut_state name="main_b_row_named_input" value="DDR2" type="" sender="unknown"/>
</shortcut_states>`
		)
	})

	send = MOCK_SEND

	close = MOCK_CLOSE
}
