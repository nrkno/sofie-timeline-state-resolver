import { ThreadedClass, threadedClass, ThreadedClassConfig, ThreadedClassManager } from 'threadedclass'
import { Device } from './device'
import { DeviceType, DeviceOptionsBase } from 'timeline-state-resolver-types'
import { EventEmitter } from 'eventemitter3'

export type DeviceContainerEvents = {
	error: [context: string, err: Error]
}

/**
 * A device container is a wrapper around a device in ThreadedClass class, it
 * keeps a local property of some basic information about the device (like
 * names and id's) to prevent a costly round trip over IPC.
 */
export class DeviceContainer<TOptions extends DeviceOptionsBase<any>> extends EventEmitter<DeviceContainerEvents> {
	private _device: ThreadedClass<Device<TOptions>>
	private _deviceId = 'N/A'
	private _deviceType: DeviceType
	private _deviceName = 'N/A'
	private readonly _deviceOptions: TOptions
	private readonly _threadConfig: ThreadedClassConfig | undefined
	public onChildClose: () => void | undefined
	private _instanceId = -1
	private _startTime = -1
	private _onEventListeners: { stop: () => void }[] = []
	private _debugLogging = true
	private _initialized = false

	private constructor(deviceOptions: TOptions, threadConfig?: ThreadedClassConfig) {
		super()
		this._deviceOptions = deviceOptions
		this._threadConfig = threadConfig
		this._debugLogging = deviceOptions.debug || false
	}

	static async create<
		TOptions extends DeviceOptionsBase<unknown>,
		TCtor extends new (...args: any[]) => Device<TOptions>
	>(
		orgModule: string,
		orgClassExport: string,
		deviceId: string,
		deviceOptions: TOptions,
		getCurrentTime: () => number,
		threadConfig?: ThreadedClassConfig
	): Promise<DeviceContainer<TOptions>> {
		if (process.env.JEST_WORKER_ID !== undefined && threadConfig && threadConfig.disableMultithreading) {
			// running in Jest test environment.
			// hack: we need to work around the mangling performed by threadedClass, as getCurrentTime needs to not return a promise
			getCurrentTime = { inner: getCurrentTime } as any
		}

		const container = new DeviceContainer(deviceOptions, threadConfig)

		container._device = await threadedClass<Device<TOptions>, TCtor>(
			orgModule,
			orgClassExport,
			[deviceId, deviceOptions, getCurrentTime] as any, // TODO types
			threadConfig
		)

		if (deviceOptions.isMultiThreaded) {
			container._onEventListeners = [
				ThreadedClassManager.onEvent(container._device, 'thread_closed', () => {
					// This is called if a child crashes
					if (container.onChildClose) container.onChildClose()
				}),
				ThreadedClassManager.onEvent(container._device, 'error', (error) => {
					container.emit('error', `${orgClassExport} "${deviceId}" threadedClass error`, error)
				}),
			]
		}

		await container.reloadProps()

		return container
	}

	get initialized() {
		return this._initialized
	}

	public async init(initOptions: TOptions['options'], activeRundownPlaylistId: string | undefined): Promise<boolean> {
		if (this.initialized === true) {
			throw new Error(`Device ${this.deviceId} is already initialized`)
		}

		const res = await this._device.init(initOptions, activeRundownPlaylistId)
		this._initialized = true
		return res
	}

	public async reloadProps(): Promise<void> {
		this._deviceId = await this.device.deviceId
		this._deviceType = await this.device.deviceType
		this._deviceName = await this.device.deviceName
		this._instanceId = await this.device.instanceId
		this._startTime = await this.device.startTime
	}

	public async terminate() {
		if (this._onEventListeners) {
			this._onEventListeners.forEach((listener) => listener.stop())
		}
		await ThreadedClassManager.destroy(this._device)
	}

	public async setDebugLogging(debug: boolean): Promise<void> {
		this._debugLogging = debug
		await this._device.setDebugLogging(debug)
	}

	public get device(): ThreadedClass<Device<TOptions>> {
		return this._device
	}
	public get deviceId(): string {
		return this._deviceId
	}
	public get deviceType(): DeviceType {
		return this._deviceType
	}
	public get deviceName(): string {
		return this._deviceName
	}
	public get deviceOptions(): TOptions {
		return this._deviceOptions
	}
	public get threadConfig(): ThreadedClassConfig | undefined {
		return this._threadConfig
	}
	public get instanceId(): number {
		return this._instanceId
	}
	public get startTime(): number {
		return this._startTime
	}

	public get debugLogging(): boolean {
		return this._debugLogging
	}
}
