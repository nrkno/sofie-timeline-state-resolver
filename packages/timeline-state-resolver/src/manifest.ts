import { DeviceType, TSRActionSchema } from 'timeline-state-resolver-types'
import AbstractActions = require('./generated/$schemas/abstract/actions.deref.json')
import AbstractOptions = require('./generated/$schemas/abstract/options.deref.json')
import AbstractMappings = require('./generated/$schemas/abstract/mappings.deref.json')
import AtemActions = require('./generated/$schemas/atem/actions.deref.json')
import AtemOptions = require('./generated/$schemas/atem/options.deref.json')
import AtemMappings = require('./generated/$schemas/atem/mappings.deref.json')
import CasparCGActions = require('./generated/$schemas/casparCG/actions.deref.json')
import CasparCGOptions = require('./generated/$schemas/casparCG/options.deref.json')
import CasparCGMappings = require('./generated/$schemas/casparCG/mappings.deref.json')
import HTTPSendOptions = require('./generated/$schemas/httpSend/options.deref.json')
import HTTPSendMappings = require('./generated/$schemas/httpSend/mappings.deref.json')
import HTTPWatcherOptions = require('./generated/$schemas/httpWatcher/options.deref.json')
import HTTPWatcherMappings = require('./generated/$schemas/httpWatcher/mappings.deref.json')
import HyperdeckActions = require('./generated/$schemas/hyperdeck/actions.deref.json')
import HyperdeckOptions = require('./generated/$schemas/hyperdeck/options.deref.json')
import HyperdeckMappings = require('./generated/$schemas/hyperdeck/mappings.deref.json')
import LawoOptions = require('./generated/$schemas/lawo/options.deref.json')
import LawoMappings = require('./generated/$schemas/lawo/mappings.deref.json')
import MultiOSCOptions = require('./generated/$schemas/multiOsc/options.deref.json')
import MultiOSCMappings = require('./generated/$schemas/multiOsc/mappings.deref.json')
import OBSOptions = require('./generated/$schemas/obs/options.deref.json')
import OBSMappings = require('./generated/$schemas/obs/mappings.deref.json')
import OSCOptions = require('./generated/$schemas/osc/options.deref.json')
import OSCMappings = require('./generated/$schemas/osc/mappings.deref.json')
import PanasonicPTZOptions = require('./generated/$schemas/panasonicPTZ/options.deref.json')
import PanasonicPTZMappings = require('./generated/$schemas/panasonicPTZ/mappings.deref.json')
import PharosOptions = require('./generated/$schemas/pharos/options.deref.json')
import PharosMappings = require('./generated/$schemas/pharos/mappings.deref.json')
import QuantelActions = require('./generated/$schemas/quantel/actions.deref.json')
import QuantelOptions = require('./generated/$schemas/quantel/options.deref.json')
import QuantelMappings = require('./generated/$schemas/quantel/mappings.deref.json')
import ShotokuOptions = require('./generated/$schemas/shotoku/options.deref.json')
import ShotokuMappings = require('./generated/$schemas/shotoku/mappings.deref.json')
import SingularLiveOptions = require('./generated/$schemas/singularLive/options.deref.json')
import SingularLiveMappings = require('./generated/$schemas/singularLive/mappings.deref.json')
import SisyfosOptions = require('./generated/$schemas/sisyfos/options.deref.json')
import SisyfosMappings = require('./generated/$schemas/sisyfos/mappings.deref.json')
import SofieChefOptions = require('./generated/$schemas/sofieChef/options.deref.json')
import SofieChefMappings = require('./generated/$schemas/sofieChef/mappings.deref.json')
import TCPSendOptions = require('./generated/$schemas/tcpSend/options.deref.json')
import TCPSendMappings = require('./generated/$schemas/tcpSend/mappings.deref.json')
import TelemetricsOptions = require('./generated/$schemas/telemetrics/options.deref.json')
import TelemetricsMappings = require('./generated/$schemas/telemetrics/mappings.deref.json')
import TricasterOptions = require('./generated/$schemas/tricaster/options.deref.json')
import TricasterMappings = require('./generated/$schemas/tricaster/mappings.deref.json')
import HttpSendActions = require('./generated/$schemas/httpSend/actions.deref.json')
import PharosActions = require('./generated/$schemas/pharos/actions.deref.json')
import TcpSendActions = require('./generated/$schemas/tcpSend/actions.deref.json')
import VizMSEActions = require('./generated/$schemas/vizMSE/actions.deref.json')
import VizMSEOptions = require('./generated/$schemas/vizMSE/options.deref.json')
import VizMSEMappings = require('./generated/$schemas/vizMSE/mappings.deref.json')
import VMixOptions = require('./generated/$schemas/vmix/options.deref.json')
import VMixMappings = require('./generated/$schemas/vmix/mappings.deref.json')
import VMixActions = require('./generated/$schemas/vmix/actions.deref.json')

import CommonOptions = require('./$schemas/common-options.json')
import { generateTranslation } from './lib'

const stringifyActionSchema = (action: Omit<TSRActionSchema, 'payload'> & { payload?: any }): TSRActionSchema => ({
	...action,
	payload: JSON.stringify(action.payload),
})
const stringifyMappingSchema = (schema: any): Record<string, string> =>
	Object.fromEntries(Object.entries<any>(schema.mappings).map(([id, sch]) => [id, JSON.stringify(sch)]))

export type TSRDevicesManifestEntry = {
	displayName: string
	configSchema: string
	actions?: TSRActionSchema[]
	mappingsSchemas: Record<string, string>
}

