import { ThreadedClass, threadedClass, ThreadedClassConfig, ThreadedClassManager } from 'threadedclass'
import { Device } from './device'
import { DeviceOptionsBase } from 'timeline-state-resolver-types'
import { BaseRemoteDeviceIntegration, DeviceContainerEvents } from '../service/remoteDeviceInstance'

export { DeviceContainerEvents }

/**
 * A device container is a wrapper around a device in ThreadedClass class, it
 * keeps a local property of some basic information about the device (like
 * names and id's) to prevent a costly round trip over IPC.
 */
export class DeviceContainer<TOptions extends DeviceOptionsBase<any>> extends BaseRemoteDeviceIntegration<TOptions> {
	protected _device: ThreadedClass<Device<TOptions>>
	public onChildClose: () => void | undefined

	private constructor(deviceOptions: TOptions, threadConfig?: ThreadedClassConfig) {
		super(deviceOptions, threadConfig)
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
		this._deviceId = await this._device.deviceId
		this._deviceType = await this._device.deviceType
		this._deviceName = await this._device.deviceName
		this._instanceId = await this._device.instanceId
		this._startTime = await this._device.startTime
	}

	public async init(initOptions: TOptions['options'], activeRundownPlaylistId: string | undefined): Promise<boolean> {
		if (this.initialized) {
			throw new Error(`Device ${this.deviceId} is already initialized`)
		}

		const res = await this._device.init(initOptions, activeRundownPlaylistId)
		this._initialized = true
		return res
	}
}
