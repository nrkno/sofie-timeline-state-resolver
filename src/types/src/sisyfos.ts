import { Mapping } from './mapping'
import { DeviceType, TSRTimelineObjBase } from '.'

export interface SisfyosOptions {
	host: string
	port: number
}

export interface MappingSisyfos extends Mapping {
	device: DeviceType.SISYFOS
	channel: number
}

export enum TimelineContentTypeSisyfos {
	SISYFOS = 'sisyfos'
}

export interface SisyfosCommandContent {
	type: TimelineContentTypeSisyfos.SISYFOS
	isPgm?: number // 0=off 1=PGM 2=VO
	faderLevel?: number
}
export type TimelineObjSisyfosAny = TimelineObjSisyfosMessage

export enum Commands {
	TOGGLE_PGM = 'togglePgm',
	TOGGLE_PST = 'togglePst',
	SET_FADER = 'setFader',
	CLEAR_PST_ROW = 'clearPstRow',
	TAKE = 'take'
}

export interface BaseCommand {
	type: Commands
}

export interface ChannelCommand {
	type: Commands.SET_FADER | Commands.TOGGLE_PGM | Commands.TOGGLE_PST
	channel: number
	value: boolean | number
}

export interface ToggleCommand extends ChannelCommand {
	type: Commands.TOGGLE_PGM | Commands.TOGGLE_PST
	value: number
}

export interface FaderCommand extends ChannelCommand {
	type: Commands.SET_FADER
	value: number
}

export type SisyfosCommand = BaseCommand | ToggleCommand | FaderCommand

export interface SisyfosChannel extends SisyfosAPIChannel {
	tlObjIds: string[]
}

export interface SisyfosState {
	channels: { [index: string]: SisyfosChannel }
}

export interface TimelineObjSisyfos extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.SISYFOS
		type: TimelineContentTypeSisyfos
	}
}
export interface TimelineObjSisyfosMessage extends TimelineObjSisyfos {
	content: {
		deviceType: DeviceType.SISYFOS
	} & SisyfosCommandContent
}
// ------------------------------------------------------
// Interfaces for the data that comes over OSC:
export interface SisyfosAPIChannel {
	faderLevel: number
	pgmOn: number
	pstOn: number
}

export interface SisyfosAPIState {
	channels: {
		[index: string]: SisyfosAPIChannel
	}
}
// ------------------------------------------------------
