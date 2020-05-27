import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'
import { Types as EmberTypes, Model as EmberModel, Model } from 'emberplus-connection'

export interface MappingLawo extends Mapping {
	device: DeviceType.LAWO
	mappingType: MappingLawoType
	identifier?: string
	emberType?: Model.ParameterType
	priority?: number
}
export enum MappingLawoType {
	SOURCE = 'source',
	FULL_PATH = 'fullpath',
	TRIGGER_VALUE = 'triggerValue'
}
export enum LawoDeviceMode {
	R3lay,
	Ruby,
	RubyManualRamp,
	MC2,
	Manual
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
	value: EmberTypes.EmberValue
	valueType: EmberModel.ParameterType
	key: string
	identifier: string
	type: TimelineContentTypeLawo
	transitionDuration?: number
	from?: EmberTypes.EmberValue
	priority: number
}

export enum TimelineContentTypeLawo { //  Lawo-state
	SOURCE = 'lawosource', // a general content type, possibly to be replaced by specific ones later?
	EMBER_PROPERTY = 'lawofullpathemberproperty',
	TRIGGER_VALUE = 'triggervalue'
}

export type TimelineObjLawoAny = TimelineObjLawoSource | TimelineObjLawoEmberProperty | TimelineObjLawoEmberRetrigger

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
		value: EmberTypes.EmberValue
	}
}
export interface TimelineObjLawoEmberRetrigger extends TimelineObjLawoBase {
	content: {
		deviceType: DeviceType.LAWO
		type: TimelineContentTypeLawo.TRIGGER_VALUE
		triggerValue: string
	}
}