export type TSRDevicesManifest = {
	[deviceType in DeviceType]: TSRDevicesManifestEntry
}

export interface TSRManifest {
	commonOptions: string
	subdevices: TSRDevicesManifest
}

export const manifest: TSRManifest = {
	commonOptions: JSON.stringify(CommonOptions),
	subdevices: {
		[DeviceType.ABSTRACT]: {
			displayName: generateTranslation('Abstract'),
			actions: AbstractActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(AbstractOptions),
			mappingsSchemas: stringifyMappingSchema(AbstractMappings),
		},
		[DeviceType.ATEM]: {
			displayName: generateTranslation('Blackmagic ATEM'),
			actions: AtemActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(AtemOptions),
			mappingsSchemas: stringifyMappingSchema(AtemMappings),
		},
		[DeviceType.CASPARCG]: {
			displayName: generateTranslation('CasparCG'),
			actions: CasparCGActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(CasparCGOptions),
			mappingsSchemas: stringifyMappingSchema(CasparCGMappings),
		},
		[DeviceType.HTTPSEND]: {
			displayName: generateTranslation('HTTP Send'),
			actions: HttpSendActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(HTTPSendOptions),
			mappingsSchemas: stringifyMappingSchema(HTTPSendMappings),
		},
		[DeviceType.HTTPWATCHER]: {
			displayName: generateTranslation('HTTP Watcher'),
			configSchema: JSON.stringify(HTTPWatcherOptions),
			mappingsSchemas: stringifyMappingSchema(HTTPWatcherMappings),
		},
		[DeviceType.HYPERDECK]: {
			displayName: generateTranslation('Blackmagic Hyperdeck'),
			actions: HyperdeckActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(HyperdeckOptions),
			mappingsSchemas: stringifyMappingSchema(HyperdeckMappings),
		},
		[DeviceType.LAWO]: {
			displayName: generateTranslation('Lawo'),
			configSchema: JSON.stringify(LawoOptions),
			mappingsSchemas: stringifyMappingSchema(LawoMappings),
		},
		[DeviceType.MULTI_OSC]: {
			displayName: generateTranslation('Multi OSC'),
			configSchema: JSON.stringify(MultiOSCOptions),
			mappingsSchemas: stringifyMappingSchema(MultiOSCMappings),
		},
		[DeviceType.OBS]: {
			displayName: generateTranslation('OBS Studio'),
			configSchema: JSON.stringify(OBSOptions),
			mappingsSchemas: stringifyMappingSchema(OBSMappings),
		},
		[DeviceType.OSC]: {
			displayName: generateTranslation('OSC'),
			configSchema: JSON.stringify(OSCOptions),
			mappingsSchemas: stringifyMappingSchema(OSCMappings),
		},
		[DeviceType.PANASONIC_PTZ]: {
			displayName: generateTranslation('Panasonic PTZ'),
			configSchema: JSON.stringify(PanasonicPTZOptions),
			mappingsSchemas: stringifyMappingSchema(PanasonicPTZMappings),
		},
		[DeviceType.PHAROS]: {
			displayName: generateTranslation('Pharos'),
			actions: PharosActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(PharosOptions),
			mappingsSchemas: stringifyMappingSchema(PharosMappings),
		},
		[DeviceType.QUANTEL]: {
			displayName: generateTranslation('Quantel'),
			actions: QuantelActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(QuantelOptions),
			mappingsSchemas: stringifyMappingSchema(QuantelMappings),
		},
		[DeviceType.SHOTOKU]: {
			displayName: generateTranslation('Shotoku'),
			configSchema: JSON.stringify(ShotokuOptions),
			mappingsSchemas: stringifyMappingSchema(ShotokuMappings),
		},
		[DeviceType.SINGULAR_LIVE]: {
			displayName: generateTranslation('Singular Live'),
			configSchema: JSON.stringify(SingularLiveOptions),
			mappingsSchemas: stringifyMappingSchema(SingularLiveMappings),
		},
		[DeviceType.SISYFOS]: {
			displayName: generateTranslation('Sisyfos'),
			configSchema: JSON.stringify(SisyfosOptions),
			mappingsSchemas: stringifyMappingSchema(SisyfosMappings),
		},
		[DeviceType.SOFIE_CHEF]: {
			displayName: generateTranslation('Sofie Chef'),
			configSchema: JSON.stringify(SofieChefOptions),
			mappingsSchemas: stringifyMappingSchema(SofieChefMappings),
		},
		[DeviceType.TCPSEND]: {
			displayName: generateTranslation('TCP Send'),
			actions: TcpSendActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(TCPSendOptions),
			mappingsSchemas: stringifyMappingSchema(TCPSendMappings),
		},
		[DeviceType.TELEMETRICS]: {
			displayName: generateTranslation('Telemetrics'),
			configSchema: JSON.stringify(TelemetricsOptions),
			mappingsSchemas: stringifyMappingSchema(TelemetricsMappings),
		},
		[DeviceType.TRICASTER]: {
			displayName: generateTranslation('Tricaster'),
			configSchema: JSON.stringify(TricasterOptions),
			mappingsSchemas: stringifyMappingSchema(TricasterMappings),
		},
		[DeviceType.VIZMSE]: {
			displayName: generateTranslation('Viz MSE'),
			actions: VizMSEActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(VizMSEOptions),
			mappingsSchemas: stringifyMappingSchema(VizMSEMappings),
		},
		[DeviceType.VMIX]: {
			displayName: generateTranslation('VMix'),
			actions: VMixActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(VMixOptions),
			mappingsSchemas: stringifyMappingSchema(VMixMappings),
		},
	},
}
