import * as request from 'request'
import { EventEmitter } from 'events'
import * as _ from 'underscore'
// import { DoOnTime, SendMode } from '../doOnTime'

const CHECK_STATUS_INTERVAL = 3000
const CALL_TIMEOUT = 1000

export class QuantelGateway extends EventEmitter {

	public checkStatusInterval: number = CHECK_STATUS_INTERVAL

	private _gatewayUrl: string
	private _initialized: boolean = false
	private _ISAUrl: string
	private _zoneId: string
	private _serverId: number
	private _monitorInterval: NodeJS.Timer

	private _statusMessage: string | null = 'Initializing...' // null = all good
	private _cachedServer?: Q.ServerInfo | null

	constructor () {
		super()
	}

	public async init (
		gatewayUrl: string,
		ISAUrl: string,
		zoneId: string | undefined,
		serverId: number
	): Promise<void> {
		this._gatewayUrl = (
			gatewayUrl
			.replace(/\/$/, '') // trim trailing slash
		)
		if (!this._gatewayUrl.match(/http/)) this._gatewayUrl = 'http://' + this._gatewayUrl

		// Connect to ISA:
		await this.connectToISA(ISAUrl)
		this._zoneId = zoneId || 'default'
		this._serverId = serverId

		// TODO: this is not implemented yet in Quantel gw:
		// const zones = await this.getZones()
		// const zone = _.find(zones, zone => zone.zoneName === this._zoneId)
		// if (!zone) throw new Error(`Zone ${this._zoneId} not found!`)

		const server = await this.getServer()
		if (!server) throw new Error(`Server ${this._serverId} not found!`)

		this._initialized = true
	}
	public async connectToISA (ISAUrl: string) {
		this._ISAUrl = ISAUrl.replace(/^https?:\/\//, '') // trim any https://
		return this._ensureGoodResponse(this.sendRaw('post', `connect/${encodeURIComponent(this._ISAUrl) }`, undefined))
	}
	public dispose () {
		clearInterval(this._monitorInterval)
	}
	public monitorServerStatus (callbackOnStatusChange: (connected: boolean, errorMessage: string | null) => void) {

		const getServerStatus = async (): Promise<string | null> => {
			try {
				if (!this._gatewayUrl) return `Gateway URL not set`

				if (!this._serverId) return `Server id not set`

				const servers = await this.getServers(this._zoneId)
				const server = _.find(servers, s => s.ident === this._serverId)

				if (!server) return `Server ${this._serverId} not present on ISA`
				if (server.down) return `Server ${this._serverId} is down`

				if (!this._initialized) return `Not initialized`

				return null // all good
			} catch (e) {
				return `Error when monitoring status: ${(e && e.message) || e.toString()}`
			}
		}
		const checkServerStatus = () => {
			getServerStatus()
			.then((statusMessage) => {
				if (statusMessage !== this._statusMessage) {
					this._statusMessage = statusMessage
					callbackOnStatusChange(statusMessage === null, statusMessage)
				}
			})
			.catch((e) => this.emit('error', e))
		}
		this._monitorInterval = setInterval(() => {
			checkServerStatus()
		}, this.checkStatusInterval)
		checkServerStatus() // also run one right away
	}
	public get connected (): boolean {
		return this._statusMessage === null
	}
	public get statusMessage (): string | null {
		return this._statusMessage
	}
	public get initialized (): boolean {
		return this._initialized
	}
	public get gatewayUrl (): string {
		return this._gatewayUrl
	}
	public get ISAUrl (): string {
		return this._ISAUrl
	}
	public get zoneId (): string {
		return this._zoneId
	}
	public get serverId (): number {
		return this._serverId
	}

	public async getZones (): Promise<Q.ZoneInfo[]> {
		return this._ensureGoodResponse(this.sendRaw('get', ''))
	}
	public async getServers (zoneId: string): Promise<Q.ServerInfo[]> {
		return this._ensureGoodResponse(this.sendRaw('get', `${zoneId}/server`))
	}
	/** Return the (possibly cached) server */
	public async getServer (): Promise<Q.ServerInfo | null> {
		if (this._cachedServer !== undefined) return this._cachedServer

		const servers = await this.getServers(this._zoneId)
		const server = _.find(servers, (server) => {
			return server.ident === this._serverId
		}) || null
		this._cachedServer = server
		return server
	}

	/** Create a port and connect it to a channel */
	public async getPort (portId: string): Promise<Q.PortStatus | null> {
		try {
			return this.sendServer('get', `port/${portId}`)
		} catch (e) {
			if (e.status === 404) return null
			throw e
		}
	}
	public async createPort (portId: string, channelId: number): Promise<Q.PortInfo> {
		return this.sendServer('put', `port/${portId}/channel/${channelId}`)
	}
	public async releasePort (portId: string): Promise<Q.ReleaseStatus> {
		return this.sendServer('delete', `port/${portId}`)
	}

	/** Get info about a clip */
	public async getClip (clipId: number): Promise<Q.ClipData | null> {
		try {
			return this.sendZone('get', `clip/${clipId}`) as Promise<Q.ClipData>
		} catch (e) {
			if (e.status === 404) return null
			throw e
		}
	}
	public async searchClip (searchQuery: { Title: string }): Promise<Q.ClipDataSummary[]> {
		return this.sendZone('get', `clip`, {
			Title: searchQuery.Title
		})
	}
	public async getClipFragments (clipId: number): Promise<Q.ServerFragments>
	public async getClipFragments (clipId: number, inPoint: number, outPoint: number): Promise<Q.ServerFragments> // Query fragments for a specific in-out range:
	public async getClipFragments (clipId: number, inPoint?: number, outPoint?: number): Promise<Q.ServerFragments> {
		if (inPoint !== undefined && outPoint !== undefined) {
			return this.sendZone('get', `clip/${clipId}/fragments/${inPoint}-${outPoint}`)
		} else {
			return this.sendZone('get', `clip/${clipId}/fragments`)
		}
	}
	/** Load specified fragments onto a port */
	public async loadFragmentsOntoPort (portId: string, fragments: Q.ServerFragmentTypes[], offset?: number): Promise<Q.PortLoadStatus> {
		return this.sendServer('post', `port/${portId}/fragments`, {
			offset: offset
		}, fragments)
	}
	/** Query the port for which fragments are loaded. */
	public async getFragmentsOnPort (portId: string, rangeStart?: number, rangeEnd?: number): Promise<Q.ServerFragments> {
		return this.sendServer('get', `port/${portId}/fragments`, {
			start: rangeStart,
			finish: rangeEnd
		})
		// /:zoneID/server/:serverID/port/:portID/fragments(?start=:start&finish=:finish)
	}
	/** Start playing on a port */
	public async portPlay (portId: string): Promise<Q.TriggerResult> {
		const response = await this.sendServer('post', `port/${portId}/trigger/START`) as Q.TriggerResult
		if (!response.success) throw Error(`Quantel trigger start: Server returned success=${response.success}`)
		return response
	}
	/** Stop (pause) playback on a port. If stopAtFrame is provided, the playback will stop at the frame specified. */
	public async portStop (portId: string, stopAtFrame?: number): Promise<Q.TriggerResult> {
		const response = await this.sendServer('post', `port/${portId}/trigger/STOP`, {
			offset: stopAtFrame
		}) as Q.TriggerResult
		if (!response.success) throw Error(`Quantel trigger stop: Server returned success=${response.success}`)
		return response
	}
	/** Jump directly to a frame, note that this might cause flicker on the output, as the frames haven't been preloaded  */
	public async portHardJump (portId: string, jumpToFrame?: number): Promise<Q.JumpResult> {
		const response = await this.sendServer('post', `port/${portId}/trigger/JUMP`, {
			offset: jumpToFrame
		}) as Q.JumpResult
		if (!response.success) throw Error(`Quantel hard jump: Server returned success=${response.success}`)
		return response
	}
	/** Prepare a jump to a frame (so that those frames are preloaded into memory) */
	public async portPrepareJump (portId: string, jumpToFrame?: number): Promise<Q.JumpResult> {
		const response = await this.sendServer('put', `port/${portId}/jump`, {
			offset: jumpToFrame
		}) as Q.JumpResult
		if (!response.success) throw Error(`Quantel prepare jump: Server returned success=${response.success}`)
		return response
	}
	/** After having preloading a jump, trigger the jump */
	public async portTriggerJump (portId: string): Promise<Q.TriggerResult> {
		const response = await this.sendServer('post', `port/${portId}/trigger/JUMP`) as Q.TriggerResult
		if (!response.success) throw Error(`Quantel trigger jump: Server returned success=${response.success}`)
		return response
	}
	/** Clear all fragments from a port.
	 * If offsetIn and offsetOut is provided, will clear the fragments for that time range
	 */
	public async portClear (portId: string, rangeStart?: number, rangeEnd?: number): Promise<Q.WipeResult> {
		const response = await this.sendServer('delete', `port/${portId}/fragments`, {
			start: rangeStart,
			finish: rangeEnd
		}) as Q.WipeResult
		if (!response.wiped) throw Error(`Quantel clear port: Server returned wiped=${response.wiped}`)
		return response
	}

	private async sendServer (method: Methods, resource: string, queryParameters?: QueryParameters, bodyData?: object) {
		return this.sendZone(method, `server/${this._serverId}/${resource}`, queryParameters, bodyData)
	}
	private async sendZone (method: Methods, resource: string, queryParameters?: QueryParameters, bodyData?: object) {
		return this.sendBase(method, `${this._zoneId}/${resource}`, queryParameters, bodyData)
	}
	private async sendBase (method: Methods, resource: string, queryParameters?: QueryParameters, bodyData?: object) {
		if (!this._initialized) {
			throw new Error('Quantel not initialized yet')
		}
		return this._ensureGoodResponse(this.sendRaw(method, `${resource}`, queryParameters, bodyData))
	}
	// private sendRaw (
	// 	method: Methods,
	// 	resource: string,
	// 	queryParameters?: QueryParameters,
	// 	bodyData?: object
	// ): Promise<any> {

	// 	// This is a temporary implementation, to make the stuff run in order
	// 	return new Promise((resolve, reject) => {
	// 		this._doOnTime.queue(
	// 			0, // run as soon as possible
	// 			undefined,
	// 			(method, resource, bodyData) => {
	// 				return this.sendRaw2(method, resource, queryParameters, bodyData)
	// 				.then(resolve)
	// 				.catch(reject)
	// 			},
	// 			method,
	// 			resource,
	// 			bodyData
	// 		)
	// 	})
	// }
	private sendRaw (
		method: Methods,
		resource: string,
		queryParameters?: QueryParameters,
		bodyData?: object
	): Promise<any> {
		return new Promise((resolve, reject) => {
			let requestMethod = request[method]
			if (requestMethod) {
				const url = this.urlQuery(this._gatewayUrl + '/' + resource, queryParameters)

				requestMethod(
					url,
					{
						json: bodyData,
						timeout: CALL_TIMEOUT
					},
					(error, response) => {
						if (error) {
							reject(`Quantel Gateway error ${error}`)
						} else if (response.statusCode === 200) {
							try {
								resolve(
									typeof response.body === 'string' ? JSON.parse(response.body) : response.body
								)
							} catch (e) {
								reject(e)
							}
						} else {
							try {
								reject(
									typeof response.body === 'string' ? JSON.parse(response.body) : response.body
								)
							} catch (e) {
								reject(e)
							}
						}
					}
				)
			} else reject(`Unknown request method: "${method}"`)
		}).then(res => {
			return res
		})
	}
	private urlQuery (url: string, params: QueryParameters = {}): string {
		let queryString = _.compact(
			_.map(params, (value, key: string) => {
				if (value !== undefined) {
					return `${key}=${encodeURIComponent(value.toString())}`
				}
				return null
			})
		).join('&')
		return url + (queryString ? `?${queryString}` : '')
	}
	/**
	 * If the response is an error, instead throw the error instead of returning it
	 */
	private async _ensureGoodResponse<T extends Promise<any>> (pResponse: T): Promise<T>
	private async _ensureGoodResponse<T extends Promise<any>> (pResponse: T, if404ThenNull: true): Promise<T | null>
	private async _ensureGoodResponse<T extends Promise<any>> (pResponse: T, if404ThenNull?: boolean): Promise<T | null> {
		const response = await pResponse
		if (
			response &&
			_.isObject(response) &&
			response.status &&
			_.isNumber(response.status) &&
			_.isString(response.message) &&
			_.isString(response.stack) &&
			response.status !== 200
		) {
			if (response.status === 404) {
				if (if404ThenNull) {
					return null
				}
				if ((response.message || '').match(/Not found\. Request/)) {
					throw new Error(`${response.status} ${response.message}\n${response.stack}`)
				} else {
					return response
				}
			} else {
				throw new Error(`${response.status} ${response.message}\n${response.stack}`)
			}
		}
		return response
	}
}
type QueryParameters = {[key: string]: string | number | undefined}
type Methods = 'post' | 'get' | 'put' | 'delete'

// Note: These typings are a copied from https://github.com/nrkno/tv-automation-quantel-gateway
export namespace Q {
	type DateString = string // it's a string with an ISO-date in it

