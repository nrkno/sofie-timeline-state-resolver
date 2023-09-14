import { DeviceContextAPI } from '../../service/device'

/** A default context for devices used in unit tests */

export function getDeviceContext(): DeviceContextAPI {
	return {
		emitError: jest.fn(),
		emitWarning: jest.fn(),
		emitInfo: jest.fn(),
		emitDebug: jest.fn(),
		emitDebugState: jest.fn(),
		connectionChanged: jest.fn(),
		resetResolver: jest.fn(),
		commandError: jest.fn(),
		updateMediaObject: jest.fn(),
		clearMediaObjects: jest.fn(),
		timeTrace: jest.fn(),
		resetState: jest.fn(),
	}
}
