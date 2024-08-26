import {
	DeviceOptionsBase,
	DeviceOptionsMultiOSC,
	DeviceOptionsTelemetrics,
	DeviceType,
} from 'timeline-state-resolver-types'
import { BaseRemoteDeviceIntegration, RemoteDeviceInstance } from './remoteDeviceInstance'
import _ = require('underscore')
import { ThreadedClassConfig } from 'threadedclass'
import { DeviceOptionsAnyInternal } from '../conductor'
import { DeviceContainer } from '..//devices/deviceContainer'
import { assertNever } from 'atem-connection/dist/lib/atemUtil'
import { CasparCGDevice, DeviceOptionsCasparCGInternal } from '../integrations/casparCG'
import { MultiOSCMessageDevice } from '../integrations/multiOsc'
import { DeviceOptionsPharosInternal, PharosDevice } from '../integrations/pharos'
import { DeviceOptionsSingularLiveInternal, SingularLiveDevice } from '../integrations/singularLive'
import { DeviceOptionsSisyfosInternal, SisyfosMessageDevice } from '../integrations/sisyfos'
import { DeviceOptionsSofieChefInternal, SofieChefDevice } from '../integrations/sofieChef'
import { TelemetricsDevice } from '../integrations/telemetrics'
import { DeviceOptionsTriCasterInternal, TriCasterDevice } from '../integrations/tricaster'
import { DeviceOptionsVizMSEInternal, VizMSEDevice } from '../integrations/vizMSE'
import { DeviceOptionsVMixInternal, VMixDevice } from '../integrations/vmix'
import { ImplementedServiceDeviceTypes } from './devices'
import { EventEmitter } from 'eventemitter3'
import { DeviceInstanceEvents } from './DeviceInstance'

interface Operation {
	operation: 'create' | 'update' | 'delete' | 'setDebug'
	id: string
}

const FREEZE_LIMIT = 5000 // how long to wait before considering the child to be unresponsive

export type ConnectionManagerEvents = ConnectionManagerIntEvents & MappedDeviceEvents
export interface ConnectionManagerIntEvents {
	info: [info: string]
	warning: [warning: string]
	error: [context: string, err?: Error]
	debug: [...debug: any[]]

	connectionAdded: [id: string, container: BaseRemoteDeviceIntegration<DeviceOptionsBase<any>>]
	connectionRemoved: [id: string]
}
export type MappedDeviceEvents = {
	[T in keyof DeviceInstanceEvents as `connectionEvent:${T}`]: [deviceId: string, ...DeviceInstanceEvents[T]]
}

export class ConnectionManager extends EventEmitter<ConnectionManagerEvents> {
	private _config: Map<string, DeviceOptionsAnyInternal> = new Map()
	private _connections: Map<string, BaseRemoteDeviceIntegration<DeviceOptionsAnyInternal>> = new Map()
	private _updating = false

	private _connectionAttempts = new Map<string, { last: number; next: number }>()
	private _nextAttempt: NodeJS.Timeout | undefined

	/**
	 * Set the config options for all connections
	 */
	public setConnections(connectionsConfig: Map<string, DeviceOptionsAnyInternal>) {
		this._config = connectionsConfig
		this._updateConnections()
	}

	public getConnections(includeUninitialized = false): Array<BaseRemoteDeviceIntegration<DeviceOptionsBase<any>>> {
		if (includeUninitialized) {
			return Array.from(this._connections.values())
		} else {
			return Array.from(this._connections.values()).filter((conn) => conn.initialized === true)
		}
	}

	public getConnection(
		connectionId: string,
		includeUninitialized = false
	): BaseRemoteDeviceIntegration<DeviceOptionsBase<any>> | undefined {
		if (includeUninitialized) {
			return this._connections.get(connectionId)
		} else {
			const connection = this._connections.get(connectionId)
			if (connection?.initialized === true) {
				return connection
			} else {
				return undefined
			}
		}
	}

