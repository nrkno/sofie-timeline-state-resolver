import { DeviceContextAPI } from '../../service/device'

/** A default context for devices used in unit tests */

export function getDeviceContext(): DeviceContextAPI {
	return {
		logger: {
			error: jest.fn(),
			warning: jest.fn(),
			info: jest.fn(),
			debug: jest.fn(),
		},
		emitDebugState: jest.fn(),
		connectionChanged: jest.fn(),
		resetResolver: jest.fn(),
		commandError: jest.fn(),
		updateMediaObject: jest.fn(),
		clearMediaObjects: jest.fn(),
		timeTrace: jest.fn(),
		resetState: jest.fn(async () => Promise.resolve()),
		resetToState: jest.fn(async () => Promise.resolve()),
	}
}
