import * as WebSocket from 'ws'
import { EventEmitter } from 'events'
import * as request from 'request'
import * as _ from 'underscore'

/**
 * Note: This work is derived from
 * http://www.pharoscontrols.com/assets/documentation/manuals/Pharos%20Designer%202%20User%20Manual%20-%20A4.pdf
 */

// This should probably be moved into it's own library

type Primitives = string | number | boolean | null | undefined
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
		source_bus: 'internal' | 'timecode_1' | 'timecode_2' | 'timecode_3' | 'timecode_4' | 'timecode_5' | 'timecode_6' | 'audio_1' | 'audio_2' | 'audio_3' | 'audio_4'
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
export interface ContentTargetInfo {

}
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
	remote_devices: Array<any>
}
export interface Temperature {
	temp: {
		ambient_temp: number
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
		disabled: boolean,
		name: string,
		type: number,
		universes: Array<{
			key: {
				kinet_port: 1,
				kinet_power_supply_num: 1
			}
			name: string
		}>
	}>
}
export interface Output {
	channels: Array<number>
	disabled: boolean
	proxied_?: string
	tpc_name?: string
}
export interface LuaVariables {

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
enum Protocol {
	DMX = 'dmx',
	PATHPORT = 'pathport',
	ARTNET = 'art-net',
	KINET = 'kinet',
	SACN = 'sacn',
	DVI = 'dvi',
	RIODMX = 'rio-dmx'
}

/**
 * Implementation of the Pharos V2 http API
 */
export class Pharos extends EventEmitter {
	private _socket: WebSocket | null

	private _keepAlive: boolean = false
	private _replyReceived: boolean = false
	private _queryString: string = ''
	private _serverSessionKey: string | null = null
	private _reconnectAttempts: number = 0
	private _pendingMessages: Array<{msg: string, resolve: Function, reject: Function}> = []
	private _requestPromises: {[id: string]: Array<{resolve: Function, reject: Function}>} = {}
	private _broadcastCallbacks: {[id: string]: Array<Function>} = {}

	private _options: Options
	private _connected: boolean = false

	// constructor () {}
	connect (options: Options) {
		return this._connectSocket(options)
	}

	public get connected (): boolean {
		return this._connected
	}
	public dispose () {
		if (this._socket) this._socket.close()

		_.each(this._requestPromises, (rp, id) => {
			_.each(rp, (promise) => {
				promise.reject('Disposing')
			})
			delete this._requestPromises[id]
		})

		_.each(this._broadcastCallbacks, (_fcns, id) => {
			delete this._broadcastCallbacks[id]
		})

		this._connectionChanged(false)
	}

