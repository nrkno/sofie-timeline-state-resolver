import { Mapping } from './mapping'
import { DeviceType } from '.'

export type EmberValue = number | string | boolean | Buffer | null
enum ParameterType {
	Null = 'NULL',
	Integer = 'INTEGER',
	Real = 'REAL',
	String = 'STRING',
	Boolean = 'BOOLEAN',
	Trigger = 'TRIGGER',
	Enum = 'ENUM',
	Octets = 'OCTETS',
}

export interface MappingLawo extends Mapping {
	device: DeviceType.LAWO
	mappingType: MappingLawoType
	identifier?: string
	emberType?: ParameterType
	priority?: number
}
export enum MappingLawoType {
	SOURCE = 'source',
	SOURCES = 'sources', // TODO - naming? can this also be a full path or trigger val?
	FULL_PATH = 'fullpath',
	TRIGGER_VALUE = 'triggerValue',
}

export interface LawoCommand {
	path: string
	value: EmberValue
	valueType: ParameterType
	key: string
	identifier: string
	type: TimelineContentTypeLawo
	transitionDuration?: number
	from?: EmberValue
	priority: number
}

export enum TimelineContentTypeLawo { //  Lawo-state
	SOURCE = 'lawosource', // a general content type, possibly to be replaced by specific ones later?
	SOURCES = 'lawosources',
	EMBER_PROPERTY = 'lawofullpathemberproperty',
	TRIGGER_VALUE = 'triggervalue',
}

export type TimelineContentLawoAny =
	| TimelineContentLawoSources
	| TimelineContentLawoSource
	| TimelineContentLawoEmberProperty
	| TimelineContentLawoEmberRetrigger

export interface TimelineContentLawoSourceValue {
	faderValue: number
	transitionDuration?: number
}

export interface TimelineContentLawoBase {
	deviceType: DeviceType.LAWO
	type: TimelineContentTypeLawo
}
export interface TimelineContentLawoSources extends TimelineContentLawoBase {
	type: TimelineContentTypeLawo.SOURCES

	sources: Array<
		{
			mappingName: string
		} & TimelineContentLawoSourceValue
	>
	overridePriority?: number // defaults to 0
}
export interface TimelineContentLawoSource extends TimelineContentLawoBase, TimelineContentLawoSourceValue {
	type: TimelineContentTypeLawo.SOURCE

	overridePriority?: number // defaults to 0
}
export interface TimelineContentLawoEmberProperty extends TimelineContentLawoBase {
	type: TimelineContentTypeLawo.EMBER_PROPERTY
	value: EmberValue
}
export interface TimelineContentLawoEmberRetrigger extends TimelineContentLawoBase {
	type: TimelineContentTypeLawo.TRIGGER_VALUE
	triggerValue: string
}
