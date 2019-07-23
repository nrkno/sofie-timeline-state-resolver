import { Mapping, TSRTimelineObjProps } from './mapping'
import { DeviceType } from '.'
import { ResolvedTimelineObjectInstance } from 'superfly-timeline'

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
	select: boolean
	isPst?: boolean
	faderLevel?: number
}
export type TimelineObjSisyfosAny = TimelineObjSisyfosMessage

export enum Commands {
	TOGGLE_PGM = 'togglePgm',
	TOGGLE_PST = 'togglePst',
	SET_FADER = 'setFader',
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
	value: boolean
}

export interface FaderCommand extends ChannelCommand {
	type: Commands.SET_FADER
	value: number
}

export type SisyfosCommand = BaseCommand | ToggleCommand | FaderCommand

export interface SisyfosChannel {
	faderLevel: number,
	pgmOn: boolean,
	pstOn: boolean,
	tlObjId?: string
}

export interface SisyfosState {
	channels: { [index: string]: SisyfosChannel }
}

export interface TimelineObjSisyfos extends TSRTimelineObjProps {
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