	public getSystemInfo (): Promise<SystemInfo> {
		return this.request('system')
	}
	public getProjectInfo (): Promise<ProjectInfo> {
		return this.request('project')
	}
	public getCurrentTime (): Promise<CurrentTime> {
		return this.request('current_time')
	}
	/**
	 * @param params Example: { num: '1,2,5-9' }
	 */
	public getTimelineInfo (params?: {num?: string}): Promise<TimelineInfo> {
		return this.request('timeline', params)
	}
	/**
	 * @param params Example: { num: '1,2,5-9' }
	 */
	public getSceneInfo (params?: {num?: string}): Promise<SceneInfo> {
		return this.request('scene', params)
	}
	/**
	 * @param params Example: { num: '1,2,5-9' }
	 */
	public getGroupInfo (params?: {num?: string}): Promise<GroupInfo> {
		return this.request('group', params)
	}
	public getContentTargetInfo (): Promise<ContentTargetInfo> {
		return this.request('content_target')
	}
	public getControllerInfo (): Promise<ControllerInfo> {
		return this.request('controller')
	}
	public getRemoteDeviceInfo (): Promise<RemoteDeviceInfo> {
		return this.request('remote_device')
	}
	public getTemperature (): Promise<Temperature> {
		return this.request('temperature')
	}
	public getFanSpeed (): Promise<FanSpeed> {
		return this.request('fan_speed')
	}
	public getTextSlot (params?: any): Promise<TextSlot> {
		return this.request('text_slot', params)
	}
	public getProtocols (): Promise<Protocols> {
		return this.request('protocol')
	}
	/**
	 * @param key {universe?: universeKey} Example: "dmx:1", "rio-dmx:rio44:1" // DMX, Pathport, sACN and Art-Net, protocol:kinetPowerSupplyNum:kinetPort for KiNET and protocol:remoteDeviceType:remoteDeviceNum for RIO DMX
	 */
	public getOutput (key?: {universe?: string}): Promise<Output> {
		return this.request('output', {
			universe: key
		})
	}
	public getLuaVariables (vars): Promise<LuaVariables> {
		return this.request('lua', { 'variables' : vars })
	}
	public getTriggers (vars): Promise<Triggers> {
		return this.request('trigger', vars)
	}
	public subscribeTimelineStatus (callback) {
		return this.subscribe('timeline', callback)
	}
	public subscribeSceneStatus (callback) {
		return this.subscribe('scene', callback)
	}
	public subscribeGroupStatus (callback) {
		return this.subscribe('group', callback)
	}
	public subscribeContentTargetStatus (callback) {
		return this.subscribe('content_target', callback)
	}
	public subscribeRemoteDeviceStatus (callback) {
		return this.subscribe('remote_device', callback)
	}
	public subscribeBeacon (callback) {
		return this.subscribe('beacon', callback)
	}
	public subscribeLua (callback) {
		return this.subscribe('lua', callback)
	}
	public startTimeline (timelineNum: number) {
		return this.command('POST', '/api/timeline', 	{ action: 'start', num: timelineNum })
	}
	public startScene (sceneNum: number) {
		return this.command('POST', '/api/scene', 		{ action: 'start', num: sceneNum })
	}
	public releaseTimeline (timelineNum: number, fade?: number) {
		return this.command('POST', '/api/timeline', 	{ action: 'release', num: timelineNum, fade: fade })
	}
	public releaseScene (sceneNum: number, fade?: number) {
		return this.command('POST', '/api/scene', 		{ action: 'release', num: sceneNum, fade: fade })
	}
	public toggleTimeline (timelineNum: number, fade?: number) {
		return this.command('POST', '/api/timeline', 	{ action: 'toggle', num: timelineNum, fade: fade })
	}
	public toggleScene (sceneNum: number, fade?: number) {
		return this.command('POST', '/api/scene', 		{ action: 'toggle', num: sceneNum, fade: fade })
	}
	public pauseTimeline (timelineNum: number) {
		return this.command('POST', '/api/timeline', 	{ action: 'pause', num: timelineNum })
	}
	public resumeTimeline (timelineNum: number) {
		return this.command('POST', '/api/timeline', 	{ action: 'resume', num: timelineNum })
	}
	public pauseAll () {
		return this.command('POST', '/api/timeline', { action : 'pause' })
	}
	public resumeAll () {
		return this.command('POST', '/api/timeline', { action : 'resume' })
	}
	public releaseAllTimelines (group?: string | null, fade?: number) {
		return this.command('POST', '/api/timeline', 	{ action: 'release', group: group, fade: fade })
	}
	public releaseAllScenes (group?: string, fade?: number) {
		return this.command('POST', '/api/scene', 		{ action: 'release', group: group, fade: fade })
	}
	public releaseAll (group?: string, fade?: number) {
		return this.command('POST', '/api/release_all',	{ group: group, fade: fade })
	}
	public setTimelineRate (timelineNum: number, rate: number) {
		return this.command('POST', '/api/timeline', { action: 'set_rate', num: timelineNum, rate: rate })
	}
	public setTimelinePosition (position: number) {
		return this.command('POST', '/api/timeline', { action: 'set_position', position: position })
	}
	public fireTrigger (params: any = {}) {
		return this.command('POST', '/api/trigger', params)
	}
	public runCommand (params: any = {}) {
		return this.command('POST', '/api/cmdline', params)
	}
	/**
	 * Master the intensity of a group (applied as a multiplier to output levels)
	 * @param groupNum
	 * @param level integer
	 * @param fade float
	 * @param delay float
	 */
	public masterIntensity (groupNum: number, level: number, fade?: number, delay?: number) {
		return this.command('POST', '/api/group', {
			action: 'master_intensity',
			num: groupNum,
			level: level,
			fade: fade,
			delay: delay
		})
	}
	/**
	 * VLC/VLC +: Master the intensity of a content target (applied as a multiplier to output levels)
	 * @param type type - of content target, 'primary', 'secondary', 'overlay_1', 'overlay_2'...
	 * @param level integer
	 * @param fade float
	 * @param delay float
	 */
	public masterContentTargetIntensity (type: string, level: number, fade?: number, delay?: number) {
		return this.command('POST', '/api/content_target', {
			action: 'master_intensity',
			type: type,
			level: level,
			fade: fade,
			delay: delay
		})
	}
	public setGroupOverride (params: any = {}) {
		params.target = 'group'
		return this.command('PUT', '/api/override', params)
	}
	public setFixtureOverride (params: any = {}) {
		params.target = 'fixture'
		return this.command('PUT', '/api/override', params)
	}
	public clearGroupOverrides (params: any = {}) {
		params.target = 'group'
		return this.command('DELETE', '/api/override', params)
	}
	public clearFixtureOverrides (params: any = {}) {
		params.target = 'fixture'
		return this.command('DELETE', '/api/override', params)
	}
	public clearAllOverrides (params: any = {}) {
		delete params.num
		return this.command('DELETE', '/api/override', params)
	}
	public enableOutput (protocol: Protocol) {
		return this.command('POST', '/api/output', { action: 'enable', protocol: protocol })
	}
	public disableOutput (protocol: Protocol) {
		return this.command('POST', '/api/output', { action: 'disable', protocol: protocol })
	}
	public setTextSlot (params: any = {}) {
		return this.command('PUT', '/api/text_slot', params)
	}
	public toggleBeacon () {
		return this.command('POST', '/api/beacon')
	}
	public parkChannel (params: any = {}) {
		return this.command('POST', '/api/channel', params)
	}
	public unparkChannel (params: any = {}) {
		return this.command('DELETE', '/api/channel', params)
	}
	public clearLog () {
		return this.command('DELETE', '/api/log')
	}
	/**
	 * power reboot
	 */
	public resetHardware () {
		return this.command('POST', '/api/reset')
	}

