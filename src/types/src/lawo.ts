import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'

export interface MappingLawo extends Mapping {
	device: DeviceType.LAWO
	mappingType: MappingLawoType
	identifier?: string
	emberType?: EmberTypes
	priority?: number
}
export enum MappingLawoType {
	SOURCE = 'source',
	FULL_PATH = 'fullpath',
	TRIGGER_VALUE = 'triggerValue'
}
export interface LawoOptions {
	setValueFn?: SetLawoValueFn
	host?: string
	port?: number
	sourcesPath?: string
	rampMotorFunctionPath?: string
	dbPropertyName?: string
	faderInterval?: number
}
export type SetLawoValueFn = (command: LawoCommand, timelineObjId: string, valueType?: EmberTypes) => Promise<any>
export interface LawoCommand {
	path: string
	value: EmberValueTypes
	valueType: EmberTypes
	key: string
	identifier: string
	type: TimelineContentTypeLawo
	transitionDuration?: number
	from?: EmberValueTypes
	priority: number
}

export enum TimelineContentTypeLawo { //  Lawo-state
	SOURCE = 'lawosource', // a general content type, possibly to be replaced by specific ones later?
	EMBER_PROPERTY = 'lawofullpathemberproperty',
	TRIGGER_VALUE = 'triggervalue'
}

export type TimelineObjLawoAny = TimelineObjLawoSource | TimelineObjLawoEmberProperty | TimelineObjLawoEmberRetrigger
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
		type: TimelineContentTypeLawo.SOURCE

		'Fader/Motor dB Value': {
			value: number
			transitionDuration?: number
		}
	}
}
export interface TimelineObjLawoEmberProperty extends TimelineObjLawoBase {
	content: {
		deviceType: DeviceType.LAWO
		type: TimelineContentTypeLawo.EMBER_PROPERTY
		value: EmberValueTypes
	}
}
export interface TimelineObjLawoEmberRetrigger extends TimelineObjLawoBase {
	content: {
		deviceType: DeviceType.LAWO
		type: TimelineContentTypeLawo.TRIGGER_VALUE
		triggerValue: string
	}
}
