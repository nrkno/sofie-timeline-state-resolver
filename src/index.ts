
export * from './conductor'

export {
	Mappings,
	Mapping,
	MappingAbstract,
	DeviceType,
	DeviceOptions
} from './types/src/'

// let myConductor = new Conductor();
export { CasparCGDevice } from './devices/casparCG'
export { HyperdeckDevice } from './devices/hyperdeck'
