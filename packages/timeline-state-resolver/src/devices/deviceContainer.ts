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
	protected readonly _device: ThreadedClass<Device<any, TOptions>>
	public onChildClose: (() => void) | undefined

	private constructor(
		device: ThreadedClass<Device<any, TOptions>>,
		deviceOptions: TOptions,
		threadConfig: ThreadedClassConfig | undefined
	) {
		super(deviceOptions, threadConfig)
		this._device = device
	}

	static async create<
		TOptions extends DeviceOptionsBase<unknown>,
		TCtor extends new (...args: any[]) => Device<any, TOptions>
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

		const device = await threadedClass<Device<any, TOptions>, TCtor>(
			orgModule,
			orgClassExport,
			[deviceId, deviceOptions, getCurrentTime] as any, // TODO types
			threadConfig
		)
		const container = new DeviceContainer(device, deviceOptions, threadConfig)

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
			container.terminate().catch(() => null)
			throw e
		}
	}

	public async reloadProps(): Promise<void> {
		this._details.deviceId = await this._device.deviceId
		this._details.deviceType = await this._device.deviceType
		this._details.deviceName = await this._device.deviceName
		this._details.instanceId = await this._device.instanceId
		this._details.startTime = await this._device.startTime

		this._details.canConnect = await this._device.canConnect
		this._details.supportsExpectedPlayoutItems = await this._device.supportsExpectedPlayoutItems
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
