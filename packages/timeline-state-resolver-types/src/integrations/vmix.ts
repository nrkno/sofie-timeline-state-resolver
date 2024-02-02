import { DeviceType } from '..'

export enum VMixCommand {
	PREVIEW_INPUT = 'PREVIEW_INPUT',
	TRANSITION = 'TRANSITION',
	AUDIO_VOLUME = 'AUDIO_VOLUME',
	AUDIO_BALANCE = 'AUDIO_BALANCE',
	AUDIO_ON = 'AUDIO_ON',
	AUDIO_OFF = 'AUDIO_OFF',
	AUDIO_AUTO_ON = 'AUDIO_AUTO_ON',
	AUDIO_AUTO_OFF = 'AUDIO_AUTO_OFF',
	AUDIO_BUS_ON = 'AUDIO_BUS_ON',
	AUDIO_BUS_OFF = 'AUDIO_BUS_OFF',
	FADER = 'FADER',
	SET_PAN_X = 'SET_PAN_X',
	SET_PAN_Y = 'SET_PAN_Y',
	SET_ZOOM = 'SET_ZOOM',
	SET_ALPHA = 'SET_ALPHA',
	START_STREAMING = 'START_STREAMING',
	STOP_STREAMING = 'STOP_STREAMING',
	START_RECORDING = 'START_RECORDING',
	STOP_RECORDING = 'STOP_RECORDING',
	FADE_TO_BLACK = 'FADE_TO_BLACK',
	ADD_INPUT = 'ADD_INPUT',
	REMOVE_INPUT = 'REMOVE_INPUT',
	PLAY_INPUT = 'PLAY_INPUT',
	PAUSE_INPUT = 'PAUSE_INPUT',
	LOOP_ON = 'LOOP_ON',
	LOOP_OFF = 'LOOP_OFF',
	SET_POSITION = 'SET_POSITION',
	SET_INPUT_NAME = 'SET_INPUT_NAME',
	SET_OUPUT = 'SET_OUTPUT',
	START_EXTERNAL = 'START_EXTERNAL',
	STOP_EXTERNAL = 'STOP_EXTERNAL',
	OVERLAY_INPUT_IN = 'OVERLAY_INPUT_IN',
	OVERLAY_INPUT_OUT = 'OVERLAY_INPUT_OUT',
	SET_INPUT_OVERLAY = 'SET_INPUT_OVERLAY',
	SCRIPT_START = 'SCRIPT_START',
	SCRIPT_STOP = 'SCRIPT_STOP',
	SCRIPT_STOP_ALL = 'SCRIPT_STOP_ALL',
	LIST_ADD = 'LIST_ADD',
	LIST_REMOVE_ALL = 'LIST_REMOVE_ALL',
	RESTART_INPUT = 'RESTART_INPUT',
}

export type TimelineContentVMixAny =
	| TimelineContentVMixProgram
	| TimelineContentVMixPreview
	| TimelineContentVMixAudio
	| TimelineContentVMixFader
	| TimelineContentVMixRecording
	| TimelineContentVMixStreaming
	| TimelineContentVMixExternal
	| TimelineContentVMixFadeToBlack
	| TimelineContentVMixOutput
	| TimelineContentVMixOverlay
	| TimelineContentVMixInput
	| TimelineContentVMixScript

export enum TimelineContentTypeVMix {
	PROGRAM = 'PROGRAM',
	PREVIEW = 'PREVIEW',
	AUDIO = 'AUDIO',
	FADER = 'FADER',
	STREAMING = 'STREAMING',
	RECORDING = 'RECORDING',
	FADE_TO_BLACK = 'FADE_TO_BLACK',
	INPUT = 'INPUT',
	OUTPUT = 'OUTPUT',
	EXTERNAL = 'EXTERNAL',
	OVERLAY = 'OVERLAY',
	SCRIPT = 'SCRIPT',
}
export interface TimelineContentVMixBase {
	deviceType: DeviceType.VMIX
	type: TimelineContentTypeVMix
}

export interface TimelineContentVMixProgram extends TimelineContentVMixBase {
	type: TimelineContentTypeVMix.PROGRAM

	/** Input number or name */
	input?: number | string

	/** Input layer name */
	inputLayer?: string

	/** Transition effect (Stingers work only for Mix number 1) */
	transition?: VMixTransition
}

export interface TimelineContentVMixPreview extends TimelineContentVMixBase {
	type: TimelineContentTypeVMix.PREVIEW

	/** Input number or name */
	input: number | string
}

export interface TimelineContentVMixAudio extends TimelineContentVMixBase {
	type: TimelineContentTypeVMix.AUDIO

