import { Mapping, DeviceType } from './mapping'

export interface MappingCasparCG extends Mapping {
	device: DeviceType.CASPARCG,
	channel: number,
	layer: number
}

export interface CasparCGOptions {
	host: string,
	port: number,
	useScheduling?: boolean, // whether to use the CasparCG-SCHEDULE command to run future commands, or the internal (backwards-compatible) command queue
	launcherHost: string,
	launcherPort: string
}

export enum TimelineContentTypeCasparCg { //  CasparCG-state
	VIDEO = 'video', // to be deprecated & replaced by MEDIA
	AUDIO = 'audio', // to be deprecated & replaced by MEDIA
	MEDIA = 'media',
	IP = 'ip',
	INPUT = 'input',
	TEMPLATE = 'template',
	HTMLPAGE = 'htmlpage',
	ROUTE = 'route',
	RECORD = 'record'
}
