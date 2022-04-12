import { Mapping } from '../../types/mapping'
import { DeviceType } from '../../types'

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