	/** Channel volume (0 - 100) */
	volume?: number

	/** Volume change fade length in milliseconds */
	fade?: number

	/** Channel balance (-1 - 1) */
	balance?: number

	/** If input is muted */
	muted?: boolean

	/** Comma separated list of busses to enable (M,A,B,C,D,E,F,G) */
	audioBuses?: string

	/** Audio follow video */
	audioAuto?: boolean
}

export interface TimelineContentVMixFader extends TimelineContentVMixBase {
	type: TimelineContentTypeVMix.FADER

	/** Position of the transition fader (0 - 255) */
	position: number
}

export interface TimelineContentVMixStreaming extends TimelineContentVMixBase {
	type: TimelineContentTypeVMix.STREAMING

	/** If streaming should be turned on */
	on: boolean
}

export interface TimelineContentVMixRecording extends TimelineContentVMixBase {
	type: TimelineContentTypeVMix.RECORDING

	/** If recording should be turned on */
	on: boolean
}

export interface TimelineContentVMixFadeToBlack extends TimelineContentVMixBase {
	type: TimelineContentTypeVMix.FADE_TO_BLACK

	/** If Fade To Black should be turned on */
	on: boolean
}

export interface TimelineContentVMixInput extends TimelineContentVMixBase {
	type: TimelineContentTypeVMix.INPUT

	/** Media file path */
	filePath?: string

	/** Set only when dealing with media. If provided, TSR will attempt to automatically create **and potentially remove** the input. */
	inputType?: VMixInputType

	/** If media should be playing */
	playing?: boolean

	/** Media starting position in milliseconds */
	seek?: number

	/** If media should loop */
	loop?: boolean

	transform?: VMixTransform

	/** List of input (Multi View) overlays; indexes start from 1 */
	overlays?: VMixInputOverlays

	/** An array of file paths to load into a List input. Uses Windows-style path separators (\\). Only applies to List inputs. */
	listFilePaths?: string[]

	/** If media should start from the beginning or resume from where it left off */
	restart?: boolean
}

export interface TimelineContentVMixOutput extends TimelineContentVMixBase {
	type: TimelineContentTypeVMix.OUTPUT

	/** Type of the source sent to output */
	source: 'Preview' | 'Program' | 'MultiView' | 'Input'

	/** Number/name of the input when source:'Input' is chosen */
	input?: number | string
}

export interface TimelineContentVMixExternal extends TimelineContentVMixBase {
	type: TimelineContentTypeVMix.EXTERNAL

	/** If external should be turned on */
	on: boolean
}

export interface TimelineContentVMixOverlay extends TimelineContentVMixBase {
	type: TimelineContentTypeVMix.OVERLAY

	/** Input number or name */
	input: number | string
}

export interface TimelineContentVMixScript extends TimelineContentVMixBase {
	type: TimelineContentTypeVMix.SCRIPT

	/** Script name */
	name: string
}

export interface VMixTransform {
	/** Scale (0 - 5) */
	zoom: number

	/** Horizontal pan (-2 - 2) */
	panX: number

	/** Vertical pan (-2 - 2) */
	panY: number

	/** Transparency (0 - 255) */
	alpha: number
}

export interface VMixInputOverlays {
	[index: number]: number | string
}

export interface VMixTransition {
	effect: VMixTransitionType

	/** Duration in milliseconds */
	duration: number
}

export enum VMixTransitionType {
	Cut = 'Cut',
	CutDirect = 'CutDirect',
	Fade = 'Fade',
	Zoom = 'Zoom',
	Wipe = 'Wipe',
	Slide = 'Slide',
	Fly = 'Fly',
	CrossZoom = 'CrossZoom',
	FlyRotate = 'FlyRotate',
	Cube = 'Cube',
	CubeZoom = 'CubeZoom',
	VerticalWipe = 'VerticalWipe',
	VerticalSlide = 'VerticalSlide',
	Merge = 'Merge',
	WipeReverse = 'WipeReverse',
	SlideReverse = 'SlideReverse',
	VerticalWipeReverse = 'VerticalWipeReverse',
	VerticalSlideReverse = 'VerticalSlideReverse',
	Stinger1 = 'Stinger1',
	Stinger2 = 'Stinger2',
	Stinger3 = 'Stinger3',
	Stinger4 = 'Stinger4',
}

export enum VMixInputType {
	Video = 'Video',
	Image = 'Image',
	Photos = 'Photos',
	Xaml = 'Xaml',
	AudioFile = 'AudioFile',
	Flash = 'Flash',
	PowerPoint = 'PowerPoint',
	List = 'List',
}
