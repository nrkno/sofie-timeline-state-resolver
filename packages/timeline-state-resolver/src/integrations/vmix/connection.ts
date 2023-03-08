import { EventEmitter } from 'eventemitter3'
import { Socket } from 'net'
import * as xml from 'xml-js'
import { VMixCommand, VMixTransitionType } from 'timeline-state-resolver-types'
import { VMixState, VMixInput, VMixMix } from './index'
import * as _ from 'underscore'

const VMIX_DEFAULT_TCP_PORT = 8099
const RESPONSE_REGEX = /^(?<command>\w+)\s+(?<response>OK|ER|\d+)(\s+(?<responseMsg>.*))?/i

export enum ResponseTypes {
	Info = 'INFO',
	OK = 'OK',
	ClientError = 'ERROR',
	ServerError = 'FAILED',
}

export type ConnectionEvents = {
	data: [response: Response]
	connected: []
	disconnected: []
	initialized: []
	stateChanged: [state: VMixState]
	error: [error: Error]
}

export interface Response {
	command: string
	response: 'OK' | 'ER'
	message: string
	body?: string
}

export class BaseConnection extends EventEmitter<ConnectionEvents> {
	private _socket?: Socket
	private _unprocessedLines: string[] = []
	private _reconnectTimeout?: NodeJS.Timeout
	private _connected = false

	constructor(private host: string, private port = VMIX_DEFAULT_TCP_PORT, autoConnect = false) {
		super()
		if (autoConnect) this._setupSocket()
	}

	get connected(): boolean {
		return this._connected
	}

	connect(host?: string, port?: number): void {
		this.host = host ?? this.host
		this.port = host ? port ?? VMIX_DEFAULT_TCP_PORT : this.port

		this._socket?.end()

		this._setupSocket()
	}

	disconnect(): void {
		this._socket?.end()
	}

	public async requestVMixState() {
		return this._sendCommand('XML')
	}

	public async sendCommandFunction(
		func: string,
		args: { input?: string | number; value?: string | number; extra?: string; duration?: number; mix?: number }
	): Promise<any> {
		const inp = args.input !== undefined ? `&Input=${args.input}` : ''
		const val = args.value !== undefined ? `&Value=${args.value}` : ''
		const dur = args.duration !== undefined ? `&Duration=${args.duration}` : ''
		const mix = args.mix !== undefined ? `&Mix=${args.mix}` : ''
		const ext = args.extra !== undefined ? args.extra : ''

		const queryString = `${inp}${val}${dur}${mix}${ext}`.slice(1) // remove the first &
		let command = `FUNCTION ${func}`

		if (queryString) {
			command += ` ${queryString}`
		}

		// this.emit('debug', `Sending command: ${command}`)

		return this._sendCommand(command)
	}

	private async _sendCommand(cmd: string): Promise<Error | undefined> {
		return new Promise<Error | undefined>((resolve) => {
			this._socket?.write(cmd + '\r\n', (err) => resolve(err))
		})
	}

	private async _processIncomingData(data: Buffer) {
		const string = data.toString('utf-8')
		const newLines = string.split('\r\n')

		this._unprocessedLines.push(...newLines)

		lineProcessing: while (this._unprocessedLines.length > 0) {
			const firstLine = this._unprocessedLines[0]
			const result = RESPONSE_REGEX.exec(firstLine)
			let processedLines = 0

			if (result && result.groups?.['response']) {
				// create a response object
				// Add 2 to account for the space between `command` and `response` as well as the newline after `response`.
				const responseHeaderLength = result.groups?.['command'].length + result.groups?.['response'].length + 2
				if (Number.isNaN(responseHeaderLength)) {
					break lineProcessing
				}
				const responseLen = parseInt(result?.groups?.['response']) - responseHeaderLength
				const response: Response = {
					command: result.groups?.['command'],
					response: (Number.isNaN(responseLen) ? result.groups?.['response'] : 'OK') as Response['response'],
					message: result.groups?.['responseMsg'],
					body: undefined as undefined | string,
				}
				processedLines++

				// parse payload data if there is any
				if (!Number.isNaN(responseLen)) {
					let len = responseLen
					const lines: string[] = []

					while (len > 0) {
						const l = this._unprocessedLines[lines.length + 1] // offset of 1 because first line is not data
						if (l === undefined) {
							// we have not received all the data from server, break line processing and wait for more data
							break lineProcessing
						}

						len -= l.length + 2
						lines.push(l)
					}
					response.body = lines.join('\r\n')
					processedLines += lines.length
				}

				// now do something with response
				this.emit('data', response)
			} else if (firstLine.length > 0) {
				// there is some data, but we can't recognize it, emit an error
				this.emit('error', new Error(`Unknown response from vMix: "${firstLine}"`))
				processedLines++
			} else {
				// empty lines we silently ignore
				processedLines++
			}

			// remove processed lines
			this._unprocessedLines.splice(0, processedLines)
		}
	}

