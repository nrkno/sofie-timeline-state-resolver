import { Mapping } from './mapping'
import { DeviceType } from '.'

export type EmberValue = number | string | boolean | Buffer | null
export enum EmberParameterType {
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
	emberType?: EmberParameterType
	priority?: number
}
export enum MappingLawoType {
	SOURCE = 'source',
	SOURCES = 'sources', // TODO - naming? can this also be a full path or trigger val?
	FULL_PATH = 'fullpath',
	TRIGGER_VALUE = 'triggerValue',
}
export enum LawoDeviceMode {
	R3lay,
	Ruby,
	RubyManualRamp,
	MC2,
	Manual,
}
export interface LawoOptions {
	setValueFn?: SetLawoValueFn
	host?: string
	port?: number

	deviceMode: LawoDeviceMode

	faderInterval?: number

	/** Manual mode only: */
	sourcesPath?: string
	dbPropertyName?: string
	rampMotorFunctionPath?: string
	faderThreshold?: number
}
export type SetLawoValueFn = (command: LawoCommand, timelineObjId: string, logCommand?: boolean) => Promise<any>
export interface LawoCommand {
	path: string
	value: EmberValue
	valueType: EmberParameterType
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
