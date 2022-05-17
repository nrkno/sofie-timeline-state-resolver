import { ThreadedClass, threadedClass, ThreadedClassConfig, ThreadedClassManager } from 'threadedclass'
import { AbstractDevice } from './device'
import { DeviceType, DeviceOptionsBase } from 'timeline-state-resolver-types'

/**
 * A device container is a wrapper around a device in ThreadedClass class, it
 * keeps a local property of some basic information about the device (like
 * names and id's) to prevent a costly round trip over IPC.
 */
export class DeviceContainer<TOptions extends DeviceOptionsBase<any>> {
	private _device: ThreadedClass<AbstractDevice<TOptions>>
	private _deviceId = 'N/A'
	private _deviceType: DeviceType
	private _deviceName = 'N/A'
	private readonly _deviceOptions: TOptions
	private readonly _threadConfig: ThreadedClassConfig | undefined
	public onChildClose: () => void | undefined
	private _instanceId = -1
	private _startTime = -1
	private _onEventListener: { stop: () => void } | undefined
	private _debugLogging = true
	private _initialized = false

	private constructor(deviceOptions: TOptions, threadConfig?: ThreadedClassConfig) {
		this._deviceOptions = deviceOptions
		this._threadConfig = threadConfig
		this._debugLogging = deviceOptions.debug || false
	}

	static async create<
		TOptions extends DeviceOptionsBase<unknown>,
		TCtor extends new (...args: any[]) => AbstractDevice<TOptions>
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

		container._device = await threadedClass<AbstractDevice<TOptions>, TCtor>(
			orgModule,
			orgClassExport,
			[deviceId, deviceOptions, getCurrentTime] as any, // TODO types
			threadConfig
		)

		if (deviceOptions.isMultiThreaded) {
			container._onEventListener = ThreadedClassManager.onEvent(container._device, 'thread_closed', () => {
				// This is called if a child crashes
				if (container.onChildClose) container.onChildClose()
			})
		}

		await container.reloadProps()

		return container
	}

	get initialized() {
		return this._initialized
	}

	public async init(_initOptions: TOptions['options'], activeRundownPlaylistId: string | undefined): Promise<boolean> {
		if (this.initialized === true) {
			throw new Error(`Device ${this.deviceId} is already initialized`)
		}

		const res = await this._device.init(activeRundownPlaylistId)
		this._initialized = true
		return res
	}

	public async reloadProps(): Promise<void> {
		const props = await this.device.deviceProperties
		this._deviceId = props.deviceId
		this._deviceType = props.deviceType
		this._deviceName = props.deviceName
		this._instanceId = props.instanceId
		this._startTime = props.startTime
	}

	public async terminate() {
		if (this._onEventListener) {
			this._onEventListener.stop()
		}
		await ThreadedClassManager.destroy(this._device)
	}

	public async setDebugLogging(debug: boolean): Promise<void> {
		this._debugLogging = debug
		await this._device.setLogLevel(debug ? 'debug' : 'info')
		// await this._device.setDebugLogging(debug)
	}

	public get device(): ThreadedClass<AbstractDevice<TOptions>> {
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