	export interface ZoneInfo {
		type: 'ZonePortal'
		zoneNumber: number
		zoneName: string
		isRemote: boolean
	}

	export interface ServerInfo {
		type: 'Server'
		ident: number
		down: boolean
		name?: string
		numChannels?: number
		pools?: number[]
		portNames?: string[]
		chanPorts?: string[]
	}

	export interface PortRef {
		serverID: number | string
		portName: string
	}

	export interface PortInfo extends PortRef {
		type?: 'PortInfo'
		channelNo: number
		portID?: number
		audioOnly?: boolean
		assigned?: boolean
	}

	export interface PortStatus extends PortRef {
		type: 'PortStatus'
		portID: number
		refTime: string
		portTime: string
		speed: number
		offset: number
		status: string
		endOfData: number
		framesUnused: number
		outputTime: string
		channels: number[]
	}

	export interface ReleaseStatus extends PortRef {
		type: 'ReleaseStatus'
		released: boolean
	}

	export interface ClipRef {
		clipID: number
	}

	export interface FragmentRef extends ClipRef {
		start?: number
		finish?: number
	}

	export interface PortFragmentRef extends PortRef {
		start?: number
		finish?: number
	}

	export interface ClipPropertyList {
		[ name: string ]: string
	}

	export interface ClipDataSummary {
		type: 'ClipDataSummary' | 'ClipData'
		ClipID: number
		CloneID: number | null
		Completed: DateString | null
		Created: DateString, // ISO-formatted date
		Description: string
		Frames: string, // TODO ISA type is None ... not sure whether to convert to number
		Owner: string
		PoolID: number | null
		Title: string
	}

