import { ThreadedClass, threadedClass, ThreadedClassConfig, ThreadedClassManager } from 'threadedclass'
import { DeviceType, DeviceOptionsBase } from 'timeline-state-resolver-types'
import { EventEmitter } from 'eventemitter3'
import { Service } from './service'

export type DeviceContainerEvents = {
	error: [context: string, err: Error]
}

/**
 * A device container is a wrapper around a device in ThreadedClass class, it
 * keeps a local property of some basic information about the device (like
 * names and id's) to prevent a costly round trip over IPC.
 */
export class RemoteService<TOptions extends DeviceOptionsBase<any>> extends EventEmitter<DeviceContainerEvents> {
	private _service: ThreadedClass<Service>
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
	private _debugState = false
	private _initialized = false

	private constructor(deviceOptions: TOptions, threadConfig?: ThreadedClassConfig) {
		super()
		this._deviceOptions = deviceOptions
		this._threadConfig = threadConfig
		this._debugLogging = deviceOptions.debug || false
	}

	static async create<TOptions extends DeviceOptionsBase<unknown>, TCtor extends new (...args: any[]) => Service>(
		orgModule: string,
		orgClassExport: string,
		deviceId: string,
		deviceOptions: TOptions,
		getCurrentTime: () => number,
		threadConfig?: ThreadedClassConfig
	): Promise<RemoteService<TOptions>> {
		if (process.env.JEST_WORKER_ID !== undefined && threadConfig && threadConfig.disableMultithreading) {
			// running in Jest test environment.
			// hack: we need to work around the mangling performed by threadedClass, as getCurrentTime needs to not return a promise
			getCurrentTime = { inner: getCurrentTime } as any
		}

		const container = new RemoteService(deviceOptions, threadConfig)

		container._service = await threadedClass<Service, TCtor>(
			orgModule,
			orgClassExport,
			[deviceId, deviceOptions, getCurrentTime] as any, // TODO types
			threadConfig
		)

		if (deviceOptions.isMultiThreaded) {
			container._onEventListeners = [
				ThreadedClassManager.onEvent(container._service, 'thread_closed', () => {
					// This is called if a child crashes
					if (container.onChildClose) container.onChildClose()
				}),
				ThreadedClassManager.onEvent(container._service, 'error', (error) => {
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

	public async init(_initOptions: TOptions['options'], activeRundownPlaylistId: string | undefined): Promise<boolean> {
		if (this.initialized) {
			throw new Error(`Device ${this.deviceId} is already initialized`)
		}

		const res = await this._service.initDevice(activeRundownPlaylistId)
		this._initialized = true
		return res
	}

	public async reloadProps(): Promise<void> {
		const props = await this.service.getDetails()

		this._deviceId = props.deviceId
		this._deviceType = props.deviceType
		this._deviceName = props.deviceName
		this._instanceId = props.instanceId
		this._startTime = props.startTime
	}

	public async terminate() {
		this._onEventListeners.forEach((listener) => listener.stop())
		await ThreadedClassManager.destroy(this._service)
	}

	public async setDebugLogging(debug: boolean): Promise<void> {
		this._debugLogging = debug
		// await this._device.setDebugLogging(debug)
	}

	public async setDebugState(debug: boolean): Promise<void> {
		this._debugState = debug
		// await this._device.setDebugState(debug)
	}

	public get service(): ThreadedClass<Service> {
		return this._service
	}
	public get device(): ThreadedClass<Service> {
		return this._service
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

	public get debugState(): boolean {
		return this._debugState
	}
}
