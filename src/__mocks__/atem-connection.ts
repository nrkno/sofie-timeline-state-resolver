import {
	Atem as OriginalAtem,
	AtemOptions,
	AtemState,
	Enums
} from '../../node_modules/atem-connection'
import { EventEmitter } from 'events'
import { DeviceInfo } from '../../node_modules/atem-connection/dist/state/info'
import { AbstractCommand } from '../../node_modules/atem-connection/dist/commands'
import {
	DipTransitionSettings,
	DVETransitionSettings,
	MixTransitionSettings,
	TransitionProperties,
	StingerTransitionSettings,
	WipeTransitionSettings,
	SuperSourceBox,
	SuperSourceProperties
} from '../../node_modules/atem-connection/dist/state/video'
import {
	DownstreamKeyerGeneral,
	DownstreamKeyerMask
} from '../../node_modules/atem-connection/dist/state/video/downstreamKeyers'
import { MediaPlayer } from '../../node_modules/atem-connection/dist/state/media'
import { InputChannel } from '../../node_modules/atem-connection/dist/state/input'
import * as USK from '../../node_modules/atem-connection/dist/state/video/upstreamKeyers'
import { AtemSocket } from '../../node_modules/atem-connection/dist/lib/atemSocket'

const mockData = require('./atem-out.json')

export {
	Enums,
	VideoState,
	AtemState,
	Commands
} from '../../node_modules/atem-connection'

let instances: Array<Atem> = []

let setTimeoutOrg = setTimeout

// @ts-ignore separate declarations
export class Atem extends EventEmitter implements OriginalAtem {
	public DEFAULT_PORT: number = 0
	public RECONNECT_INTERVAL: number = 0
	public DEBUG: boolean = false
	public AUDIO_GAIN_RATE: number = 0

	event: EventEmitter
	private socket: AtemSocket
	private dataTransferManager
	private _log
	private _sentQueue

	constructor (options?: AtemOptions) {
		super()
		instances.push(this)
	}
	connect (address: string, port?: number) {
		// mock a connection

		return new Promise((resolve) => {
			setTimeoutOrg(() => {
				this.emit('connected', true)
			}, 10)
		})
	}
	get state (): AtemState {
		return mockData
	}