	private _triggerReconnect() {
		if (!this._reconnectTimeout) {
			this._reconnectTimeout = setTimeout(() => {
				this._reconnectTimeout = undefined

				if (!this._connected) this._setupSocket()
			}, 5000)
		}
	}

	private _setupSocket() {
		if (this._socket) {
			this._socket.removeAllListeners()
			if (!this._socket.destroyed) {
				this._socket.destroy()
			}
		}

		this._socket = new Socket()
		this._socket.setNoDelay(true)
		this._socket.setEncoding('utf-8')

		this._socket.on('data', (data) => {
			this._processIncomingData(data).catch((e) => this.emit('error', e))
		})
		this._socket.on('connect', () => {
			this._setConnected(true)
		})
		this._socket.on('close', () => {
			this._setConnected(false)
			this._triggerReconnect()
		})
		this._socket.on('error', (e) => {
			if (`${e}`.match(/ECONNREFUSED/)) {
				// Unable to connect, no need to handle this error
				this._setConnected(false)
			} else {
				this.emit('error', e)
			}
		})

		this._socket.connect(this.port, this.host)
	}

	private _setConnected(connected: boolean) {
		if (connected) {
			if (!this._connected) {
				this._connected = true
				this.emit('connected')
			}
		} else {
			if (this._connected) {
				this._connected = false
				this.emit('disconnected')
			}
		}
	}
}

export class VMix extends BaseConnection {
	public state: VMixState

	public async sendCommand(command: VMixStateCommand): Promise<any> {
		switch (command.command) {
			case VMixCommand.PREVIEW_INPUT:
				return this.setPreviewInput(command.input, command.mix)
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
			case VMixCommand.SCRIPT_START:
				return this.scriptStart(command.value)
			case VMixCommand.SCRIPT_STOP:
				return this.scriptStop(command.value)
			case VMixCommand.SCRIPT_STOP_ALL:
				return this.scriptStopAll()
			default:
				throw new Error(`vmixAPI: Command ${((command || {}) as any).command} not implemented`)
		}
	}

