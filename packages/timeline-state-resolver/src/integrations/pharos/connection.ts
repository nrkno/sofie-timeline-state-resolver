import * as WebSocket from 'ws'
import { EventEmitter } from 'events'
import got, { GotRequestFunction } from 'got'
import * as _ from 'underscore'

/**
 * Note: This work is derived from
 * https://dl.pharoscontrols.com/documentation/manuals/Pharos%20Designer%202%20User%20Manual%20-%20A4.pdf
 */

// This should probably be moved into it's own library

type Primitives = string | number | boolean | null | undefined

const CONNECT_TIMEOUT = 3000
const PING_TIMEOUT = 10 * 1000
export interface Options {
	host: string
	ssl?: boolean
}
export interface SystemInfo {
	bootloader_version: string
	channel_capacity: number
	default_gateway: string
	firmware_version: string
	hardware_type: string
	ip_address: string
	last_boot_time: string
	memory_free: string
	memory_total: string
	memory_used: string
	reset_reason: string
	serial_number: string
	storage_size: string
	subnet_mask: string
}
export interface ProjectInfo {
	author: string
	filename: string
	name: string
	unique_id: string
	upload_date: string
}
export interface CurrentTime {
	datetime: string
	local_time: number
	uptime: number
}
export interface TimelineInfo {
	timelines: Array<{
		audio_band: number
		audio_channel: 'left' | 'right' | 'combined'
		audio_peak: boolean
		group: 'A' | 'B' | 'C' | 'D' | ''
		length: number
		name: string
		num: number
		onstage: boolean
		position: number
		priority: 'high' | 'above_normal' | 'normal' | 'below_normal' | 'low'
		source_bus:
			| 'internal'
			| 'timecode_1'
			| 'timecode_2'
			| 'timecode_3'
			| 'timecode_4'
			| 'timecode_5'
			| 'timecode_6'
			| 'audio_1'
			| 'audio_2'
			| 'audio_3'
			| 'audio_4'
		state: 'none' | 'running' | 'paused' | 'holding_at_end' | 'released'
		time_offset: number
		timecode_format: string
	}>
}
export interface SceneInfo {
	scenes: Array<{
		name: string
		num: number
		state: 'none' | 'started'
		onstage: boolean
	}>
}
export interface GroupInfo {
	groups: Array<{
		level: number
		name: string
		num: number // 0-100
	}>
}
export type ContentTargetInfo = unknown // Data structure unknown
export interface ControllerInfo {
	controllers: Array<{
		ip_address: string
		name: string
		num: number
		online: boolean
		serial: string
		type: string
	}>
}
export interface RemoteDeviceInfo {
	remote_devices: Array<{
		num: number
		type: string
		serial: Array<string>
		outputs: Array<{
			output: number
			value: boolean
		}>
		inputs: Array<{
			input: number
			type: string
			value: boolean
		}>
		online: boolean
	}>
}
export interface Temperature {
	temp: {
		sys_temp: number // (only for LPC X and VLC/VLC +)
		core1_temp: number // (only for LPC X and VLC/VLC +)
		core2_temp: number // (only for LPC X rev 1
		ambient_temp: number // (only for TPC, LPC X rev 1)
		cc_temp: number // (only for LPC X rev 2 and VLC/VLC +)
		gpu_temp: number // (only for VLC/VLC +)
	}
}
export interface FanSpeed {
	fan_speed: boolean | any
}
export interface TextSlot {
	text_slots: Array<{
		name: string
		value: string
	}>
}
export interface Protocols {
	outputs: Array<{
		disabled: boolean
		name: string
		type: number
		universes: Array<{
			name: string
			key: {
				index?: number // For DMX, Pathport, sACN and Art-Net:
				kinet_port?: number // For KiNET
				kinet_power_supply_num?: number // For KiNET
			}
		}>
		dmx_proxy?: Array<{
			name: string
			ip_address: string
		}>
	}>
}
export interface Output {
	channels: Array<number>
	disabled: boolean
	proxied_tpc_name?: string
}
export interface LuaVariables {
	// Unknown how this looks like, this is a pure guess:
	[key: string]: any
}
export interface Triggers {
	triggers: Array<{
		actions: Array<{
			text: string
		}>
		conditions: Array<{
			text: string
		}>
		name: string
		num: number
		trigger_text: string
		type: string
	}>
}
export enum Protocol {
	DMX = 'dmx',
	PATHPORT = 'pathport',
	ARTNET = 'art-net',
	KINET = 'kinet',
	SACN = 'sacn',
	DVI = 'dvi',
	RIODMX = 'rio-dmx',
}
export interface RGBOptions {
	intensity?: number
	red?: number
	green?: number
	blue?: number
	temperature?: number
	fade?: number
	path?: 'Default' | 'Linear' | 'Start' | 'End' | 'Braked' | 'Accelerated' | 'Damped' | 'Overshoot'
}

