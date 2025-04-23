import type { DeviceEntry } from 'timeline-state-resolver-api'
import { getDeviceContext } from '../../integrations/__tests__/testlib'
import { builtinDeviceManifest } from '../../manifest'
import { DevicesDict } from '../devices'

describe('Ensure that all integrations have defined their actions', () => {
	for (const [key, device] of Object.entries<DeviceEntry>(DevicesDict)) {
		test(`Device ${key}`, () => {
			const deviceManifest = builtinDeviceManifest.subdevices[key]
			expect(deviceManifest).toBeTruthy()

			const deviceInstance = new device.deviceClass(getDeviceContext())
			expect(deviceInstance).toBeTruthy()

			if (!deviceManifest.actions) return

			for (const action of deviceManifest.actions) {
				// check that the action is defined on the device:
				const fcn = deviceInstance.actions[action.id]
				try {
					// eslint-disable-next-line jest/no-conditional-expect
					expect(fcn).toBeTruthy()
					// eslint-disable-next-line jest/no-conditional-expect
					expect(typeof fcn).toBe('function')
				} catch (e) {
					if (e instanceof Error) {
						e.message = `Action "${action.id}": ${e.message}`
					}
					throw e
				}
			}
		})
	}
})