	disconnect (): Promise<void> {
		return Promise.resolve()
	}
	sendCommand (command: AbstractCommand): Promise<any> {
		return Promise.resolve()
	}
	changeProgramInput (input: number, me?: number): Promise<any> {
		return Promise.resolve()
	}
	changePreviewInput (input: number, me?: number): Promise<any> {
		return Promise.resolve()
	}
	cut (me?: number): Promise<any> {
		return Promise.resolve()
	}
	autoTransition (me?: number): Promise<any> {
		return Promise.resolve()
	}
	autoDownstreamKey (key?: number): Promise<any> {
		return Promise.resolve()
	}
	setDipTransitionSettings (newProps: Partial<DipTransitionSettings>, me?: number): Promise<any> {
		return Promise.resolve()
	}
	setDVETransitionSettings (newProps: Partial<DVETransitionSettings>, me?: number): Promise<any> {
		return Promise.resolve()
	}
	setMixTransitionSettings (newProps: Partial<MixTransitionSettings>, me?: number): Promise<any> {
		return Promise.resolve()
	}
	setTransitionPosition (position: number, me?: number): Promise<any> {
		return Promise.resolve()
	}
	previewTransition (on: boolean, me?: number): Promise<any> {
		return Promise.resolve()
	}
	setTransitionStyle (newProps: Partial<TransitionProperties>, me?: number): Promise<any> {
		return Promise.resolve()
	}
	setStingerTransitionSettings (newProps: Partial<StingerTransitionSettings>, me?: number): Promise<any> {
		return Promise.resolve()
	}
	setWipeTransitionSettings (newProps: Partial<WipeTransitionSettings>, me?: number): Promise<any> {
		return Promise.resolve()
	}
	setAuxSource (source: number, bus?: number): Promise<any> {
		return Promise.resolve()
	}
	setDownstreamKeyTie (tie: boolean, key?: number): Promise<any> {
		return Promise.resolve()
	}
	setDownstreamKeyOnAir (onAir: boolean, key?: number): Promise<any> {
		return Promise.resolve()
	}
	setDownstreamKeyCutSource (input: number, key?: number): Promise<any> {
		return Promise.resolve()
	}
	setDownstreamKeyFillSource (input: number, key?: number): Promise<any> {
		return Promise.resolve()
	}
	setDownstreamKeyGeneralProperties (props: Partial<DownstreamKeyerGeneral>, key?: number): Promise<any> {
		return Promise.resolve()
	}
	setDownstreamKeyMaskSettings (props: Partial<DownstreamKeyerMask>, key?: number): Promise<any> {
		return Promise.resolve()
	}
	setDownstreamKeyRate (rate: number, key?: number): Promise<any> {
		return Promise.resolve()
	}
	macroRun (index?: number): Promise<any> {
		return Promise.resolve()
	}
	setMediaPlayerSettings (newProps: Partial<MediaPlayer>, player?: number): Promise<any> {
		return Promise.resolve()
	}
	setMediaPlayerSource (newProps: Partial<{
		sourceType: Enums.MediaSourceType
		stillIndex: number
		clipIndex: number
	}>, player?: number): Promise<any> {
		return Promise.resolve()
	}
	setMediaClip (index: number, name: string, frames?: number): Promise<any> {
		return Promise.resolve()
	}
	clearMediaPoolClip (clipId: number): Promise<any> {
		return Promise.resolve()
	}
	clearMediaPoolStill (stillId: number): Promise<any> {
		return Promise.resolve()
	}
	setSuperSourceBoxSettings (newProps: Partial<SuperSourceBox>, box?: number): Promise<any> {
		return Promise.resolve()
	}
	setSuperSourceProperties (newProps: Partial<SuperSourceProperties>): Promise<any> {
		return Promise.resolve()
	}
	setInputSettings (newProps: Partial<InputChannel>, input?: number): Promise<any> {
		return Promise.resolve()
	}
	setUpstreamKeyerChromaSettings (newProps: Partial<USK.UpstreamKeyerChromaSettings>, me?: number, keyer?: number): Promise<any> {
		return Promise.resolve()
	}
	setUpstreamKeyerCutSource (cutSource: number, me?: number, keyer?: number): Promise<any> {
		return Promise.resolve()
	}
	setUpstreamKeyerFillSource (fillSource: number, me?: number, keyer?: number): Promise<any> {
		return Promise.resolve()
	}
	setUpstreamKeyerDVESettings (newProps: Partial<USK.UpstreamKeyerDVESettings>, me?: number, keyer?: number): Promise<any> {
		return Promise.resolve()
	}
	setUpstreamKeyerLumaSettings (newProps: Partial<USK.UpstreamKeyerLumaSettings>, me?: number, keyer?: number): Promise<any> {
		return Promise.resolve()
	}
	setUpstreamKeyerMaskSettings (newProps: Partial<USK.UpstreamKeyerMaskSettings>, me?: number, keyer?: number): Promise<any> {
		return Promise.resolve()
	}
	setUpstreamKeyerPatternSettings (newProps: Partial<USK.UpstreamKeyerPatternSettings>, me?: number, keyer?: number): Promise<any> {
		return Promise.resolve()
	}
	setUpstreamKeyerOnAir (onAir: boolean, me?: number, keyer?: number): Promise<any> {
		return Promise.resolve()
	}
	setUpstreamKeyerType (newProps: Partial<USK.UpstreamKeyerTypeSettings>, me?: number, keyer?: number): Promise<any> {
		return Promise.resolve()
	}
	uploadStill (index: number, data: Buffer, name: string, description: string) {
		return Promise.resolve({})
	}
	uploadClip (index: number, frames: Array<Buffer>, name: string) {
		return Promise.resolve({})
	}
	uploadAudio (index: number, data: Buffer, name: string) {
		return Promise.resolve({})
	}

	private _mutateState (command) {
		// nothing
	}
	private _resolveCommand (trackingId) {
		// nothing
	}
	private _rejectCommand (trackingId) {
		// nothing
	}

}
