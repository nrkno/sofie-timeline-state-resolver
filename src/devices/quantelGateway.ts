import * as request from 'request'
import { EventEmitter } from 'events'
import * as _ from 'underscore'
import { DoOnTime, SendMode } from '../doOnTime'

const CHECK_STATUS_INTERVAL = 3000
const CALL_TIMEOUT = 1000

export class QuantelGateway extends EventEmitter {

	private _gatewayUrl: string
	private _initialized: boolean = false
	private _ISAUrl: string
	private _zoneId: string
	private _serverId: number
	private _monitorInterval: NodeJS.Timer

	private _statusMessage: string | null = 'Initializing...' // null = all good
	private _cachedServer?: Q.ServerInfo | null

	// TMP, to be removed later:
	private _doOnTime: DoOnTime

	constructor () {
		super()

		this._doOnTime = new DoOnTime(() => {
			return Date.now()
		}, SendMode.IN_ORDER)
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

		this._zoneId = zoneId || 'default'
		this._serverId = serverId

		this._ISAUrl = ISAUrl.replace(/^https?:\/\//, '') // trim any https://

		// Connect to ISA:
		const response = await this.sendRaw('post', `connect/${encodeURIComponent(this._ISAUrl) }`, undefined)
		this._initialized = true
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
				return `Error when monitoring status: ${e.toString()}`
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
		}, CHECK_STATUS_INTERVAL)
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
		return this.sendBase('get', '')
	}
	public async getServers (zoneId: string): Promise<Q.ServerInfo[]> {
		return this.sendBase('get', `${zoneId}/server`)
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
			return await this.sendServer('get', `port/${portId}`)
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
	public async getClip (clipId: number): Promise<Q.ClipData> {
		return this.sendZone('get', `clip/${clipId}`)
	}
	public async searchClip (searchQuery: { Title: string }): Promise<Q.ClipDataSummary[]> {
		return this.sendZone('get', `clip?Title=${encodeURIComponent(searchQuery.Title)}`)
	}
	public async getClipFragments (clipId: number)
	public async getClipFragments (clipId: number, inPoint: number, outPoint: number) // Query fragments for a specific in-out range:
	public async getClipFragments (clipId: number, inPoint?: number, outPoint?: number): Promise<Q.ServerFragments> {
		if (inPoint !== undefined && outPoint !== undefined) {
			return this.sendZone('get', `clip/${clipId}/fragments/${inPoint}-${outPoint}`)
		} else {
			return this.sendZone('get', `clip/${clipId}/fragments`)
		}
	}
	/** Load specified fragments onto a port */
	public async loadFragmentsOntoPort (portId: string, fragments: Q.ServerFragments, offset?: number): Promise<Q.PortStatus> {
		if (offset !== undefined) {
			return this.sendServer('post', `port/${portId}/fragments?offset=${offset}`, fragments.fragments)
		} else {
			return this.sendServer('post', `port/${portId}/fragments`, fragments.fragments)
		}
	}
	/** Start playing on a port */
	public async portPlay (portId: string): Promise<any> {
		return this.sendServer('post', `port/${portId}/trigger/START`)
	}
	/** Stop (pause) playback on a port. If stopAtFrame is provided, the playback will stop at the frame specified. */
	public async portStop (portId: string, stopAtFrame?: number): Promise<any> {
		if (stopAtFrame !== undefined) {
			return this.sendServer('post', `port/${portId}/trigger/STOP?offset=${stopAtFrame}`)
		} else {
			return this.sendServer('post', `port/${portId}/trigger/STOP`)
		}
	}
	/** Jump directly to a frame, note that this might cause flicker on the output, as the frames haven't been preloaded  */
	public async portHardJump (portId: string, jumpToFrame?: number): Promise<any> {
		return this.sendServer('post', `port/${portId}/trigger/JUMP?offset=${jumpToFrame}`)
	}
	/** Prepare a jump to a frame (so that those frames are preloaded into memory) */
	public async portPrepareJump (portId: string, jumpToFrame?: number): Promise<any> {
		return this.sendServer('put', `port/${portId}/jump?offset=${jumpToFrame}`)
	}
	/** After having preloading a jump, trigger the jump */
	public async portTriggerJump (portId: string): Promise<any> {
		return this.sendServer('post', `port/${portId}/trigger/JUMP`)
	}
	public async portClear (portId: string) {
		// TODO: implement this
		// clear all fragments on a port, etc
		console.log('Quantel portClear not implemented yet')
		return this.portStop(portId)
	}

	private async sendServer (method: Methods, resource: string, bodyData?: object) {
		return this.sendZone(method, `server/${this._serverId}/${resource}`, bodyData)
	}
	private async sendZone (method: Methods, resource: string, bodyData?: object) {
		return this.sendBase(method, `${this._zoneId}/${resource}`, bodyData)
	}
	private async sendBase (method: Methods, resource: string, bodyData?: object) {
		if (!this._initialized) {
			throw new Error('Quantel not initialized yet')
		}
		return this.sendRaw(method, `${resource}`, bodyData)
	}
	private sendRaw (
		method: Methods,
		resource: string,
		bodyData?: object
	): Promise<any> {
		// This is a temporary implementation, to make the stuff run in order
		return new Promise((resolve, reject) => {
			this._doOnTime.queue(
				0, // run as soon as possible
				undefined,
				(method, resource, bodyData) => {
					return this.sendRaw2(method, resource, bodyData)
					.then(resolve)
					.catch(reject)
				},
				method,
				resource,
				bodyData
			)
		})
	}
	private sendRaw2 (
		method: Methods,
		resource: string,
		bodyData?: object
	): Promise<any> {
		return new Promise((resolve, reject) => {
			let requestMethod = request[method]
			if (requestMethod) {
				const url = this._gatewayUrl + '/' + resource
				// console.log('QUANTEL: ' + method + ' ' + url)
				// if (bodyData) console.log('bodyData', bodyData)
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
								// console.log('response.body', response.body)
								reject(e)
							}
						} else {
							try {
								reject(
									typeof response.body === 'string' ? JSON.parse(response.body) : response.body
								)
							} catch (e) {
								// console.log('response.body', response.body)
								reject(e)
							}
						}
					}
				)
			} else reject(`Unknown request method: "${method}"`)
		}).then(res => {
			// console.log('QUANTEL REPLY:', res)
			return res
		})
	}
}
type Methods = 'post' | 'get' | 'put' | 'delete'

