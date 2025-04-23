import { ThreadedClass, threadedClass, ThreadedClassConfig, ThreadedClassManager } from 'threadedclass'
import { DeviceType, DeviceOptionsBase } from 'timeline-state-resolver-types'
import { EventEmitter } from 'eventemitter3'
import { DeviceDetails, DeviceInstanceWrapper } from './DeviceInstance'
import type { Device, DeviceOptionsAnyInternal } from '../conductor'

export type DeviceContainerEvents = {
	error: [context: string, err: Error]
}

export abstract class BaseRemoteDeviceIntegration<
	TOptions extends DeviceOptionsBase<any>
> extends EventEmitter<DeviceContainerEvents> {
	public abstract onChildClose: (() => void) | undefined

	protected abstract _device: ThreadedClass<DeviceInstanceWrapper> | ThreadedClass<Device<any, TOptions>>
	protected _details: DeviceDetails = {
		deviceId: 'N/A',
		deviceType: DeviceType.ABSTRACT,
		deviceName: 'N/A',
		instanceId: -1,
		startTime: -1,

		supportsExpectedPlayoutItems: false,
		canConnect: true,
	}
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

	public get device(): ThreadedClass<DeviceInstanceWrapper> | ThreadedClass<Device<any, TOptions>> {
		return this._device
	}
	public get deviceId(): string {
		return this._details.deviceId
	}
	public get deviceType(): DeviceType {
		return this._details.deviceType
	}
	public get deviceName(): string {
		return this._details.deviceName
	}
	public get deviceOptions(): TOptions {
		return this._deviceOptions
	}
	public get threadConfig(): ThreadedClassConfig | undefined {
		return this._threadConfig
	}
	public get instanceId(): number {
		return this._details.instanceId
	}
	public get startTime(): number {
		return this._details.startTime
	}

	public get debugLogging(): boolean {
		return this._debugLogging
	}

	public get debugState(): boolean {
		return this._debugState
	}

	public get details(): DeviceDetails {
		return this._details
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
	protected _device!: ThreadedClass<DeviceInstanceWrapper>
	public onChildClose: (() => void) | undefined

	private constructor(deviceOptions: TOptions, threadConfig?: ThreadedClassConfig) {
		super(deviceOptions, threadConfig)
	}

	static async create<TOptions extends DeviceOptionsBase<unknown>>(
		deviceId: string,
		deviceOptions: TOptions,
		getCurrentTime: () => number,
		threadConfig?: ThreadedClassConfig
	): Promise<RemoteDeviceInstance<TOptions>> {
		const container = new RemoteDeviceInstance(deviceOptions, threadConfig)

		container._device = await threadedClass<DeviceInstanceWrapper, typeof DeviceInstanceWrapper>(
			'../../dist/service/DeviceInstance.js',
			'DeviceInstanceWrapper',
			[deviceId, getCurrentTime(), deviceOptions as DeviceOptionsAnyInternal, getCurrentTime as any], // any because callbacks can't be casted
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
						container.emit('error', `DeviceInstanceWrapper "${deviceId}" threadedClass error`, error)
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
		const props = await this._device.getDetails()

		this._details.canConnect = props.canConnect
		this._details.supportsExpectedPlayoutItems = props.supportsExpectedPlayoutItems

		this._details.deviceId = props.deviceId
		this._details.deviceType = props.deviceType
		this._details.deviceName = props.deviceName
		this._details.instanceId = props.instanceId
		this._details.startTime = props.startTime
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
