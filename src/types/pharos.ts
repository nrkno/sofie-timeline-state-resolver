import { Mapping, DeviceType } from './mapping'

export interface PharosOptions {
	host: string
	ssl: boolean
}

export interface MappingPharos extends Mapping {
	device: DeviceType.PHAROS
}
