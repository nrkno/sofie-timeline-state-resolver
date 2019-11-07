import { Mapping } from './mapping'
import { DeviceType } from '.'

export interface MappingHTTPWatcher extends Mapping {
	device: DeviceType.HTTPWATCHER
}

export interface HTTPWatcherOptions {
	uri?: string
	httpMethod?: string
	expectedHttpResponse?: number
	keyword?: string
	interval?: number
}
