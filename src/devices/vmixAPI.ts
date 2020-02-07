import { EventEmitter } from 'events'
import * as request from 'request'
import * as xml from 'xml-js'
import { VMixOptions, VMixCommand, VMixTransitionType } from '../types/src'
import { VMixState, VMixInput, VMixTransition, VMixAudioChannel } from './vmix'
import * as _ from 'underscore'

// const PING_TIMEOUT = 10 * 1000

export class VMix extends EventEmitter {
	public state: VMixState

	private _options: VMixOptions
	private _connected: boolean = false

	private _socketKeepAliveTimeout: NodeJS.Timer | null = null

	connect (options: VMixOptions): Promise<void> {
		this.state = {
			version: '22.0.0.67',
			edition: 'Trial',
			inputs: {},
			// media: {},
			overlays: _.map([1,2,3,4,5,6], num => {
				return {
					number: num,
					input: undefined
				}
			}),
			mixes: _.map([1,2,3,4], num => {
				return {
					number: num,
					program: undefined,
					preview: undefined,
					transition: { effect: VMixTransitionType.Cut, duration: 0 }}
			}),
			fadeToBlack: false,
			faderPosition: 0,
			transitions: [],
			recording: false,
			external: false,
			streaming: false,
			playlist: false,
			multiCorder: false,
			fullscreen: false,
			audio: []
		}
		return this._connectHTTP(options)
		.then(() => {
			this._connected = true
			this.getVMixState()
		})
	}

	public get connected (): boolean {
		return this._connected
	}

	public dispose (): Promise<void> {
		return new Promise((resolve) => {
			this._connected = false
			resolve()
		})
	}

	private _connectHTTP (options?: VMixOptions): Promise<void> {
		if (options) {
			if (!(options.host.startsWith('http://') || options.host.startsWith('https://'))) {
				options.host = `http://${options.host}`
			}
			this._options = options
		}

		return new Promise((resolve, reject) => {
			request.get(`${this._options.host}:${this._options.port}`, {}, (error) => {
				if (error) {
					reject(error)
				} else {
					this._connected = true
					// this._socketKeepAliveTimeout = setTimeout(() => {
					// 	this.getVMixState()
					// }, PING_TIMEOUT)
					this.emit('connected')
					resolve()
				}
			})
		})
	}

	private _stillAlive () {
		if (this._socketKeepAliveTimeout) {
			this._socketKeepAliveTimeout = null
		}

		// this._socketKeepAliveTimeout = setTimeout(() => {
		// 	this.getVMixState()
		// }, PING_TIMEOUT)
	}

	public async sendCommand (command: VMixStateCommand): Promise<any> {
		switch (command.command) {
			case VMixCommand.PREVIEW_INPUT:
				return this.setPreviewInput(command.input, command.mix)
			case VMixCommand.ACTIVE_INPUT:
				return this.setActiveInput(command.input)
			case VMixCommand.TRANSITION:
				return this.transition(command.input, command.effect, command.duration, command.mix)
			case VMixCommand.AUDIO_VOLUME:
				return this.setAudioLevel(command.input, command.value, command.fade)
			case VMixCommand.AUDIO_BALANCE:
				return this.setAudioBalance(command.input, command.value)
			case VMixCommand.AUDIO_ON:
				return this.setAudioOn(command.input)
			case VMixCommand.AUDIO_OFF:
				return this.setAudioOff(command.input)
			case VMixCommand.AUDIO_AUTO_ON:
				return this.setAudioAutoOn(command.input)
			case VMixCommand.AUDIO_AUTO_OFF:
				return this.setAudioAutoOff(command.input)
			case VMixCommand.AUDIO_BUS_ON:
				return this.setAudioBusOn(command.input, command.value)
			case VMixCommand.AUDIO_BUS_OFF:
				return this.setAudioBusOff(command.input, command.value)
			case VMixCommand.FADER:
				return this.setFader(command.value)
			case VMixCommand.START_RECORDING:
				return this.startRecording()
			case VMixCommand.STOP_RECORDING:
				return this.stopRecording()
			case VMixCommand.START_STREAMING:
				return this.startStreaming()
			case VMixCommand.STOP_STREAMING:
				return this.stopStreaming()
			case VMixCommand.FADE_TO_BLACK:
				return this.fadeToBlack()
			case VMixCommand.ADD_INPUT:
				return this.addInput(command.value)
			case VMixCommand.REMOVE_INPUT:
				return this.removeInput(command.input)
			case VMixCommand.PLAY_INPUT:
				return this.playInput(command.input)
			case VMixCommand.PAUSE_INPUT:
				return this.pauseInput(command.input)
			case VMixCommand.SET_POSITION:
				return this.setPosition(command.input, command.value)
			case VMixCommand.SET_PAN_X:
				return this.setPanX(command.input, command.value)
			case VMixCommand.SET_PAN_Y:
				return this.setPanY(command.input, command.value)	
			case VMixCommand.SET_ZOOM:
				return this.setZoom(command.input, command.value)
			case VMixCommand.SET_ALPHA:
				return this.setAlpha(command.input, command.value)
			case VMixCommand.LOOP_ON:
				return this.loopOn(command.input)
			case VMixCommand.LOOP_OFF:
				return this.loopOff(command.input)
			case VMixCommand.SET_INPUT_NAME:
				return this.setInputName(command.input, command.value)
			case VMixCommand.SET_OUPUT:
				return this.setOutput(command.name, command.value, command.input)
			case VMixCommand.START_EXTERNAL:
				return this.startExternal()
			case VMixCommand.STOP_EXTERNAL:
				return this.stopExternal()
			case VMixCommand.OVERLAY_INPUT_IN:
				return this.overlayInputIn(command.value, command.input)
			case VMixCommand.OVERLAY_INPUT_OUT:
				return this.overlayInputOut(command.value)
			case VMixCommand.SET_INPUT_OVERLAY:
				return this.setInputOverlay(command.input, command.index, command.value)
			default:
				throw new Error(`vmixAPI: Command ${((command || {}) as any).command} not implemented`)
		}
	}