	/**
	 * Iterate over config and check that the existing connection has the right config, if
	 * not... recreate it
	 */
	private _updateConnections() {
		if (this._updating) return
		this._updating = true

		if (this._nextAttempt) {
			clearTimeout(this._nextAttempt)
			this._nextAttempt = undefined
		}

		const operations: Operation[] = []

		for (const [deviceId, config] of this._config.entries()) {
			// find connection
			const connection = this._connections.get(deviceId)

			if (connection) {
				// see if it should be restarted because of an update
				if (configHasChanged(connection, config)) {
					operations.push({ operation: 'update', id: deviceId })
				} else if (
					connection.deviceOptions.debug !== config.debug ||
					connection.deviceOptions.debugState !== config.debugState
				) {
					// see if we should set the debug params
					operations.push({ operation: 'setDebug', id: deviceId })
				}
			} else {
				// create
				operations.push({ operation: 'create', id: deviceId })
			}
		}

		for (const deviceId of this._connections.keys()) {
			// find if still in config
			const config = this._config.get(deviceId)

			if (!config) {
				// not found, so it should be closed
				operations.push({ operation: 'delete', id: deviceId })
			}
		}

		const isAllowedOp = (op: Operation): boolean => {
			if (op.operation !== 'create') return true // allow non-create ops

			const nextCreate = this._connectionAttempts.get(op.id)
			if (!nextCreate || nextCreate.next < Date.now()) return true

			return false
		}
		const allowedOperations = operations.filter(isAllowedOp)

		if (operations.length === 0) {
			// no operations needed, so stop the loop
			this._updating = false
			return
		} else if (allowedOperations.length === 0) {
			this._updating = false

			// wait until next
			const nextTime = Array.from(this._connectionAttempts.values()).reduce((a, b) => (a.next < b.next ? a : b))
			this._nextAttempt = setTimeout(() => {
				this._updateConnections()
			}, nextTime.next - Date.now())

			// there's nothing to execute right now so return
			return
		}

		Promise.allSettled(allowedOperations.map((op) => this.executeOperation(op))).then(() => {
			this._updating = false

			// rerun the algorithm once to make sure we have no missed operations in the meanwhile
			this._updateConnections()
		})
	}

	private async executeOperation({ operation, id }: Operation): Promise<void> {
		// todo - timeout?
		try {
			switch (operation) {
				case 'create':
					await this.createConnection(id)
					break
				case 'delete':
					await this.deleteConnection(id)
					break
				case 'update':
					await this.deleteConnection(id)
					await this.createConnection(id)
					break
				case 'setDebug':
					await this.setDebugForConnection(id)
					break
			}
		} catch {
			this.emit('warning', `Failed to execute "${operation} for ${id}"`)
		}
	}

	private async createConnection(id: string): Promise<void> {
		const deviceOptions = this._config.get(id)
		if (!deviceOptions) return // has been removed since, so do not create

		const lastAttempt = this._connectionAttempts.get(id)
		const last = lastAttempt?.last ?? Date.now()
		this._connectionAttempts.set(id, {
			last: Date.now(),
			next: Date.now() + Math.min(Math.max(Date.now() - last, 2000) * 2, 60 * 1000),
		}) // first retry after 4secs, double it every try, max 60s

		const threadedClassOptions: ThreadedClassConfig = {
			threadUsage: deviceOptions.threadUsage || 1,
			autoRestart: false,
			disableMultithreading: !deviceOptions.isMultiThreaded,
			instanceName: id,
			freezeLimit: FREEZE_LIMIT,
		}

		const container = await createContainer(deviceOptions, id, () => Date.now(), threadedClassOptions) // time out if this gets el stucko

		if (!container) {
			this.emit('warning', 'Failed to create container for ' + id)
			return
		}

		// set up event handlers
		this._setupDeviceListeners(id, container)

		this._connections.set(id, container)
		this.emit('connectionAdded', id, container)

		// trigger conenction init
		this._handleConnectionInitialisation(id, container)
			.then(() => {
				this._connectionAttempts.delete(id)
			})
			.catch((e) => {
				this.emit('error', 'Connection ' + id + ' failed to initialise')
				this._connections.delete(id)

				container.terminate().catch(() => this.emit('warning', `Failed to initialise ${id} (${e})`))
				// todo - find a good point to retrigger _updateConnections
				this._updateConnections() // this can't be the right place... right?? it was not :kekw:... was it not??
			})
	}

