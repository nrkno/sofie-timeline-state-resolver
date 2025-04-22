import { EventEmitter } from 'eventemitter3'
import {
	DeviceType,
	SomeMappingTricaster,
	MappingTricasterType,
	TimelineContentTypeTriCaster,
	TimelineContentTriCasterME,
	Mapping,
	Timeline,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { TriCasterDevice } from '..'
import { TriCasterConnectionEvents, TriCasterConnection } from '../triCasterConnection'
import { literal } from '../../../lib'
import { wrapIntoResolvedInstance } from './helpers'
import { getDeviceContext } from '../../__tests__/testlib'

const MOCK_CONNECT = jest.fn()
const MOCK_CLOSE = jest.fn()

jest.mock('../triCasterConnection', () => ({
	TriCasterConnection: jest.fn().mockImplementation(() => {
		return new TriCasterConnectionMock()
	}),
}))

describe('TriCasterDevice', () => {
	beforeEach(() => {
		;(TriCasterConnection as jest.Mock).mockClear()
		MOCK_CONNECT.mockClear()
		MOCK_CLOSE.mockClear()
	})

	test('resolves init when connected', async () => {
		const device = createTriCasterDevice()

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
		const device = createTriCasterDevice()

		await device.init({
			host: 'testhost',
			port: 56789,
		})

		const mappings = {
			tc_me0_0: literal<Mapping<SomeMappingTricaster>>({
				device: DeviceType.TRICASTER,
				deviceId: 'tc0',
				options: {
					mappingType: MappingTricasterType.ME,
					name: 'main',
				},
			}),
		}

		const state1: Timeline.TimelineState<TSRTimelineContent> = { time: 11000, layers: {}, nextEvents: [] }
		const tricasterState1 = device.convertTimelineStateToDeviceState(state1, mappings)
		const commands1 = device.diffStates(undefined, tricasterState1, mappings, 0, 'test')
		expect(commands1).not.toHaveLength(0)

		const state2: Timeline.TimelineState<TSRTimelineContent> = {
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
		}
		const tricasterState2 = device.convertTimelineStateToDeviceState(state2, mappings)
		const commands2 = device.diffStates(tricasterState1, tricasterState2, mappings, 0, 'test')
		expect(commands2).toHaveLength(4)
		expect(commands2[0].command).toMatchObject({ target: 'main', name: '_set_mix_effect_bin_index', value: 5 })
		expect(commands2[1].command).toMatchObject({ target: 'main', name: '_speed', value: 20 })
		expect(commands2[2].command).toMatchObject({ target: 'main_b', name: '_row_named_input', value: 'input2' })
		expect(commands2[3].command).toMatchObject({ target: 'main', name: '_auto' })
	})
})

function createTriCasterDevice(): TriCasterDevice {
	return new TriCasterDevice(getDeviceContext())
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

	close = MOCK_CLOSE
}