	export interface ClipData extends ClipDataSummary {
		type: 'ClipData'
		Category: string
		CloneZone: number | null
		Destination: number | null
		Expiry: DateString | null, // ISO-formatted date
	 	HasEditData: number | null
		Inpoint: number | null
		JobID: number | null
		Modified: string | null
		NumAudTracks: number | null
		Number: number | null
		NumVidTracks: number | null
		Outpoint: number | null
		PlaceHolder: boolean
		PlayAspect: string
		PublishedBy: string
		Register: string
		Tape: string
		Template: number | null
		UnEdited: number | null
		PlayMode: string
		MosActive: boolean
		Division: string
		AudioFormats: string
		VideoFormats: string
		ClipGUID: string
		Protection: string
		VDCPID: string
		PublishCompleted: DateString | null, // ISO-formatted date
	}

	export interface ServerFragment {
		type: string
		trackNum: number
		start: number
		finish: number
	}
	export type ServerFragmentTypes =
		VideoFragment |
		AudioFragment |
		AUXFragment |
		CCFragment |
		TimecodeFragment |
		EffectFragment

	interface PositionData extends ServerFragment {
		rushID: string
		format: number
		poolID: number
		poolFrame: number
		skew: number
		rushFrame: number
	}

	export interface VideoFragment extends PositionData {
		type: 'VideoFragment'
	}

