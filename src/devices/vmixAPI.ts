import { EventEmitter } from 'events'
import * as request from 'request-promise'
import { VMixOptions, VMixCommand } from '../../src/types/src/vmix'
import { VMixState, VMixStateCommand } from './vmix'

const PING_TIMEOUT = 10 * 1000

export class VMix extends EventEmitter {
	public state: VMixState

	private _options: VMixOptions
	private _connected: boolean = false

	private _socketKeepAliveTimeout: NodeJS.Timer | null = null

	connect (options: VMixOptions): Promise<void> {
		// TODO: Populate from VMix
		this.state = {
			version: '22.0.0.67',
			edition: 'Trial',
			inputs: [],
			overlays: [],
			preview: undefined,
			active: undefined,
			fadeToBlack: false,
			faderPosition: undefined,
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
			request.get(`${this._options.host}:${this._options.port}`)
			.then(() => {
				this._connected = true
				this._socketKeepAliveTimeout = setTimeout(() => {
					this.sendCommandVersion()
				}, PING_TIMEOUT)
				this.emit('connected')
				resolve()
			})
			.catch((e) => {
				reject(e)
			})
		})
	}

	private _stillAlive () {
		if (this._socketKeepAliveTimeout) {
			this._socketKeepAliveTimeout = null
		}

		this._socketKeepAliveTimeout = setTimeout(() => {
			this.sendCommandVersion()
		}, PING_TIMEOUT)
	}

	public sendCommand (command: VMixStateCommand): Promise<any> {
		switch (command.command) {
			case VMixCommand.PREVIEW_INPUT:
				if (command.input) {
					this.setPreviewInput(command.input.toString())
				}
				break
			case VMixCommand.ACTIVE_INPUT:
				if (command.input) {
					this.setActiveInput(command.input.toString())
				}
				break
			case VMixCommand.TRANSITION_EFFECT:
				if (command.value && command.input) {
					this.setTransition(Number(command.input), command.value.toString())
				}
				break
			case VMixCommand.TRANSITION_DURATION:
				if (command.value && command.input) {
					this.setTransitionDuration(Number(command.input), Number(command.value))
				}
				break
			case VMixCommand.TRANSITION:
				if (command.input) this.transition(Number(command.input))
				break
			case VMixCommand.AUDIO:
				if (command.input && command.value) {
					this.setAudioLevel(command.input.toString(), Number(command.value))
				}
				break
			case VMixCommand.FADER:
				if (command.value) {
					this.setFader(Number(command.value))
				}
				break
			case VMixCommand.START_RECORDING:
				this.startRecording()
				break
			case VMixCommand.STOP_RECORDING:
				this.stopRecording()
				break
			case VMixCommand.START_STREAMING:
				this.startStreaming()
				break
			case VMixCommand.STOP_STREAMING:
				this.stopStreaming()
				break
			case VMixCommand.FADE_TO_BLACK:
				this.fadeToBlack()
				break
			case VMixCommand.QUICK_PLAY:
				if (command.input) this.quickPlay(command.input.toString())
				break
			default:
				return Promise.reject(`Command ${command.command} not implemented`)
		}

		return Promise.resolve()
	}

	public sendCommandVersion () {
		request.get(`${this._options.host}:${this._options.port}/api`)
		.then((res) => {
			this._connected = true
			console.log(res)
		})
		.catch((e) => {
			this._connected = false
			throw new Error(e)
		}).finally(() => {
			this._stillAlive()
		})
	}

	public setPreviewInput (input: string) {
		this.sendCommandFunction('PreviewInput', { input: input })
	}

	public setActiveInput (input: string) {
		this.sendCommandFunction('ActiveInput', { input: input })
	}

	public setTransition (transitionNumber: number, transition: string) {
		this.sendCommandFunction(`SetTransitionEffect${transitionNumber}`, { value: transition })
	}

	public setTransitionDuration (transitionNumber: number, duration: number) {
		this.sendCommandFunction(`SetTransitionDuration${transitionNumber}`, { value: duration })
	}

	public transition (transitionNumber: number) {
		this.sendCommandFunction(`Transition${transitionNumber}`, {})
	}

	public setAudioLevel (input: string, volume: number) {
		this.sendCommandFunction(`SetVolume`, { input: input, value: Math.min(Math.max(Number(volume), 0), 100) })
	}

	public setFader (position: number) {
		this.sendCommandFunction(`SetFader`, { value: Math.min(Math.max(position, 0), 255) })
	}

	public startRecording () {
		this.sendCommandFunction(`StartRecording`, {})
	}

	public stopRecording () {
		this.sendCommandFunction(`StopRecording`, {})
	}

	public startStreaming () {
		this.sendCommandFunction(`StartStreaming`, {})
	}

	public stopStreaming () {
		this.sendCommandFunction(`StopStreaming`, {})
	}

	public fadeToBlack () {
		this.sendCommandFunction(`FadeToBlack`, {})
	}

	public quickPlay (input: string) {
		this.sendCommandFunction(`QuickPlay`, { input: input })
	}

	public sendCommandFunction (func: string, args: { input?: string | number, value?: string | number, extra?: string }) {
		const inp = args.input ? `&Input=${args.input}` : ''
		const val = args.value ? `&Value=${args.value}` : ''
		const ext = args.extra ? args.extra : ''

		const command = `${this._options.host}:${this._options.port}/api/?Function=${func}${inp}${val}${ext}`

		console.log(`Sending command: ${command}`)

		request.get(command)
		.then((res) => {
			console.log(res)
		})
		.catch((e) => {
			throw new Error(e)
		})
		.finally(() => {
			this._stillAlive()
		})
	}
}