	public setInternalPage (isInternal) {
		this._queryString = (isInternal ? '?internal_page' : '')
	}
	public request (id: string, params?: {[name: string]: any}): Promise<any> {

		let p = new Promise((resolve, reject) => {
			if (!this._requestPromises[id]) this._requestPromises[id] = []
			this._requestPromises[id].push({ resolve, reject })

			let json = { 'request' : id }
			if (params) {
				for (let name in params) {
					json[name] = params[name]
				}
			}
			this._sendMessage(JSON.stringify(json))
			.catch(e => {
				reject(e)
			})
		})

		return p

	}
	public subscribe (id: string, callback: Function): Promise<void> {
		if (!this._broadcastCallbacks[id]) this._broadcastCallbacks[id] = []
		this._broadcastCallbacks[id].push(callback)

		let json = { 'subscribe' : id }
		return this._sendMessage(JSON.stringify(json))
		.then(() => {
			return
		})
	}
	public command (method: 'GET' | 'POST' | 'DELETE' | 'PUT', url0: string, data0?: {[key: string]: Primitives}) {
		return new Promise((resolve, reject) => {

			let url = `${this._options.ssl ? 'https' : 'http'}://${this._options.host}${url0}${this._queryString}`

			let data = {}
			if (data0) {
				_.each(data0, (value: any, key: string) => {
					if (value !== undefined && value !== null) {
						data[key] = value
					}
				})
			}
			let handleResponse = (error, response) => {
				if (error) {
					this.emit('error', new Error(`Error ${method}: ${error}`))
					reject(error)
				} else if (response.statusCode === 400) {
					reject(new Error(`Error: [400]: Bad request`))
				} else {
					resolve(response.statusCode)
				}
			}
			if (method === 'POST') {
				request.post(
					url,
					{ json: data },
					handleResponse
				)
			} else if (method === 'PUT') {
				request.put(
					url,
					{ json: data },
					handleResponse
				)
			} else if (method === 'GET') {
				request.get(
					url,
					{ json: data },
					handleResponse
				)
			} else if (method === 'DELETE') {
				request.delete(
					url,
					{ json: data },
					handleResponse
				)
			} else {
				reject(`Unknown method: "${method}"`)
			}
		})
	}