// Note: These typings are a copied from https://github.com/nrkno/tv-automation-quantel-gateway
export namespace Q {

	export interface ZoneInfo {
		type: 'ZoneInfo',
		zoneNumber: number,
		zoneName: string,
		isRemote: boolean
	}

	export interface ServerInfo {
		type: 'ServerInfo',
		ident: number,
		down: boolean,
		name?: string,
		numChannels?: number,
		pools?: number[],
		portNames?: string[],
		chanPorts?: string[]
	}

	export interface PortRef {
		serverID: number | string,
		portName: string,
	}

	export interface PortInfo extends PortRef {
		type?: 'PortInfo',
		channelNo: number,
		portID?: number,
		audioOnly?: boolean,
		assigned?: boolean,
	}

	export interface PortStatus extends PortRef {
		type: 'PortStatus',
		portID: number,
		refTime: string,
		portTime: string,
		speed: number,
		offset: number,
		status: string,
		endOfData: number,
		framesUnused: number,
		outputTime: string,
		channels: number[],
	}

	export interface ReleaseStatus extends PortRef {
		type: 'ReleaseStatus',
		released: boolean
	}

	export interface ClipRef {
		clipID: number,
	}

	export interface FragmentRef extends ClipRef {
		start?: number,
		finish?: number,
	}

	export interface ClipPropertyList {
		[ name: string ]: string
	}

	export interface ClipDataSummary {
		type: string,
		ClipID: number,
		CloneID: number | null,
		Completed: Date | null,
		Created: Date, // ISO-formatted date
		Description: string,
		Frames: string, // TODO ISA type is None ... not sure whether to convert to number
		Owner: string,
		PoolID: number | null,
		Title: string,
	}

	export interface ClipData extends ClipDataSummary {
		Category: string,
		CloneZone: number | null,
		Destination: number | null,
		Expiry: Date | null, // ISO-formatted date
	 	HasEditData: number | null,
		Inpoint: number | null,
		JobID: number | null,
		Modified: string | null,
		NumAudTracks: number | null,
		Number: number | null,
		NumVidTracks: number | null,
		Outpoint: number | null,
		PlaceHolder: boolean,
		PlayAspect: string,
		PublishedBy: string,
		Register: string,
		Tape: string,
		Template: number | null,
		UnEdited: number | null,
		PlayMode: string,
		MosActive: boolean,
		Division: string,
		AudioFormats: string,
		VideoFormats: string,
		ClipGUID: string,
		Protection: string,
		VDCPID: string,
		PublishCompleted: Date | null, // ISO-formatted date
	}

	export interface ServerFragment {
		type: 'VideoFragment' | 'AudioFragment' | 'TimeCode',
		trackNum: number,
		start: number,
		end: number,
	}

	export interface VideoFragment extends ServerFragment {
		rushID: string,
		format: number,
		poolID: number,
		poolFrame: number,
		skew: number,
		rushFrame: number,
	}

	export interface AudioFragment extends VideoFragment { }
	export interface AUXFragment extends VideoFragment { }

	export interface CCFragment extends ServerFragment {
		ccID: string,
		ccType: number,
		effectID: number,
	}

	// TODO extend with the different types
	export interface ServerFragments extends ClipRef {
		type: 'ServerFragments',
		fragments: ServerFragment[]
	}

	export interface PortLoadInfo extends PortRef {
		fragments: ServerFragment[],
		offset?: number
	}

	export interface PortLoadStatus extends PortRef {
		type: string,
		fragmentCount: number,
		offset: number
	}

	export enum Trigger {
		START = 'START', // quantel.START
		STOP = 'STOP', // quantel.STOP
		JUMP = 'JUMP', // quantel.JUMP
		TRANSITION = 'TRANSITION' // quantel.TRANSITION
	}

	export interface TriggerInfo extends PortRef {
		trigger: Trigger,
		offset?: number
	}

	export interface TriggerResult extends TriggerInfo {
		type: string,
		success: boolean,
	}

	export interface JumpInfo extends PortRef {
		offset: number
	}

	export interface JumpResult extends JumpInfo {
		type: string,
		success: boolean,
	}

	export interface ThumbnailSize {
		width: number,
		height: number
	}

	export interface ThumbnailOrder extends ClipRef {
		offset: number,
		stride: number,
		count: number,
	}

	export interface ConnectionDetails {
		type: string,
		isaIOR: string | null,
		href: string,
	}

	export interface CloneRequest extends ClipRef {
		poolID: number,
		highPriority?: boolean
	}
}
