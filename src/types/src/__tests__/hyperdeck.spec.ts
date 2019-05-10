import {
	TransportStatus as UpstreamTransportStatus,
	SlotId as UpstreamSlotId,
	SlotStatus as UpstreamSlotStatus,
	VideoFormat as UpstreamVideoFormat
} from 'hyperdeck-connection'
import {
	TransportStatus as LocalTransportStatus,
	SlotId as LocalSlotId,
	VideoFormat as LocalVideoFormat,
	SlotStatus as LocalSlotStatus
} from '../'

describe('Hyperdeck types', () => {
	test('Hyperdeck types: TransportStatus', async () => {
		expect(LocalTransportStatus).toEqual(UpstreamTransportStatus)
	})
	/*
	test('Hyperdeck types: SlotId', async () => {
		expect(LocalSlotId).toEqual(UpstreamSlotId)
	})
	test('Hyperdeck types: SlotStatus', async () => {
		expect(LocalSlotStatus).toEqual(UpstreamSlotStatus)
	})
	test('Hyperdeck types: VideoFormat', async () => {
		expect(LocalVideoFormat).toEqual(UpstreamVideoFormat)
	})
	*/
})
