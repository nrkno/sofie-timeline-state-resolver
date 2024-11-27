import { DeviceType, TSRActionSchema } from 'timeline-state-resolver-types'
import AbstractActions = require('./$schemas/generated/abstract/actions.json')
import AbstractOptions = require('./$schemas/generated/abstract/options.json')
import AbstractMappings = require('./$schemas/generated/abstract/mappings.json')
import AtemActions = require('./$schemas/generated/atem/actions.json')
import AtemOptions = require('./$schemas/generated/atem/options.json')
import AtemMappings = require('./$schemas/generated/atem/mappings.json')
import CasparCGActions = require('./$schemas/generated/casparCG/actions.json')
import CasparCGOptions = require('./$schemas/generated/casparCG/options.json')
import CasparCGMappings = require('./$schemas/generated/casparCG/mappings.json')
import HTTPSendOptions = require('./$schemas/generated/httpSend/options.json')
import HTTPSendMappings = require('./$schemas/generated/httpSend/mappings.json')
import HTTPWatcherOptions = require('./$schemas/generated/httpWatcher/options.json')
import HTTPWatcherMappings = require('./$schemas/generated/httpWatcher/mappings.json')
import HyperdeckActions = require('./$schemas/generated/hyperdeck/actions.json')
import HyperdeckOptions = require('./$schemas/generated/hyperdeck/options.json')
import HyperdeckMappings = require('./$schemas/generated/hyperdeck/mappings.json')
import LawoOptions = require('./$schemas/generated/lawo/options.json')
import LawoMappings = require('./$schemas/generated/lawo/mappings.json')
import MultiOSCOptions = require('./$schemas/generated/multiOsc/options.json')
import MultiOSCMappings = require('./$schemas/generated/multiOsc/mappings.json')
import OBSOptions = require('./$schemas/generated/obs/options.json')
import OBSMappings = require('./$schemas/generated/obs/mappings.json')
import OSCOptions = require('./$schemas/generated/osc/options.json')
import OSCMappings = require('./$schemas/generated/osc/mappings.json')
import PanasonicPTZOptions = require('./$schemas/generated/panasonicPTZ/options.json')
import PanasonicPTZMappings = require('./$schemas/generated/panasonicPTZ/mappings.json')
import PharosOptions = require('./$schemas/generated/pharos/options.json')
import PharosMappings = require('./$schemas/generated/pharos/mappings.json')
import QuantelActions = require('./$schemas/generated/quantel/actions.json')
import QuantelOptions = require('./$schemas/generated/quantel/options.json')
import QuantelMappings = require('./$schemas/generated/quantel/mappings.json')
import ShotokuOptions = require('./$schemas/generated/shotoku/options.json')
import ShotokuMappings = require('./$schemas/generated/shotoku/mappings.json')
import SingularLiveOptions = require('./$schemas/generated/singularLive/options.json')
import SingularLiveMappings = require('./$schemas/generated/singularLive/mappings.json')
import SisyfosOptions = require('./$schemas/generated/sisyfos/options.json')
import SisyfosMappings = require('./$schemas/generated/sisyfos/mappings.json')
import SofieChefOptions = require('./$schemas/generated/sofieChef/options.json')
import SofieChefMappings = require('./$schemas/generated/sofieChef/mappings.json')
import TCPSendOptions = require('./$schemas/generated/tcpSend/options.json')
import TCPSendMappings = require('./$schemas/generated/tcpSend/mappings.json')
import TelemetricsOptions = require('./$schemas/generated/telemetrics/options.json')
import TelemetricsMappings = require('./$schemas/generated/telemetrics/mappings.json')
import TricasterOptions = require('./$schemas/generated/tricaster/options.json')
import TricasterMappings = require('./$schemas/generated/tricaster/mappings.json')
import HttpSendActions = require('./$schemas/generated/httpSend/actions.json')
import PharosActions = require('./$schemas/generated/pharos/actions.json')
import TcpSendActions = require('./$schemas/generated/tcpSend/actions.json')
import ViscaOverIPActions = require('./$schemas/generated/viscaOverIP/actions.json')
import ViscaOverIPOptions = require('./$schemas/generated/viscaOverIP/options.json')
import ViscaOverIPMappings = require('./$schemas/generated/viscaOverIP/mappings.json')
import VizMSEActions = require('./$schemas/generated/vizMSE/actions.json')
import VizMSEOptions = require('./$schemas/generated/vizMSE/options.json')
import VizMSEMappings = require('./$schemas/generated/vizMSE/mappings.json')
import VMixOptions = require('./$schemas/generated/vmix/options.json')
import VMixMappings = require('./$schemas/generated/vmix/mappings.json')
import VMixActions = require('./$schemas/generated/vmix/actions.json')

import CommonOptions = require('./$schemas/common-options.json')
import { generateTranslation } from './lib'

const stringifyActionSchema = (
	action: Omit<TSRActionSchema, 'payload' | 'result'> & { payload?: any; result?: any }
): TSRActionSchema => ({
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
		[DeviceType.VISCA_OVER_IP]: {
			displayName: generateTranslation('VISCA over IP'),
			actions: ViscaOverIPActions.actions.map(stringifyActionSchema),
			configSchema: JSON.stringify(ViscaOverIPOptions),
			mappingsSchemas: stringifyMappingSchema(ViscaOverIPMappings),
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
