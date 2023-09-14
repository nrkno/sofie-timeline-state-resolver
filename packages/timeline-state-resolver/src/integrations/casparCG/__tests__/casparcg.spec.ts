/* eslint-disable jest/expect-expect */
import {
	DeviceType,
	Mappings,
	Timeline,
	TimelineContentCasparCGAny,
	TimelineContentTypeCasparCg,
	TSRTimelineContent,
} from 'timeline-state-resolver-types'
import { CasparCGDevice } from '..'

import { mockDo } from '../../../__mocks__/casparcg-connection'
import { CasparCGDeviceState } from '../state'
import { CasparCGCommand } from '../diff'
import { Commands } from 'casparcg-connection'
import { Layer, LayerContentType } from 'casparcg-state'

async function getInitialisedOscDevice() {
	const dev = new CasparCGDevice()
	await dev.init({ host: 'localhost', port: 8082 })
	return dev
}

describe('CasparCG Device', () => {
	describe('convertTimelineStateToDeviceState', () => {
		async function compareState(tlState: Timeline.TimelineState<TSRTimelineContent>, expDevState: CasparCGDeviceState) {
			const mappings: Mappings = {
				layer0: {
					device: DeviceType.CASPARCG,
					deviceId: 'caspar0',
					options: {
						channel: 1,
						layer: 10,
					},
				},
			}
			const device = await getInitialisedOscDevice()

			const actualState = device.convertTimelineStateToDeviceState(tlState, mappings)

			expect(actualState).toEqual(expDevState)
		}

		test('convert empty state', async () => {
			await compareState(createTimelineState({}), {})
		})

		test('convert amb', async () => {
			await compareState(
				createTimelineState({
					layer0: {
						id: 'obj0',
						layer: 'layer0',
						content: {
							deviceType: DeviceType.CASPARCG,
							type: TimelineContentTypeCasparCg.MEDIA,
							file: 'amb',
						},
						instance: {
							originalStart: 10,
						},
					},
				}),
				{
					'1-10': {
						time: 10,
						layer: {
							id: 'obj0',
							layerNo: 10,
							content: LayerContentType.MEDIA,
							media: 'amb',
							playTime: 10,

							pauseTime: null,
							playing: true,

							clearOn404: true,
						},
						lookahead: undefined,
					},
				}
			)
		})
		test('convert lookahead', async () => {
			await compareState(
				createTimelineState({
					layer0_lookahead: {
						id: 'obj0',
						layer: 'layer0_lookahead',
						content: {
							deviceType: DeviceType.CASPARCG,
							type: TimelineContentTypeCasparCg.MEDIA,
							file: 'amb_lookahead',
						},
						instance: {
							originalStart: 10,
						},
						isLookahead: true,
						lookaheadForLayer: 'layer0',
					},
				}),
				{
					'1-10': {
						time: 10,
						layer: undefined,
						lookahead: {
							id: 'obj0',
							// @ts-expect-error: this is due to some fun typecasting, but has no negative effect
							layerNo: 10,
							content: LayerContentType.MEDIA,
							media: 'amb_lookahead',
							playTime: 10,

							pauseTime: 10,
							playing: false,

							clearOn404: true,
						},
					},
				}
			)
		})
	})

	describe('diffState', () => {
		async function compareStates(
			oldDevState: CasparCGDeviceState,
			newDevState: CasparCGDeviceState,
			expCommands: CasparCGCommand[]
		) {
			const device = await getInitialisedOscDevice()

			const commands = device.diffStates(oldDevState, newDevState)

			expect(commands).toEqual(expCommands)
		}

		test('Empty states', async () => {
			await compareStates({}, {}, [])
		})

		const layer: Layer = {
			id: 'obj0',
			layerNo: 10,
			content: LayerContentType.MEDIA,
			media: 'amb',
			playTime: 10,

			pauseTime: null,
			playing: true,

			clearOn404: true,
		}
		test('Load AMB', async () => {
			await compareStates(
				{},
				{
					'1-10': {
						time: 10,
						layer: undefined,
						lookahead: layer,
					},
				},
				[
					{
						command: {
							command: Commands.Loadbg,
							params: { clip: 'amb', channel: 1, layer: 10, clearOn404: true, loop: false, seek: 0 },
							context: { layerId: '1-10_empty_base', context: 'Nextup media (amb)' },
						},
						context: 'Nextup media (amb)',
						tlObjId: '1-10_empty_base', // note - this makes no sense but is an issue in casparcg-state
					},
				]
			)
		})
		test('Play AMB', async () => {
			await compareStates(
				{},
				{
					'1-10': {
						time: 10,
						layer,
						lookahead: undefined,
					},
				},
				[
					{
						command: {
							command: Commands.Play,
							params: { clip: 'amb', channel: 1, layer: 10, clearOn404: true, loop: false, seek: 0 },
							context: { layerId: 'obj0', context: 'VFilter diff ("undefined", "undefined") (content: media!=)' },
						},
						context: 'VFilter diff ("undefined", "undefined") (content: media!=)',
						tlObjId: 'obj0',
					},
				]
			)
		})
		test('Stop AMB', async () => {
			await compareStates(
				{
					'1-10': {
						time: 10,
						layer,
						lookahead: undefined,
					},
				},
				{},
				[
					{
						command: {
							command: Commands.Stop,
							params: { channel: 1, layer: 10 },
							context: { layerId: 'obj0', context: 'No new content ()' },
						},
						context: 'No new content ()',
						tlObjId: 'obj0',
					},
					{
						command: {
							command: Commands.Clear,
							params: { channel: 1, layer: 10 },
							context: { layerId: 'obj0', context: 'Clear old stuff' },
						},
						context: 'Clear old stuff',
						tlObjId: 'obj0',
					},
				]
			)
		})
	})

	describe('sendCommand', () => {
		test('send a command', async () => {
			const dev = await getInitialisedOscDevice()

			const command = {
				command: Commands.Play,
				params: {
					channel: 1,
					layer: 2,
					clip: 'asdf',
				},
				context: {
					context: '',
					layerId: '',
				},
			}

			dev
				.sendCommand({
					command,
					context: '',
					tlObjId: '',
				})
				.catch((e) => {
					throw e
				})

			expect(mockDo).toHaveBeenCalledTimes(1)
			expect(mockDo).toHaveBeenCalledWith(command)
		})
	})
})

function createTimelineState(
	objs: Record<
		string,
		{
			id: string
			layer: string
			content: TimelineContentCasparCGAny
			instance: any
			isLookahead?: boolean
			lookaheadForLayer?: string
		}
	>
): Timeline.TimelineState<TSRTimelineContent> {
	return {
		time: 10,
		layers: objs as any,
		nextEvents: [],
	}
}
