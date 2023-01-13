import { Mapping } from './mapping'
import { DeviceType } from '.'

export interface MappingHTTPWatcher extends Mapping {
	device: DeviceType.HTTPWATCHER
}
