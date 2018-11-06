import { Mapping, DeviceType } from './mapping'

export interface MappingHyperdeck extends Mapping {
	device: DeviceType.HYPERDECK,
	mappingType: MappingHyperdeckType
	index?: number
}
export enum MappingHyperdeckType {
	TRANSPORT = 'transport'
}

export interface HyperdeckOptions {
	host: string
	port?: number
}

export enum TimelineContentTypeHyperdeck {
	TRANSPORT = 'transport'
}