	export interface AudioFragment extends PositionData {
		type: 'AudioFragment'
	}

	export interface AUXFragment extends PositionData {
		type: 'AUXFragment'
	}

	export interface CCFragment extends ServerFragment {
		type: 'CCFragment'
		ccID: string
		ccType: number
		effectID: number
	}
	export interface EffectFragment extends ServerFragment {
		type: 'EffectFragment'
		effectID: number
	}

	export interface TimecodeFragment extends ServerFragment {
		startTimecode: string
		userBits: number
	}

	// TODO extend with the different types
	export interface ServerFragments extends ClipRef {
		type: 'ServerFragments'
		fragments: ServerFragmentTypes[]
	}

	export interface PortServerFragments extends ServerFragments, PortRef {
		clipID: -1
	}

	export interface PortLoadInfo extends PortRef {
		fragments: ServerFragmentTypes[]
		offset?: number
	}

	export interface PortLoadStatus extends PortRef {
		type: 'PortLoadStatus'
		fragmentCount: number
		offset: number
	}

	export enum Trigger {
		START = 'START', // quantel.START
		STOP = 'STOP', // quantel.STOP
		JUMP = 'JUMP', // quantel.JUMP
		TRANSITION = 'TRANSITION' // quantel.TRANSITION
	}

	export interface TriggerInfo extends PortRef {
		trigger: Trigger
		offset?: number
	}

	export interface TriggerResult extends TriggerInfo {
		type: 'TriggerResult'
		success: boolean
	}

	export interface JumpInfo extends PortRef {
		offset: number
	}

	export interface JumpResult extends JumpInfo {
		type: 'HardJumpResult' | 'TriggeredJumpResult'
		success: boolean
	}

	export interface ThumbnailSize {
		width: number
		height: number
	}

	export interface ThumbnailOrder extends ClipRef {
		offset: number
		stride: number
		count: number
	}

	export interface ConnectionDetails {
		type: string
		isaIOR: string | null
		href: string
	}

	export interface CloneRequest extends ClipRef {
		poolID: number
		highPriority?: boolean
	}

	export interface WipeInfo extends PortRef {
		start?: number
		frames?: number
	}

	export interface WipeResult extends WipeInfo {
		type: 'WipeResult'
		wiped: boolean
	}
}
