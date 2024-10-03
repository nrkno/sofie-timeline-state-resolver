import { OscDevice } from '../integrations/osc'
import { DeviceType } from 'timeline-state-resolver-types'
import { Device, DeviceContextAPI, ExecuteMode } from './device'
import { AuthenticatedHTTPSendDevice } from '../integrations/httpSend/AuthenticatedHTTPSendDevice'
import { ShotokuDevice } from '../integrations/shotoku'
import { HTTPWatcherDevice } from '../integrations/httpWatcher'
import { AbstractDevice } from '../integrations/abstract'
import { AtemDevice } from '../integrations/atem'
import { TcpSendDevice } from '../integrations/tcpSend'
import { QuantelDevice } from '../integrations/quantel'
import { HyperdeckDevice } from '../integrations/hyperdeck'
import { OBSDevice } from '../integrations/obs'
import { PanasonicPtzDevice } from '../integrations/panasonicPTZ'
import { LawoDevice } from '../integrations/lawo'
import { SofieChefDevice } from '../integrations/sofieChef'
import { PharosDevice } from '../integrations/pharos'
import { TelemetricsDevice } from '../integrations/telemetrics'
import { TriCasterDevice } from '../integrations/tricaster'
import { SingularLiveDevice } from '../integrations/singularLive'
import { MultiOSCMessageDevice } from '../integrations/multiOsc'

export interface DeviceEntry {
	deviceClass: new (context: DeviceContextAPI<any>) => Device<any, any, any>
	canConnect: boolean
	deviceName: (deviceId: string, options: any) => string
	executionMode: (options: any) => ExecuteMode
}

export type ImplementedServiceDeviceTypes =
	| DeviceType.ABSTRACT
	| DeviceType.ATEM
	| DeviceType.HTTPSEND
	| DeviceType.HTTPWATCHER
	| DeviceType.HYPERDECK
	| DeviceType.LAWO
	| DeviceType.OBS
	| DeviceType.OSC
	| DeviceType.MULTI_OSC
	| DeviceType.PANASONIC_PTZ
	| DeviceType.PHAROS
	| DeviceType.SHOTOKU
	| DeviceType.SINGULAR_LIVE
	| DeviceType.SOFIE_CHEF
	| DeviceType.TCPSEND
	| DeviceType.TELEMETRICS
	| DeviceType.TRICASTER
	| DeviceType.QUANTEL

// TODO - move all device implementations here and remove the old Device classes
export const DevicesDict: Record<ImplementedServiceDeviceTypes, DeviceEntry> = {
	[DeviceType.ABSTRACT]: {
		deviceClass: AbstractDevice,
		canConnect: false,
		deviceName: (deviceId: string) => 'Abstract ' + deviceId,
		executionMode: () => ExecuteMode.SALVO,
	},
	[DeviceType.ATEM]: {
		deviceClass: AtemDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'Atem ' + deviceId,
		executionMode: () => ExecuteMode.SALVO,
	},
	[DeviceType.HTTPSEND]: {
		deviceClass: AuthenticatedHTTPSendDevice,
		canConnect: false,
		deviceName: (deviceId: string) => 'HTTPSend ' + deviceId,
		executionMode: () => ExecuteMode.SEQUENTIAL, // todo - config?
	},
	[DeviceType.HTTPWATCHER]: {
		deviceClass: HTTPWatcherDevice,
		canConnect: false,
		deviceName: (deviceId: string) => 'HTTP-Watch ' + deviceId,
		executionMode: () => ExecuteMode.SEQUENTIAL,
	},
	[DeviceType.HYPERDECK]: {
		deviceClass: HyperdeckDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'Hyperdeck ' + deviceId,
		executionMode: () => ExecuteMode.SALVO,
	},
	[DeviceType.LAWO]: {
		deviceClass: LawoDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'Lawo ' + deviceId,
		executionMode: () => ExecuteMode.SALVO,
	},
	[DeviceType.OBS]: {
		deviceClass: OBSDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'OBS ' + deviceId,
		executionMode: () => ExecuteMode.SALVO,
	},
	[DeviceType.OSC]: {
		deviceClass: OscDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'OSC ' + deviceId,
		executionMode: () => ExecuteMode.SALVO,
	},
	[DeviceType.MULTI_OSC]: {
		deviceClass: MultiOSCMessageDevice,
		canConnect: false,
		deviceName: (deviceId: string) => 'MultiOSC ' + deviceId,
		executionMode: () => 'salvo',
	},
	[DeviceType.PANASONIC_PTZ]: {
		deviceClass: PanasonicPtzDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'Panasonic PTZ ' + deviceId,
		executionMode: () => ExecuteMode.SALVO,
	},
	[DeviceType.PHAROS]: {
		deviceClass: PharosDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'Pharos ' + deviceId,
		executionMode: () => ExecuteMode.SALVO,
	},
	[DeviceType.SOFIE_CHEF]: {
		deviceClass: SofieChefDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'SofieChef ' + deviceId,
		executionMode: () => ExecuteMode.SALVO,
	},
	[DeviceType.SHOTOKU]: {
		deviceClass: ShotokuDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'SHOTOKU' + deviceId,
		executionMode: () => ExecuteMode.SALVO,
	},
	[DeviceType.SINGULAR_LIVE]: {
		deviceClass: SingularLiveDevice,
		canConnect: false,
		deviceName: (deviceId: string) => 'Singular.Live ' + deviceId,
		executionMode: () => ExecuteMode.SEQUENTIAL,
	},
	[DeviceType.TCPSEND]: {
		deviceClass: TcpSendDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'TCP' + deviceId,
		executionMode: () => ExecuteMode.SEQUENTIAL, // todo: should this be configurable?
	},
	[DeviceType.TELEMETRICS]: {
		deviceClass: TelemetricsDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'Telemetrics ' + deviceId,
		executionMode: () => ExecuteMode.SALVO,
	},
	[DeviceType.TRICASTER]: {
		deviceClass: TriCasterDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'TriCaster ' + deviceId,
		executionMode: () => ExecuteMode.SALVO,
	},
	[DeviceType.QUANTEL]: {
		deviceClass: QuantelDevice,
		canConnect: true,
		deviceName: (deviceId: string) => 'Quantel' + deviceId,
		executionMode: () => ExecuteMode.SEQUENTIAL,
	},
}
