import { TimelineObject } from 'superfly-timeline'
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

export enum HyperdeckTransportStatus { // Note: Copied from hyperdeck-connection
	PREVIEW = 'preview',
	STOPPED = 'stopped',
	PLAY = 'play',
	FORWARD = 'forward',
	REWIND = 'rewind',
	JOG = 'jog',
	SHUTTLE = 'shuttle',
	RECORD = 'record'
}

export type TimelineObjHyperdeckAny = TimelineObjHyperdeckTransport

export interface TimelineObjHyperdeckTransport extends TimelineObject {
	content: {
		type: TimelineContentTypeHyperdeck,
		attributes: {
			status: HyperdeckTransportStatus
			recordFilename?: string
		}
	}
}
