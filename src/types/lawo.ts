import { Mapping, DeviceType } from './mapping'

export interface MappingLawo extends Mapping {
	device: DeviceType.LAWO,
	mappingType: MappingLawoType,
	identifier: string
}
export enum MappingLawoType {
	SOURCE = 'source'
}

export enum TimelineContentTypeLawo { //  Lawo-state
	SOURCE = 'lawosource' // a general content type, possibly to be replaced by specific ones later?
}