/**
 * Implementation of the Pharos V2 http API
 */
export class Pharos extends EventEmitter {
	private _socket: WebSocket | null = null

	private _keepAlive = false
	private _replyReceived = false
	private _queryString = ''
	private _serverSessionKey: Int32Array | null = null
	private _reconnectAttempts = 0
	private _isConnecting = false
	private _isReconnecting = false
	private _aboutToReconnect = false
	private _pendingMessages: Array<{ msg: string; resolve: Function; reject: Function }> = []
	private _requestPromises: { [id: string]: Array<{ resolve: Function; reject: Function }> } = {}
	private _broadcastCallbacks: { [id: string]: Array<Function> } = {}

	/** Setup in connect */
	private _options!: Options
	private _connected = false

	private _webSocketKeepAliveTimeout: NodeJS.Timer | null = null

	// constructor () {}
	async connect(options: Options): Promise<void> {
		this._isConnecting = true
		this._options = options

		return this._connectSocket().then(() => {
			this._isConnecting = false
		})
	}

	public get connected(): boolean {
		return this._connected
	}
	public async dispose(): Promise<void> {
		return new Promise((resolve) => {
			_.each(this._requestPromises, (rp, id) => {
				_.each(rp, (promise) => {
					promise.reject('Disposing')
				})
				delete this._requestPromises[id]
			})
			_.each(this._broadcastCallbacks, (_fcns, id) => {
				delete this._broadcastCallbacks[id]
			})

			if (this.connected) {
				this.once('disconnected', resolve)
			}
			if (this._socket) this._socket.close()
			if (!this.connected) {
				resolve()
			}
		})
	}

