import { DeviceType, OSCDeviceType } from 'timeline-state-resolver-types'
import { ConstructedMockDevices, MockDeviceInstanceWrapper } from '../../__tests__/mockDeviceInstanceWrapper'
import { ConnectionManager } from '../ConnectionManager'
import { DevicesRegistry } from '../devicesRegistry'

// Mock explicitly the 'dist' version, as that is what threadedClass is being told to load
jest.mock('../../../dist/service/DeviceInstance', () => ({
	DeviceInstanceWrapper: MockDeviceInstanceWrapper,
}))
jest.mock('../DeviceInstance', () => ({
	DeviceInstanceWrapper: MockDeviceInstanceWrapper,
}))

describe('ConnectionManager', () => {
	const connManager = new ConnectionManager(new DevicesRegistry())

	test('adding/removing a device', async () => {
		let resolveAdded: undefined | (() => void) = undefined
		const psAdded = new Promise<void>((resolveCb) => (resolveAdded = resolveCb))
		connManager.on('connectionAdded', () => {
			if (resolveAdded) resolveAdded()
		})

		let resolveRemoved: undefined | (() => void) = undefined
		const psRemoved = new Promise<void>((resolveCb) => (resolveRemoved = resolveCb))
		connManager.on('connectionRemoved', () => {
			if (resolveRemoved) resolveRemoved()
		})

		connManager.setConnections({
			osc0: {
				type: DeviceType.OSC,
				options: {
					host: '127.0.0.1',
					port: 5250,
					type: OSCDeviceType.UDP,
				},
			},
		})

		await psAdded

		expect(ConstructedMockDevices['osc0']).toBeTruthy()

		connManager.setConnections({})

		await psRemoved

		expect(ConstructedMockDevices['osc0']).toBeFalsy()
	})
})
