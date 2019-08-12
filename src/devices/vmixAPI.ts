import { EventEmitter } from 'events'
import * as request from 'request-promise'
import * as xml from 'xml-js'
import { VMixOptions, VMixCommand } from '../../src/types/src/vmix'
import { VMixState, VMixStateCommand, VMixInput, VMixTransition, VMixAudioChannel } from './vmix'

const PING_TIMEOUT = 10 * 1000

export class VMix extends EventEmitter {
	public state: VMixState

	private _options: VMixOptions
	private _connected: boolean = false

	private _socketKeepAliveTimeout: NodeJS.Timer | null = null

	connect (options: VMixOptions): Promise<void> {
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
			request.get(`${this._options.host}:${this._options.port}`)
			.then(() => {
				this._connected = true
				this._socketKeepAliveTimeout = setTimeout(() => {
					this.getVMixState()
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
			this.getVMixState()
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
			case VMixCommand.ADD_INPUT:
				if (command.value) this.addInput(command.value.toString())
				break
			case VMixCommand.PLAY_INPUT:
				if (command.input) this.playInput(command.input.toString())
				break
			case VMixCommand.PAUSE_INPUT:
				if (command.input) this.pauseInput(command.input.toString())
				break
			case VMixCommand.SET_POSITION:
				if (command.input && command.value) this.setPosition(command.input.toString(), command.value.toString())
				break
			case VMixCommand.SET_INPUT_NAME:
				if (command.input && command.value) this.setInputName(command.input.toString(), command.value.toString())
				break
			case VMixCommand.SET_OUPUT:
				if (command.input && command.value && command.name) this.setOutput(command.name, command.value.toString(), command.input.toString())
				break
			default:
				return Promise.reject(`Command ${command.command} not implemented`)
		}

		return Promise.resolve()
	}

	public getVMixState () {
		request.get(`${this._options.host}:${this._options.port}/api`)
		.then((res) => {
			this._connected = true
			const state = xml.xml2json(res, { compact: true, spaces: 4 })
			this.parseVMixState(JSON.parse(state))
		})
		.catch((e) => {
			this._connected = false
			throw new Error(e)
		}).finally(() => {
			this._stillAlive()
		})
	}

	public parseVMixState (xml: any) {
		// For what lies ahead I apologise - Tom
		let state: VMixState = {
			version: xml['vmix']['version']['_text'],
			edition: xml['vmix']['edition']['_text'],
			inputs: (xml['vmix']['inputs']['input'] as Array<any>)
			.map(input => {
				return {
					key: input['_attributes']['key'],
					number: Number(input['_attributes']['number']),
					type: input['_attributes']['type'],
					title: input['_attributes']['title'],
					state: input['_attributes']['state'],
					position: Number(input['_attributes']['position']),
					duration: Number(input['_attributes']['duration']),
					loop: (input['_attributes']['loop'] === 'True') ? true : false,
					muted: (input['_attributes']['muted'] === 'True') ? true : false,
					volume: Number(input['_attributes']['volume']),
					balance: Number(input['_attributes']['balance']),
					solo: (input['_attributes']['solo'] === 'True') ? true : false,
					audiobusses: input['_attributes']['audiobusses'],
					meterF1: Number(input['_attributes']['meterF1']),
					meterF2: Number(input['_attributes']['meterF2']),
					content: input['_text']
				} as VMixInput
			}),
			overlays: [], // TODO: Need some examples from vmix
			preview: xml['vmix']['preview']['_text'],
			active: xml['vmix']['active']['_text'],
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

	public setState (state: VMixState) {
		this.state = state
		this.emit('stateChanged', this.state)
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
		this.sendCommandFunction(`SetVolume`, { input: input, value: Math.min(Math.max(volume, 0), 100) })
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

	public addInput (file: string) {
		this.sendCommandFunction(`AddInput`, { value: file })
	}

	public playInput (input: string) {
		this.sendCommandFunction(`Play`, { input: input })
	}

	public pauseInput (input: string) {
		this.sendCommandFunction(`Pause`, { input: input })
	}

	public setPosition (input: string, value: string) {
		this.sendCommandFunction(`SetPosition`, { input: input, value: value })
	}

	public setInputName (input: string, value: string) {
		this.sendCommandFunction(`SetInputName`, { input: input, value: value })
	}

	public setOutput (name: string, value: string, input?: string) {
		this.sendCommandFunction(`SetOutput${name}`, { value: value, input: (input ? input : '') })
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
			this.getVMixState()
		})
		.catch((e) => {
			throw new Error(e)
		})
		.finally(() => {
			this._stillAlive()
		})
	}
}