	public async getSystemInfo(): Promise<SystemInfo> {
		return this.request('system')
	}
	public async getProjectInfo(): Promise<ProjectInfo> {
		return this.request('project')
	}
	public async getCurrentTime(): Promise<CurrentTime> {
		return this.request('time')
	}
	/**
	 * @param params Example: { num: '1,2,5-9' }
	 */
	public async getTimelineInfo(num?: string | number): Promise<TimelineInfo> {
		return this.getThingInfo('timeline', num)
	}
	/**
	 * @param params Example: { num: '1,2,5-9' }
	 */
	public async getSceneInfo(num?: string | number): Promise<SceneInfo> {
		const params: any = {}
		if (num) params.num = num + ''
		return this.getThingInfo('scene', num)
	}
	/**
	 * @param params Example: { num: '1,2,5-9' }
	 */
	public async getGroupInfo(num?: string | number): Promise<GroupInfo> {
		return this.getThingInfo('group', num)
	}
	private async getThingInfo(thing: string, num?: string | number): Promise<any> {
		const params: any = {}
		if (num) params.num = num + ''
		return this.request(thing, params)
	}
	public async getContentTargetInfo(): Promise<ContentTargetInfo> {
		return this.request('content_target')
	}
	public async getControllerInfo(): Promise<ControllerInfo> {
		return this.request('controller')
	}
	public async getRemoteDeviceInfo(): Promise<RemoteDeviceInfo> {
		return this.request('remote_device')
	}
	public async getTemperature(): Promise<Temperature> {
		return this.request('temperature')
	}
	public async getFanSpeed(): Promise<FanSpeed> {
		return this.request('fan_speed')
	}
	public async getTextSlot(names?: string | Array<string>): Promise<TextSlot> {
		const params: any = {}
		if (names) {
			if (!_.isArray(names)) names = [names]
			params.names = names.join(',') // TODO: test that this actually works
		}
		return this.request('text_slot', params)
	}
	public async getProtocols(): Promise<Protocols> {
		return this.request('protocol')
	}
	/**
	 * @param key {universe?: universeKey} Example: "dmx:1", "rio-dmx:rio44:1" // DMX, Pathport, sACN and Art-Net, protocol:kinetPowerSupplyNum:kinetPort for KiNET and protocol:remoteDeviceType:remoteDeviceNum for RIO DMX
	 */
	public async getOutput(universe?: string): Promise<Output> {
		const params: any = {}
		if (universe) params.universe = universe
		return this.request('output', params)
	}
	public async getLuaVariables(vars?: string | Array<string>): Promise<LuaVariables> {
		const params: any = {}
		if (vars) {
			if (!_.isArray(vars)) vars = [vars]
			params.variables = vars.join(',')
		}
		return this.request('lua', params)
	}
	public async getTriggers(): Promise<Triggers> {
		return this.request('trigger')
	}
	public async subscribeTimelineStatus(callback): Promise<void> {
		return this.subscribe('timeline', callback)
	}
	public async subscribeSceneStatus(callback): Promise<void> {
		return this.subscribe('scene', callback)
	}
	public async subscribeGroupStatus(callback): Promise<void> {
		return this.subscribe('group', callback)
	}
	public async subscribeContentTargetStatus(callback): Promise<void> {
		return this.subscribe('content_target', callback)
	}
	public async subscribeRemoteDeviceStatus(callback): Promise<void> {
		return this.subscribe('remote_device', callback)
	}
	public async subscribeBeacon(callback): Promise<void> {
		return this.subscribe('beacon', callback)
	}
	public async subscribeLua(callback): Promise<void> {
		return this.subscribe('lua', callback)
	}
	public async startTimeline(timelineNum: number) {
		return this.command('POST', '/api/timeline', { action: 'start', num: timelineNum })
	}
	public async startScene(sceneNum: number) {
		return this.command('POST', '/api/scene', { action: 'start', num: sceneNum })
	}
	public async releaseTimeline(timelineNum: number, fade?: number) {
		return this.command('POST', '/api/timeline', { action: 'release', num: timelineNum, fade: fade })
	}
	public async releaseScene(sceneNum: number, fade?: number) {
		return this.command('POST', '/api/scene', { action: 'release', num: sceneNum, fade: fade })
	}
	public async toggleTimeline(timelineNum: number, fade?: number) {
		return this.command('POST', '/api/timeline', { action: 'toggle', num: timelineNum, fade: fade })
	}
	public async toggleScene(sceneNum: number, fade?: number) {
		return this.command('POST', '/api/scene', { action: 'toggle', num: sceneNum, fade: fade })
	}
	public async pauseTimeline(timelineNum: number) {
		return this.command('POST', '/api/timeline', { action: 'pause', num: timelineNum })
	}
	public async resumeTimeline(timelineNum: number) {
		return this.command('POST', '/api/timeline', { action: 'resume', num: timelineNum })
	}
	public async pauseAll() {
		return this.command('POST', '/api/timeline', { action: 'pause' })
	}
	public async resumeAll() {
		return this.command('POST', '/api/timeline', { action: 'resume' })
	}
	public async releaseAllTimelines(group?: string | null, fade?: number) {
		return this.command('POST', '/api/timeline', { action: 'release', group: group, fade: fade })
	}
	public async releaseAllScenes(group?: string, fade?: number) {
		return this.command('POST', '/api/scene', { action: 'release', group: group, fade: fade })
	}
	public async releaseAll(group?: string, fade?: number) {
		return this.command('POST', '/api/release_all', { group: group, fade: fade })
	}
	public async setTimelineRate(timelineNum: number, rate: number) {
		return this.command('POST', '/api/timeline', { action: 'set_rate', num: timelineNum, rate: rate })
	}
	public async setTimelinePosition(timelineNum: number, position: number) {
		return this.command('POST', '/api/timeline', { action: 'set_position', num: timelineNum, position: position })
	}
	public async fireTrigger(triggerNum: number, vars?: Array<any>, testConditions?: boolean) {
		return this.command('POST', '/api/trigger', {
			num: triggerNum,
			var: (vars || []).join(','),
			conditions: !!testConditions,
		})
	}
	public async runCommand(input: string) {
		return this.command('POST', '/api/cmdline', {
			input: input,
		})
	}
	/**
	 * Master the intensity of a group (applied as a multiplier to output levels)
	 * @param groupNum
	 * @param level integer
	 * @param fade float
	 * @param delay float
	 */
	public async masterIntensity(groupNum: number, level: number, fade?: number, delay?: number) {
		return this.command('POST', '/api/group', {
			action: 'master_intensity',
			num: groupNum,
			level: level,
			fade: fade,
			delay: delay,
		})
	}
	/**
	 * VLC/VLC +: Master the intensity of a content target (applied as a multiplier to output levels)
	 * @param type type - of content target, 'primary', 'secondary', 'overlay_1', 'overlay_2'...
	 * @param level integer
	 * @param fade float
	 * @param delay float
	 */
	public async masterContentTargetIntensity(type: string, level: number, fade?: number, delay?: number) {
		return this.command('POST', '/api/content_target', {
			action: 'master_intensity',
			type: type,
			level: level,
			fade: fade,
			delay: delay,
		})
	}
	public async setGroupOverride(groupNum: number, options: RGBOptions) {
		const params: any = _.extend({}, options, {
			num: groupNum,
			target: 'group',
		})
		return this.command('PUT', '/api/override', params)
	}
	public async setFixtureOverride(fixtureNum: number, options: RGBOptions) {
		const params: any = _.extend({}, options, {
			num: fixtureNum,
			target: 'fixture',
		})
		return this.command('PUT', '/api/override', params)
	}
	public async clearGroupOverrides(groupNum?: number, fade?: number) {
		const params: any = {
			target: 'group',
		}
		if (groupNum !== undefined) params.num = groupNum
		if (fade !== undefined) params.fade = fade
		return this.command('DELETE', '/api/override', params)
	}
	public async clearFixtureOverrides(fixtureNum?: number, fade?: number) {
		const params: any = {
			target: 'fixture',
		}
		if (fixtureNum !== undefined) params.num = fixtureNum
		if (fade !== undefined) params.fade = fade
		return this.command('DELETE', '/api/override', params)
	}
	public async clearAllOverrides(fade?: number) {
		const params: any = {}
		if (fade !== undefined) params.fade = fade
		return this.command('DELETE', '/api/override', params)
	}
	public async enableOutput(protocol: Protocol) {
		return this.command('POST', '/api/output', { action: 'enable', protocol: protocol })
	}
	public async disableOutput(protocol: Protocol) {
		return this.command('POST', '/api/output', { action: 'disable', protocol: protocol })
	}
	public async setTextSlot(slot: string, value: string) {
		return this.command('PUT', '/api/text_slot', {
			name: slot,
			value: value,
		})
	}
	public async flashBeacon() {
		return this.command('POST', '/api/beacon')
	}
	public async parkChannel(universeKey: string, channelList: Array<number | string>, level: number) {
		return this.command('POST', '/api/channel', {
			universe: universeKey,
			channels: (channelList || []).join(','),
			level: level,
		})
	}
	public async unparkChannel(universeKey: string, channelList: Array<number | string>) {
		return this.command('DELETE', '/api/channel', {
			universe: universeKey,
			channels: (channelList || []).join(','),
		})
	}
	public async getLog() {
		return this.command('GET', '/api/log')
	}
	public async clearLog() {
		return this.command('DELETE', '/api/log')
	}
	/**
	 * power reboot
	 */
	public async resetHardware() {
		return this.command('POST', '/api/reset')
	}

