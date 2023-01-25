import { ThreadedClass, threadedClass, ThreadedClassConfig, ThreadedClassManager } from 'threadedclass'
import { DeviceType, DeviceOptionsBase } from 'timeline-state-resolver-types'
import { EventEmitter } from 'eventemitter3'
import { DeviceInstanceWrapper } from './DeviceInstance'
import { Device } from '../conductor'

export type DeviceContainerEvents = {
	error: [context: string, err: Error]
}

export abstract class BaseRemoteDeviceIntegration<
	TOptions extends DeviceOptionsBase<any>
> extends EventEmitter<DeviceContainerEvents> {
	protected abstract _device: ThreadedClass<DeviceInstanceWrapper> | ThreadedClass<Device<TOptions>>
	protected _deviceId = 'N/A'
	protected _deviceType: DeviceType
	protected _deviceName = 'N/A'
	protected _instanceId = -1
	protected _startTime = -1
	protected _onEventListeners: { stop: () => void }[] = []

	private _debugLogging = true
	private _debugState = false
	private readonly _deviceOptions: TOptions
	private readonly _threadConfig: ThreadedClassConfig | undefined
	protected _initialized = false

	constructor(deviceOptions: TOptions, threadConfig?: ThreadedClassConfig) {
		super()
		this._deviceOptions = deviceOptions
		this._threadConfig = threadConfig
		this._debugLogging = deviceOptions.debug || false
	}

	get initialized() {
		return this._initialized
	}

	public abstract reloadProps(): Promise<void>
	public abstract init(_initOptions: TOptions['options'], activeRundownPlaylistId: string | undefined): Promise<boolean>

	public async terminate() {
		this._onEventListeners.forEach((listener) => listener.stop())
		await ThreadedClassManager.destroy(this._device)
	}

	public async setDebugLogging(debug: boolean): Promise<void> {
		this._debugLogging = debug
		await this._device.setDebugLogging(debug)
	}

	public async setDebugState(debug: boolean): Promise<void> {
		this._debugState = debug
		await this._device.setDebugState(debug)
	}

	public get device(): ThreadedClass<DeviceInstanceWrapper> | ThreadedClass<Device<TOptions>> {
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

	public get debugState(): boolean {
		return this._debugState
	}
}

/**
 * A device container is a wrapper around a device in ThreadedClass class, it
 * keeps a local property of some basic information about the device (like
 * names and id's) to prevent a costly round trip over IPC.
 */
export class RemoteDeviceInstance<
	TOptions extends DeviceOptionsBase<any>
> extends BaseRemoteDeviceIntegration<TOptions> {
	protected _device: ThreadedClass<DeviceInstanceWrapper>
	public onChildClose: () => void | undefined

	private constructor(deviceOptions: TOptions, threadConfig?: ThreadedClassConfig) {
		super(deviceOptions, threadConfig)
	}

	static async create<
		TOptions extends DeviceOptionsBase<unknown>,
		TCtor extends new (...args: any[]) => DeviceInstanceWrapper
	>(
		orgModule: string,
		orgClassExport: string,
		deviceId: string,
		deviceOptions: TOptions,
		getCurrentTime: () => number,
		threadConfig?: ThreadedClassConfig
	): Promise<RemoteDeviceInstance<TOptions>> {
		if (process.env.JEST_WORKER_ID !== undefined && threadConfig && threadConfig.disableMultithreading) {
			// running in Jest test environment.
			// hack: we need to work around the mangling performed by threadedClass, as getCurrentTime needs to not return a promise
			getCurrentTime = { inner: getCurrentTime } as any
		}

		const container = new RemoteDeviceInstance(deviceOptions, threadConfig)

		container._device = await threadedClass<DeviceInstanceWrapper, TCtor>(
			orgModule,
			orgClassExport,
			[deviceId, deviceOptions, getCurrentTime] as any, // TODO types
			threadConfig
		)

		try {
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
		} catch (e) {
			// try to clean up any loose threads
			try {
				container.terminate()
			} catch {}
			throw e
		}
	}

	public async reloadProps(): Promise<void> {
		const props = await this._device.getDetails()

		this._deviceId = props.deviceId
		this._deviceType = props.deviceType
		this._deviceName = props.deviceName
		this._instanceId = props.instanceId
		this._startTime = props.startTime
	}

	public async init(_initOptions: TOptions['options'], activeRundownPlaylistId: string | undefined): Promise<boolean> {
		if (this.initialized) {
			throw new Error(`Device ${this.deviceId} is already initialized`)
		}

		const res = await this._device.initDevice(activeRundownPlaylistId)
		this._initialized = true
		return res
	}
}