	private async deleteConnection(id: string): Promise<void> {
		const connection = this._connections.get(id)
		if (!connection) return // already removed / never existed

		this._connections.delete(id)
		this.emit('connectionRemoved', id)

		try {
			await connection.device.terminate()
			await connection.device.removeAllListeners()
			await connection.terminate()
		} catch {
			await connection.terminate()
		}
	}

	private async setDebugForConnection(id: string): Promise<void> {
		const config = this._config.get(id)
		const connection = this._connections.get(id)
		if (!connection || !config) return

		try {
			connection.device.setDebugLogging(config.debug ?? false)
			connection.device.setDebugState(config.debugState ?? false)
		} catch {
			this.emit('warning', 'Failed to update debug values for ' + id)
		}
	}

	private async _handleConnectionInitialisation(
		id: string,
		container: BaseRemoteDeviceIntegration<DeviceOptionsAnyInternal>
	) {
		const deviceOptions = this._config.get(id)
		if (!deviceOptions) return // unexpected - throw error?

		this.emit(
			'info',
			`Initializing connection ${id} (${container.instanceId}) of type ${DeviceType[deviceOptions.type]}...`
		)
		await container.init(deviceOptions.options, undefined)
		await container.reloadProps()
		this.emit('info', `Connection ${id} (${container.instanceId}) initialized!`)
	}

	private async _setupDeviceListeners(
		id: string,
		container: BaseRemoteDeviceIntegration<DeviceOptionsAnyInternal>
	): Promise<void> {
		const passEvent = <T extends keyof DeviceInstanceEvents>(ev: T) => {
			const evHandler: any = (...args: DeviceInstanceEvents[T]) =>
				this.emit(('connectionEvent:' + ev) as `connectionEvent:${keyof DeviceInstanceEvents}`, id, ...args)
			container.device.on(ev, evHandler)
		}

		passEvent('info')
		passEvent('warning')
		passEvent('error')
		passEvent('debug')
		passEvent('debugState')
		passEvent('connectionChanged')
		passEvent('resetResolver')
		passEvent('slowCommand')
		passEvent('slowSentCommand')
		passEvent('slowFulfilledCommand')
		passEvent('commandReport')
		passEvent('commandError')
		passEvent('updateMediaObject')
		passEvent('clearMediaObjects')
		passEvent('timeTrace')
	}
}

/**
 * A config has changed if any of the options are no longer the same, taking default values into
 * consideration. In addition, the debug logging flag should be ignored as that can be changed at runtime.
 */
function configHasChanged(
	connection: BaseRemoteDeviceIntegration<DeviceOptionsBase<any>>,
	config: DeviceOptionsBase<any>
): boolean {
	const oldConfig = connection.deviceOptions

	// now check device specific options
	return !_.isEqual(_.omit(oldConfig, 'debug', 'debugState'), _.omit(config, 'debug', 'debugState'))
}