	public getVMixState () {
		request.get(`${this._options.host}:${this._options.port}/api`, {}, (error, res) => {
			if (error) {
				this._connected = false
				// throw new Error(error)
			} else {
				this._connected = true
				const state = xml.xml2json(res.body, { compact: true, spaces: 4 })
				this.parseVMixState(JSON.parse(state))
				this._stillAlive()
			}
		})
	}

	public parseVMixState (xml: any) {
		// For what lies ahead I apologise - Tom
		let state: VMixState = {
			version: xml['vmix']['version']['_text'],
			edition: xml['vmix']['edition']['_text'],
			inputs: _.indexBy((xml['vmix']['inputs']['input'] as Array<any>)
			.map(input => {
				return {
					// key: input['_attributes']['key'],
					number: Number(input['_attributes']['number']),
					type: input['_attributes']['type'],
					// title: input['_attributes']['title'],
					state: input['_attributes']['state'],
					position: Number(input['_attributes']['position']),
					duration: Number(input['_attributes']['duration']),
					loop: (input['_attributes']['loop'] === 'True') ? true : false,
					muted: (input['_attributes']['muted'] === 'True') ? true : false,
					volume: Number(input['_attributes']['volume']) || 100,
					balance: Number(input['_attributes']['balance']),
					solo: (input['_attributes']['solo'] === 'True') ? true : false,
					audioBusses: input['_attributes']['audiobusses'],
					audioAuto: true
					// content: input['_text']
				} as VMixInput
			}), 'number'),
			overlays: (xml['vmix']['overlays']['overlay'] as Array<any>).map(overlay => {
				return {
					number: Number(overlay['_attributes']['number']),
					input: overlay['_text'] ? overlay['_text'] : undefined
				}
			}),
			// preview: Number(xml['vmix']['preview']['_text']),
			// program: Number(xml['vmix']['active']['_text']),
			// TODO: load real mixes data if that is necessary
			mixes: _.map([1,2,3,4], num => {
				return {
					number: num,
					program: undefined,
					preview: undefined,
					transition: { effect: VMixTransitionType.Cut, duration: 0 }}
			}),
			fadeToBlack: (xml['vmix']['fadeToBlack']['_text'] === 'True') ? true : false,
			transitions: (xml['vmix']['transitions']['transition'] as Array<any>)
			.map(transition => {
				return {
					number: Number(transition['_attributes']['number']),
					effect: transition['_attributes']['effect'],
					duration: Number(transition['_attributes']['duration'])
				} as VMixTransition
			}),
			recording: (xml['vmix']['recording']['_text'] === 'True') ? true : false,
			external: (xml['vmix']['external']['_text'] === 'True') ? true : false,
			streaming: (xml['vmix']['streaming']['_text'] === 'True') ? true : false,
			playlist: (xml['vmix']['playList']['_text'] === 'True') ? true : false,
			multiCorder: (xml['vmix']['multiCorder']['_text'] === 'True') ? true : false,
			fullscreen: (xml['vmix']['fullscreen']['_text'] === 'True') ? true : false,
			audio: [
				{
					volume: Number(xml['vmix']['audio']['master']['_attributes']['volume']),
					muted: (xml['vmix']['audio']['master']['_attributes']['muted'] === 'True') ? true : false,
					meterF1: Number(xml['vmix']['audio']['master']['_attributes']['meterF1']),
					meterF2: Number(xml['vmix']['audio']['master']['_attributes']['meterF2']),
					headphonesVolume: Number(xml['vmix']['audio']['master']['_attributes']['headphonesVolume'])
				} as VMixAudioChannel
			]
		}

		this.setState(state)
	}