	public parseVMixState(responseBody: string): void {
		const preParsed = xml.xml2json(responseBody, { compact: true, spaces: 4 })
		const xmlState = JSON.parse(preParsed)
		let mixes = xmlState['vmix']['mix']
		mixes = Array.isArray(mixes) ? mixes : mixes ? [mixes] : []
		let fixedInputsCount = 0
		// For what lies ahead I apologise - Tom
		const state: VMixState = {
			version: xmlState['vmix']['version']['_text'],
			edition: xmlState['vmix']['edition']['_text'],
			inputs: _.indexBy(
				(xmlState['vmix']['inputs']['input'] as Array<any>).map((input): VMixInput => {
					fixedInputsCount++
					return {
						number: Number(input['_attributes']['number']),
						type: input['_attributes']['type'],
						state: input['_attributes']['state'],
						position: Number(input['_attributes']['position']) || 0,
						duration: Number(input['_attributes']['duration']) || 0,
						loop: input['_attributes']['loop'] === 'False' ? false : true,
						muted: input['_attributes']['muted'] === 'False' ? false : true,
						volume: Number(input['_attributes']['volume'] || 100),
						balance: Number(input['_attributes']['balance'] || 0),
						audioBuses: input['_attributes']['audiobusses'],
						transform: {
							panX: Number(input['position'] ? input['position']['_attributes']['panX'] || 0 : 0),
							panY: Number(input['position'] ? input['position']['_attributes']['panY'] || 0 : 0),
							alpha: -1, // unavailable
							zoom: Number(input['position'] ? input['position']['_attributes']['zoomX'] || 1 : 1), // assume that zoomX==zoomY
						},
					}
				}),
				'number'
			),
			overlays: (xmlState['vmix']['overlays']['overlay'] as Array<any>).map((overlay) => {
				return {
					number: Number(overlay['_attributes']['number']),
					input: overlay['_text'],
				}
			}),
			mixes: [
				{
					number: 1,
					program: Number(xmlState['vmix']['active']['_text']),
					preview: Number(xmlState['vmix']['preview']['_text']),
					transition: { effect: VMixTransitionType.Cut, duration: 0 },
				},
				...mixes.map((mix: any): VMixMix => {
					return {
						number: Number(mix['_attributes']['number']),
						program: Number(mix['active']['_text']),
						preview: Number(mix['preview']['_text']),
						transition: { effect: VMixTransitionType.Cut, duration: 0 },
					}
				}),
			],
			fadeToBlack: xmlState['vmix']['fadeToBlack']['_text'] === 'True' ? true : false,
			recording: xmlState['vmix']['recording']['_text'] === 'True' ? true : false,
			external: xmlState['vmix']['external']['_text'] === 'True' ? true : false,
			streaming: xmlState['vmix']['streaming']['_text'] === 'True' ? true : false,
			playlist: xmlState['vmix']['playList']['_text'] === 'True' ? true : false,
			multiCorder: xmlState['vmix']['multiCorder']['_text'] === 'True' ? true : false,
			fullscreen: xmlState['vmix']['fullscreen']['_text'] === 'True' ? true : false,
			audio: [
				{
					volume: Number(xmlState['vmix']['audio']['master']['_attributes']['volume']),
					muted: xmlState['vmix']['audio']['master']['_attributes']['muted'] === 'True' ? true : false,
					meterF1: Number(xmlState['vmix']['audio']['master']['_attributes']['meterF1']),
					meterF2: Number(xmlState['vmix']['audio']['master']['_attributes']['meterF2']),
					headphonesVolume: Number(xmlState['vmix']['audio']['master']['_attributes']['headphonesVolume']),
				},
			],
			fixedInputsCount,
		}
		this.setState(state)
	}

	public setState(state: VMixState): void {
		this.state = state
		this.emit('stateChanged', state)
	}

	public async setPreviewInput(input: number | string, mix: number): Promise<any> {
		return this.sendCommandFunction('PreviewInput', { input, mix })
	}

	public async transition(input: number | string, effect: string, duration: number, mix: number): Promise<any> {
		return this.sendCommandFunction(effect, { input, duration, mix })
	}

	public async setAudioLevel(input: number | string, volume: number, fade?: number): Promise<any> {
		let value: string = Math.min(Math.max(volume, 0), 100).toString()
		if (fade) {
			value += ',' + fade.toString()
		}
		return this.sendCommandFunction(`SetVolume${fade ? 'Fade' : ''}`, { input: input, value })
	}

	public async setAudioBalance(input: number | string, balance: number): Promise<any> {
		return this.sendCommandFunction(`SetBalance`, { input, value: Math.min(Math.max(balance, -1), 1) })
	}

	public async setAudioOn(input: number | string): Promise<any> {
		return this.sendCommandFunction(`AudioOn`, { input })
	}

	public async setAudioOff(input: number | string): Promise<any> {
		return this.sendCommandFunction(`AudioOff`, { input })
	}

	public async setAudioAutoOn(input: number | string): Promise<any> {
		return this.sendCommandFunction(`AudioAutoOn`, { input })
	}

	public async setAudioAutoOff(input: number | string): Promise<any> {
		return this.sendCommandFunction(`AudioAutoOff`, { input })
	}

	public async setAudioBusOn(input: number | string, value: string): Promise<any> {
		return this.sendCommandFunction(`AudioBusOn`, { input, value })
	}

	public async setAudioBusOff(input: number | string, value: string): Promise<any> {
		return this.sendCommandFunction(`AudioBusOff`, { input, value })
	}

	public async setFader(position: number): Promise<any> {
		return this.sendCommandFunction(`SetFader`, { value: Math.min(Math.max(position, 0), 255) })
	}