	private _connectSocket (options?: Options) {
		if (options) {
			this._options = options
		}

		return new Promise((resolve, reject) => {

			let pathName = `${this._options.ssl ? 'wss:' : 'ws:'}//${this._options.host}/query${this._queryString}`

			this._socket = new WebSocket(pathName)
			this._socket.binaryType = 'arraybuffer'

			this.once('connected', () => {
				resolve()
			})
			setTimeout(() => {
				reject(new Error('Connection timeout'))
			}, 3000)

			this._socket.on('open', () => {
				this._connectionChanged(true)

				this._reconnectAttempts = 0 // reset reconnection attempts
				if (this._socket) {
					while (this._pendingMessages.length) {
						let m = this._pendingMessages.shift()
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
			this._socket.on('message', (data) => {
				// let data: WebSocket.Data = ev.data
				this._replyReceived = true
				if (typeof data === 'object') {
					// @ts-ignore data type
					let array = new Int32Array(data)
					if (this._serverSessionKey) {
						// need to compare primitives as two objects are never the same
						if ((this._serverSessionKey[0] !== array[0]) ||
							(this._serverSessionKey[1] !== array[1]) ||
							(this._serverSessionKey[2] !== array[2]) ||
							(this._serverSessionKey[3] !== array[3])
						) {
							this.emit('restart')

							this._serverSessionKey = array
						}
					} else {
						this._serverSessionKey = array
					}
				} else {
					let json = JSON.parse(data)
					this._onReceiveMessage(json)
				}
			})
			this._socket.on('error', (e) => {
				this._handleWebsocketError(e)
			})
			this._socket.on('close', () => {
				this._connectionChanged(false)
			})
		})

	}
	private _sendMessage (msg: string): Promise<void> {
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
					reject: reject
				})
				if (!this._socket || this._socket.readyState !== this._socket.CONNECTING) {
					this._connectSocket()
					.catch((err) => {
						this.emit('error', err)
					})
				}
			}
		})
	}
	private _webSocketKeepAlive () {
		// send a zero length message as a ping to keep the connection alive
		if (this._keepAlive) {
			if (this._replyReceived) {
				this._sendMessage('')
				.catch(e => this.emit('error', e))

				setTimeout(() => {
					this._webSocketKeepAlive()
				}, 10 * 1000)
				this._replyReceived = false
			} else {
				// never got a reply, throw an error
				this._handleWebsocketError(new Error('ping timeout'))
			}
		}
	}
	private _reconnect () {
		// try to _reconnect
		this._reconnectAttempts++
		this._connectSocket()
		.catch(e => this.emit('error', e))
	}
	private _onReceiveMessage (json: any) {
		if (json.broadcast) {
			let bc = this._broadcastCallbacks[json.broadcast]
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
			let rp = this._requestPromises[json.request]
			if (rp) {
				let p = rp.shift()
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
		}
	}
	private _handleWebsocketError (e) {
		this._keepAlive = false
		this._socket = null

		this._connectionChanged(false)

		if (this._reconnectAttempts === 0) { // Only emit error on first error
			this.emit('error', e)
		}
		setTimeout(() => {
			this._reconnect()
		}, Math.min(60, this._reconnectAttempts) * 1000)
	}
	private _connectionChanged (connected: boolean) {
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
// Test it:
// async function aaa () {
// 	let ph = new Pharos()

// 	await ph.connect({
// 		host: '10.0.1.251'
// 	})
// 	console.log('connected!')

// 	console.log('subscribeSceneStatus', await ph.subscribeSceneStatus((data) => {
// 		console.log('sub data', data)
// 	}))

// 	console.log('subscribed')

// 	// console.log('toggleScene', await ph.startScene(1))

// 	// await ph.toggleScene(1)

// 	// await ph.toggleScene(2)
// 	// await ph.toggleScene(2)

// }

// aaa()
// .then(console.log)
// .catch(console.log)
