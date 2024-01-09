import { EventEmitter } from 'eventemitter3'
import OBSWebSocket, { OBSRequestTypes, OBSResponseTypes } from 'obs-websocket-js'

const RECONNECT_TIME = 5000

export enum OBSConnectionEvents {
	Connected = 'connected',
	Disconnected = 'disconnected',
	Error = 'error',
}
export interface OBSConnectionEventsTypes {
	[OBSConnectionEvents.Connected]: [void]
	[OBSConnectionEvents.Disconnected]: [void]
	[OBSConnectionEvents.Error]: [string, Error]
}

export class OBSConnection extends EventEmitter<OBSConnectionEventsTypes> {
	private _obs = new OBSWebSocket()

	private _url: string | undefined
	private _password: string | undefined
	private _reconnect_wait = 0
	private _reconnect_timeout: NodeJS.Timeout | undefined
	private _sceneItemMap = new Map<string, number>()

	connected = false
	error: string | undefined = undefined

	constructor() {
		super()

		this._obs.on('ConnectionClosed', () => {
			if (!this._reconnect_timeout) {
				this._reconnect_timeout = setTimeout(() => {
					this._attemptConnection()
				}, this._reconnect_wait)

				this._reconnect_wait = RECONNECT_TIME
			}
		})
	}

	connect(host: string, port: number, password?: string) {
		this._url = `ws://${host}:${port}`
		this._password = password

		this._attemptConnection()
	}

	private _attemptConnection() {
		this._reconnect_timeout = undefined
		if (!this._url) return

		this._obs
			.connect(this._url, this._password)
			.then(() => {
				this.connected = true
				this._reconnect_wait = 0
				if (this._reconnect_timeout) clearTimeout(this._reconnect_timeout)

				this._buildAndTrackSceneItemIDs()
					.catch((e) => {
						this.emit(OBSConnectionEvents.Error, 'Error trying to rebuild SceneItemID map', e)
					})
					.finally(() => {
						this.emit(OBSConnectionEvents.Connected)
					})
			})
			.catch((e) => {
				this.connected = false
				this.error = e.toString()
				this.emit(OBSConnectionEvents.Disconnected) // does this create too many events?
			})
	}

	disconnect() {
		this._url = undefined
		this._password = undefined

		if (this._reconnect_timeout) clearTimeout(this._reconnect_timeout)

		this._obs
			.disconnect()
			.then(() => {
				this.connected = false
				this.emit(OBSConnectionEvents.Disconnected)
			})
			.catch((e) => {
				this.emit(OBSConnectionEvents.Error, 'Error while disconnecting', e)
			})
	}

	async call<Type extends keyof OBSRequestTypes>(
		requestType: Type,
		requestData?: OBSRequestTypes[Type]
	): Promise<OBSResponseTypes[Type]> {
		// todo - OBS currently doesn't let use send play or pause commands if the media is stopped so we have a little hack in place
		if (
			requestType === 'TriggerMediaInputAction' &&
			(requestData as OBSRequestTypes['TriggerMediaInputAction'])?.inputName &&
			(requestData as OBSRequestTypes['TriggerMediaInputAction'])?.mediaAction !==
				'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP'
		) {
			const name = (requestData as OBSRequestTypes['TriggerMediaInputAction']).inputName
			// get the state first...
			const status = await this._obs.call('GetMediaInputStatus', { inputName: name })
			if (status.mediaState === 'OBS_MEDIA_STATE_STOPPED') {
				// restart it first
				await this._obs.call('TriggerMediaInputAction', {
					inputName: name,
					mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART',
				})
			}
		}
		return this._obs.call(requestType, requestData)
	}

	getSceneItemId(scene: string, input: string): number | undefined {
		return this._sceneItemMap.get(scene + '_' + input)
	}

	private async _buildAndTrackSceneItemIDs() {
		const sceneItemMap = new Map<string, number>()
		const scenes = await this._obs.call('GetSceneList')

		for (const scene of scenes.scenes) {
			const items = await this._obs.call('GetSceneItemList', { sceneName: scene.sceneName as string })

			for (const item of items.sceneItems) {
				sceneItemMap.set(scene.sceneName + '_' + item.sourceName, item.sceneItemId as number)
			}
		}

		this._sceneItemMap = sceneItemMap
	}
}