	public async setPanX(input: number | string, value: number): Promise<any> {
		return this.sendCommandFunction(`SetPanX`, { input, value: Math.min(Math.max(value, -2), 2) })
	}

	public async setPanY(input: number | string, value: number): Promise<any> {
		return this.sendCommandFunction(`SetPanY`, { input, value: Math.min(Math.max(value, -2), 2) })
	}

	public async setZoom(input: number | string, value: number): Promise<any> {
		return this.sendCommandFunction(`SetZoom`, { input, value: Math.min(Math.max(value, 0), 5) })
	}

	public async setAlpha(input: number | string, value: number): Promise<any> {
		return this.sendCommandFunction(`SetAlpha`, { input, value: Math.min(Math.max(value, 0), 255) })
	}

	public async startRecording(): Promise<any> {
		return this.sendCommandFunction(`StartRecording`, {})
	}

	public async stopRecording(): Promise<any> {
		return this.sendCommandFunction(`StopRecording`, {})
	}

	public async startStreaming(): Promise<any> {
		return this.sendCommandFunction(`StartStreaming`, {})
	}

	public async stopStreaming(): Promise<any> {
		return this.sendCommandFunction(`StopStreaming`, {})
	}

	public async fadeToBlack(): Promise<any> {
		return this.sendCommandFunction(`FadeToBlack`, {})
	}

	public async addInput(file: string): Promise<any> {
		return this.sendCommandFunction(`AddInput`, { value: file })
	}

	public async removeInput(name: string): Promise<any> {
		return this.sendCommandFunction(`RemoveInput`, { input: name })
	}

	public async playInput(input: number | string): Promise<any> {
		return this.sendCommandFunction(`Play`, { input: input })
	}

	public async pauseInput(input: number | string): Promise<any> {
		return this.sendCommandFunction(`Pause`, { input: input })
	}

	public async setPosition(input: number | string, value: number): Promise<any> {
		return this.sendCommandFunction(`SetPosition`, { input: input, value: value })
	}

	public async loopOn(input: number | string): Promise<any> {
		return this.sendCommandFunction(`LoopOn`, { input: input })
	}

	public async loopOff(input: number | string): Promise<any> {
		return this.sendCommandFunction(`LoopOff`, { input: input })
	}

	public async setInputName(input: number | string, value: string): Promise<any> {
		return this.sendCommandFunction(`SetInputName`, { input: input, value: value })
	}

	public async setOutput(name: string, value: string, input?: number | string): Promise<any> {
		return this.sendCommandFunction(`SetOutput${name}`, { value, input })
	}

	public async startExternal(): Promise<any> {
		return this.sendCommandFunction(`StartExternal`, {})
	}

	public async stopExternal(): Promise<any> {
		return this.sendCommandFunction(`StopExternal`, {})
	}

	public async overlayInputIn(name: number, input: string | number): Promise<any> {
		return this.sendCommandFunction(`OverlayInput${name}In`, { input: input })
	}

	public async overlayInputOut(name: number): Promise<any> {
		return this.sendCommandFunction(`OverlayInput${name}Out`, {})
	}

	public async setInputOverlay(input: string | number, index: number, value: string | number): Promise<any> {
		const val = `${index},${value}`
		return this.sendCommandFunction(`SetMultiViewOverlay`, { input, value: val })
	}

	public async scriptStart(value: string): Promise<any> {
		return this.sendCommandFunction(`ScriptStart`, { value })
	}

	public async scriptStop(value: string): Promise<any> {
		return this.sendCommandFunction(`ScriptStop`, { value })
	}

	public async scriptStopAll(): Promise<any> {
		return this.sendCommandFunction(`ScriptStopAll`, {})
	}

	public async lastPreset(): Promise<any> {
		return this.sendCommandFunction('LastPreset', {})
	}

	public async openPreset(file: string): Promise<any> {
		return this.sendCommandFunction('OpenPreset', { value: file })
	}

	public async savePreset(file: string): Promise<any> {
		return this.sendCommandFunction('SavePreset', { value: file })
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
	| VMixStateCommandSetInputOverlay
	| VMixStateCommandScriptStart
	| VMixStateCommandScriptStop
	| VMixStateCommandScriptStopAll
