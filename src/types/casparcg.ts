import { Mapping, DeviceType } from './mapping'

export interface MappingCasparCG extends Mapping {
	device: DeviceType.CASPARCG,
	channel: number,
	layer: number
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