	public setInternalPage(isInternal) {
		this._queryString = isInternal ? '?internal_page' : ''
	}
	public async request(id: string, params?: { [name: string]: any }): Promise<any> {
		const p = new Promise((resolve, reject) => {
			if (!this._requestPromises[id]) this._requestPromises[id] = []
			this._requestPromises[id].push({ resolve, reject })

			const json = { request: id }
			if (params) {
				for (const name in params) {
					json[name] = params[name]
				}
			}
			this._sendMessage(JSON.stringify(json)).catch((e) => {
				reject(e)
			})
		})

		return p
	}
	public async subscribe(id: string, callback: Function): Promise<void> {
		if (!this._broadcastCallbacks[id]) this._broadcastCallbacks[id] = []
		this._broadcastCallbacks[id].push(callback)

		const json = { subscribe: id }
		return this._sendMessage(JSON.stringify(json)).then(() => {
			return
		})
	}
	public async command(method: 'GET' | 'POST' | 'DELETE' | 'PUT', url0: string, data0?: { [key: string]: Primitives }) {
		return new Promise((resolve, reject) => {
			const url = `${this._options.ssl ? 'https' : 'http'}://${this._options.host}${url0}${this._queryString}`

			const data = {}
			if (data0) {
				_.each(data0, (value: any, key: string) => {
					if (value !== undefined && value !== null) {
						data[key] = value
					}
				})
			}
			let httpReq: GotRequestFunction
			switch (method) {
				case 'POST':
					httpReq = got.post
					break

				case 'PUT':
					httpReq = got.put
					break

				case 'GET':
					httpReq = got.get
					break

				case 'DELETE':
					httpReq = got.delete
					break

				default:
					reject(`Unknown method: "${method}"`)
					return
			}

			httpReq(url, { json: data })
				.then((response) => {
					if (response.statusCode === 400) {
						reject(new Error(`Error: [400]: Bad request`))
						// TODO: Maybe handle other response-codes?
					} else if (response.statusCode >= 200 && response.statusCode <= 299) {
						resolve(response.body)
					} else {
						reject(new Error(`Error: StatusCode: [${response.statusCode}]`))
					}
				})
				.catch((error) => {
					this.emit('error', new Error(`Error ${method}: ${error}`))
					reject(error)
				})
		})
	}