function createContainer(
	deviceOptions: DeviceOptionsAnyInternal,
	deviceId: string,
	getCurrentTime: () => number,
	threadedClassOptions: ThreadedClassConfig
): Promise<BaseRemoteDeviceIntegration<DeviceOptionsBase<any>>> | null {
	switch (deviceOptions.type) {
		case DeviceType.CASPARCG:
			return DeviceContainer.create<DeviceOptionsCasparCGInternal, typeof CasparCGDevice>(
				'../../dist/integrations/casparCG/index.js',
				'CasparCGDevice',
				deviceId,
				deviceOptions,
				getCurrentTime,
				threadedClassOptions
			)
		case DeviceType.PHAROS:
			return DeviceContainer.create<DeviceOptionsPharosInternal, typeof PharosDevice>(
				'../../dist/integrations/pharos/index.js',
				'PharosDevice',
				deviceId,
				deviceOptions,
				getCurrentTime,
				threadedClassOptions
			)
		case DeviceType.SISYFOS:
			return DeviceContainer.create<DeviceOptionsSisyfosInternal, typeof SisyfosMessageDevice>(
				'../../dist/integrations/sisyfos/index.js',
				'SisyfosMessageDevice',
				deviceId,
				deviceOptions,
				getCurrentTime,
				threadedClassOptions
			)
		case DeviceType.VIZMSE:
			return DeviceContainer.create<DeviceOptionsVizMSEInternal, typeof VizMSEDevice>(
				'../../dist/integrations/vizMSE/index.js',
				'VizMSEDevice',
				deviceId,
				deviceOptions,
				getCurrentTime,
				threadedClassOptions
			)
		case DeviceType.SINGULAR_LIVE:
			return DeviceContainer.create<DeviceOptionsSingularLiveInternal, typeof SingularLiveDevice>(
				'../../dist/integrations/singularLive/index.js',
				'SingularLiveDevice',
				deviceId,
				deviceOptions,
				getCurrentTime,
				threadedClassOptions
			)
		case DeviceType.VMIX:
			return DeviceContainer.create<DeviceOptionsVMixInternal, typeof VMixDevice>(
				'../../dist/integrations/vmix/index.js',
				'VMixDevice',
				deviceId,
				deviceOptions,
				getCurrentTime,
				threadedClassOptions
			)
		case DeviceType.TELEMETRICS:
			return DeviceContainer.create<DeviceOptionsTelemetrics, typeof TelemetricsDevice>(
				'../../dist/integrations/telemetrics/index.js',
				'TelemetricsDevice',
				deviceId,
				deviceOptions,
				getCurrentTime,
				threadedClassOptions
			)
		case DeviceType.SOFIE_CHEF:
			return DeviceContainer.create<DeviceOptionsSofieChefInternal, typeof SofieChefDevice>(
				'../../dist/integrations/sofieChef/index.js',
				'SofieChefDevice',
				deviceId,
				deviceOptions,
				getCurrentTime,
				threadedClassOptions
			)
		case DeviceType.TRICASTER:
			return DeviceContainer.create<DeviceOptionsTriCasterInternal, typeof TriCasterDevice>(
				'../../dist/integrations/tricaster/index.js',
				'TriCasterDevice',
				deviceId,
				deviceOptions,
				getCurrentTime,
				threadedClassOptions
			)
		case DeviceType.MULTI_OSC:
			return DeviceContainer.create<DeviceOptionsMultiOSC, typeof MultiOSCMessageDevice>(
				'../../dist/integrations/multiOsc/index.js',
				'MultiOSCMessageDevice',
				deviceId,
				deviceOptions,
				getCurrentTime,
				threadedClassOptions
			)
		case DeviceType.ABSTRACT:
		case DeviceType.ATEM:
		case DeviceType.HTTPSEND:
		case DeviceType.HTTPWATCHER:
		case DeviceType.HYPERDECK:
		case DeviceType.LAWO:
		case DeviceType.OBS:
		case DeviceType.OSC:
		case DeviceType.PANASONIC_PTZ:
		case DeviceType.SHOTOKU:
		case DeviceType.TCPSEND:
		case DeviceType.QUANTEL: {
			ensureIsImplementedAsService(deviceOptions.type)

			// presumably this device is implemented in the new service handler
			return RemoteDeviceInstance.create(deviceId, deviceOptions, getCurrentTime, threadedClassOptions)
		}
		default:
			assertNever(deviceOptions)
			return null
	}
}

function ensureIsImplementedAsService(_type: ImplementedServiceDeviceTypes): void {
	// This is a type check
}
