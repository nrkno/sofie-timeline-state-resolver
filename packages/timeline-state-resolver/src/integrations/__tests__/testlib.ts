import { DeviceContextAPI } from '../../service/device'

/** A default context for devices used in unit tests */
export const DEFAULT_NOOP_CONTEXT: DeviceContextAPI = {
	hello: () => 'world',
}