	private async _connectSocket(): Promise<void> {
		return new Promise((resolve, reject) => {
			const pathName = `${this._options.ssl ? 'wss:' : 'ws:'}//${this._options.host}/query${this._queryString}`

			this._socket = new WebSocket(pathName)
			this._socket.binaryType = 'arraybuffer'

			this.once('connected', () => {
				resolve()
			})
			this.once('error', (e) => {
				reject(e)
			})
			setTimeout(() => {
				reject(new Error('Connection timeout'))
			}, CONNECT_TIMEOUT)

			this._socket.on('open', () => {
				this._connectionChanged(true)

				this._reconnectAttempts = 0 // reset reconnection attempts
				if (this._socket) {
					while (this._pendingMessages.length) {
						const m = this._pendingMessages.shift()
						if (m) {
							this._socket.send(m.msg, (err) => {
								if (m) {
									if (err) m.reject(err)
									else m.resolve()
								}
							})
						}
					}
				}
				this._keepAlive = true
				this._replyReceived = true
				this._webSocketKeepAlive()
			})
			this._socket.on('message', (data, isBinary) => {
				// let data: WebSocket.Data = ev.data
				this._replyReceived = true
				if (isBinary) {
					// @ts-ignore data type
					const array = new Int32Array(data)
					if (this._serverSessionKey) {
						// need to compare primitives as two objects are never the same
						if (
							this._serverSessionKey[0] !== array[0] ||
							this._serverSessionKey[1] !== array[1] ||
							this._serverSessionKey[2] !== array[2] ||
							this._serverSessionKey[3] !== array[3]
						) {
							this.emit('restart')

							this._serverSessionKey = array
						}
					} else {
						this._serverSessionKey = array
					}
				} else {
					const json = JSON.parse(data.toString())
					this._onReceiveMessage(json)
				}
			})
			this._socket.on('error', (e) => {
				this._handleWebsocketReconnection(e)
			})
			this._socket.on('close', () => {
				// this._connectionChanged(false)
				this._handleWebsocketReconnection()
			})
		})
	}
	private async _sendMessage(msg: string): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this._socket && this._socket.readyState === this._socket.OPEN) {
				this._socket.send(msg, (err) => {
					if (err) reject(err)
					else resolve()
				})
			} else {
				this._pendingMessages.push({
					msg: msg,
					resolve: resolve,
					reject: reject,
				})
				if (!this._socket || this._socket.readyState !== this._socket.CONNECTING) {
					this._connectSocket().catch((err) => {
						this.emit('error', err)
					})
				}
			}
		})
	}
	private _webSocketKeepAlive() {
		// send a zero length message as a ping to keep the connection alive
		if (this._webSocketKeepAliveTimeout) {
			clearTimeout(this._webSocketKeepAliveTimeout) // to prevent multiple loops of pings
		}
		this._webSocketKeepAliveTimeout = null
		if (this._keepAlive) {
			if (this._replyReceived) {
				if (this._connected) {
					// we only have to ping if we think we're connected
					this._sendMessage('').catch((e) => this.emit('error', e))
				}

				this._webSocketKeepAliveTimeout = setTimeout(() => {
					this._webSocketKeepAlive()
				}, PING_TIMEOUT)
				this._replyReceived = false
			} else {
				// never got a reply, throw an error
				this._handleWebsocketReconnection(new Error('ping timeout'))
			}
		}
	}
	private _reconnect() {
		if (this._isConnecting) return // don't reconnect while a connect is already running

		if (!this._isReconnecting) {
			// try to _reconnect
			this._reconnectAttempts++
			this._isReconnecting = true
			this._connectSocket()
				.then(() => {
					this._isReconnecting = false
				})
				.catch((e) => {
					this._isReconnecting = false
					this.emit('error', e)

					// If the reconnection failed and another reconnection attempt was ignored, do that now instead:
					if (this._aboutToReconnect) {
						this._aboutToReconnect = false
						this._reconnect()
					}
				})
		} else {
			// Nothing, ignore if we're already trying to reconnect
			this._aboutToReconnect = true
		}
	}
	private _onReceiveMessage(json: any) {
		if (json.broadcast) {
			const bc = this._broadcastCallbacks[json.broadcast]
			if (bc) {
				if (bc.length) {
					_.each(bc, (fcn) => {
						fcn(json.data)
					})
				} else {
					this.emit('error', new Error(`no broadcastCallbacks found for ${json.broadcast}`))
				}
			} else {
				this.emit('error', new Error(`no broadcastCallbacks array found for ${json.broadcast}`))
			}
		} else if (json.request) {
			const rp = this._requestPromises[json.request]
			if (rp) {
				const p = rp.shift()
				if (p) {
					p.resolve(json.data)
				} else {
					this.emit('error', new Error(`no requestPromise found for ${json.request}`))
				}
			} else {
				this.emit('error', new Error(`no requestPromise array found for ${json.request}`))
			}
		} else if (json.redirect) {
			this.emit('error', `Redirect to ${json.redirect}`)
		} else {
			this.emit('error', `Unknown reply: ${json}`)
		}
	}
	private _handleWebsocketReconnection(e?: Error) {
		// Called when a socket connection is closed for whatever reason
		this._keepAlive = false
		this._socket = null

		this._connectionChanged(false)

		if (e) {
			if (this._reconnectAttempts === 0) {
				// Only emit error on first error
				this.emit('error', e)
			}
		}

		setTimeout(() => {
			this._reconnect()
		}, Math.min(60, this._reconnectAttempts) * 1000)
	}
	private _connectionChanged(connected: boolean) {
		if (this._connected !== connected) {
			this._connected = connected

			if (connected) {
				this.emit('connected')
			} else {
				this.emit('disconnected')
			}
		}
	}
}
