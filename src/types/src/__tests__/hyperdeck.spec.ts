import { TransportStatus as UpstreamTransportStatus } from 'hyperdeck-connection'
import { HyperdeckTransportStatus } from '../'

describe('Hyperdeck types', () => {
	test('Hyperdeck types: TransportStatus', async () => {
		expect(HyperdeckTransportStatus).toEqual(UpstreamTransportStatus)
	})
})