	public setState (state: VMixState): void {
		this.state = state
		this.emit('stateChanged', this.state)
	}

	public setPreviewInput (input: number | string, mix: number): Promise<any> {
		return this.sendCommandFunction('PreviewInput', { input, mix })
	}

	public setActiveInput (input: number | string): Promise<any> {
		return this.sendCommandFunction('ActiveInput', { input: input })
	}

	public transition (input: number | string, effect: string, duration: number, mix: number): Promise<any> {
		return this.sendCommandFunction(effect, { input, duration, mix })
	}

	public setAudioLevel (input: number | string, volume: number, fade?: number): Promise<any> {
		let value: string = Math.min(Math.max(volume, 0), 100).toString()
		if(fade) {
			value += ',' + fade.toString()
		}
		return this.sendCommandFunction(`SetVolume${fade? 'Fade': ''}`, { input: input, value })
	}

	public setAudioBalance (input: number | string, balance: number): Promise<any> {
		return this.sendCommandFunction(`SetBalance`, { input, value: Math.min(Math.max(balance, -1), 1) })
	}	

	public setAudioOn (input: number | string): Promise<any> {
		return this.sendCommandFunction(`AudioOn`, { input })
	}	

	public setAudioOff (input: number | string): Promise<any> {
		return this.sendCommandFunction(`AudioOff`, { input })
	}	
	
	public setAudioAutoOn (input: number | string): Promise<any> {
		return this.sendCommandFunction(`AudioAutoOn`, { input })
	}	

	public setAudioAutoOff (input: number | string): Promise<any> {
		return this.sendCommandFunction(`AudioAutoOff`, { input })
	}

	public setAudioBusOn (input: number | string, value: string): Promise<any> {
		return this.sendCommandFunction(`AudioBusOn`, { input, value })
	}

	public setAudioBusOff (input: number | string, value: string): Promise<any> {
		return this.sendCommandFunction(`AudioBusOff`, { input, value })
	}

	public setFader (position: number): Promise<any> {
		return this.sendCommandFunction(`SetFader`, { value: Math.min(Math.max(position, 0), 255) })
	}
	
	public setPanX (input: number | string, value: number): Promise<any> {
		return this.sendCommandFunction(`SetPanX`, { input, value: Math.min(Math.max(value, -2), 2) })
	}

	public setPanY (input: number | string, value: number): Promise<any> {
		return this.sendCommandFunction(`SetPanY`, { input, value: Math.min(Math.max(value, -2), 2) })
	}

	public setZoom (input: number | string, value: number): Promise<any> {
		return this.sendCommandFunction(`SetZoom`, { input, value: Math.min(Math.max(value, 0), 5) })
	}

	public setAlpha (input: number | string, value: number): Promise<any> {
		return this.sendCommandFunction(`SetAlpha`, { input, value: Math.min(Math.max(value, 0), 255) })
	}

	public startRecording (): Promise<any> {
		return this.sendCommandFunction(`StartRecording`, {})
	}

	public stopRecording (): Promise<any> {
		return this.sendCommandFunction(`StopRecording`, {})
	}

	public startStreaming (): Promise<any> {
		return this.sendCommandFunction(`StartStreaming`, {})
	}

	public stopStreaming (): Promise<any> {
		return this.sendCommandFunction(`StopStreaming`, {})
	}

	public fadeToBlack (): Promise<any> {
		return this.sendCommandFunction(`FadeToBlack`, {})
	}

	public quickPlay (input: number): Promise<any> {
		return this.sendCommandFunction(`QuickPlay`, { input: input })
	}

	public addInput (file: string): Promise<any> {
		return this.sendCommandFunction(`AddInput`, { value: file })
	}

	public removeInput (name: string): Promise<any> {
		return this.sendCommandFunction(`RemoveInput`, { input: name })
	}

	public playInput (input: number | string): Promise<any> {
		return this.sendCommandFunction(`Play`, { input: input })
	}

