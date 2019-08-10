import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'

export interface MappingLawo extends Mapping {
	device: DeviceType.LAWO,
	mappingType: MappingLawoType,
	identifier: string,
	emberType: EmberTypes
}
export enum MappingLawoType {
	SOURCE = 'source',
	FULL_PATH = 'fullpath'
}

export enum TimelineContentTypeLawo { //  Lawo-state
	SOURCE = 'lawosource', // a general content type, possibly to be replaced by specific ones later?
	EMBER_PROPERTY = 'lawofullpathemberproperty'
}

export type TimelineObjLawoAny = TimelineObjLawoSource | TimelineObjLawoEmberProperty
export enum EmberTypes {
	STRING = 'string',
	INTEGER = 'integer',
	REAL = 'real',
	BOOLEAN = 'bool'
}
export type EmberValueTypes = string | number | boolean // @todo: move to ember library?

export interface TimelineObjLawoBase extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.LAWO
		type: TimelineContentTypeLawo
	}
}
export interface TimelineObjLawoSource extends TimelineObjLawoBase {
	content: {
		deviceType: DeviceType.LAWO
		type: TimelineContentTypeLawo.SOURCE,

		'Fader/Motor dB Value': {
			value: number,
			transitionDuration?: number,
			triggerValue?: string // only used for trigging new command sent
		}
	}
}
export interface TimelineObjLawoEmberProperty extends TimelineObjLawoBase {
	content: {
		deviceType: DeviceType.LAWO,
		type: TimelineContentTypeLawo.EMBER_PROPERTY,
		property: {
			type: EmberTypes
			value: EmberValueTypes
		}
	}
}
