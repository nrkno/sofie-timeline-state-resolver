import { EventEmitter } from 'eventemitter3'
import { Socket } from 'net'
import { VMixCommand } from 'timeline-state-resolver-types'
import { VMixStateCommand } from './vMixCommands'
import { Response, VMixResponseStreamReader } from './vMixResponseStreamReader'

const VMIX_DEFAULT_TCP_PORT = 8099

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
	error: [error: Error]
}

/**
 * This TSR integration polls the state of vMix and merges that into our last-known state.
 * However, not all state properties can be retried from vMix's API.
 * Therefore, there are some properties that we must "carry over" from our last-known state, every time.
 * These are those property keys for the Input state objects.
 */
export type InferredPartialInputStateKeys = 'filePath' | 'fade' | 'audioAuto' | 'restart'

interface SentCommandArgs {
	input?: string | number
	value?: string | number
	extra?: string
	duration?: number
	mix?: number
}

export class VMixConnection extends EventEmitter<ConnectionEvents> {
	private _socket?: Socket
	private _reconnectTimeout?: NodeJS.Timeout
	private _connected = false
	private _responseStreamReader = new VMixResponseStreamReader()

	constructor(private host: string, private port = VMIX_DEFAULT_TCP_PORT, autoConnect = false) {
		super()
		if (autoConnect) this._setupSocket()
		this._responseStreamReader.on('response', (response) => this.emit('data', response))
		this._responseStreamReader.on('error', (error) => this.emit('error', error))
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

	public async sendCommandFunction(func: string, args: SentCommandArgs): Promise<any> {
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
			if (typeof data !== 'string') {
				// this is against the types, but according to the docs the data will be a string
				// the problem of a character split into chunks in transit should be taken care of
				// (https://nodejs.org/docs/latest-v12.x/api/stream.html#stream_readable_setencoding_encoding)
				throw new Error('Received a non-string even though encoding should have been set to utf-8')
			}
			this._responseStreamReader.processIncomingData(data)
		})
		this._socket.on('connect', () => {
			this._setConnected(true)
			this._responseStreamReader.reset()
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
		} else if (this._connected) {
			this._connected = false
			this.emit('disconnected')
		}
	}
}

export class VMixCommandSender {
	constructor(private vMixConnection: VMixConnection) {}

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
			case VMixCommand.SET_LAYER_INPUT:
				return this.setLayerInput(command.input, command.index, command.value)
			case VMixCommand.SET_LAYER_CROP:
				return this.setLayerCrop(
					command.input,
					command.index,
					command.cropLeft,
					command.cropTop,
					command.cropRight,
					command.cropBottom
				)
			case VMixCommand.SET_LAYER_PAN_X:
				return this.setLayerPanX(command.input, command.index, command.value)
			case VMixCommand.SET_LAYER_PAN_Y:
				return this.setLayerPanY(command.input, command.index, command.value)
			case VMixCommand.SET_LAYER_ZOOM:
				return this.setLayerZoom(command.input, command.index, command.value)
			case VMixCommand.SCRIPT_START:
				return this.scriptStart(command.value)
			case VMixCommand.SCRIPT_STOP:
				return this.scriptStop(command.value)
			case VMixCommand.SCRIPT_STOP_ALL:
				return this.scriptStopAll()
			case VMixCommand.LIST_ADD:
				return this.listAdd(command.input, command.value)
			case VMixCommand.LIST_REMOVE_ALL:
				return this.listRemoveAll(command.input)
			case VMixCommand.RESTART_INPUT:
				return this.restart(command.input)
			case VMixCommand.BROWSER_NAVIGATE:
				return this.browserNavigate(command.input, command.value)
			case VMixCommand.SELECT_INDEX:
				return this.selectIndex(command.input, command.value)
			default:
				throw new Error(`vmixAPI: Command ${((command || {}) as any).command} not implemented`)
		}
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

	public async setLayerInput(input: string | number, index: number, value: string | number): Promise<any> {
		const val = `${index},${value}`
		// note: this could probably be replaced by SetLayer, but let's keep it backwards compatible until SetMultiViewOverlay becomes deprecated
		return this.sendCommandFunction(`SetMultiViewOverlay`, { input, value: val })
	}

	public async setLayerCrop(
		input: string | number,
		index: number,
		cropLeft: number,
		cropTop: number,
		cropRight: number,
		cropBottom: number
	): Promise<any> {
		const value = `${cropLeft},${cropTop},${cropRight},${cropBottom}`
		return this.sendCommandFunction(`SetLayer${index}Crop`, { input, value })
	}

	public async setLayerZoom(input: string | number, index: number, value: number): Promise<any> {
		return this.sendCommandFunction(`SetLayer${index}Zoom`, { input, value })
	}

	public async setLayerPanX(input: string | number, index: number, value: number): Promise<any> {
		return this.sendCommandFunction(`SetLayer${index}PanX`, { input, value })
	}

	public async setLayerPanY(input: string | number, index: number, value: number): Promise<any> {
		return this.sendCommandFunction(`SetLayer${index}PanY`, { input, value })
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

	public async listAdd(input: string | number, value: string | number): Promise<any> {
		return this.sendCommandFunction(`ListAdd`, { input, value: encodeURIComponent(value) })
	}

	public async listRemoveAll(input: string | number): Promise<any> {
		return this.sendCommandFunction(`ListRemoveAll`, { input })
	}

	public async restart(input: string | number): Promise<any> {
		return this.sendCommandFunction(`Restart`, { input })
	}

	public async browserNavigate(input: string | number, value: string): Promise<any> {
		return this.sendCommandFunction(`BrowserNavigate`, { input, value: encodeURIComponent(value) })
	}

	public async selectIndex(input: string | number, value: number): Promise<any> {
		return this.sendCommandFunction(`SelectIndex`, { input, value })
	}

	private async sendCommandFunction(func: string, args: SentCommandArgs) {
		return this.vMixConnection.sendCommandFunction(func, args)
	}
}