	public pauseInput (input: number | string): Promise<any> {
		return this.sendCommandFunction(`Pause`, { input: input })
	}

	public setPosition (input: number | string, value: number): Promise<any> {
		return this.sendCommandFunction(`SetPosition`, { input: input, value: value })
	}

	public loopOn (input: number | string): Promise<any> {
		return this.sendCommandFunction(`LoopOn`, { input: input })
	}

	public loopOff (input: number | string): Promise<any> {
		return this.sendCommandFunction(`LoopOff`, { input: input })
	}

	public setInputName (input: number | string, value: string): Promise<any> {
		return this.sendCommandFunction(`SetInputName`, { input: input, value: value })
	}

	public setOutput (name: string, value: string, input?: number | string): Promise<any> {
		return this.sendCommandFunction(`SetOutput${name}`, { value, input })
	}

	public startExternal (): Promise<any> {
		return this.sendCommandFunction(`StartExternal`, {})
	}

	public stopExternal (): Promise<any> {
		return this.sendCommandFunction(`StopExternal`, {})
	}

	public overlayInputIn (name: number, input: string | number): Promise<any> {
		return this.sendCommandFunction(`OverlayInput${name}In`, { input: input })
	}

	public overlayInputOut (name: number): Promise<any> {
		return this.sendCommandFunction(`OverlayInput${name}Out`, {})
	}

	public setInputOverlay (input: string | number, index: number, value:string | number): Promise<any> {
		let val = `${index},${value}`
		return this.sendCommandFunction(`SetMultiViewOverlay`, { input, value:val })
	}

	public sendCommandFunction (func: string, args: { input?: string | number, value?: string | number, extra?: string, duration?: number, mix?: number }): Promise<any> {
		const inp = args.input !== undefined ? `&Input=${args.input}` : ''
		const val = args.value !== undefined ? `&Value=${args.value}` : ''
		const dur = args.duration !== undefined ? `&Duration=${args.duration}` : ''
		const mix = args.mix !== undefined ? `&Mix=${args.mix}` : ''
		const ext = args.extra !== undefined ? args.extra : ''

		const command = `${this._options.host}:${this._options.port}/api/?Function=${func}${inp}${val}${dur}${mix}${ext}`

		console.log(`Sending command: ${command}`)

		return new Promise((resolve, reject) => {
			request.get(command, {}, (error) => {
				if (error) {
					reject(error)
				} else {
					// this.getVMixState()
					this._stillAlive()
					resolve()
				}
			})
		})
	}
}

export interface VMixStateCommandBase {
	command: VMixCommand
}
export interface VMixStateCommandPreviewInput extends VMixStateCommandBase {
	command: VMixCommand.PREVIEW_INPUT
	input: number | string
	mix: number
}
export interface VMixStateCommandProgram extends VMixStateCommandBase {
	command: VMixCommand.ACTIVE_INPUT
	input: number | string
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
export interface VMixStateCommandSetInputOverlay extends VMixStateCommandBase {
	command: VMixCommand.SET_INPUT_OVERLAY
	input: string | number
	index: number
	value: string | number
}
export type VMixStateCommand = VMixStateCommandPreviewInput |
	VMixStateCommandProgram |
	VMixStateCommandTransition |
	VMixStateCommandAudio |
	VMixStateCommandAudioBalance |
	VMixStateCommandAudioOn |
	VMixStateCommandAudioOff |
	VMixStateCommandAudioAutoOn |
	VMixStateCommandAudioAutoOff |
	VMixStateCommandAudioBusOn |
	VMixStateCommandAudioBusOff |
	VMixStateCommandFader |
	VMixStateCommandSetZoom |
	VMixStateCommandSetPanX |
	VMixStateCommandSetPanY |
	VMixStateCommandSetAlpha |
	VMixStateCommandStartStreaming |
	VMixStateCommandStopStreaming |
	VMixStateCommandStartRecording |
	VMixStateCommandStopRecording |
	VMixStateCommandFadeToBlack |
	VMixStateCommandAddInput |
	VMixStateCommandRemoveInput |
	VMixStateCommandPlayInput |
	VMixStateCommandPauseInput |
	VMixStateCommandSetPosition |
	VMixStateCommandLoopOn |
	VMixStateCommandLoopOff |
	VMixStateCommandSetInputName |
	VMixStateCommandSetOuput |
	VMixStateCommandStartExternal |
	VMixStateCommandStopExternal |
	VMixStateCommandOverlayInputIn |
	VMixStateCommandOverlayInputOut |
	VMixStateCommandSetInputOverlay
