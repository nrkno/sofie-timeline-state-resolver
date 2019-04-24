import {
	ThreadedClass,
	threadedClass,
	ThreadedClassConfig
} from 'threadedclass'
import { DeviceClassOptions, Device } from './device'
import { DeviceOptions, DeviceType } from '../types/src'

/**
 * A device container is a wrapper around a device in ThreadedClass class, it
 * keeps a local property of some basic information about the device (like
 * names and id's) to prevent a costly round trip over IPC. 
 */
export class DeviceContainer {

	public _device: ThreadedClass<Device>
	public _deviceId: string
	public _deviceType: DeviceType
	public _deviceName: string
	public _deviceOptions: DeviceOptions
	public _options: DeviceClassOptions
	public _threadConfig: ThreadedClassConfig | undefined

	async create<T extends Device> (
		orgModule: string,
		orgClass: Function,
		deviceId: string,
		deviceOptions: DeviceOptions,
		options: DeviceClassOptions,
		threadConfig?: ThreadedClassConfig
	) {

		this._deviceOptions = deviceOptions
		this._options = options
		this._threadConfig = threadConfig

		this._device = await threadedClass<T>(
			orgModule,
			orgClass,
			[ deviceId, deviceOptions, options ],
			threadConfig
		)
		this._deviceId = await this.device.deviceId
		this._deviceType = await this.device.deviceType
		this._deviceName = await this.device.deviceName

		return this
	}

	public get device (): ThreadedClass<Device> 				{ return this._device }
	public get deviceId (): string 								{ return this._deviceId }
	public get deviceType (): DeviceType 						{ return this._deviceType }
	public get deviceName (): string	 						{ return this._deviceName }
	public get deviceOptions (): DeviceOptions 					{ return this._deviceOptions }
	public get options (): DeviceClassOptions 					{ return this._options }
	public get threadConfig (): ThreadedClassConfig | undefined { return this._threadConfig }
}
