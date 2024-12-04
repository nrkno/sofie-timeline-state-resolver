import { VMixCommand } from 'timeline-state-resolver-types'

export interface VMixStateCommandBase {
	command: VMixCommand
}
export interface VMixStateCommandPreviewInput extends VMixStateCommandBase {
	command: VMixCommand.PREVIEW_INPUT
	input: number | string
	mix: number
}
export interface VMixStateCommandTransition extends VMixStateCommandBase {
	command: VMixCommand.TRANSITION
	input: number | string
	effect: string
	duration: number
	mix: number
}
export interface VMixStateCommandAudio extends VMixStateCommandBase {
	command: VMixCommand.AUDIO_VOLUME
	input: number | string
	value: number
	fade?: number
}
export interface VMixStateCommandAudioBalance extends VMixStateCommandBase {
	command: VMixCommand.AUDIO_BALANCE
	input: number | string
	value: number
}
export interface VMixStateCommandAudioOn extends VMixStateCommandBase {
	command: VMixCommand.AUDIO_ON
	input: number | string
}
export interface VMixStateCommandAudioOff extends VMixStateCommandBase {
	command: VMixCommand.AUDIO_OFF
	input: number | string
}
export interface VMixStateCommandAudioAutoOn extends VMixStateCommandBase {
	command: VMixCommand.AUDIO_AUTO_ON
	input: number | string
}
export interface VMixStateCommandAudioAutoOff extends VMixStateCommandBase {
	command: VMixCommand.AUDIO_AUTO_OFF
	input: number | string
}
export interface VMixStateCommandAudioBusOn extends VMixStateCommandBase {
	command: VMixCommand.AUDIO_BUS_ON
	input: number | string
	value: string
}
export interface VMixStateCommandAudioBusOff extends VMixStateCommandBase {
	command: VMixCommand.AUDIO_BUS_OFF
	input: number | string
	value: string
}
export interface VMixStateCommandFader extends VMixStateCommandBase {
	command: VMixCommand.FADER
	value: number
}
export interface VMixStateCommandSetPanX extends VMixStateCommandBase {
	command: VMixCommand.SET_PAN_X
	input: number | string
	value: number
}
export interface VMixStateCommandSetPanY extends VMixStateCommandBase {
	command: VMixCommand.SET_PAN_Y
	input: number | string
	value: number
}
export interface VMixStateCommandSetZoom extends VMixStateCommandBase {
	command: VMixCommand.SET_ZOOM
	input: number | string
	value: number
}
export interface VMixStateCommandSetAlpha extends VMixStateCommandBase {
	command: VMixCommand.SET_ALPHA
	input: number | string
	value: number
}
export interface VMixStateCommandStartStreaming extends VMixStateCommandBase {
	command: VMixCommand.START_STREAMING
}
export interface VMixStateCommandStopStreaming extends VMixStateCommandBase {
	command: VMixCommand.STOP_STREAMING
}
export interface VMixStateCommandStartRecording extends VMixStateCommandBase {
	command: VMixCommand.START_RECORDING
}
export interface VMixStateCommandStopRecording extends VMixStateCommandBase {
	command: VMixCommand.STOP_RECORDING
}
export interface VMixStateCommandFadeToBlack extends VMixStateCommandBase {
	command: VMixCommand.FADE_TO_BLACK
}
export interface VMixStateCommandAddInput extends VMixStateCommandBase {
	command: VMixCommand.ADD_INPUT
	value: string
}
export interface VMixStateCommandRemoveInput extends VMixStateCommandBase {
	command: VMixCommand.REMOVE_INPUT
	input: string
}
export interface VMixStateCommandPlayInput extends VMixStateCommandBase {
	command: VMixCommand.PLAY_INPUT
	input: number | string
}
export interface VMixStateCommandPauseInput extends VMixStateCommandBase {
	command: VMixCommand.PAUSE_INPUT
	input: number | string
}
export interface VMixStateCommandSetPosition extends VMixStateCommandBase {
	command: VMixCommand.SET_POSITION
	input: number | string
	value: number
}
export interface VMixStateCommandLoopOn extends VMixStateCommandBase {
	command: VMixCommand.LOOP_ON
	input: number | string
}
export interface VMixStateCommandLoopOff extends VMixStateCommandBase {
	command: VMixCommand.LOOP_OFF
	input: number | string
}
export interface VMixStateCommandSetInputName extends VMixStateCommandBase {
	command: VMixCommand.SET_INPUT_NAME
	input: number | string
	value: string
}
export interface VMixStateCommandSetOuput extends VMixStateCommandBase {
	command: VMixCommand.SET_OUPUT
	name: string
	value: string
	input?: number | string
}
export interface VMixStateCommandStartExternal extends VMixStateCommandBase {
	command: VMixCommand.START_EXTERNAL
}
export interface VMixStateCommandStopExternal extends VMixStateCommandBase {
	command: VMixCommand.STOP_EXTERNAL
}
export interface VMixStateCommandOverlayInputIn extends VMixStateCommandBase {
	command: VMixCommand.OVERLAY_INPUT_IN
	value: number
	input: string | number
}
export interface VMixStateCommandOverlayInputOut extends VMixStateCommandBase {
	command: VMixCommand.OVERLAY_INPUT_OUT
	value: number
}
export interface VMixStateCommandSetLayerInput extends VMixStateCommandBase {
	command: VMixCommand.SET_LAYER_INPUT
	input: string | number
	index: number
	value: string | number
}
export interface VMixStateCommandSetLayerZoom extends VMixStateCommandBase {
	command: VMixCommand.SET_LAYER_ZOOM
	input: string | number
	index: number
	value: number
}
export interface VMixStateCommandSetLayerPanX extends VMixStateCommandBase {
	command: VMixCommand.SET_LAYER_PAN_X
	input: string | number
	index: number
	value: number
}
export interface VMixStateCommandSetLayerPanY extends VMixStateCommandBase {
	command: VMixCommand.SET_LAYER_PAN_Y
	input: string | number
	index: number
	value: number
}
export interface VMixStateCommandSetLayerCrop extends VMixStateCommandBase {
	command: VMixCommand.SET_LAYER_CROP
	input: string | number
	index: number
	cropLeft: number
	cropTop: number
	cropRight: number
	cropBottom: number
}
export interface VMixStateCommandScriptStart extends VMixStateCommandBase {
	command: VMixCommand.SCRIPT_START
	value: string
}
export interface VMixStateCommandScriptStop extends VMixStateCommandBase {
	command: VMixCommand.SCRIPT_STOP
	value: string
}
export interface VMixStateCommandScriptStopAll extends VMixStateCommandBase {
	command: VMixCommand.SCRIPT_STOP_ALL
}
export interface VMixStateCommandListAdd extends VMixStateCommandBase {
	command: VMixCommand.LIST_ADD
	input: string | number
	value: string
}
export interface VMixStateCommandListRemoveAll extends VMixStateCommandBase {
	command: VMixCommand.LIST_REMOVE_ALL
	input: string | number
}
export interface VMixStateCommandRestart extends VMixStateCommandBase {
	command: VMixCommand.RESTART_INPUT
	input: string | number
}
export interface VMixStateCommandSetText extends VMixStateCommandBase {
	command: VMixCommand.SET_TEXT
	input: string | number
	fieldName: string
	value: string
}
export interface VMixStateCommandBrowserNavigate extends VMixStateCommandBase {
	command: VMixCommand.BROWSER_NAVIGATE
	input: string | number
	value: string
}
export interface VMixStateCommanSelectIndex extends VMixStateCommandBase {
	command: VMixCommand.SELECT_INDEX
	input: string | number
	value: number
}
export type VMixStateCommand =
	| VMixStateCommandPreviewInput
	| VMixStateCommandTransition
	| VMixStateCommandAudio
	| VMixStateCommandAudioBalance
	| VMixStateCommandAudioOn
	| VMixStateCommandAudioOff
	| VMixStateCommandAudioAutoOn
	| VMixStateCommandAudioAutoOff
	| VMixStateCommandAudioBusOn
	| VMixStateCommandAudioBusOff
	| VMixStateCommandFader
	| VMixStateCommandSetZoom
	| VMixStateCommandSetPanX
	| VMixStateCommandSetPanY
	| VMixStateCommandSetAlpha
	| VMixStateCommandStartStreaming
	| VMixStateCommandStopStreaming
	| VMixStateCommandStartRecording
	| VMixStateCommandStopRecording
	| VMixStateCommandFadeToBlack
	| VMixStateCommandAddInput
	| VMixStateCommandRemoveInput
	| VMixStateCommandPlayInput
	| VMixStateCommandPauseInput
	| VMixStateCommandSetPosition
	| VMixStateCommandLoopOn
	| VMixStateCommandLoopOff
	| VMixStateCommandSetInputName
	| VMixStateCommandSetOuput
	| VMixStateCommandStartExternal
	| VMixStateCommandStopExternal
	| VMixStateCommandOverlayInputIn
	| VMixStateCommandOverlayInputOut
	| VMixStateCommandSetLayerInput
	| VMixStateCommandSetLayerZoom
	| VMixStateCommandSetLayerPanX
	| VMixStateCommandSetLayerPanY
	| VMixStateCommandSetLayerCrop
	| VMixStateCommandScriptStart
	| VMixStateCommandScriptStop
	| VMixStateCommandScriptStopAll
	| VMixStateCommandListAdd
	| VMixStateCommandListRemoveAll
	| VMixStateCommandRestart
	| VMixStateCommandSetText
	| VMixStateCommandBrowserNavigate
	| VMixStateCommanSelectIndex

export enum CommandContext {
	None = 'none',
	Retry = 'retry',
}
export interface VMixStateCommandWithContext {
	command: VMixStateCommand
	context: CommandContext
	timelineId: string
}
